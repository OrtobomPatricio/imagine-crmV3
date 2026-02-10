import type { Express, Request, Response } from "express";
import crypto from "crypto";
import axios from "axios";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { chatMessages, conversations, whatsappConnections } from "../../drizzle/schema";
import { normalizeContactPhone } from "../_core/phone";
import { logger, safeError } from "../_core/logger";
import { decryptSecret } from "../_core/crypto";
import { saveBufferToUploads } from "../_core/media-storage";

function verifySignature(rawBody: Buffer, signature: string, appSecret: string): boolean {
  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  return signature === `sha256=${expected}`;
}

async function downloadWhatsAppMedia(mediaId: string, accessToken: string): Promise<{ url: string; mimeType?: string; filename?: string } | null> {
  try {
    const graphUrl = `https://graph.facebook.com/v19.0/${mediaId}`;
    const { data } = await axios.get(graphUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 15000,
    });

    const url = data?.url as string | undefined;
    if (!url) return null;

    return {
      url,
      mimeType: data?.mime_type,
      filename: data?.filename,
    };
  } catch (e) {
    logger.warn({ err: safeError(e), mediaId }, "whatsapp media fetch failed");
    return null;
  }

}


async function downloadWhatsAppMediaBinary(mediaId: string, accessToken: string): Promise<{ buffer: Buffer; mimeType?: string; filename?: string } | null> {
  const meta = await downloadWhatsAppMedia(mediaId, accessToken);
  if (!meta?.url) return null;

  try {
    const resp = await axios.get(meta.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: "arraybuffer",
      timeout: 30000,
    });

    const mimeType = meta.mimeType || (resp.headers?.["content-type"] as string | undefined);
    const buffer = Buffer.from(resp.data);
    return { buffer, mimeType, filename: meta.filename };
  } catch (e) {
    logger.warn({ err: safeError(e), mediaId }, "whatsapp media download failed");
    return null;
  }
}

/**
 * Processes the WhatsApp Cloud API webhook payload (Meta) and upserts:
 * - conversations
 * - chat_messages (inbound)
 * - message statuses
 *
 * IMPORTANT:
 * - No signature verification here. The HTTP route does it.
 * - No full payload logging (to avoid leaking PII in production logs).
 */
