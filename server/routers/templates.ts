import { z } from "zod";
import { eq, desc, and, or, like } from "drizzle-orm";
import { templates } from "../../drizzle/schema";
import { getDb } from "../db";
import { permissionProcedure, router } from "../_core/trpc";

export const templatesRouter = router({
    list: permissionProcedure("campaigns.view").query(async () => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(templates).orderBy(desc(templates.createdAt));
    }),

    // Chat-friendly list: WhatsApp templates available to agents in the composer
    quickList: permissionProcedure("chat.send")
        .input(z.object({ search: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) return [];
            const q = input?.search?.trim();

            if (q) {
                const needle = `%${q}%`;
                return db
                    .select()
                    .from(templates)
                    .where(and(eq(templates.type, "whatsapp"), or(like(templates.name, needle), like(templates.content, needle))))
                    .orderBy(desc(templates.createdAt));
            }

            return db
                .select()
                .from(templates)
                .where(eq(templates.type, "whatsapp"))
                .orderBy(desc(templates.createdAt));
        }),


    create: permissionProcedure("campaigns.manage")
        .input(z.object({
            name: z.string().min(1),
            content: z.string().min(1),
            type: z.enum(["whatsapp", "email"]),
            variables: z.array(z.string()).optional(),
            attachments: z.array(z.object({
                url: z.string(),
                name: z.string(),
                type: z.string()
            })).optional(),
        }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");
            await db.insert(templates).values(input);
            return { success: true };
        }),

    update: permissionProcedure("campaigns.manage")
        .input(z.object({
            id: z.number(),
            name: z.string().optional(),
            content: z.string().optional(),
            variables: z.array(z.string()).optional(),
            attachments: z.array(z.object({
                url: z.string(),
                name: z.string(),
                type: z.string()
            })).optional(),
        }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");
            await db.update(templates).set(input).where(eq(templates.id, input.id));
            return { success: true };
        }),

    delete: permissionProcedure("campaigns.manage")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("DB error");
            await db.delete(templates).where(eq(templates.id, input.id));
            return { success: true };
        }),
});
