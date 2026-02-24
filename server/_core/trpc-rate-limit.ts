/**
 * tRPC Rate Limiting
 * 
 * Rate limiting specific for tRPC procedures.
 * Protects against brute force attacks on authentication endpoints.
 */

import { TRPCError } from "@trpc/server";

// In-memory store for rate limiting (per IP per procedure)
interface RateLimitEntry {
    count: number;
    resetAt: number;
    blocked: boolean;
}

const rateLimits = new Map<string, RateLimitEntry>();

// Configuración
const AUTH_RATE_LIMIT = {
    maxAttempts: 5,        // 5 intentos
    windowMs: 15 * 60 * 1000,  // por 15 minutos
    blockDurationMs: 30 * 60 * 1000,  // bloqueo por 30 minutos después de exceder
};

const GENERAL_RATE_LIMIT = {
    maxRequests: 100,      // 100 requests
    windowMs: 60 * 1000,   // por minuto
};

// Limpieza periódica de entradas expiradas
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimits.entries()) {
        if (now > entry.resetAt && !entry.blocked) {
            rateLimits.delete(key);
        }
    }
}, 60000).unref();

/**
 * Rate limit para endpoints de autenticación (login, reset password, etc.)
 */
export async function authRateLimit(identifier: string): Promise<void> {
    const key = `auth:${identifier}`;
    const now = Date.now();
    
    const entry = rateLimits.get(key);
    
    if (!entry || now > entry.resetAt) {
        // Nueva ventana
        rateLimits.set(key, {
            count: 1,
            resetAt: now + AUTH_RATE_LIMIT.windowMs,
            blocked: false,
        });
        return;
    }
    
    // Si está bloqueado
    if (entry.blocked) {
        const blockExpiry = entry.resetAt + AUTH_RATE_LIMIT.blockDurationMs;
        if (now < blockExpiry) {
            const minutesLeft = Math.ceil((blockExpiry - now) / 60000);
            throw new TRPCError({
                code: "TOO_MANY_REQUESTS",
                message: `Demasiados intentos fallidos. Cuenta bloqueada por ${minutesLeft} minutos.`,
            });
        } else {
            // Desbloquear y reiniciar contador
            entry.blocked = false;
            entry.count = 1;
            entry.resetAt = now + AUTH_RATE_LIMIT.windowMs;
            return;
        }
    }
    
    // Incrementar contador
    entry.count++;
    
    // Verificar si excede el límite
    if (entry.count > AUTH_RATE_LIMIT.maxAttempts) {
        entry.blocked = true;
        entry.resetAt = now; // Resetear para calcular el bloqueo desde ahora
        throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Demasiados intentos fallidos. Cuenta bloqueada por ${AUTH_RATE_LIMIT.blockDurationMs / 60000} minutos.`,
        });
    }
}

/**
 * Rate limit general para procedimientos
 */
export async function generalRateLimit(identifier: string): Promise<void> {
    const key = `general:${identifier}`;
    const now = Date.now();
    
    const entry = rateLimits.get(key);
    
    if (!entry || now > entry.resetAt) {
        rateLimits.set(key, {
            count: 1,
            resetAt: now + GENERAL_RATE_LIMIT.windowMs,
            blocked: false,
        });
        return;
    }
    
    entry.count++;
    
    if (entry.count > GENERAL_RATE_LIMIT.maxRequests) {
        throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Demasiadas peticiones. Por favor intenta más tarde.",
        });
    }
}

/**
 * Limpia el rate limit para un identificador específico
 * Útil después de un login exitoso
 */
export function clearRateLimit(identifier: string, type: 'auth' | 'general' = 'auth'): void {
    const key = `${type}:${identifier}`;
    rateLimits.delete(key);
}
