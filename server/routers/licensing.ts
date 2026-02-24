import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { license, usageTracking, users, whatsappNumbers, chatMessages } from "../../drizzle/schema";
import { getDb } from "../db";
import { permissionProcedure, router, publicProcedure } from "../_core/trpc";
import { logger, safeError } from "../_core/logger";

export const licensingRouter = router({
    /**
     * Get current license status and usage
     */
    getStatus: permissionProcedure("settings.view").query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) {
            return {
                license: null,
                usage: { messagesThisMonth: 0, activeUsers: 0, activeNumbers: 0 },
                limits: { maxUsers: 5, maxWhatsappNumbers: 3, maxMessagesPerMonth: 10000 },
            };
        }

        // Get license (single tenant for now)
        const [licenseRow] = await db.select().from(license).where(eq(license.tenantId, ctx.tenantId)).limit(1);

        // Get current usage
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const [usageRow] = await db.select()
            .from(usageTracking)
            .where(and(
                eq(usageTracking.tenantId, ctx.tenantId),
                eq(usageTracking.year, year),
                eq(usageTracking.month, month)
            ));

        // Calculate actual usage
        const activeUsers = await db.select({ count: sql<number>`count(*)` })
            .from(users)
            .where(and(eq(users.tenantId, ctx.tenantId), eq(users.isActive, true)));

        const activeNumbers = await db.select({ count: sql<number>`count(*)` })
            .from(whatsappNumbers)
            .where(and(eq(whatsappNumbers.tenantId, ctx.tenantId), eq(whatsappNumbers.isConnected, true)));

        // Count messages this month
        const startOfMonth = new Date(year, month - 1, 1);
        const messagesThisMonth = await db.select({ count: sql<number>`count(*)` })
            .from(chatMessages)
            .where(and(eq(chatMessages.tenantId, ctx.tenantId), sql`${chatMessages.createdAt} >= ${startOfMonth} AND ${chatMessages.direction} = 'outbound'`));

        const defaultLicense = {
            status: 'trial' as const,
            plan: 'starter',
            maxUsers: 5,
            maxWhatsappNumbers: 3,
            maxMessagesPerMonth: 10000,
        };

        const lic = licenseRow || defaultLicense;

        return {
            license: licenseRow ? {
                id: licenseRow.id,
                status: licenseRow.status,
                plan: licenseRow.plan,
                expiresAt: licenseRow.expiresAt,
                maxUsers: licenseRow.maxUsers,
                maxWhatsappNumbers: licenseRow.maxWhatsappNumbers,
                maxMessagesPerMonth: licenseRow.maxMessagesPerMonth,
                features: licenseRow.features || [],
            } : {
                status: 'trial',
                plan: 'starter',
                expiresAt: null,
                maxUsers: 5,
                maxWhatsappNumbers: 3,
                maxMessagesPerMonth: 10000,
                features: [],
            },
            usage: {
                messagesThisMonth: messagesThisMonth[0]?.count || usageRow?.messagesSent || 0,
                activeUsers: activeUsers[0]?.count || 0,
                activeNumbers: activeNumbers[0]?.count || 0,
            },
            limits: {
                maxUsers: lic.maxUsers || 5,
                maxWhatsappNumbers: lic.maxWhatsappNumbers || 3,
                maxMessagesPerMonth: lic.maxMessagesPerMonth || 10000,
            },
        };
    }),

    /**
     * Update license (for manual activation or syncing with payment provider)
     */
    updateLicense: permissionProcedure("settings.manage")
        .input(z.object({
            key: z.string().optional(),
            status: z.enum(["active", "expired", "canceled", "trial"]).optional(),
            plan: z.string().optional(),
            expiresAt: z.date().optional(),
            maxUsers: z.number().optional(),
            maxWhatsappNumbers: z.number().optional(),
            maxMessagesPerMonth: z.number().optional(),
            features: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const [existing] = await db.select().from(license).where(eq(license.tenantId, ctx.tenantId)).limit(1);

            if (existing) {
                await db.update(license)
                    .set({
                        ...input,
                        updatedAt: new Date(),
                    })
                    .where(and(eq(license.tenantId, ctx.tenantId), eq(license.id, existing.id)));
            } else {
                if (!input.key) throw new Error("License key is required");
                await db.insert(license).values({
                    tenantId: ctx.tenantId,
                    key: input.key,
                    status: input.status || 'trial',
                    plan: input.plan || 'starter',
                    expiresAt: input.expiresAt,
                    maxUsers: input.maxUsers || 5,
                    maxWhatsappNumbers: input.maxWhatsappNumbers || 3,
                    maxMessagesPerMonth: input.maxMessagesPerMonth || 10000,
                    features: input.features || [],
                });
            }

            logger.info({ status: input.status, plan: input.plan }, "License updated");
            return { success: true };
        }),

    /**
     * Get usage history (for charts)
     */
    getUsageHistory: permissionProcedure("settings.view")
        .input(z.object({ months: z.number().default(6) }))
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) return [];

            const history = await db.select()
                .from(usageTracking)
                .where(eq(usageTracking.tenantId, ctx.tenantId))
                .orderBy(sql`${usageTracking.year} DESC, ${usageTracking.month} DESC`)
                .limit(input.months);

            return history;
        }),

    /**
     * Record usage (called internally)
     */
    recordUsage: publicProcedure
        .input(z.object({
            tenantId: z.number().default(1),
            messagesSent: z.number().optional(),
            messagesReceived: z.number().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) return;

            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;

            const [existing] = await db.select()
                .from(usageTracking)
                .where(and(
                    eq(usageTracking.tenantId, input.tenantId),
                    eq(usageTracking.year, year),
                    eq(usageTracking.month, month)
                ));

            if (existing) {
                await db.update(usageTracking)
                    .set({
                        messagesSent: sql`${usageTracking.messagesSent} + ${input.messagesSent || 0}`,
                        messagesReceived: sql`${usageTracking.messagesReceived} + ${input.messagesReceived || 0}`,
                        updatedAt: new Date(),
                    })
                    .where(and(eq(usageTracking.tenantId, input.tenantId), eq(usageTracking.id, existing.id)));
            } else {
                await db.insert(usageTracking).values({
                    tenantId: input.tenantId,
                    year,
                    month,
                    messagesSent: input.messagesSent || 0,
                    messagesReceived: input.messagesReceived || 0,
                });
            }
        }),
});

