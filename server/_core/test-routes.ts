import type { Express, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  whatsappNumbers,
  whatsappConnections,
  supportQueues,
  conversations,
  chatMessages,
} from "../../drizzle/schema";
import { requireAuthMiddleware } from "./middleware/auth";
import { logger, safeError } from "./logger";
import { normalizeContactPhone } from "./phone";
import { processMetaWebhookPayload } from "../whatsapp/webhook";

function isEnabled() {
  const isProd = process.env.NODE_ENV === "production";
  return !isProd && process.env.ENABLE_TEST_ROUTES === "1";
}

export function registerTestRoutes(app: Express) {
  if (!isEnabled()) return;

  // --- Seed minimal data for e2e ---
  app.post("/api/test/seed", requireAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });

      // 1) Ensure WhatsApp Number exists
      const body = (req.body ?? {}) as any;
      const phoneNumber = String(body.phoneNumber ?? "595900000000").replace(/\D/g, "");
      const displayName = body.displayName ? String(body.displayName) : "E2E Channel";
      const phoneNumberId = body.phoneNumberId ? String(body.phoneNumberId) : `e2e-phone-number-id-${phoneNumber}`;
      const existingNum = await db
        .select()
        .from(whatsappNumbers)
        .where(eq(whatsappNumbers.phoneNumber, phoneNumber))
        .limit(1);

      let whatsappNumberId = existingNum[0]?.id;
      if (!whatsappNumberId) {
        const ins = await db.insert(whatsappNumbers).values({
          phoneNumber,
          displayName,
          country: "Paraguay",
          countryCode: "PY",
          status: "active",
          isConnected: false,
        });
        whatsappNumberId = ins[0].insertId as number;
      }

      // 2) Ensure WhatsApp Connection exists (QR by default, not connected)
      const existingConn = await db
        .select()
        .from(whatsappConnections)
        .where(eq(whatsappConnections.whatsappNumberId, whatsappNumberId))
        .limit(1);

      if (existingConn[0]) {
        await db
          .update(whatsappConnections)
          .set({ connectionType: "api", isConnected: true, phoneNumberId })
          .where(eq(whatsappConnections.whatsappNumberId, whatsappNumberId));
      } else {
        await db.insert(whatsappConnections).values({
          whatsappNumberId,
          connectionType: "api",
          isConnected: true,
          phoneNumberId,
        });
      }

      // 3) Ensure at least one queue exists
      const q = await db.select().from(supportQueues).limit(1);
      let queueId = q[0]?.id;
      if (!queueId) {
        const ins = await db.insert(supportQueues).values({
          name: "Default",
          color: "#22c55e",
          greetingMessage: "Hola 👋 ¿En qué puedo ayudarte?",
        });
        queueId = ins[0].insertId as number;
      }

      return res.json({ ok: true, whatsappNumberId, phoneNumberId, queueId });
    } catch (e) {
      logger.error({ err: safeError(e) }, "test seed failed");
      return res.status(500).json({ error: "seed_failed" });
    }
  });

  // --- Insert a conversation + inbound message without external webhooks ---
  app.post("/api/test/mock-inbound-message", requireAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });

      const body = (req.body ?? {}) as any;
      const whatsappNumberId = Number(body.whatsappNumberId ?? 0) || undefined;
      const queueId = Number(body.queueId ?? 0) || undefined;

      const contactPhoneRaw = String(body.contactPhone ?? "595971000000");
      const contactPhone = normalizeContactPhone(contactPhoneRaw);
      const contactName = body.contactName ? String(body.contactName) : "E2E Lead";
      const text = body.text ? String(body.text) : "hola (mock inbound)";
      const ticketStatus = (body.ticketStatus as any) ?? "pending";

      // Find existing conversation
      const existing = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.contactPhone, contactPhone),
            whatsappNumberId ? eq(conversations.whatsappNumberId, whatsappNumberId) : eq(conversations.channel, "whatsapp")
          )
        )
        .limit(1);

      let conversationId = existing[0]?.id as number | undefined;
      if (!conversationId) {
        const ins = await db.insert(conversations).values({
          channel: "whatsapp",
          whatsappNumberId: whatsappNumberId ?? null,
          whatsappConnectionType: "qr",
          contactPhone,
          contactName,
          ticketStatus,
          queueId: queueId ?? null,
          status: "active",
          unreadCount: 1,
          lastMessageAt: new Date(),
        } as any);
        conversationId = ins[0].insertId as number;
      } else {
        await db
          .update(conversations)
          .set({ lastMessageAt: new Date(), unreadCount: 1 })
          .where(eq(conversations.id, conversationId));
      }

      await db.insert(chatMessages).values({
        conversationId,
        whatsappNumberId: whatsappNumberId ?? null,
        whatsappConnectionType: "qr",
        direction: "inbound",
        messageType: "text",
        content: text,
        status: "delivered",
        deliveredAt: new Date(),
      } as any);

      return res.json({ ok: true, conversationId, contactPhone });
    } catch (e) {
      logger.error({ err: safeError(e) }, "mock inbound failed");
      return res.status(500).json({ error: "mock_inbound_failed" });
    }
  });

  // --- Call the same webhook processor with a mock payload (no signature) ---
  app.post("/api/test/mock-meta-webhook", requireAuthMiddleware, async (req: Request, res: Response) => {
    try {
      await processMetaWebhookPayload(req.body, { skipSignature: true });
      return res.json({ ok: true });
    } catch (e) {
      logger.error({ err: safeError(e) }, "mock meta webhook failed");
      return res.status(500).json({ error: "mock_webhook_failed" });
    }
  });

  // Alias for older test naming used by Playwright
  app.post("/api/test/mock-webhook-meta", requireAuthMiddleware, async (req: Request, res: Response) => {
    try {
      await processMetaWebhookPayload(req.body, { skipSignature: true });
      return res.json({ ok: true });
    } catch (e) {
      logger.error({ err: safeError(e) }, "mock meta webhook failed");
      return res.status(500).json({ error: "mock_webhook_failed" });
    }
  });

  logger.warn("[test-routes] ENABLE_TEST_ROUTES=1: test endpoints are enabled");
}
