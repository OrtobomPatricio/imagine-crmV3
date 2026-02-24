import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logger } from "../_core/logger";
import crypto from "node:crypto";

/**
 * Stripe Billing Router
 *
 * Manages subscriptions, plan changes, and billing events.
 * Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET env vars.
 *
 * Plans:
 * - free:       5 users, 1 WA number,  1,000 msgs/month
 * - starter:   10 users, 3 WA numbers, 10,000 msgs/month
 * - pro:       50 users, 10 WA numbers, 100,000 msgs/month
 * - enterprise: unlimited
 */

const PLANS = {
    free: {
        name: "Gratis",
        maxUsers: 5,
        maxWaNumbers: 1,
        maxMessages: 1000,
        priceMonthly: 0,
    },
    starter: {
        name: "Starter",
        maxUsers: 10,
        maxWaNumbers: 3,
        maxMessages: 10000,
        priceMonthly: 29,
    },
    pro: {
        name: "Pro",
        maxUsers: 50,
        maxWaNumbers: 10,
        maxMessages: 100000,
        priceMonthly: 99,
    },
    enterprise: {
        name: "Enterprise",
        maxUsers: 9999,
        maxWaNumbers: 50,
        maxMessages: 1000000,
        priceMonthly: 299,
    },
} as const;

export const billingRouter = router({
    /** Get current plan and usage */
    getCurrentPlan: protectedProcedure
        .query(async ({ ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            const [tenant] = await db.select()
                .from(tenants)
                .where(eq(tenants.id, ctx.tenantId))
                .limit(1);

            const currentPlan = ((tenant as any)?.plan as keyof typeof PLANS) || "free";
            const planInfo = PLANS[currentPlan] ?? PLANS.free;

            return {
                plan: currentPlan,
                planInfo,
                allPlans: PLANS,
            };
        }),

    /** Create a checkout session for plan upgrade */
    createCheckoutSession: protectedProcedure
        .input(z.object({
            plan: z.enum(["starter", "pro", "enterprise"]),
        }))
        .mutation(async ({ input, ctx }) => {
            const stripeKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeKey) {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "Stripe no está configurado. Contacta al administrador.",
                });
            }

            try {
                const stripe = (await import("stripe")).default;
                const client = new stripe(stripeKey);

                // In production, use real Stripe Price IDs from env vars
                const priceId = process.env[`STRIPE_PRICE_${input.plan.toUpperCase()}`];
                if (!priceId) {
                    throw new TRPCError({
                        code: "PRECONDITION_FAILED",
                        message: `Precio de Stripe no configurado para plan: ${input.plan}`,
                    });
                }

                const session = await client.checkout.sessions.create({
                    mode: "subscription",
                    payment_method_types: ["card"],
                    line_items: [{ price: priceId, quantity: 1 }],
                    success_url: `${process.env.APP_URL}/settings/billing?success=true`,
                    cancel_url: `${process.env.APP_URL}/settings/billing?cancelled=true`,
                    metadata: {
                        tenantId: String(ctx.tenantId),
                        plan: input.plan,
                    },
                });

                logger.info(
                    { tenantId: ctx.tenantId, plan: input.plan, sessionId: session.id },
                    "[Billing] Checkout session created"
                );

                return { url: session.url };
            } catch (err: any) {
                logger.error({ err }, "[Billing] Failed to create checkout session");
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al crear sesión de pago",
                });
            }
        }),

    /** Get billing portal URL */
    getBillingPortal: protectedProcedure
        .mutation(async ({ ctx }) => {
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
                    message: "No hay suscripción activa.",
                });
            }

            try {
                const stripe = (await import("stripe")).default;
                const client = new stripe(stripeKey);

                const portal = await client.billingPortal.sessions.create({
                    customer: customerId,
                    return_url: `${process.env.APP_URL}/settings/billing`,
                });

                return { url: portal.url };
            } catch (err: any) {
                logger.error({ err }, "[Billing] Failed to create portal session");
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
            }
        }),
});
