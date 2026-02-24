import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logger } from "../_core/logger";

/**
 * Free Trial & Proration Service
 *
 * - 14-day free trial on Pro plan for new tenants
 * - Proration on mid-cycle plan changes via Stripe
 * - Churn survey data collection on cancellation
 */

export const trialRouter = router({
    /** Start a 14-day free trial */
    startFreeTrial: protectedProcedure
        .mutation(async ({ ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            const [tenant] = await db.select().from(tenants)
                .where(eq(tenants.id, ctx.tenantId)).limit(1);

            const currentPlan = (tenant as any)?.plan;
            if (currentPlan && currentPlan !== "free") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Ya tienes un plan activo. No puedes iniciar un trial.",
                });
            }

            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 14);

            await db.update(tenants).set({
                plan: "pro",
                trialEndsAt: trialEnd,
            } as any).where(eq(tenants.id, ctx.tenantId));

            logger.info({ tenantId: ctx.tenantId, trialEnd }, "[Trial] 14-day free trial started");

            return {
                success: true,
                plan: "pro",
                trialEndsAt: trialEnd.toISOString(),
                message: "¡Tu trial de 14 días ha comenzado! Disfruta todas las funciones Pro.",
            };
        }),

    /** Check trial status */
    getTrialStatus: protectedProcedure
        .query(async ({ ctx }) => {
            const db = await getDb();
            if (!db) return null;

            const [tenant] = await db.select().from(tenants)
                .where(eq(tenants.id, ctx.tenantId)).limit(1);

            const trialEnd = (tenant as any)?.trialEndsAt as Date | null;
            if (!trialEnd) {
                return { onTrial: false, daysRemaining: 0 };
            }

            const now = new Date();
            const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

            return {
                onTrial: daysRemaining > 0,
                daysRemaining,
                trialEndsAt: trialEnd.toISOString(),
                expired: daysRemaining === 0,
            };
        }),

    /** Submit churn survey on cancellation */
    submitChurnSurvey: protectedProcedure
        .input(z.object({
            reason: z.enum([
                "too_expensive",
                "missing_features",
                "switched_competitor",
                "not_using",
                "bad_experience",
                "temporary",
                "other",
            ]),
            feedback: z.string().max(500).optional(),
            wouldRecommend: z.number().min(0).max(10).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            logger.info(
                { tenantId: ctx.tenantId, userId: ctx.user!.id, ...input },
                "[Churn] Survey submitted"
            );

            // In production, save to a churn_surveys table or analytics
            return {
                success: true,
                message: "Gracias por tu feedback. Lo usaremos para mejorar.",
            };
        }),

    /** Prorate plan change (Stripe handles this) */
    changePlan: protectedProcedure
        .input(z.object({
            newPlan: z.enum(["starter", "pro", "enterprise"]),
        }))
        .mutation(async ({ input, ctx }) => {
            const stripeKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeKey) {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "Stripe no está configurado.",
                });
            }

            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            const [tenant] = await db.select().from(tenants)
                .where(eq(tenants.id, ctx.tenantId)).limit(1);

            const customerId = (tenant as any)?.stripeCustomerId;
            if (!customerId) {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "No hay suscripción activa para prorratear.",
                });
            }

            try {
                const stripe = (await import("stripe")).default;
                const client = new stripe(stripeKey);

                // Get current subscription
                const subscriptions = await client.subscriptions.list({
                    customer: customerId,
                    status: "active",
                    limit: 1,
                });

                const sub = subscriptions.data[0];
                if (!sub) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "No se encontró suscripción activa.",
                    });
                }

                const newPriceId = process.env[`STRIPE_PRICE_${input.newPlan.toUpperCase()}`];
                if (!newPriceId) {
                    throw new TRPCError({
                        code: "PRECONDITION_FAILED",
                        message: `Precio no configurado para plan: ${input.newPlan}`,
                    });
                }

                // Update subscription with proration
                await client.subscriptions.update(sub.id, {
                    items: [{
                        id: sub.items.data[0].id,
                        price: newPriceId,
                    }],
                    proration_behavior: "create_prorations",
                });

                // Update local DB
                await db.update(tenants).set({
                    plan: input.newPlan,
                } as any).where(eq(tenants.id, ctx.tenantId));

                logger.info(
                    { tenantId: ctx.tenantId, newPlan: input.newPlan },
                    "[Billing] Plan changed with proration"
                );

                return { success: true, plan: input.newPlan };
            } catch (err: any) {
                logger.error({ err }, "[Billing] Proration failed");
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al cambiar de plan",
                });
            }
        }),
});
