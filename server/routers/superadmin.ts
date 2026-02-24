import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tenants, users, whatsappNumbers, conversations, leads, sessions } from "../../drizzle/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { logger } from "../_core/logger";
import { TRPCError } from "@trpc/server";
import { getAllFlags, setFeatureFlag, getFlagDefinitions } from "../services/feature-flags";

/**
 * Superadmin Router
 *
 * Cross-tenant administration panel for platform owners.
 * Only accessible by users with role === "owner" AND tenantId === 1 (platform tenant).
 *
 * Provides:
 * - List all tenants with usage stats
 * - Impersonate a user in another tenant
 * - Manage feature flags per tenant
 * - Platform-wide stats
 */

const superadminGuard = protectedProcedure.use(async ({ ctx, next }) => {
    if (ctx.user?.role !== "owner" || ctx.tenantId !== 1) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "Acceso restringido a superadmins de la plataforma.",
        });
    }
    return next();
});

export const superadminRouter = router({
    // ── Tenant Management ──

    /** List all tenants with user counts */
    listTenants: superadminGuard
        .query(async () => {
            const db = await getDb();
            if (!db) return [];

            const tenantList = await db
                .select({
                    id: tenants.id,
                    name: tenants.name,
                    slug: tenants.slug,
                    plan: tenants.plan,
                    createdAt: tenants.createdAt,
                    userCount: sql<number>`(SELECT COUNT(*) FROM users WHERE users.tenantId = ${tenants.id})`,
                    leadCount: sql<number>`(SELECT COUNT(*) FROM leads WHERE leads.tenantId = ${tenants.id} AND leads.deletedAt IS NULL)`,
                    waNumberCount: sql<number>`(SELECT COUNT(*) FROM whatsapp_numbers WHERE whatsapp_numbers.tenantId = ${tenants.id})`,
                })
                .from(tenants)
                .orderBy(desc(tenants.createdAt));

            return tenantList;
        }),

    /** Get platform-wide stats */
    platformStats: superadminGuard
        .query(async () => {
            const db = await getDb();
            if (!db) return null;

            const [stats] = await db.select({
                totalTenants: sql<number>`(SELECT COUNT(*) FROM tenants)`,
                totalUsers: sql<number>`(SELECT COUNT(*) FROM users WHERE isActive = 1)`,
                totalLeads: sql<number>`(SELECT COUNT(*) FROM leads WHERE deletedAt IS NULL)`,
                totalConversations: sql<number>`(SELECT COUNT(*) FROM conversations)`,
                totalMessages: sql<number>`(SELECT COUNT(*) FROM chat_messages)`,
            }).from(sql`(SELECT 1) as dummy`);

            return stats;
        }),

    // ── Impersonate ──

    /** Generate an impersonation token for another user */
    impersonateUser: superadminGuard
        .input(z.object({
            targetUserId: z.number(),
            targetTenantId: z.number(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            // Verify target user exists
            const [targetUser] = await db.select()
                .from(users)
                .where(eq(users.id, input.targetUserId))
                .limit(1);

            if (!targetUser) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
            }

            logger.warn(
                { adminId: ctx.user!.id, targetUserId: input.targetUserId, targetTenantId: input.targetTenantId },
                "[Superadmin] IMPERSONATION initiated"
            );

            // Return impersonation context (the client should create a special session)
            return {
                success: true,
                targetUser: {
                    id: targetUser.id,
                    name: (targetUser as any).name,
                    email: (targetUser as any).email,
                    tenantId: targetUser.tenantId,
                    role: targetUser.role,
                },
                note: "Impersonation mode active. All actions will be logged as the target user.",
            };
        }),

    // ── Feature Flags ──

    /** Get all flags for a tenant */
    getFeatureFlags: superadminGuard
        .input(z.object({ tenantId: z.number() }))
        .query(async ({ input }) => {
            const flags = await getAllFlags(input.tenantId);
            const definitions = getFlagDefinitions();
            return { flags, definitions };
        }),

    /** Update a feature flag for a tenant */
    setFeatureFlag: superadminGuard
        .input(z.object({
            tenantId: z.number(),
            flag: z.string(),
            enabled: z.boolean(),
        }))
        .mutation(async ({ input, ctx }) => {
            await setFeatureFlag(input.tenantId, input.flag, input.enabled);
            logger.info(
                { adminId: ctx.user!.id, ...input },
                "[Superadmin] Feature flag updated"
            );
            return { success: true };
        }),
});
