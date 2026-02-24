import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { integrations } from "../../drizzle/schema";
import { getDb } from "../db";
import { permissionProcedure, router } from "../_core/trpc";
import { assertSafeOutboundUrl } from "../_core/urlSafety";

export const integrationsRouter = router({
    list: permissionProcedure("integrations.view").query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];

        return db.select()
            .from(integrations)
            .where(eq(integrations.tenantId, ctx.tenantId))
            .orderBy(desc(integrations.createdAt));
    }),

    getById: permissionProcedure("integrations.view")
        .input(z.object({ id: z.number() }))
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) return null;

            const result = await db.select()
                .from(integrations)
                .where(and(eq(integrations.tenantId, ctx.tenantId), eq(integrations.id, input.id)))
                .limit(1);

            return result[0] ?? null;
        }),

    create: permissionProcedure("integrations.manage")
        .input(z.object({
            name: z.string().min(1),
            type: z.enum(['n8n', 'chatwoot', 'zapier', 'webhook']),
            webhookUrl: z.string().url(),
            whatsappNumberId: z.number(),
            events: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await assertSafeOutboundUrl(input.webhookUrl);

            const result = await db.insert(integrations).values({
                tenantId: ctx.tenantId,
                ...input,
                events: input.events ?? ['message_received', 'lead_created', 'lead_updated', 'campaign_sent'],
                createdById: ctx.user?.id,
                isActive: true,
            });

            return { id: result[0].insertId, success: true };
        }),

    update: permissionProcedure("integrations.manage")
        .input(z.object({
            id: z.number(),
            name: z.string().optional(),
            webhookUrl: z.string().url().optional(),
            whatsappNumberId: z.number().optional(),
            isActive: z.boolean().optional(),
            events: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            if (input.webhookUrl) {
                await assertSafeOutboundUrl(input.webhookUrl);
            }

            const { id, ...updateData } = input;
            await db.update(integrations)
                .set(updateData)
                .where(and(eq(integrations.tenantId, ctx.tenantId), eq(integrations.id, id)));

            return { success: true };
        }),

    delete: permissionProcedure("integrations.manage")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.delete(integrations).where(and(eq(integrations.tenantId, ctx.tenantId), eq(integrations.id, input.id)));
            return { success: true };
        }),

    toggle: permissionProcedure("integrations.manage")
        .input(z.object({
            id: z.number(),
            isActive: z.boolean(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.update(integrations)
                .set({ isActive: input.isActive })
                .where(and(eq(integrations.tenantId, ctx.tenantId), eq(integrations.id, input.id)));

            return { success: true };
        }),

    testWebhook: permissionProcedure("integrations.manage")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const integration = await db.select()
                .from(integrations)
                .where(and(eq(integrations.tenantId, ctx.tenantId), eq(integrations.id, input.id)))
                .limit(1);

            if (!integration[0]) throw new Error("Integration not found");

            await assertSafeOutboundUrl(integration[0].webhookUrl);

            // Test webhook by sending a test payload
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10_000);

                const response = await fetch(integration[0].webhookUrl, {
                    method: 'POST',
                    redirect: 'error',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                    body: JSON.stringify({
                        event: 'test',
                        timestamp: new Date().toISOString(),
                        data: { message: 'Test from Imagine Lab CRM' },
                    }),
                });

                clearTimeout(timeout);

                if (response.ok) {
                    await db.update(integrations)
                        .set({ lastTriggeredAt: new Date() })
                        .where(and(eq(integrations.tenantId, ctx.tenantId), eq(integrations.id, input.id)));
                    return { success: true, status: response.status };
                } else {
                    return { success: false, status: response.status, error: 'Webhook returned error' };
                }
            } catch (error) {
                return { success: false, error: 'Failed to connect to webhook' };
            }
        }),
});
