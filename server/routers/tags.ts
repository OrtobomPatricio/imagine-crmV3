import { z } from "zod";
import { eq, and, inArray, sql } from "drizzle-orm";
import { tags, leadTags, conversationTags } from "../../drizzle/schema";
import { getDb } from "../db";
import { permissionProcedure, router } from "../_core/trpc";

export const tagsRouter = router({
    // Tags CRUD
    list: permissionProcedure("leads.view").query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(tags).where(eq(tags.tenantId, ctx.tenantId)).orderBy(tags.name);
    }),

    create: permissionProcedure("settings.manage")
        .input(z.object({
            name: z.string().min(1).max(50),
            color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3b82f6"),
            description: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const result = await db.insert(tags).values({
                tenantId: ctx.tenantId,
                name: input.name,
                color: input.color,
                description: input.description,
            });
            return { id: result[0].insertId, ...input };
        }),

    update: permissionProcedure("settings.manage")
        .input(z.object({
            id: z.number(),
            name: z.string().min(1).max(50).optional(),
            color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
            description: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const { id, ...updates } = input;
            await db.update(tags).set(updates).where(and(eq(tags.tenantId, ctx.tenantId), eq(tags.id, id)));
            return { success: true };
        }),

    delete: permissionProcedure("settings.manage")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");
            await db.delete(tags).where(and(eq(tags.tenantId, ctx.tenantId), eq(tags.id, input.id)));
            return { success: true };
        }),

    // Lead Tags
    getLeadTags: permissionProcedure("leads.view")
        .input(z.object({ leadId: z.number() }))
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) return [];

            return db.select({
                tagId: tags.id,
                name: tags.name,
                color: tags.color,
            })
                .from(leadTags)
                .innerJoin(tags, eq(leadTags.tagId, tags.id))
                .where(and(eq(leadTags.tenantId, ctx.tenantId), eq(leadTags.leadId, input.leadId)));
        }),

    getLeadTagsBatch: permissionProcedure("leads.view")
        .input(z.object({ leadIds: z.array(z.number()) }))
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db || input.leadIds.length === 0) return [];

            return db.select({
                leadId: leadTags.leadId,
                tagId: tags.id,
                name: tags.name,
                color: tags.color,
            })
                .from(leadTags)
                .innerJoin(tags, eq(leadTags.tagId, tags.id))
                .where(and(eq(leadTags.tenantId, ctx.tenantId), inArray(leadTags.leadId, input.leadIds)));
        }),

    addTagToLead: permissionProcedure("leads.edit")
        .input(z.object({ leadId: z.number(), tagId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.insert(leadTags).values({
                tenantId: ctx.tenantId,
                leadId: input.leadId,
                tagId: input.tagId,
            }).onDuplicateKeyUpdate({ set: {} }); // Ignore if exists

            return { success: true };
        }),

    removeTagFromLead: permissionProcedure("leads.edit")
        .input(z.object({ leadId: z.number(), tagId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.delete(leadTags)
                .where(and(
                    eq(leadTags.tenantId, ctx.tenantId),
                    eq(leadTags.leadId, input.leadId),
                    eq(leadTags.tagId, input.tagId)
                ));

            return { success: true };
        }),

    setLeadTags: permissionProcedure("leads.edit")
        .input(z.object({
            leadId: z.number(),
            tagIds: z.array(z.number()),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            // Delete existing
            await db.delete(leadTags).where(and(eq(leadTags.tenantId, ctx.tenantId), eq(leadTags.leadId, input.leadId)));

            // Insert new
            if (input.tagIds.length > 0) {
                await db.insert(leadTags).values(
                    input.tagIds.map(tagId => ({
                        tenantId: ctx.tenantId,
                        leadId: input.leadId,
                        tagId,
                    }))
                );
            }

            return { success: true };
        }),

    // Conversation Tags
    getConversationTags: permissionProcedure("chat.view")
        .input(z.object({ conversationId: z.number() }))
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) return [];

            return db.select({
                tagId: tags.id,
                name: tags.name,
                color: tags.color,
            })
                .from(conversationTags)
                .innerJoin(tags, eq(conversationTags.tagId, tags.id))
                .where(and(eq(conversationTags.tenantId, ctx.tenantId), eq(conversationTags.conversationId, input.conversationId)));
        }),

    addTagToConversation: permissionProcedure("chat.edit")
        .input(z.object({ conversationId: z.number(), tagId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.insert(conversationTags).values({
                tenantId: ctx.tenantId,
                conversationId: input.conversationId,
                tagId: input.tagId,
            }).onDuplicateKeyUpdate({ set: {} });

            return { success: true };
        }),

    removeTagFromConversation: permissionProcedure("chat.edit")
        .input(z.object({ conversationId: z.number(), tagId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.delete(conversationTags)
                .where(and(
                    eq(conversationTags.tenantId, ctx.tenantId),
                    eq(conversationTags.conversationId, input.conversationId),
                    eq(conversationTags.tagId, input.tagId)
                ));

            return { success: true };
        }),

    // Stats
    getStats: permissionProcedure("analytics.view").query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return { totalTags: 0, topTags: [] };

        const totalTags = await db.select({ count: sql<number>`count(*)` }).from(tags).where(eq(tags.tenantId, ctx.tenantId));

        const topTags = await db.select({
            tagId: tags.id,
            name: tags.name,
            color: tags.color,
            leadCount: sql<number>`count(${leadTags.leadId})`,
        })
            .from(tags)
            .leftJoin(leadTags, eq(tags.id, leadTags.tagId))
            .where(eq(tags.tenantId, ctx.tenantId))
            .groupBy(tags.id)
            .orderBy(sql`count(${leadTags.leadId}) desc`)
            .limit(10);

        return {
            totalTags: totalTags[0]?.count || 0,
            topTags,
        };
    }),
});
