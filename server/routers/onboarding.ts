import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
    getOrCreateOnboardingProgress,
    updateOnboardingStep,
    finalizeOnboarding
} from "../services/onboarding-tracking";
import { createDemoData } from "../services/onboarding-demo";
import { getDb } from "../db";
import { tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Onboarding Router
 * Handles state persistence for the multi-step setup wizard.
 */

export const onboardingRouter = router({
    // 1. Get current progress
    getProgress: protectedProcedure
        .query(async ({ ctx }) => {
            return await getOrCreateOnboardingProgress(ctx.tenantId);
        }),

    // 2. Save progress for a specific step
    saveStep: protectedProcedure
        .input(z.object({
            step: z.enum(['company', 'team', 'whatsapp', 'import', 'first-message']),
            data: z.any().optional(),
            completed: z.boolean()
        }))
        .mutation(async ({ input, ctx }) => {
            return await updateOnboardingStep(
                ctx.tenantId,
                input.step,
                input.data,
                input.completed
            );
        }),

    // 3. Skip an optional step
    skipStep: protectedProcedure
        .input(z.object({
            step: z.enum(['team', 'import', 'first-message'])
        }))
        .mutation(async ({ input, ctx }) => {
            return await updateOnboardingStep(
                ctx.tenantId,
                input.step,
                null,
                true // Mark as completed even if skipped
            );
        }),

    // 4. Update Company Info (Step 1)
    updateCompany: protectedProcedure
        .input(z.object({
            name: z.string().min(2),
            timezone: z.string(),
            language: z.string(),
            currency: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            // Update tenant directly as well
            try {
                await db.update(tenants)
                    .set({
                        name: input.name,
                        // Note: If tenants table had timezone/lang/etc, update them here
                    } as any)
                    .where(eq(tenants.id, ctx.tenantId));
            } catch (error) {
                console.warn("[MockDB] Warning: Could not update tenant name in mock DB");
            }

            return await updateOnboardingStep(
                ctx.tenantId,
                "company",
                input,
                true
            );
        }),

    // 5. Finalize Onboarding
    complete: protectedProcedure
        .mutation(async ({ ctx }) => {
            // Seed demo data first
            await createDemoData(ctx.tenantId, ctx.user!.id);

            // Mark as finished
            return await finalizeOnboarding(ctx.tenantId);
        }),
});