export async function processMetaWebhookPayload(payload: any, _opts: { skipSignature?: boolean } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!payload || payload.object !== "whatsapp_business_account") {
    return;
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = change?.value;
      if (!value) continue;

      // --- Status updates ---
      if (value.statuses && Array.isArray(value.statuses)) {
        for (const status of value.statuses) {
          const messageId = status?.id as string | undefined;
          const statusValue = status?.status as string | undefined;
          if (!messageId || !statusValue) continue;

          try {
            if (statusValue === "sent") {
              await db
                .update(chatMessages)
                .set({ status: "sent", sentAt: new Date() } as any)
                .where(eq(chatMessages.whatsappMessageId, messageId));
            } else if (statusValue === "delivered") {
              await db
                .update(chatMessages)
                .set({ status: "delivered", deliveredAt: new Date() } as any)
                .where(eq(chatMessages.whatsappMessageId, messageId));
            } else if (statusValue === "read") {
              await db
                .update(chatMessages)
                .set({ status: "read", readAt: new Date() } as any)
                .where(eq(chatMessages.whatsappMessageId, messageId));
            } else if (statusValue === "failed") {
              await db
                .update(chatMessages)
                .set({ status: "failed", failedAt: new Date(), errorMessage: status?.errors?.[0]?.title ?? "Failed" } as any)
                .where(eq(chatMessages.whatsappMessageId, messageId));
            }
          } catch (e) {
            logger.error({ err: safeError(e), messageId, status: statusValue }, "failed to update message status");
          }
        }
      }

      // --- New inbound messages ---
      const msgs = Array.isArray(value.messages) ? value.messages : [];
      if (msgs.length === 0) continue;

      const phoneNumberId = value?.metadata?.phone_number_id as string | undefined;
      if (!phoneNumberId) {
        logger.warn("webhook message missing metadata.phone_number_id");
        continue;
      }

      // Find WhatsApp connection by phoneNumberId
      const conn = await db
        .select()
        .from(whatsappConnections)
        .where(and(eq(whatsappConnections.phoneNumberId, phoneNumberId), eq(whatsappConnections.connectionType, "api")))
        .limit(1);

      if (!conn[0] || !conn[0].whatsappNumberId) {
        logger.warn({ phoneNumberId }, "no whatsapp connection found for phone_number_id");
        continue;
      }

      const whatsappNumberId = conn[0].whatsappNumberId;
      const accessToken = decryptSecret(conn[0].accessToken) || "";

      // Contact info (Meta includes contacts array for most message events)
      const contact = (Array.isArray(value.contacts) ? value.contacts[0] : undefined) as any;
      const waIdRaw = contact?.wa_id || msgs[0]?.from;
      if (!waIdRaw) {
        logger.warn({ phoneNumberId }, "webhook message missing contact id");
        continue;
      }
      const contactPhone = normalizeContactPhone(String(waIdRaw));
      const contactName = contact?.profile?.name ? String(contact.profile.name) : null;

      for (const msg of msgs) {
        try {
          const messageType = msg?.type as string | undefined;
          const messageId = msg?.id as string | undefined;
          const ts = msg?.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date();

          let mType: any = "text";
          let content: string | null = null;
          let mediaId: string | null = null;
          let mimeType: string | null = null;
          let filename: string | null = null;
          let latitude: string | null = null;
          let longitude: string | null = null;
          let locationName: string | null = null;

          if (messageType === "text") {
            mType = "text";
            content = msg.text?.body ?? null;
          } else if (messageType === "image") {
            mType = "image";
            mediaId = msg.image?.id ?? null;
            mimeType = msg.image?.mime_type ?? null;
            content = msg.image?.caption ?? null;
          } else if (messageType === "video") {
            mType = "video";
            mediaId = msg.video?.id ?? null;
            mimeType = msg.video?.mime_type ?? null;
            content = msg.video?.caption ?? null;
          } else if (messageType === "audio") {
            mType = "audio";
            mediaId = msg.audio?.id ?? null;
            mimeType = msg.audio?.mime_type ?? null;
          } else if (messageType === "document") {
            mType = "document";
            mediaId = msg.document?.id ?? null;
            mimeType = msg.document?.mime_type ?? null;
            filename = msg.document?.filename ?? null;
            content = msg.document?.caption ?? null;
          } else if (messageType === "sticker") {
            mType = "sticker";
            mediaId = msg.sticker?.id ?? null;
            mimeType = msg.sticker?.mime_type ?? null;
          } else if (messageType === "location") {
            mType = "location";
            latitude = msg.location?.latitude ? String(msg.location.latitude) : null;
            longitude = msg.location?.longitude ? String(msg.location.longitude) : null;
            locationName = msg.location?.name ? String(msg.location.name) : null;
            content = msg.location?.address ? String(msg.location.address) : null;
          } else {
            // Unknown / unsupported type
            mType = "text";
            content = "[Mensaje no soportado]";
          }

          // Resolve conversation
          const existing = await db
            .select()
            .from(conversations)
            .where(and(
              eq(conversations.contactPhone, contactPhone),
              eq(conversations.whatsappNumberId, whatsappNumberId),
              eq(conversations.whatsappConnectionType, "api"),
            ))
            .limit(1);

          let conversationId = existing[0]?.id as number | undefined;
          if (!conversationId) {
            const ins = await db.insert(conversations).values({
              channel: "whatsapp",
              whatsappNumberId,
              whatsappConnectionType: "api",
              externalChatId: contactPhone,
              contactPhone,
              contactName,
              ticketStatus: "pending",
              lastMessageAt: ts,
              unreadCount: 1,
              status: "active",
            } as any);
            conversationId = ins[0].insertId as number;
          } else {
            await db
              .update(conversations)
              .set({
                lastMessageAt: ts,
                unreadCount: sql`${conversations.unreadCount} + 1`,
                whatsappConnectionType: "api",
              } as any)
              .where(eq(conversations.id, conversationId));
          }

          // (Optional) For Cloud API media, we can fetch a temporary URL. We do NOT download binaries here in phase3/4.
          // Phase2 media pipeline should store binary into /uploads or S3.
          if (mediaId && accessToken && process.env.NODE_ENV !== "production") {
            // only debug-level; do not log the URL itself
            void downloadWhatsAppMedia(mediaId, accessToken).catch(() => undefined);
          }

          
          // Media pipeline (Cloud API): convert mediaId -> binary -> /api/uploads/<file>
          let storedMediaUrl: string | null = mediaId;
          let storedMimeType: string | null = mimeType;
          let storedFilename: string | null = filename;

          if (mediaId && accessToken) {
            const downloaded = await downloadWhatsAppMediaBinary(mediaId, accessToken);
            if (downloaded?.buffer && downloaded.buffer.length > 0) {
              const saved = saveBufferToUploads({
                buffer: downloaded.buffer,
                originalname: downloaded.filename || filename || `${mType}-${messageId || mediaId}`,
                mimetype: downloaded.mimeType || mimeType,
              });
              storedMediaUrl = saved.url;
              storedMimeType = downloaded.mimeType || mimeType || null;
              storedFilename = downloaded.filename || filename || saved.originalname;
            }
          }
await db.insert(chatMessages).values({
            conversationId,
            whatsappNumberId,
            whatsappConnectionType: "api",
            direction: "inbound",
            messageType: mType,
            content,
            mediaUrl: storedMediaUrl,
            mediaName: storedFilename,
            mediaMimeType: storedMimeType,
            latitude: latitude as any,
            longitude: longitude as any,
            locationName,
            status: "delivered",
            whatsappMessageId: messageId,
            deliveredAt: ts,
            createdAt: ts,
          } as any);

        } catch (e) {
          logger.error({ err: safeError(e), phoneNumberId }, "failed processing inbound message");
        }
      }
    }
  }
}

export function registerWhatsAppWebhookRoutes(app: Express) {
  // Verification endpoint for Meta
  app.get("/api/whatsapp/webhook", (req: Request, res: Response) => {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === verifyToken) {
      logger.info("whatsapp webhook verified");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  });

  // Webhook POST: receives notifications from Meta
  app.post("/api/whatsapp/webhook", async (req: Request, res: Response) => {
    try {
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      const signature = (req.headers["x-hub-signature-256"] as string) || "";

      if (appSecret) {
        const raw = (req as any).rawBody as Buffer | undefined;
        if (!raw) {
          logger.warn("missing rawBody for signature verification");
          return res.status(400).send("Bad Request");
        }
        const ok = verifySignature(raw, signature, appSecret);
        if (!ok) {
          logger.warn({ hasSignature: Boolean(signature) }, "invalid webhook signature");
          return res.sendStatus(403);
        }
      }

      if (process.env.NODE_ENV !== "production") {
        logger.debug({ object: req.body?.object }, "whatsapp webhook received");
      }

      await processMetaWebhookPayload(req.body);
      return res.sendStatus(200);
    } catch (e) {
      logger.error({ err: safeError(e) }, "webhook handler failed");
      return res.sendStatus(500);
    }
  });
}
