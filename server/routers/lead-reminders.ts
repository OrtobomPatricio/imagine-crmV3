import { z } from "zod";
import { eq, desc, and, gte, lte, inArray } from "drizzle-orm";
import { leadReminders } from "../../drizzle/schema";
import { getDb } from "../db";
import { permissionProcedure, router } from "../_core/trpc";

// Button schema
const buttonSchema = z.object({
    id: z.string(),
    text: z.string().max(20),
});

export const leadRemindersRouter = router({
    // List reminders for a lead
    listByLead: permissionProcedure("leads.view")
        .input(z.object({ leadId: z.number() }))
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) return [];

            return db
                .select()
                .from(leadReminders)
                .where(and(eq(leadReminders.tenantId, ctx.tenantId), eq(leadReminders.leadId, input.leadId)))
                .orderBy(desc(leadReminders.scheduledAt));
        }),

    // Get single reminder
    getById: permissionProcedure("leads.view")
        .input(z.object({ id: z.number() }))
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) return null;

            const rows = await db
                .select()
                .from(leadReminders)
                .where(and(eq(leadReminders.tenantId, ctx.tenantId), eq(leadReminders.id, input.id)))
                .limit(1);

            return rows[0] || null;
        }),

    // Create new reminder
    create: permissionProcedure("leads.edit")
        .input(z.object({
            leadId: z.number(),
            conversationId: z.number().optional(),
            scheduledAt: z.string().datetime(), // ISO string
            timezone: z.string().default("America/Asuncion"),
            message: z.string().min(1).max(4000),
            messageType: z.enum(["text", "image", "document", "template"]).default("text"),
            mediaUrl: z.string().optional(),
            mediaName: z.string().optional(),
            buttons: z.array(buttonSchema).max(3).optional(), // Max 3 buttons for WhatsApp
            isRecurring: z.boolean().default(false),
            recurrencePattern: z.enum(["daily", "weekly", "monthly"]).optional(),
            recurrenceEndDate: z.string().datetime().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const scheduledDate = new Date(input.scheduledAt);

            // Validate scheduled date is in the future
            if (scheduledDate <= new Date()) {
                throw new Error("La fecha de recordatorio debe ser en el futuro");
            }

            // Validate recurring settings
            if (input.isRecurring && !input.recurrencePattern) {
                throw new Error("Debe especificar el patrón de recurrencia");
            }

            const result = await db.insert(leadReminders).values({
                tenantId: ctx.tenantId,
                leadId: input.leadId,
                conversationId: input.conversationId || null,
                createdById: ctx.user!.id,
                scheduledAt: scheduledDate,
                timezone: input.timezone,
                message: input.message,
                messageType: input.messageType,
                mediaUrl: input.mediaUrl || null,
                mediaName: input.mediaName || null,
                buttons: input.buttons || null,
                isRecurring: input.isRecurring,
                recurrencePattern: input.recurrencePattern || null,
                recurrenceEndDate: input.recurrenceEndDate ? new Date(input.recurrenceEndDate) : null,
                status: "scheduled",
            });

            const reminderId = result[0].insertId;

            // If recurring, create next instance
            if (input.isRecurring && input.recurrencePattern) {
                // The worker will handle creating subsequent instances
            }

            return { id: reminderId, success: true };
        }),

    // Update reminder (only if not sent)
    update: permissionProcedure("leads.edit")
        .input(z.object({
            id: z.number(),
            scheduledAt: z.string().datetime().optional(),
            timezone: z.string().optional(),
            message: z.string().min(1).max(4000).optional(),
            messageType: z.enum(["text", "image", "document", "template"]).optional(),
            mediaUrl: z.string().optional(),
            mediaName: z.string().optional(),
            buttons: z.array(buttonSchema).max(3).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            // Check if reminder exists and is not sent
            const existing = await db
                .select({ status: leadReminders.status })
                .from(leadReminders)
                .where(and(eq(leadReminders.tenantId, ctx.tenantId), eq(leadReminders.id, input.id)))
                .limit(1);

            if (!existing[0]) {
                throw new Error("Recordatorio no encontrado");
            }

            if (existing[0].status !== "scheduled") {
                throw new Error("No se puede editar un recordatorio que ya fue enviado o cancelado");
            }

            const updates: any = {};
            if (input.scheduledAt) updates.scheduledAt = new Date(input.scheduledAt);
            if (input.timezone) updates.timezone = input.timezone;
            if (input.message) updates.message = input.message;
            if (input.messageType) updates.messageType = input.messageType;
            if (input.mediaUrl !== undefined) updates.mediaUrl = input.mediaUrl;
            if (input.mediaName !== undefined) updates.mediaName = input.mediaName;
            if (input.buttons !== undefined) updates.buttons = input.buttons;

            await db
                .update(leadReminders)
                .set(updates)
                .where(and(eq(leadReminders.tenantId, ctx.tenantId), eq(leadReminders.id, input.id)));

            return { success: true };
        }),

    // Cancel reminder
    cancel: permissionProcedure("leads.edit")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const existing = await db
                .select({ status: leadReminders.status })
                .from(leadReminders)
                .where(and(eq(leadReminders.tenantId, ctx.tenantId), eq(leadReminders.id, input.id)))
                .limit(1);

            if (!existing[0]) {
                throw new Error("Recordatorio no encontrado");
            }

            if (existing[0].status === "sent") {
                throw new Error("No se puede cancelar un recordatorio que ya fue enviado");
            }

            await db
                .update(leadReminders)
                .set({ status: "cancelled" })
                .where(and(eq(leadReminders.tenantId, ctx.tenantId), eq(leadReminders.id, input.id)));

            return { success: true };
        }),

    // Delete reminder
    delete: permissionProcedure("leads.edit")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db
                .delete(leadReminders)
                .where(and(eq(leadReminders.tenantId, ctx.tenantId), eq(leadReminders.id, input.id)));

            return { success: true };
        }),

    // Get upcoming reminders (for dashboard/notification)
    getUpcoming: permissionProcedure("leads.view")
        .input(z.object({
            hours: z.number().default(24),
            leadId: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) return [];

            const now = new Date();
            const future = new Date(now.getTime() + input.hours * 60 * 60 * 1000);

            let whereClause = and(
                eq(leadReminders.tenantId, ctx.tenantId),
                eq(leadReminders.status, "scheduled"),
                gte(leadReminders.scheduledAt, now),
                lte(leadReminders.scheduledAt, future)
            );

            if (input.leadId) {
                whereClause = and(whereClause, eq(leadReminders.leadId, input.leadId));
            }

            return db
                .select()
                .from(leadReminders)
                .where(whereClause)
                .orderBy(leadReminders.scheduledAt);
        }),

    // Record button response from lead
    recordResponse: permissionProcedure("leads.edit")
        .input(z.object({
            reminderId: z.number(),
            buttonId: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db
                .update(leadReminders)
                .set({
                    response: input.buttonId,
                    respondedAt: new Date(),
                })
                .where(and(eq(leadReminders.tenantId, ctx.tenantId), eq(leadReminders.id, input.reminderId)));

            return { success: true };
        }),
});
