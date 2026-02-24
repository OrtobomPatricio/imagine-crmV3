import { z } from "zod";
import { appSettings, facebookPages } from "../../drizzle/schema";
import { getDb } from "../db";
import { permissionProcedure, router } from "../_core/trpc";
import { encryptSecret } from "../_core/crypto";
import { eq, desc, and } from "drizzle-orm";

export const facebookRouter = router({
    listPages: permissionProcedure("settings.view").query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(facebookPages)
            .where(eq(facebookPages.tenantId, ctx.tenantId))
            .orderBy(desc(facebookPages.createdAt));
    }),

    connectPage: permissionProcedure("settings.manage")
        .input(z.object({
            pageId: z.string(),
            name: z.string(),
            accessToken: z.string(),
            pictureUrl: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const existing = await db.select().from(facebookPages)
                .where(and(eq(facebookPages.tenantId, ctx.tenantId), eq(facebookPages.pageId, input.pageId)))
                .limit(1);

            if (existing[0]) {
                await db.update(facebookPages).set({
                    name: input.name,
                    accessToken: encryptSecret(input.accessToken),
                    pictureUrl: input.pictureUrl,
                    isConnected: true,
                    updatedAt: new Date(),
                }).where(and(eq(facebookPages.tenantId, ctx.tenantId), eq(facebookPages.id, existing[0].id)));
            } else {
                await db.insert(facebookPages).values({
                    tenantId: ctx.tenantId,
                    pageId: input.pageId,
                    name: input.name,
                    accessToken: encryptSecret(input.accessToken),
                    pictureUrl: input.pictureUrl,
                    isConnected: true,
                });
            }
            return { success: true };
        }),

    disconnectPage: permissionProcedure("settings.manage")
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.update(facebookPages)
                .set({ isConnected: false, accessToken: null })
                .where(and(eq(facebookPages.tenantId, ctx.tenantId), eq(facebookPages.id, input.id)));
            return { success: true };
        }),
});
