import { z } from "zod";
import { eq, and, desc, asc, sql, gte, lte } from "drizzle-orm";
import { leadNotes, leadTasks, leads, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { permissionProcedure, router } from "../_core/trpc";

export const notesTasksRouter = router({
    // Lead Notes
    listNotes: permissionProcedure("leads.view")
        .input(z.object({ leadId: z.number() }))
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) return [];

            return db.select({
                id: leadNotes.id,
                content: leadNotes.content,
                createdAt: leadNotes.createdAt,
                updatedAt: leadNotes.updatedAt,
                createdBy: {
                    id: users.id,
                    name: users.name,
                },
            })
                .from(leadNotes)
                .leftJoin(users, eq(leadNotes.createdById, users.id))
                .where(and(eq(leadNotes.tenantId, ctx.tenantId), eq(leadNotes.leadId, input.leadId)))
                .orderBy(desc(leadNotes.createdAt));
        }),

    createNote: permissionProcedure("leads.edit")
        .input(z.object({
            leadId: z.number(),
            content: z.string().min(1),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const result = await db.insert(leadNotes).values({
                tenantId: ctx.tenantId,
                leadId: input.leadId,
                content: input.content,
                createdById: ctx.user?.id,
            });

            return { id: result[0].insertId, success: true };
        }),

    updateNote: permissionProcedure("leads.edit")
        .input(z.object({
            id: z.number(),
            content: z.string().min(1),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.update(leadNotes)
                .set({ content: input.content })
                .where(and(eq(leadNotes.tenantId, ctx.tenantId), eq(leadNotes.id, input.id)));

            return { success: true };
        }),

    deleteNote: permissionProcedure("leads.edit")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.delete(leadNotes).where(and(eq(leadNotes.tenantId, ctx.tenantId), eq(leadNotes.id, input.id)));
            return { success: true };
        }),

    // Lead Tasks
    listTasks: permissionProcedure("leads.view")
        .input(z.object({
            leadId: z.number().optional(),
            status: z.enum(["pending", "completed", "cancelled"]).optional(),
            assignedToMe: z.boolean().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) return [];

            let query = db.select({
                id: leadTasks.id,
                leadId: leadTasks.leadId,
                title: leadTasks.title,
                description: leadTasks.description,
                dueDate: leadTasks.dueDate,
                status: leadTasks.status,
                priority: leadTasks.priority,
                completedAt: leadTasks.completedAt,
                createdAt: leadTasks.createdAt,
                assignedTo: {
                    id: users.id,
                    name: users.name,
                },
                lead: {
                    id: leads.id,
                    name: leads.name,
                    phone: leads.phone,
                },
            })
                .from(leadTasks)
                .leftJoin(users, eq(leadTasks.assignedToId, users.id))
                .leftJoin(leads, eq(leadTasks.leadId, leads.id));

            const conditions = [eq(leadTasks.tenantId, ctx.tenantId)];
            if (input.leadId) conditions.push(eq(leadTasks.leadId, input.leadId));
            if (input.status) conditions.push(eq(leadTasks.status, input.status));
            if (input.assignedToMe && ctx.user) {
                conditions.push(eq(leadTasks.assignedToId, ctx.user.id));
            }

            if (conditions.length > 0) {
                query = query.where(and(...conditions)) as any;
            }

            return query.orderBy(asc(leadTasks.dueDate), desc(leadTasks.createdAt));
        }),

    createTask: permissionProcedure("leads.edit")
        .input(z.object({
            leadId: z.number(),
            title: z.string().min(1).max(200),
            description: z.string().optional(),
            dueDate: z.date().optional(),
            priority: z.enum(["low", "medium", "high"]).default("medium"),
            assignedToId: z.number().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const result = await db.insert(leadTasks).values({
                tenantId: ctx.tenantId,
                leadId: input.leadId,
                title: input.title,
                description: input.description,
                dueDate: input.dueDate,
                priority: input.priority,
                assignedToId: input.assignedToId,
                createdById: ctx.user?.id,
            });

            return { id: result[0].insertId, success: true };
        }),

    updateTask: permissionProcedure("leads.edit")
        .input(z.object({
            id: z.number(),
            title: z.string().min(1).max(200).optional(),
            description: z.string().optional(),
            dueDate: z.date().optional(),
            priority: z.enum(["low", "medium", "high"]).optional(),
            assignedToId: z.number().optional(),
            status: z.enum(["pending", "completed", "cancelled"]).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const { id, ...updates } = input;

            if (updates.status === "completed") {
                (updates as any).completedAt = new Date();
            }

            await db.update(leadTasks).set(updates).where(and(eq(leadTasks.tenantId, ctx.tenantId), eq(leadTasks.id, id)));
            return { success: true };
        }),

    deleteTask: permissionProcedure("leads.edit")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.delete(leadTasks).where(and(eq(leadTasks.tenantId, ctx.tenantId), eq(leadTasks.id, input.id)));
            return { success: true };
        }),

    // Dashboard stats
    getTaskStats: permissionProcedure("dashboard.view").query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return { pending: 0, overdue: 0, today: 0, mine: 0 };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [pending, overdue, todayTasks, mine] = await Promise.all([
            db.select({ count: sql<number>`count(*)` })
                .from(leadTasks)
                .where(and(eq(leadTasks.tenantId, ctx.tenantId), eq(leadTasks.status, "pending"))),
            db.select({ count: sql<number>`count(*)` })
                .from(leadTasks)
                .where(and(
                    eq(leadTasks.tenantId, ctx.tenantId),
                    eq(leadTasks.status, "pending"),
                    lte(leadTasks.dueDate, now)
                )),
            db.select({ count: sql<number>`count(*)` })
                .from(leadTasks)
                .where(and(
                    eq(leadTasks.tenantId, ctx.tenantId),
                    eq(leadTasks.status, "pending"),
                    gte(leadTasks.dueDate, today),
                    lte(leadTasks.dueDate, tomorrow)
                )),
            ctx.user ? db.select({ count: sql<number>`count(*)` })
                .from(leadTasks)
                .where(and(
                    eq(leadTasks.tenantId, ctx.tenantId),
                    eq(leadTasks.status, "pending"),
                    eq(leadTasks.assignedToId, ctx.user.id)
                )) : [{ count: 0 }],
        ]);

        return {
            pending: pending[0]?.count || 0,
            overdue: overdue[0]?.count || 0,
            today: todayTasks[0]?.count || 0,
            mine: mine[0]?.count || 0,
        };
    }),
});
