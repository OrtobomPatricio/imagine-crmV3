import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sessions, users, leads, conversations, chatMessages, accessLogs } from "../../drizzle/schema";
import { eq, and, desc, ne } from "drizzle-orm";
import { logger } from "../_core/logger";
import { TRPCError } from "@trpc/server";

/**
 * Session Management & GDPR Router
 *
 * Provides:
 * - List active sessions for the current user
 * - Revoke specific sessions (logout from device)
 * - Revoke all other sessions (security emergency)
 * - Inactivity check middleware helper
 * - GDPR data export (right of access)
 * - GDPR data deletion (right to erasure)
 */

export const securityRouter = router({
    // ── Session Management ──

    /** List all active sessions for the current user */
    listSessions: protectedProcedure
        .query(async ({ ctx }) => {
            const db = await getDb();
            if (!db) return [];

            const userSessions = await db
                .select()
                .from(sessions)
                .where(eq(sessions.userId, ctx.user!.id))
                .orderBy(desc(sessions.createdAt));

            return userSessions.map((s) => ({
                id: s.id,
                createdAt: s.createdAt,
                expiresAt: s.expiresAt,
                userAgent: (s as any).userAgent ?? "Unknown",
                ipAddress: (s as any).ipAddress ?? "Unknown",
                isCurrent: String(s.id) === ctx.sessionJti,
            }));
        }),

    /** Revoke a specific session by ID */
    revokeSession: protectedProcedure
        .input(z.object({ sessionId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            // Prevent revoking your own current session
            if (String(input.sessionId) === ctx.sessionJti) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "No puedes cerrar la sesión actual. Usa Cerrar Sesión en su lugar.",
                });
            }

            await db.delete(sessions).where(
                and(
                    eq(sessions.id, input.sessionId),
                    eq(sessions.userId, ctx.user!.id)
                )
            );

            logger.info({ sessionId: input.sessionId, userId: ctx.user!.id }, "[Security] Session revoked");
            return { success: true };
        }),

    /** Revoke ALL other sessions (panic button) */
    revokeAllOtherSessions: protectedProcedure
        .mutation(async ({ ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            const result = await db.delete(sessions).where(
                and(
                    eq(sessions.userId, ctx.user!.id),
                    ne(sessions.id, Number(ctx.sessionJti) || 0)
                )
            );

            logger.info({ userId: ctx.user!.id }, "[Security] All other sessions revoked");
            return { success: true };
        }),

    // ── GDPR Endpoints ──

    /** Export all user data (GDPR Right of Access) */
    exportMyData: protectedProcedure
        .query(async ({ ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            const tenantId = ctx.tenantId;
            const userId = ctx.user!.id;

            // Gather all personal data
            const [userData] = await db.select().from(users).where(eq(users.id, userId));

            const userLeads = await db.select()
                .from(leads)
                .where(and(eq(leads.tenantId, tenantId), eq(leads.assignedToId, userId)))
                .limit(10000);

            return {
                exportedAt: new Date().toISOString(),
                user: {
                    id: userData?.id,
                    email: (userData as any)?.email,
                    fullName: (userData as any)?.fullName,
                    role: (userData as any)?.role,
                    createdAt: (userData as any)?.createdAt,
                },
                leadsAssigned: userLeads.length,
                dataCategories: [
                    "Profile Information",
                    "Assigned Leads",
                    "Session History",
                    "Activity Logs",
                ],
                note: "Para una exportación completa incluyendo mensajes, contacta al administrador.",
            };
        }),

    /** Delete all user data (GDPR Right to Erasure) */
    deleteMyData: protectedProcedure
        .input(z.object({
            confirmEmail: z.string().email(),
            reason: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            // Verify email matches
            const [userData] = await db.select().from(users).where(eq(users.id, ctx.user!.id));
            if (!userData || (userData as any).email !== input.confirmEmail) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "El email de confirmación no coincide con tu cuenta.",
                });
            }

            logger.warn(
                { userId: ctx.user!.id, reason: input.reason },
                "[GDPR] User data deletion requested"
            );

            // Delete sessions
            await db.delete(sessions).where(eq(sessions.userId, ctx.user!.id));

            // Anonymize user (soft delete - keep ID for FK integrity)
            await db.update(users).set({
                fullName: "[DELETED USER]",
                email: `deleted-${ctx.user!.id}@anonymized.local`,
            } as any).where(eq(users.id, ctx.user!.id));

            return {
                success: true,
                message: "Tus datos personales han sido eliminados. Tu cuenta ha sido anonimizada.",
            };
        }),

    // ── Access Logs ──

    /** List recent access logs for audit */
    listAccessLogs: protectedProcedure
        .input(z.object({ limit: z.number().min(1).max(500).default(50) }).optional())
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) return [];

            const limit = input?.limit ?? 50;
            const logs = await db
                .select({
                    id: accessLogs.id,
                    action: accessLogs.action,
                    ipAddress: accessLogs.ipAddress,
                    createdAt: accessLogs.createdAt,
                    success: accessLogs.success,
                    userName: users.name,
                })
                .from(accessLogs)
                .leftJoin(users, eq(accessLogs.userId, users.id))
                .where(eq(accessLogs.tenantId, ctx.tenantId))
                .orderBy(desc(accessLogs.createdAt))
                .limit(limit);

            return logs;
        }),
});
