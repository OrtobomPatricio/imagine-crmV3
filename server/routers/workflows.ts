import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { workflows } from "../../drizzle/schema";
import { getDb } from "../db";
import { permissionProcedure, router } from "../_core/trpc";

export const workflowsRouter = router({
    list: permissionProcedure("campaigns.view").query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(workflows).where(eq(workflows.tenantId, ctx.tenantId)).orderBy(desc(workflows.createdAt));
    }),

    get: permissionProcedure("campaigns.view")
        .input(z.object({ id: z.number() }))
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");
            const result = await db.select().from(workflows).where(and(eq(workflows.tenantId, ctx.tenantId), eq(workflows.id, input.id))).limit(1);
            if (!result[0]) throw new Error("Workflow not found");
            return result[0];
        }),

    create: permissionProcedure("campaigns.manage")
        .input(z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            triggerType: z.enum(["lead_created", "lead_updated", "msg_received", "campaign_link_clicked"]),
            triggerConfig: z.any().optional(),
            actions: z.array(z.any()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const result = await db.insert(workflows).values({
                tenantId: ctx.tenantId,
                ...input,
                isActive: true
            });
            return { success: true, id: result[0].insertId };
        }),

    update: permissionProcedure("campaigns.manage")
        .input(z.object({
            id: z.number(),
            name: z.string().optional(),
            description: z.string().optional(),
            triggerType: z.enum(["lead_created", "lead_updated", "msg_received", "campaign_link_clicked"]).optional(),
            triggerConfig: z.any().optional(),
            actions: z.array(z.any()).optional(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("DB error");

            await db.update(workflows).set(input).where(and(eq(workflows.tenantId, ctx.tenantId), eq(workflows.id, input.id)));
            return { success: true };
        }),

    toggle: permissionProcedure("campaigns.manage")
        .input(z.object({ id: z.number(), isActive: z.boolean() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");
            await db.update(workflows).set({ isActive: input.isActive }).where(and(eq(workflows.tenantId, ctx.tenantId), eq(workflows.id, input.id)));
            return { success: true };
        }),

    delete: permissionProcedure("campaigns.manage")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");
            await db.delete(workflows).where(and(eq(workflows.tenantId, ctx.tenantId), eq(workflows.id, input.id)));
            return { success: true };
        }),
});
