import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";

// Create Redis Client
const redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : undefined;

if (redisClient) {
    console.log("✅ Redis Rate Limiting habilitado");
    redisClient.on("error", (err) => console.error("Error del Cliente Redis Rate Limit", err));
}

// Default Global Rate Limiter
const globalLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? "60000"), // 1 min by default
    max: Number(process.env.RATE_LIMIT_MAX ?? "2000"), // 2000 per min
    standardHeaders: true,
    legacyHeaders: false,
    store: redisClient ? new RedisStore({
        sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
    }) : undefined,
    message: {
        error: "rate_limit",
        message: "Demasiadas peticiones, por favor intenta más tarde."
    }
});

// Sensitive endpoints Map
const SENSITIVE_LIMITS = {
    "auth.login": rateLimit({
        windowMs: 60000, max: 10,
        store: redisClient ? new RedisStore({ sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any }) : undefined,
        message: { error: "rate_limit", message: "Excedido el límite de login." }
    }),
    "auth.register": rateLimit({
        windowMs: 60000, max: 5,
        store: redisClient ? new RedisStore({ sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any }) : undefined,
        message: { error: "rate_limit", message: "Excedido el límite de registro." }
    }),
};

export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Skip static assets and public webhooks
    if (req.method === "OPTIONS") return next();
    if (req.path.startsWith("/api/whatsapp") || req.path.startsWith("/api/webhooks")) return next();

    // Check sensitive TRPC endpoints
    if (req.path.includes("/api/trpc/")) {
        for (const [key, limiter] of Object.entries(SENSITIVE_LIMITS)) {
            if (req.path.includes(key)) {
                return limiter(req, res, next);
            }
        }
    }

    // Default to global limiter
    globalLimiter(req, res, next);
};
