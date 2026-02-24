import { eq, and, lt, sql, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { messageQueue, chatMessages, whatsappConnections, whatsappNumbers, conversations } from "../../drizzle/schema";
import { BaileysService } from "./baileys";
import { logger, safeError } from "../_core/logger";
import { dispatchIntegrationEvent } from "../_core/integrationDispatch";
import { sendCloudMessage, sendCloudTemplate } from "../whatsapp/cloud";
import { decryptSecret } from "../_core/crypto";
import path from "path";
import fs from "fs";
import { ENV } from "../_core/env";

// Constants
const MAX_RETRIES = 5;
const BATCH_SIZE = 10;
const PROCESSING_INTERVAL_MS = 2000;

export class MessageQueueWorker {
    private static instance: MessageQueueWorker;
    private isProcessing = false;
    private timer: NodeJS.Timeout | null = null;
    private dailyResetTimer: NodeJS.Timeout | null = null;

    private constructor() {
        this.start();
        this.scheduleDailyReset();
    }

    /**
     * Schedule daily reset of messagesSentToday counter
     */
    private scheduleDailyReset() {
        // Reset at midnight
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const msUntilMidnight = tomorrow.getTime() - now.getTime();
        
        // Initial timeout to midnight, then every 24 hours
        setTimeout(() => {
            this.resetDailyCounters();
            this.dailyResetTimer = setInterval(() => this.resetDailyCounters(), 24 * 60 * 60 * 1000);
        }, msUntilMidnight);
        
        logger.info(`📅 Daily counter reset scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
    }

    private async resetDailyCounters() {
        const db = await getDb();
        if (!db) return;

        try {
            await db.update(whatsappNumbers)
                .set({ messagesSentToday: 0 });
            logger.info("🔄 Daily message counters reset");
        } catch (e) {
            logger.error({ err: safeError(e) }, "Failed to reset daily counters");
        }
    }

    public static getInstance(): MessageQueueWorker {
        if (!MessageQueueWorker.instance) {
            MessageQueueWorker.instance = new MessageQueueWorker();
        }
        return MessageQueueWorker.instance;
    }

    public start() {
        if (this.timer) return;
        logger.info("🏭 MessageQueueWorker started");
        this.timer = setInterval(() => this.processQueue(), PROCESSING_INTERVAL_MS);
    }

    public stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        logger.info("🛑 MessageQueueWorker stopped");
    }

    /**
     * Main processing loop
     */
    private async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const db = await getDb();
            if (!db) {
                this.isProcessing = false;
                return;
            }

            await db.transaction(async (tx) => {
                // 1. Fetch pending items atomically using FOR UPDATE SKIP LOCKED
                const pendingItems = await tx.execute(sql`
                    SELECT * FROM message_queue 
                    WHERE status IN ('queued', 'failed')
                    AND attempts < ${MAX_RETRIES}
                    AND (nextAttemptAt <= NOW() OR nextAttemptAt IS NULL)
                    ORDER BY priority DESC, createdAt ASC
                    LIMIT ${BATCH_SIZE}
                    FOR UPDATE SKIP LOCKED
                `);

                // @ts-ignore
                const items = pendingItems[0] as typeof messageQueue.$inferSelect[];

                if (!items || items.length === 0) return;

                logger.debug(`🏭 Processing ${items.length} queued messages (Atomic Lock)`);

                const ids = items.map(i => i.id);

                // 2. Mark as processing immediately within transaction
                await tx.update(messageQueue)
                    .set({ status: 'processing', attempts: sql`attempts + 1` })
                    .where(inArray(messageQueue.id, ids));

                // 3. Process items in parallel
                await Promise.all(items.map(item => this.processItem(item)));
            });

        } catch (error) {
            logger.error({ err: safeError(error) }, "Error in MessageQueueWorker loop");
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process a single queue item
     */
    private async processItem(item: typeof messageQueue.$inferSelect) {
        const db = await getDb();
        if (!db) return;

        try {
            // Fetch full context: Message, Conversation, Connection
            const [chatMessage] = await db.select().from(chatMessages).where(eq(chatMessages.id, item.chatMessageId!));

            if (!chatMessage) {
                throw new Error("Linked ChatMessage not found");
            }

            const [conversation] = await db.select().from(conversations).where(eq(conversations.id, item.conversationId));
            if (!conversation) {
                throw new Error("Conversation not found");
            }

            // Determine sending method based on connection type
            if (chatMessage.whatsappConnectionType === 'qr') {
                await this.sendViaBaileys(item, chatMessage, conversation);
            } else {
                await this.sendViaCloud(item, chatMessage, conversation);
            }

            // Success!
            await db.update(messageQueue)
                .set({ status: 'sent', errorMessage: null })
                .where(eq(messageQueue.id, item.id));

            await db.update(chatMessages)
                .set({ status: 'sent', sentAt: new Date() })
                .where(eq(chatMessages.id, chatMessage.id));

            // Update counters
            await this.updateMessageCounters(conversation.whatsappNumberId);

            // Webhook dispatch
            try {
                if (conversation.whatsappNumberId) {
                    await dispatchIntegrationEvent({
                        whatsappNumberId: conversation.whatsappNumberId,
                        event: "message_sent",
                        data: {
                            id: chatMessage.id,
                            direction: "outbound",
                            content: chatMessage.content,
                            messageType: chatMessage.messageType,
                            mediaUrl: chatMessage.mediaUrl,
                            createdAt: new Date(),
                            to: conversation.contactPhone
                        }
                    });
                }
            } catch (e) {
                logger.error({ err: safeError(e) }, "Failed to dispatch outgoing integration event");
            }

        } catch (error: any) {
            const errorMessage = error.message || "Unknown error";
            logger.error({ err: safeError(error), itemId: item.id }, `Failed to process queue item`);

            // Calculate backoff
            const nextAttempt = new Date();
            nextAttempt.setSeconds(nextAttempt.getSeconds() + Math.pow(2, item.attempts + 1) * 30);

            await db.update(messageQueue)
                .set({
                    status: 'failed',
                    errorMessage: errorMessage.substring(0, 500),
                    nextAttemptAt: nextAttempt
                })
                .where(eq(messageQueue.id, item.id));

            if (item.chatMessageId) {
                await db.update(chatMessages)
                    .set({ status: 'failed', errorMessage: errorMessage })
                    .where(eq(chatMessages.id, item.chatMessageId));
            }
        }
    }

    /**
     * Update message counters for whatsapp number
     */
    private async updateMessageCounters(whatsappNumberId: number | null) {
        if (!whatsappNumberId) return;
        
        const db = await getDb();
        if (!db) return;

        try {
            await db.update(whatsappNumbers)
                .set({
                    messagesSentToday: sql`${whatsappNumbers.messagesSentToday} + 1`,
                    totalMessagesSent: sql`${whatsappNumbers.totalMessagesSent} + 1`,
                })
                .where(eq(whatsappNumbers.id, whatsappNumberId));
            
            logger.debug(`Updated message counters for number ${whatsappNumberId}`);
        } catch (e) {
            logger.warn({ err: safeError(e) }, "Failed to update message counters");
        }
    }

    /**
     * Send message via WhatsApp Cloud API
     */
    private async sendViaCloud(item: any, chatMessage: any, conversation: any) {
        if (!conversation.whatsappNumberId) {
            throw new Error("No linked WhatsApp number for this conversation");
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get connection details
        const [connection] = await db.select()
            .from(whatsappConnections)
            .where(eq(whatsappConnections.whatsappNumberId, conversation.whatsappNumberId));

        if (!connection || !connection.isConnected) {
            throw new Error("WhatsApp Cloud API not connected");
        }

        if (!connection.accessToken || !connection.phoneNumberId) {
            throw new Error("WhatsApp Cloud API credentials not configured");
        }

        // Decrypt access token
        let accessToken: string;
        try {
            accessToken = decryptSecret(connection.accessToken);
        } catch (e) {
            throw new Error("Failed to decrypt access token");
        }

        const to = conversation.contactPhone.replace(/\+/g, '');
        let result: { messageId: string };

        try {
            switch (chatMessage.messageType) {
                case 'text':
                    result = await sendCloudMessage({
                        accessToken,
                        phoneNumberId: connection.phoneNumberId,
                        to,
                        payload: { type: 'text', body: chatMessage.content || '' }
                    });
                    break;

                case 'template':
                    if (!chatMessage.content) {
                        throw new Error("Template name is required");
                    }
                    // Parse template data if stored as JSON
                    let templateData: any = {};
                    try {
                        templateData = JSON.parse(chatMessage.content);
                    } catch {
                        templateData = { name: chatMessage.content, languageCode: 'es' };
                    }
                    result = await sendCloudTemplate({
                        accessToken,
                        phoneNumberId: connection.phoneNumberId,
                        to,
                        templateName: templateData.name || chatMessage.content,
                        languageCode: templateData.languageCode || 'es',
                        components: templateData.components
                    });
                    break;

                case 'image':
                case 'video':
                case 'audio':
                case 'document':
                    if (!chatMessage.mediaUrl) {
                        throw new Error("Media URL is required");
                    }
                    // For Cloud API, we need a public URL
                    // Upload media to Meta if it's a local file
                    const mediaUrl = await this.uploadMediaToMeta(
                        chatMessage.mediaUrl, 
                        accessToken, 
                        connection.phoneNumberId,
                        chatMessage.messageType
                    );
                    result = await sendCloudMessage({
                        accessToken,
                        phoneNumberId: connection.phoneNumberId,
                        to,
                        payload: {
                            type: chatMessage.messageType,
                            link: mediaUrl,
                            caption: chatMessage.content || undefined,
                            filename: chatMessage.mediaName || undefined
                        }
                    });
                    break;

                case 'location':
                    if (!chatMessage.latitude || !chatMessage.longitude) {
                        throw new Error("Latitude and longitude are required");
                    }
                    result = await sendCloudMessage({
                        accessToken,
                        phoneNumberId: connection.phoneNumberId,
                        to,
                        payload: {
                            type: 'location',
                            latitude: parseFloat(chatMessage.latitude),
                            longitude: parseFloat(chatMessage.longitude),
                            name: chatMessage.locationName || undefined,
                            address: chatMessage.content || undefined
                        }
                    });
                    break;

                case 'sticker':
                    if (!chatMessage.mediaUrl) {
                        throw new Error("Sticker URL is required");
                    }
                    const stickerUrl = await this.uploadMediaToMeta(
                        chatMessage.mediaUrl,
                        accessToken,
                        connection.phoneNumberId,
                        'sticker'
                    );
                    result = await sendCloudMessage({
                        accessToken,
                        phoneNumberId: connection.phoneNumberId,
                        to,
                        payload: { type: 'sticker', link: stickerUrl }
                    });
                    break;

                case 'contact':
                    if (!chatMessage.content) {
                        throw new Error("Contact vCard is required");
                    }
                    result = await sendCloudMessage({
                        accessToken,
                        phoneNumberId: connection.phoneNumberId,
                        to,
                        payload: { type: 'contact', vcard: chatMessage.content }
                    });
                    break;

                default:
                    throw new Error(`Unsupported message type for Cloud API: ${chatMessage.messageType}`);
            }

            // Store the WhatsApp message ID
            if (result.messageId) {
                await db.update(chatMessages)
                    .set({ whatsappMessageId: result.messageId })
                    .where(eq(chatMessages.id, chatMessage.id));
            }

            logger.info(`[CloudAPI] Message sent successfully: ${result.messageId}`);

        } catch (error: any) {
            logger.error({ err: safeError(error) }, "[CloudAPI] Failed to send message");
            throw error;
        }
    }

    /**
     * Upload media to Meta for Cloud API
     */
    private async uploadMediaToMeta(
        mediaUrl: string, 
        accessToken: string, 
        phoneNumberId: string,
        type: string
    ): Promise<string> {
        // If it's already a public URL (not local), return as-is
        if (!mediaUrl.startsWith('/api/uploads/') && mediaUrl.startsWith('http')) {
            return mediaUrl;
        }

        // Map local path to file
        let filePath = mediaUrl;
        if (filePath.startsWith('/api/uploads/')) {
            const filename = filePath.split('/').pop();
            const uploadDir = path.join(process.cwd(), "storage/uploads");
            filePath = path.join(uploadDir, filename!);
        }

        if (!fs.existsSync(filePath)) {
            throw new Error(`Media file not found: ${filePath}`);
        }

        // Upload to Meta
        const version = ENV.whatsappGraphVersion || "v19.0";
        const base = ENV.whatsappGraphBaseUrl || "https://graph.facebook.com";
        const endpoint = `${base}/${version}/${phoneNumberId}/media`;

        const formData = new FormData();
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer]);
        
        // Determine MIME type
        const mimeType = this.getMimeType(filePath, type);
        formData.append('file', blob, { type: mimeType } as any);
        formData.append('messaging_product', 'whatsapp');

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            body: formData as any
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.error?.message || `Media upload failed: ${response.status}`);
        }

        // Return the media ID
        return data.id;
    }

    private getMimeType(filePath: string, type: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.mp3': 'audio/mpeg',
            '.ogg': 'audio/ogg',
            '.wav': 'audio/wav',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.webm': 'video/webm',
        };
        return mimeTypes[ext] || `${type}/${ext.replace('.', '')}`;
    }

    private async sendViaBaileys(item: any, chatMessage: any, conversation: any) {
        if (!conversation.whatsappNumberId) {
            throw new Error("No linked WhatsApp number for this conversation");
        }

        // Validar estado de conexión ANTES de obtener socket
        const status = BaileysService.getStatus(conversation.whatsappNumberId);
        if (status !== 'connected') {
            throw new Error(`WhatsApp not connected (status: ${status}). Cannot send message.`);
        }

        const sock = BaileysService.getSocket(conversation.whatsappNumberId);
        if (!sock) {
            throw new Error("WhatsApp socket not available after status check");
        }

        // Validación adicional de WebSocket subyacente
        const wsReadyState = (sock.ws as any)?.readyState;
        if (wsReadyState !== undefined && wsReadyState !== 1) {
            throw new Error(`WhatsApp WebSocket not ready (readyState: ${wsReadyState})`);
        }

        // Baileys Send
        const cleanPhone = conversation.contactPhone.replace(/\+/g, '');
        const jid = cleanPhone + "@s.whatsapp.net";

        logger.info(`[QueueWorker] Sending to JID: ${jid}, type: ${chatMessage.messageType}`);

        let sentMsg;
        try {
            const filePath = this.resolveFilePath(chatMessage.mediaUrl);

            switch (chatMessage.messageType) {
                case 'text':
                    sentMsg = await sock.sendMessage(jid, { text: chatMessage.content || "" });
                    break;

                case 'image':
                    if (!filePath) throw new Error("Image file path is required");
                    sentMsg = await sock.sendMessage(jid, {
                        image: { url: filePath },
                        caption: chatMessage.content || ""
                    });
                    break;

                case 'video':
                    if (!filePath) throw new Error("Video file path is required");
                    sentMsg = await sock.sendMessage(jid, {
                        video: { url: filePath },
                        caption: chatMessage.content || "",
                        mimetype: this.getMimeType(filePath, 'video')
                    });
                    break;

                case 'audio':
                    if (!filePath) throw new Error("Audio file path is required");
                    sentMsg = await sock.sendMessage(jid, {
                        audio: { url: filePath },
                        mimetype: this.getMimeType(filePath, 'audio'),
                        ptt: false // Set to true for voice notes
                    });
                    break;

                case 'document':
                    if (!filePath) throw new Error("Document file path is required");
                    sentMsg = await sock.sendMessage(jid, {
                        document: { url: filePath },
                        caption: chatMessage.content || "",
                        mimetype: this.getMimeType(filePath, 'application'),
                        fileName: chatMessage.mediaName || path.basename(filePath)
                    });
                    break;

                case 'location':
                    if (!chatMessage.latitude || !chatMessage.longitude) {
                        throw new Error("Latitude and longitude are required");
                    }
                    sentMsg = await sock.sendMessage(jid, {
                        location: {
                            degreesLatitude: parseFloat(chatMessage.latitude),
                            degreesLongitude: parseFloat(chatMessage.longitude),
                            name: chatMessage.locationName || undefined
                        }
                    });
                    break;

                case 'sticker':
                    if (!filePath) throw new Error("Sticker file path is required");
                    sentMsg = await sock.sendMessage(jid, {
                        sticker: { url: filePath }
                    });
                    break;

                case 'contact':
                    if (!chatMessage.content) throw new Error("Contact vCard is required");
                    sentMsg = await sock.sendMessage(jid, {
                        contacts: {
                            displayName: "Contact",
                            contacts: [{ vcard: chatMessage.content }]
                        }
                    });
                    break;

                case 'template':
                    // For Baileys, templates are just text messages with template content
                    sentMsg = await sock.sendMessage(jid, { 
                        text: chatMessage.content || "Template message" 
                    });
                    break;

                default:
                    throw new Error(`Unsupported message type for Baileys: ${chatMessage.messageType}`);
            }
        } catch (sendError: any) {
            if (sendError.message?.includes('not-authorized')) {
                throw new Error('WhatsApp session expired. Please reconnect.');
            }
            throw sendError;
        }

        // Store the WhatsApp message ID
        const db = await getDb();
        if (db && sentMsg?.key?.id) {
            await db.update(chatMessages)
                .set({ whatsappMessageId: sentMsg.key.id })
                .where(eq(chatMessages.id, chatMessage.id));
        }
    }

    private resolveFilePath(mediaUrl: string | null): string | null {
        if (!mediaUrl) return null;

        let filePath = mediaUrl;

        // If path starts with /api/uploads, map it to the physical directory
        if (filePath.startsWith('/api/uploads/')) {
            const filename = filePath.split('/').pop();
            const uploadDir = path.join(process.cwd(), "storage/uploads");
            filePath = path.join(uploadDir, filename!);
        }

        if (!fs.existsSync(filePath)) {
            logger.warn(`File not found: ${filePath}`);
            return null;
        }

        return filePath;
    }
}
