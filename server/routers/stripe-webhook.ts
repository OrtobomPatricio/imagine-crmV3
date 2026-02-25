import type { Express, Request, Response } from "express";
import crypto from "node:crypto";
import { getDb } from "../db";
import { tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { logger } from "../_core/logger";

/**
 * Stripe Webhook Handler
 *
 * Processes Stripe billing events:
 * - checkout.session.completed → Update tenant plan
 * - customer.subscription.updated → Plan changes
 * - customer.subscription.deleted → Downgrade to free
 * - invoice.payment_failed → Notify admin
 *
 * Requires STRIPE_WEBHOOK_SECRET env var.
 */

export function registerStripeWebhookRoutes(app: Express): void {
    app.post("/api/webhooks/stripe", async (req: Request, res: Response) => {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            logger.warn("[StripeWebhook] STRIPE_WEBHOOK_SECRET not set, ignoring");
            return res.sendStatus(400);
        }

        const sig = req.headers["stripe-signature"] as string;
        const rawBody = (req as any).rawBody as Buffer | undefined;

        if (!sig || !rawBody) {
            return res.status(400).send("Missing signature or body");
        }

        // Verify signature
        try {
            const stripe = (await import("stripe")).default;
            const client = new stripe(process.env.STRIPE_SECRET_KEY!);
            const event = client.webhooks.constructEvent(rawBody, sig, webhookSecret);

            const db = await getDb();
            if (!db) return res.sendStatus(500);

            switch (event.type) {
                case "checkout.session.completed": {
                    const session = event.data.object as any;
                    const tenantId = Number(session.metadata?.tenantId);
                    const plan = session.metadata?.plan;
                    const customerId = session.customer as string;

                    if (tenantId && plan) {
                        await db.update(tenants).set({
                            plan,
                            stripeCustomerId: customerId,
                        } as any).where(eq(tenants.id, tenantId));

                        logger.info({ tenantId, plan, customerId }, "[StripeWebhook] Plan upgraded");
                    }
                    break;
                }

                case "customer.subscription.updated": {
                    const sub = event.data.object as any;
                    const customerId = sub.customer as string;
                    const status = sub.status;

                    logger.info({ customerId, status }, "[StripeWebhook] Subscription updated");

                    if (status === "active" || status === "trialing") {
                        // Subscription is good
                    } else if (status === "past_due" || status === "unpaid") {
                        logger.warn({ customerId }, "[StripeWebhook] Payment past due");
                    }
                    break;
                }

                case "customer.subscription.deleted": {
                    const sub = event.data.object as any;
                    const customerId = sub.customer as string;

                    // Downgrade to free
                    await db.update(tenants).set({
                        plan: "free",
                    } as any).where(eq((tenants as any).stripeCustomerId, customerId));

                    logger.warn({ customerId }, "[StripeWebhook] Subscription cancelled, downgrading to free");
                    break;
                }

                case "invoice.payment_failed": {
                    const invoice = event.data.object as any;
                    const customerId = invoice.customer as string;

                    // Hard block for unpaid subscriptions
                    await db.update(tenants).set({
                        status: "suspended",
                    } as any).where(eq((tenants as any).stripeCustomerId, customerId));

                    logger.error({
                        customerId,
                        amount: invoice.amount_due,
                    }, "[StripeWebhook] Payment failed, tenant suspended");
                    break;
                }

                case "invoice.paid":
                case "invoice.payment_succeeded": {
                    const invoice = event.data.object as any;
                    const customerId = invoice.customer as string;

                    await db.update(tenants).set({
                        status: "active",
                    } as any).where(eq((tenants as any).stripeCustomerId, customerId));

                    logger.info({
                        customerId,
                    }, "[StripeWebhook] Payment succeeded, tenant restored");
                    break;
                }

                default:
                    logger.debug({ type: event.type }, "[StripeWebhook] Unhandled event");
            }

            res.json({ received: true });

        } catch (err: any) {
            logger.error({ err }, "[StripeWebhook] Verification failed");
            res.status(400).send(`Webhook error: ${err.message}`);
        }
    });

    logger.info("[StripeWebhook] Registered at /api/webhooks/stripe");
}
