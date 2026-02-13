
import { getDb } from "../db";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { saveBufferToUploads } from "../_core/media-storage";
import { leads, conversations, chatMessages, whatsappNumbers, pipelines, pipelineStages } from "../../drizzle/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { normalizeContactPhone } from "../_core/phone";



function unwrapBaileysMessage(msg: any): any {
    // supports ephemeralMessage and viewOnceMessage wrappers
    let m = msg;
    for (let i = 0; i < 4; i++) {
        if (!m) break;
        if (m.ephemeralMessage?.message) { m = m.ephemeralMessage.message; continue; }
        if (m.viewOnceMessage?.message) { m = m.viewOnceMessage.message; continue; }
        if (m.viewOnceMessageV2?.message) { m = m.viewOnceMessageV2.message; continue; }
        break;
    }
    return m;
}

async function streamToBuffer(stream: AsyncIterable<Uint8Array>): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

async function maybeDownloadMedia(innerMessage: any, upsertType: 'append' | 'notify') {
    // By default, avoid downloading media during history sync unless explicitly enabled
    if (upsertType === 'append' && process.env.WA_MEDIA_DOWNLOAD_ON_SYNC !== '1') {
        return { mediaUrl: null, mediaMimeType: null, mediaName: null };
    }

    const m = innerMessage || {};
    const map: Array<{ key: string; type: any; name: string }> = [
        { key: 'imageMessage', type: 'image', name: 'image' },
        { key: 'videoMessage', type: 'video', name: 'video' },
        { key: 'audioMessage', type: 'audio', name: 'audio' },
        { key: 'documentMessage', type: 'document', name: 'document' },
        { key: 'stickerMessage', type: 'sticker', name: 'sticker' },
    ];

    for (const item of map) {
        const msgObj = m[item.key];
        if (!msgObj) continue;

        const stream = await downloadContentFromMessage(msgObj, item.type);
        const buffer = await streamToBuffer(stream);
        const mimetype = (msgObj.mimetype as string | undefined) || null;
        const filename = (msgObj.fileName as string | undefined) || (msgObj.file_name as string | undefined) || null;

        const saved = saveBufferToUploads({
            buffer,
            originalname: filename || `${item.name}-${Date.now()}`,
            mimetype,
        });

        return { mediaUrl: saved.url, mediaMimeType: mimetype, mediaName: filename || saved.originalname };
    }

    return { mediaUrl: null, mediaMimeType: null, mediaName: null };
}
export const MessageHandler = {
    async handleMessageUpdate(userId: number, whatsappMessageId: string, status: 'read' | 'delivered') {
        console.log(`[MessageHandler] Updating message ${whatsappMessageId} status to ${status}`);
        const db = await getDb();
        if (!db) { console.error("[MessageHandler] No DB connection"); return; }

        const updates: any = {};
        if (status === 'read') {
            updates.readAt = new Date();
        } else if (status === 'delivered') {
            updates.deliveredAt = new Date();
        }

        await db.update(chatMessages)
            .set(updates)
            .where(and(
                eq(chatMessages.whatsappMessageId, whatsappMessageId),
                eq(chatMessages.whatsappNumberId, userId)
            ));
    },

    async handleIncomingMessage(userId: number, message: any, upsertType: 'append' | 'notify' = 'notify') {
        console.log(`[MessageHandler] Received ${upsertType} msg ${message.key?.id} from ${message.key?.remoteJid}`);
        const db = await getDb();
        if (!db) { console.error("[MessageHandler] No DB connection"); return; }

        // Skip strange messages (status broadcasts, etc)
        const jid = message.key.remoteJid;
        if (!jid || jid.includes('status@broadcast') || jid.includes('@lid')) {
            return;
        }

        // 1. Idempotency Check (Prevent Duplicates)
        // We trust message.key.id from WhatsApp
        const existingMessage = await db.select({ id: chatMessages.id })
            .from(chatMessages)
            .where(and(eq(chatMessages.whatsappMessageId, message.key.id), eq(chatMessages.whatsappConnectionType, "qr")))
            .limit(1);

        if (existingMessage.length > 0) {
            console.log(`[MessageHandler] Skipping duplicate message ${message.key.id}`);
            return;
        }

        const fromMe = message.key.fromMe;
        const text = message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            (message.message?.imageMessage ? "Image" : null) ||
            (message.message?.videoMessage ? "Video" : null) ||
            (message.message?.audioMessage ? "Audio" : null) ||
            (message.message?.documentMessage ? "Document" : null) ||
            (message.message?.stickerMessage ? "Sticker" : null) ||
            "Media/Unknown";

        // Extract Timestamp (seconds to milliseconds)
        const messageTimestamp = message.messageTimestamp ? new Date(Number(message.messageTimestamp) * 1000) : new Date();

        // 2. Determine Contact (Lead)
        // Normalize to a single format across QR + Cloud: "+<digits>"
        const phoneNumber = normalizeContactPhone(jid);
        const contactName = message.pushName || "Unknown";

        try {
            // Find or Create Lead
            let leadId: number;
            const existingLead = await db.select().from(leads).where(eq(leads.phone, phoneNumber)).limit(1);

            if (existingLead.length > 0) {
                leadId = existingLead[0].id;

                // ✅ Actualizar lastContactedAt con timestamp del mensaje
                // Para 'notify' usa fecha actual, para 'append' usa fecha del mensaje
                const contactDate = upsertType === 'notify' ? new Date() : messageTimestamp;

                // Solo actualizar si es MÁS RECIENTE que el valor actual
                const currentLastContact = existingLead[0].lastContactedAt;
                if (!currentLastContact || contactDate > currentLastContact) {
                    await db.update(leads)
                        .set({ lastContactedAt: contactDate })
                        .where(eq(leads.id, leadId));
                }
            } else {
                // If syncing history, maybe we DON'T want to create leads for everyone who ever messaged?
                // But for a CRM, yes we probably do.
                // But let's be careful. If I have 1000 chats, I get 1000 leads.
                // For now, let's allow it as requested "historial".

                // Determine Default Pipeline Stage
                let stageId: number | null = null;
                let nextOrder = 0;

                const defaultPipeline = await db.select().from(pipelines).where(eq(pipelines.isDefault, true)).limit(1);
                if (defaultPipeline[0]) {
                    const firstStage = await db.select().from(pipelineStages)
                        .where(eq(pipelineStages.pipelineId, defaultPipeline[0].id))
                        .orderBy(asc(pipelineStages.order))
                        .limit(1);

                    if (firstStage[0]) {
                        stageId = firstStage[0].id;
                        // Calculate next Kanban Order
                        const maxRows = await db.select({ max: sql<number>`max(${leads.kanbanOrder})` })
                            .from(leads)
                            .where(eq(leads.pipelineStageId, stageId));
                        nextOrder = ((maxRows[0] as any)?.max ?? 0) + 1;
                    }
                }

                const [newLead] = await db.insert(leads).values({
                    name: contactName !== "Unknown" ? contactName : phoneNumber, // Helper if no name
                    phone: phoneNumber,
                    country: "Unknown",
                    pipelineStageId: stageId,
                    kanbanOrder: nextOrder,
                    source: "whatsapp_inbound",
                    createdAt: new Date(), // This is when LEAD was created in CRM, not message time
                    updatedAt: new Date(),
                    lastContactedAt: messageTimestamp,
                }).$returningId();
                leadId = newLead.id;
            }

            // 3. Find or Create Conversation
            let conversationId: number;
            const existingConv = await db.select().from(conversations).where(
                and(
                    eq(conversations.leadId, leadId),
                    eq(conversations.whatsappNumberId, userId),
                    eq(conversations.channel, 'whatsapp'),
                    eq(conversations.whatsappConnectionType, 'qr'),
                    eq(conversations.externalChatId, jid)
                )
            ).limit(1);

            if (existingConv.length > 0) {
                conversationId = existingConv[0].id;

                // Sync Logic:
                // If it's a 'notify' (real-time) message, increment unread count & update lastMessageAt
                // If it's 'append' (history), assume read (or at least don't notify) and update lastMessageAt only if newer

                const updates: any = {};

                if (upsertType === 'notify' && !fromMe) {
                    updates.unreadCount = (existingConv[0].unreadCount || 0) + 1;
                    updates.lastMessageAt = new Date(); // now
                    updates.status = 'active'; // revive archived chats if new message comes
                } else if (upsertType === 'append' || fromMe) {
                    // For history, we might want to ensure lastMessageAt reflects the LATEST message
                    // But we are processing one by one.
                    // Let's just update lastMessageAt if this message is newer than current lastMessageAt
                    if (!existingConv[0].lastMessageAt || messageTimestamp > existingConv[0].lastMessageAt) {
                        updates.lastMessageAt = messageTimestamp;
                    }
                }

                if (Object.keys(updates).length > 0) {
                    await db.update(conversations).set(updates).where(eq(conversations.id, conversationId));
                }

            } else {
                const [newConv] = await db.insert(conversations).values({
                    channel: 'whatsapp',
                    whatsappNumberId: userId,
                    whatsappConnectionType: 'qr',
                    externalChatId: jid,
                    leadId: leadId,
                    contactPhone: phoneNumber,
                    contactName: contactName,
                    unreadCount: (upsertType === 'notify' && !fromMe) ? 1 : 0,
                    lastMessageAt: messageTimestamp,
                    status: 'active'
                }).$returningId();
                conversationId = newConv.id;
            }

            // 4. Insert Chat Message
            const inner = unwrapBaileysMessage(message.message);

            // Detect Type
            let msgType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' = 'text';
            if (inner?.imageMessage) msgType = 'image';
            else if (inner?.videoMessage) msgType = 'video';
            else if (inner?.audioMessage) msgType = 'audio';
            else if (inner?.documentMessage) msgType = 'document';
            else if (inner?.stickerMessage) msgType = 'sticker';

            const media = await maybeDownloadMedia(inner, upsertType);

            await db.insert(chatMessages).values({
                conversationId: conversationId,
                whatsappNumberId: userId,
                whatsappConnectionType: 'qr',
                direction: fromMe ? 'outbound' : 'inbound',
                messageType: msgType,
                content: text,
                mediaUrl: media.mediaUrl,
                mediaName: media.mediaName,
                mediaMimeType: media.mediaMimeType,
                whatsappMessageId: message.key.id,
                status: fromMe ? 'sent' : 'delivered', // Assume sent if from me in history
                deliveredAt: fromMe ? null : messageTimestamp,
                sentAt: messageTimestamp,
                createdAt: messageTimestamp
            });

            console.log(`[MessageHandler] Saved ${upsertType} msg ${message.key.id} for Lead ${leadId} in Conversation ${conversationId}`);

        } catch (error) {
            console.error("Error handling incoming message:", error);
        }
    }
};
