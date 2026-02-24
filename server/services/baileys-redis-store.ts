import Redis from "ioredis";
import { logger } from "../_core/logger";

const REDIS_URL = process.env.REDIS_URL;

/**
 * Redis-based auth state store for Baileys.
 * Stores session credentials and keys in Redis instead of the filesystem,
 * enabling multi-server deployments and faster session restoration.
 *
 * Usage:
 * ```ts
 * const { state, saveCreds } = await useRedisAuthState(redis, `baileys:session:${userId}`);
 * const socket = makeWASocket({ auth: state, ... });
 * socket.ev.on('creds.update', saveCreds);
 * ```
 */
export async function useRedisAuthState(redis: Redis, keyPrefix: string) {
    const writeData = async (key: string, data: any) => {
        const serialized = JSON.stringify(data, (_, value) =>
            typeof value === "bigint" ? value.toString() : value
        );
        await redis.set(`${keyPrefix}:${key}`, serialized, "EX", 86400 * 30); // 30 day TTL
    };

    const readData = async (key: string) => {
        try {
            const raw = await redis.get(`${keyPrefix}:${key}`);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    };

    const removeData = async (key: string) => {
        await redis.del(`${keyPrefix}:${key}`);
    };

    // Load existing creds
    const creds = await readData("creds");

    return {
        state: {
            creds: creds || {},
            keys: {
                get: async (type: string, ids: string[]) => {
                    const result: Record<string, any> = {};
                    for (const id of ids) {
                        const val = await readData(`${type}-${id}`);
                        if (val) result[id] = val;
                    }
                    return result;
                },
                set: async (data: Record<string, Record<string, any>>) => {
                    for (const [type, entries] of Object.entries(data)) {
                        for (const [id, value] of Object.entries(entries)) {
                            if (value) {
                                await writeData(`${type}-${id}`, value);
                            } else {
                                await removeData(`${type}-${id}`);
                            }
                        }
                    }
                },
            },
        },
        saveCreds: async () => {
            // creds object is mutated by Baileys, save latest
            await writeData("creds", creds);
        },
    };
}

/**
 * Check if Redis is available for Baileys session persistence.
 */
export function isRedisAvailable(): boolean {
    return !!REDIS_URL;
}

/**
 * Create a Redis client for Baileys sessions.
 */
export function createBaileysRedis(): Redis | null {
    if (!REDIS_URL) return null;
    try {
        const client = new Redis(REDIS_URL, { keyPrefix: "baileys:" });
        client.on("error", (err) => logger.error({ err }, "[BaileysRedis] connection error"));
        return client;
    } catch {
        return null;
    }
}
