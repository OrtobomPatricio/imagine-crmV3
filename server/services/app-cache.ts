import { logger } from "../_core/logger";

/**
 * Redis Application Cache Service
 *
 * Provides a unified caching layer for frequently read data:
 * - appSettings: TTL 5 min (rarely changes)
 * - permissions: TTL 1 hour (role-based, stable)
 * - listings: TTL 1 min (frequent but acceptable staleness)
 *
 * Falls back to in-memory Map if Redis is unavailable.
 */

type CacheTier = "settings" | "permissions" | "listing" | "custom";

const TTL_MAP: Record<CacheTier, number> = {
    settings: 300,      // 5 min
    permissions: 3600,  // 1 hour
    listing: 60,        // 1 min
    custom: 120,        // 2 min
};

// In-memory fallback store
const memoryCache = new Map<string, { data: any; expiresAt: number }>();

let redisClient: any = null;

/**
 * Initialize Redis client for caching.
 * Call during server startup.
 */
export async function initCacheRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        logger.warn("[Cache] REDIS_URL not set — using in-memory cache fallback");
        return;
    }

    try {
        const Redis = (await import("ioredis")).default;
        redisClient = new Redis(redisUrl, {
            keyPrefix: "cache:",
            maxRetriesPerRequest: 3,
            retryStrategy: (times: number) => Math.min(times * 200, 3000),
        });

        redisClient.on("error", (err: any) => {
            logger.error({ err }, "[Cache] Redis error — falling back to memory");
        });

        redisClient.on("connect", () => {
            logger.info("[Cache] Redis connected for application caching");
        });
    } catch (err) {
        logger.warn({ err }, "[Cache] Failed to init Redis — using memory cache");
    }
}

/**
 * Get a cached value. Returns null if not found or expired.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    // Try Redis first
    if (redisClient) {
        try {
            const raw = await redisClient.get(key);
            if (raw) return JSON.parse(raw) as T;
        } catch {
            // fallback to memory
        }
    }

    // Memory fallback
    const entry = memoryCache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
        return entry.data as T;
    }
    memoryCache.delete(key);
    return null;
}

/**
 * Set a cached value with TTL based on tier.
 */
export async function cacheSet(key: string, data: any, tier: CacheTier = "custom"): Promise<void> {
    const ttl = TTL_MAP[tier];

    // Redis
    if (redisClient) {
        try {
            await redisClient.set(key, JSON.stringify(data), "EX", ttl);
        } catch {
            // fallback to memory
        }
    }

    // Always set in memory too (for local reads and Redis unavailability)
    memoryCache.set(key, { data, expiresAt: Date.now() + ttl * 1000 });
}

/**
 * Invalidate a specific cache key.
 */
export async function cacheInvalidate(key: string): Promise<void> {
    memoryCache.delete(key);
    if (redisClient) {
        try {
            await redisClient.del(key);
        } catch { /* ignore */ }
    }
}

/**
 * Invalidate all keys matching a pattern (e.g., "tenant:5:*").
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
    // Memory: brute-force scan
    for (const [key] of memoryCache) {
        if (key.includes(pattern.replace("*", ""))) {
            memoryCache.delete(key);
        }
    }

    // Redis: use SCAN to avoid blocking
    if (redisClient) {
        try {
            const stream = redisClient.scanStream({ match: `cache:${pattern}`, count: 100 });
            stream.on("data", (keys: string[]) => {
                if (keys.length) {
                    const pipeline = redisClient.pipeline();
                    keys.forEach((k: string) => pipeline.del(k));
                    pipeline.exec();
                }
            });
        } catch { /* ignore */ }
    }
}

// ── Convenience helpers for typed caching ──

/**
 * Cache appSettings for a tenant.
 */
export async function getCachedSettings(tenantId: number): Promise<any | null> {
    return cacheGet(`tenant:${tenantId}:settings`);
}

export async function setCachedSettings(tenantId: number, settings: any): Promise<void> {
    await cacheSet(`tenant:${tenantId}:settings`, settings, "settings");
}

/**
 * Cache permissions matrix for a role.
 */
export async function getCachedPermissions(tenantId: number, role: string): Promise<any | null> {
    return cacheGet(`tenant:${tenantId}:perms:${role}`);
}

export async function setCachedPermissions(tenantId: number, role: string, perms: any): Promise<void> {
    await cacheSet(`tenant:${tenantId}:perms:${role}`, perms, "permissions");
}

/**
 * Cache a listing result (leads, conversations, etc.)
 */
export async function getCachedListing(tenantId: number, listName: string, params: string): Promise<any | null> {
    return cacheGet(`tenant:${tenantId}:list:${listName}:${params}`);
}

export async function setCachedListing(tenantId: number, listName: string, params: string, data: any): Promise<void> {
    await cacheSet(`tenant:${tenantId}:list:${listName}:${params}`, data, "listing");
}

// Periodic cleanup for memory cache
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryCache) {
        if (entry.expiresAt <= now) memoryCache.delete(key);
    }
}, 60_000).unref();
