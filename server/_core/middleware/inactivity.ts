import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

const INACTIVITY_TIMEOUT_MS = Number(process.env.SESSION_INACTIVITY_MS ?? String(30 * 60 * 1000)); // 30 minutes

// In-memory store for last activity timestamps per session
const lastActivity = new Map<string, number>();

/**
 * Inactivity Expiration Middleware
 *
 * Tracks the last activity timestamp for each authenticated session.
 * If a session has been inactive for longer than INACTIVITY_TIMEOUT_MS,
 * the request is rejected with 401 Unauthorized.
 *
 * Works alongside the session management system — revokes sessions
 * that have been idle beyond the configured threshold.
 */
export const inactivityMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Only track authenticated API requests
    if (!req.path.startsWith("/api/trpc")) return next();

    const sessionId = (req as any).sessionJti;
    if (!sessionId) return next(); // No session = public route

    const now = Date.now();
    const last = lastActivity.get(sessionId);

    if (last && (now - last) > INACTIVITY_TIMEOUT_MS) {
        // Session expired due to inactivity
        lastActivity.delete(sessionId);
        logger.info({ sessionId }, "[Inactivity] Session expired due to inactivity");
        return res.status(401).json({
            error: "session_expired",
            message: "Tu sesión ha expirado por inactividad. Por favor, vuelve a iniciar sesión.",
        });
    }

    // Update last activity
    lastActivity.set(sessionId, now);
    next();
};

/**
 * Clean up stale entries from the activity map periodically
 */
setInterval(() => {
    const now = Date.now();
    const cutoff = now - INACTIVITY_TIMEOUT_MS * 2;
    for (const [key, ts] of lastActivity.entries()) {
        if (ts < cutoff) lastActivity.delete(key);
    }
}, 5 * 60 * 1000).unref(); // Every 5 min

/**
 * Manually record activity for a session (e.g., on explicit user action)
 */
export function touchSession(sessionId: string): void {
    lastActivity.set(sessionId, Date.now());
}
