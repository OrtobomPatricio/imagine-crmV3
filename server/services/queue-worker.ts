import { eq, and, lt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { messageQueue, chatMessages, whatsappConnections, whatsappNumbers, conversations } from "../../drizzle/schema";
import { BaileysService } from "./baileys";
import { logger, safeError } from "../_core/logger";
import path from "path";

// Constants
const MAX_RETRIES = 5;
const BATCH_SIZE = 10;
const PROCESSING_INTERVAL_MS = 2000;

export class MessageQueueWorker {
    private static instance: MessageQueueWorker;
    private isProcessing = false;
    private timer: NodeJS.Timeout | null = null;

    private constructor() {
        this.start();
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

            // 1. Fetch pending items (queued or failed < max_retries)
            // We process higher priority first, then older items
            const itemsToProcess = await db.select()
                .from(messageQueue)
                .where(
                    and(
                        sql`${messageQueue.status} IN ('queued', 'failed')`,
                        lt(messageQueue.attempts, MAX_RETRIES),
                        sql`(${messageQueue.nextAttemptAt} <= NOW() OR ${messageQueue.nextAttemptAt} IS NULL)`
                    )
                )
                .orderBy(sql`${messageQueue.priority} DESC`, sql`${messageQueue.createdAt} ASC`)
                .limit(BATCH_SIZE);

            if (itemsToProcess.length === 0) {
                this.isProcessing = false;
                return;
            }

            logger.debug(`🏭 Processing ${itemsToProcess.length} queued messages`);

            // 2. Process each item
            for (const item of itemsToProcess) {
                await this.processItem(item);
            }

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

        // Lock item by setting status to 'processing'
        await db.update(messageQueue)
            .set({ status: 'processing', attempts: item.attempts + 1 })
            .where(eq(messageQueue.id, item.id));

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
                // Send via Baileys
                await this.sendViaBaileys(item, chatMessage, conversation);
            } else {
                // Send via Cloud API (Placeholder for now, assuming Baileys is primary for 'qr')
                await this.sendViaBaileys(item, chatMessage, conversation);
                // NOTE: If using Cloud API, we would call the cloud sender here.
            }

            // Success!
            await db.update(messageQueue)
                .set({ status: 'sent', errorMessage: null })
                .where(eq(messageQueue.id, item.id));

            await db.update(chatMessages)
                .set({ status: 'sent', sentAt: new Date() })
                .where(eq(chatMessages.id, chatMessage.id));

        } catch (error: any) {
            const errorMessage = error.message || "Unknown error";
            logger.error({ err: safeError(error), itemId: item.id }, `Failed to process queue item`);

            // Calculate backoff
            const nextAttempt = new Date();
            nextAttempt.setSeconds(nextAttempt.getSeconds() + Math.pow(2, item.attempts + 1) * 30); // Exponential backoff: 60s, 120s, 240s...

            await db.update(messageQueue)
                .set({
                    status: 'failed',
                    errorMessage: errorMessage.substring(0, 500), // Truncate to avoid overflow
                    nextAttemptAt: nextAttempt
                })
                .where(eq(messageQueue.id, item.id));

            // Update chat message status to failed temporarily
            if (item.chatMessageId) {
                await db.update(chatMessages)
                    .set({ status: 'failed', errorMessage: errorMessage })
                    .where(eq(chatMessages.id, item.chatMessageId));
            }
        }
    }

    private async sendViaBaileys(item: any, chatMessage: any, conversation: any) {
        if (!conversation.whatsappNumberId) {
            throw new Error("No linked WhatsApp number for this conversation");
        }

        // ✅ Validar estado de conexión ANTES de obtener socket
        const status = BaileysService.getStatus(conversation.whatsappNumberId);
        if (status !== 'connected') {
            throw new Error(`WhatsApp not connected (status: ${status}). Cannot send message.`);
        }

        const sock = BaileysService.getSocket(conversation.whatsappNumberId);
        if (!sock) {
            throw new Error("WhatsApp socket not available after status check");
        }

        // ✅ Validación adicional de WebSocket subyacente
        const wsReadyState = (sock.ws as any)?.readyState;
        if (wsReadyState !== undefined && wsReadyState !== 1) { // 1 = OPEN en WebSocket
            throw new Error(`WhatsApp WebSocket not ready (readyState: ${wsReadyState})`);
        }

        // Baileys Send
        // Fix: Remove '+' from phone number for JID
        const cleanPhone = conversation.contactPhone.replace(/\+/g, '');
        const jid = cleanPhone + "@s.whatsapp.net";

        logger.info(`[QueueWorker] Sending to JID: ${jid}`);

        let sentMsg;
        try {
            if (chatMessage.messageType === 'text') {
                sentMsg = await sock.sendMessage(jid, { text: chatMessage.content || "" });
            } else if (chatMessage.messageType === 'image' && chatMessage.mediaUrl) {
                // Fix: Resolve local file path from URL
                // URL: /api/uploads/filename.png -> File: /app/dist/public/uploads/filename.png
                // Locally: public/uploads/filename.png
                let filePath = chatMessage.mediaUrl;

                // If path starts with /api/uploads, map it to the physical directory
                if (filePath.startsWith('/api/uploads/')) {
                    const filename = filePath.split('/').pop();
                    // Determine uploads dir based on environment
                    const uploadDir = process.env.NODE_ENV === 'production'
                        ? '/app/dist/public/uploads'
                        : path.resolve(process.cwd(), 'public', 'uploads');

                    filePath = path.join(uploadDir, filename);
                }

                logger.info(`[QueueWorker] Sending image from: ${filePath}`);

                sentMsg = await sock.sendMessage(jid, {
                    image: { url: filePath }, // Baileys supports file path in url field for local files
                    caption: chatMessage.content || ""
                });
            } else {
                // Handle other types as needed
                sentMsg = await sock.sendMessage(jid, { text: `[Unsupported type: ${chatMessage.messageType}] ${chatMessage.content}` });
            }
        } catch (sendError: any) {
            // ✅ Mejor manejo de errores específicos de Baileys
            if (sendError.message?.includes('not-authorized')) {
                throw new Error('WhatsApp session expired. Please reconnect.');
            }
            throw sendError;
        }

        // If we get here, it sent successfully (or at least handed off to TCP)
        // We can update the whatsappMessageId if Baileys returns it
        const db = await getDb();
        if (db && sentMsg?.key?.id) {
            await db.update(chatMessages)
                .set({ whatsappMessageId: sentMsg.key.id })
                .where(eq(chatMessages.id, chatMessage.id));
        }
    }
}
