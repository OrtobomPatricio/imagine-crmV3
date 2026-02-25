import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { exportUserData } from "../services/gdpr-export";
import { purgeUserData } from "../services/gdpr-delete";

/**
 * GDPR Router
 * Implements endpoints for users to exercise their data rights.
 */

export const gdprRouter = router({
    // Right of Access (Art. 15) & Portability (Art. 20)
    exportMyData: protectedProcedure.query(async ({ ctx }) => {
        const data = await exportUserData(ctx.user!.id, ctx.tenantId);
        return {
            success: true,
            data
        };
    }),

    // Right to Erasure (Art. 17) - Request Deletion
    requestDeletion: protectedProcedure
        .input(z.object({
            confirmEmail: z.string().email(),
            reason: z.string().optional()
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            if (input.confirmEmail !== ctx.user!.email) {
                throw new Error("Email confirmation mismatch");
            }

            // Set retention until 30 days from now (Grace period)
            const retentionDate = new Date();
            retentionDate.setDate(retentionDate.getDate() + 30);

            await db.update(users)
                .set({
                    dataRetentionUntil: retentionDate,
                    isActive: false // Disable account immediately
                })
                .where(and(eq(users.id, ctx.user!.id), eq(users.tenantId, ctx.tenantId)));

            return {
                success: true,
                message: "Cuenta marcada para eliminación definitiva en 30 días.",
                deletionDate: retentionDate.toISOString()
            };
        }),

    // Right to Rectification (Art. 16) - Update profile
    updateMyData: protectedProcedure
        .input(z.object({
            name: z.string().min(2).optional(),
            marketingConsent: z.boolean().optional()
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const updatePayload: any = { ...input };
            if (input.marketingConsent !== undefined) {
                updatePayload.marketingConsentAt = new Date();
            }

            await db.update(users)
                .set(updatePayload)
                .where(and(eq(users.id, ctx.user!.id), eq(users.tenantId, ctx.tenantId)));

            return { success: true };
        }),

    // Right to Restrict Processing (Art. 18) - Freeze account
    restrictProcessing: protectedProcedure
        .input(z.object({ restricted: z.boolean() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.update(users)
                .set({ isActive: !input.restricted })
                .where(and(eq(users.id, ctx.user!.id), eq(users.tenantId, ctx.tenantId)));

            return { success: true };
        }),

    // Right to Object (Art. 21) - Specifically object to marketing
    objectToMarketing: protectedProcedure.mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(users)
            .set({
                marketingConsent: false,
                marketingConsentAt: new Date()
            })
            .where(and(eq(users.id, ctx.user!.id), eq(users.tenantId, ctx.tenantId)));

        return { success: true };
    })
});
