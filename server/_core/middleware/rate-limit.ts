import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";
import { sdk } from "../sdk";

// Configuración de Rate Limit
const RATE_MAX_REDIS = 2000;
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

// Límite en memoria simple como respaldo
const RATE_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? "60000"); // 1 minuto
const RATE_MAX_MEMORY = Number(process.env.RATE_LIMIT_MAX ?? "2000"); // 2000 peticiones por minuto
const buckets = new Map<string, { count: number; resetAt: number }>();

// Limpieza de buckets en memoria (Optimización: Solo limpiar si tamaño excede umbral o periódicamente)
setInterval(() => {
    const now = Date.now();
    // Convertir a array para iterar y borrar seguros
    for (const [key, bucket] of Array.from(buckets.entries())) {
        if (now > bucket.resetAt) {
            buckets.delete(key);
        }
    }
}, 60000).unref(); // Cada minuto

if (redis) {
    console.log("✅ Redis Rate Limiting habilitado");
    redis.on("error", (err) => console.error("Error del Cliente Redis", err));
}

export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // Omitir lógica para assets estáticos y OPTIONS
    if (req.method === "OPTIONS") return next();

    // Lista blanca de rutas públicas
    if (req.path.startsWith("/api/whatsapp") || req.path.startsWith("/api/webhooks")) return next();

    // Obtención robusta de IP
    const ip = (
        req.ip ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket.remoteAddress ||
        "unknown"
    ).toString().replace('::ffff:', '');

    let user = null;
    try {
        user = await sdk.authenticateRequest(req);
    } catch { }

    const rateKey = user ? `ratelimit:tenant:${user.tenantId}:user:${user.id}` : `ratelimit:ip:${ip}`;


    if (redis) {
        try {
            const key = rateKey;
            const count = await redis.incr(key);
            if (count === 1) await redis.expire(key, 60);
            if (count > RATE_MAX_REDIS) {
                res.setHeader("Retry-After", 60);
                return res.status(429).json({ error: "Demasiadas peticiones" });
            }
            return next();
        } catch (e) {
            console.error("Error Redis Rate Limit:", e);
            // Fallback a memoria si Redis falla
        }
    }

    // Fallback / Límite en Memoria por Defecto
    const now = Date.now();
    const bucket = buckets.get(rateKey);

    if (!bucket || now > bucket.resetAt) {
        buckets.set(rateKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return next();
    }

    bucket.count += 1;
    if (bucket.count > RATE_MAX_MEMORY) {
        res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
        return res.status(429).json({
            error: "rate_limit",
            message: "Demasiadas peticiones, por favor intenta más tarde."
        });
    }

    next();
};