/**
 * Check if license is valid for an operation
 * Returns { allowed: boolean, reason?: string }
 */
export async function checkLicenseLimit(
    limitType: 'users' | 'whatsappNumbers' | 'messages',
    currentCount: number,
    tenantId: number
): Promise<{ allowed: boolean; reason?: string }> {
    const db = await getDb();
    if (!db) return { allowed: true }; // Allow if no DB (dev mode)

    const [lic] = await db.select().from(license).where(eq(license.tenantId, tenantId)).limit(1);

    if (!lic || lic.status === 'expired' || lic.status === 'canceled') {
        return { allowed: false, reason: "Licencia expirada o cancelada" };
    }

    const limits = {
        users: lic.maxUsers || 5,
        whatsappNumbers: lic.maxWhatsappNumbers || 3,
        messages: lic.maxMessagesPerMonth || 10000,
    };

    if (currentCount >= limits[limitType]) {
        return {
            allowed: false,
            reason: `Límite de ${limitType} alcanzado (${limits[limitType]}). Actualiza tu plan.`
        };
    }

    return { allowed: true };
}

/**
 * Middleware to check license before allowing operations
 */
export function requireLicense(limitType: 'users' | 'whatsappNumbers' | 'messages') {
    return async (ctx: any, next: () => Promise<any>) => {
        const db = await getDb();
        if (!db) return next();

        // Get current count based on limit type
        let currentCount = 0;

        switch (limitType) {
            case 'users':
                const userCount = await db.select({ count: sql<number>`count(*)` })
                    .from(users)
                    .where(and(eq(users.tenantId, ctx.tenantId), eq(users.isActive, true)));
                currentCount = userCount[0]?.count || 0;
                break;
            case 'whatsappNumbers':
                const numberCount = await db.select({ count: sql<number>`count(*)` })
                    .from(whatsappNumbers)
                    .where(and(eq(whatsappNumbers.tenantId, ctx.tenantId), eq(whatsappNumbers.isConnected, true)));
                currentCount = numberCount[0]?.count || 0;
                break;
            case 'messages':
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const msgCount = await db.select({ count: sql<number>`count(*)` })
                    .from(chatMessages)
                    .where(and(eq(chatMessages.tenantId, ctx.tenantId), sql`${chatMessages.createdAt} >= ${startOfMonth} AND ${chatMessages.direction} = 'outbound'`));
                currentCount = msgCount[0]?.count || 0;
                break;
        }

        const check = await checkLicenseLimit(limitType, currentCount, ctx.tenantId);
        if (!check.allowed) {
            throw new Error(check.reason);
        }

        return next();
    };
}
