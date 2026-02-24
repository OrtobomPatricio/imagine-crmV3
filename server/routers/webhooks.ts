import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { webhooks, webhookDeliveries } from "../../drizzle/schema";
import { getDb } from "../db";
import { permissionProcedure, router } from "../_core/trpc";
import { randomBytes, createHmac } from "crypto";

// Generate webhook secret
function generateSecret(): string {
    return `whsec_${randomBytes(32).toString("hex")}`;
}

// Sign payload with secret
function signPayload(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
}

export const webhooksRouter = router({
    // List webhooks
    list: permissionProcedure("settings.manage")
        .query(async ({ ctx }) => {
            const db = await getDb();
            if (!db) return [];

            return db.select().from(webhooks).where(eq(webhooks.tenantId, ctx.tenantId)).orderBy(desc(webhooks.createdAt));
        }),

    // Create webhook
    create: permissionProcedure("settings.manage")
        .input(z.object({
            name: z.string().min(1).max(100),
            url: z.string().url(),
            events: z.array(z.enum([
                "lead.created",
                "lead.updated",
                "lead.status_changed",
                "message.received",
                "message.sent",
                "conversation.assigned",
                "note.created",
                "task.created",
                "task.completed",
            ])).min(1),
            active: z.boolean().default(true),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const secret = generateSecret();
            const result = await db.insert(webhooks).values({
                tenantId: ctx.tenantId,
                ...input,
                secret,
            });

            return {
                id: result[0].insertId,
                secret,
                ...input
            };
        }),

    // Update webhook
    update: permissionProcedure("settings.manage")
        .input(z.object({
            id: z.number(),
            name: z.string().min(1).max(100).optional(),
            url: z.string().url().optional(),
            events: z.array(z.string()).optional(),
            active: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const { id, ...updates } = input;
            await db.update(webhooks).set(updates).where(and(eq(webhooks.tenantId, ctx.tenantId), eq(webhooks.id, id)));

            return { success: true };
        }),

    // Delete webhook
    delete: permissionProcedure("settings.manage")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.delete(webhooks).where(and(eq(webhooks.tenantId, ctx.tenantId), eq(webhooks.id, input.id)));
            return { success: true };
        }),

    // Regenerate secret
    regenerateSecret: permissionProcedure("settings.manage")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const secret = generateSecret();
            await db.update(webhooks)
                .set({ secret })
                .where(and(eq(webhooks.tenantId, ctx.tenantId), eq(webhooks.id, input.id)));

            return { secret };
        }),

    // Get delivery history
    getDeliveries: permissionProcedure("settings.manage")
        .input(z.object({
            webhookId: z.number(),
            limit: z.number().default(50),
        }))
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) return [];

            return db.select()
                .from(webhookDeliveries)
                .where(and(eq(webhookDeliveries.tenantId, ctx.tenantId), eq(webhookDeliveries.webhookId, input.webhookId)))
                .orderBy(desc(webhookDeliveries.createdAt))
                .limit(input.limit);
        }),

    // Test webhook
    test: permissionProcedure("settings.manage")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const webhook = await db.select()
                .from(webhooks)
                .where(and(eq(webhooks.tenantId, ctx.tenantId), eq(webhooks.id, input.id)))
                .limit(1);

            if (!webhook[0]) {
                throw new Error("Webhook not found");
            }

            // Send test payload
            const testPayload = {
                event: "test",
                data: { message: "This is a test webhook" },
                timestamp: new Date().toISOString(),
            };

            const body = JSON.stringify(testPayload);
            const signature = signPayload(body, webhook[0].secret);

            try {
                const response = await fetch(webhook[0].url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Webhook-Signature": signature,
                        "X-Webhook-Event": "test",
                    },
                    body,
                    signal: AbortSignal.timeout(30000),
                });

                const responseBody = await response.text().catch(() => "");

                await db.insert(webhookDeliveries).values({
                    tenantId: ctx.tenantId,
                    webhookId: input.id,
                    event: "test",
                    payload: body,
                    responseStatus: response.status,
                    responseBody: responseBody.slice(0, 1000),
                    success: response.ok,
                });

                return {
                    success: response.ok,
                    status: response.status,
                };
            } catch (error: any) {
                await db.insert(webhookDeliveries).values({
                    tenantId: ctx.tenantId,
                    webhookId: input.id,
                    event: "test",
                    payload: body,
                    responseStatus: 0,
                    responseBody: error.message,
                    success: false,
                });

                return {
                    success: false,
                    error: error.message,
                };
            }
        }),

    // Get event types
    getEventTypes: permissionProcedure("settings.manage").query(() => {
        return [
            { value: "lead.created", label: "Lead Created", description: "Triggered when a new lead is created" },
            { value: "lead.updated", label: "Lead Updated", description: "Triggered when lead information is updated" },
            { value: "lead.status_changed", label: "Lead Status Changed", description: "Triggered when a lead moves to a different stage" },
            { value: "message.received", label: "Message Received", description: "Triggered when a new message is received" },
            { value: "message.sent", label: "Message Sent", description: "Triggered when a message is sent" },
            { value: "conversation.assigned", label: "Conversation Assigned", description: "Triggered when a conversation is assigned to an agent" },
            { value: "note.created", label: "Note Created", description: "Triggered when a note is added to a lead" },
            { value: "task.created", label: "Task Created", description: "Triggered when a task is created" },
            { value: "task.completed", label: "Task Completed", description: "Triggered when a task is marked complete" },
        ];
    }),
});
