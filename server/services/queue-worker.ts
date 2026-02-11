import { eq, and, lt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { messageQueue, chatMessages, whatsappConnections, whatsappNumbers, conversations } from "../../drizzle/schema";
import { BaileysService } from "./baileys";
import { logger, safeError } from "../_core/logger";

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

        // Ensure connection is ready
        // This is part of the robust lifecycle check
        const sock = BaileysService.getSocket(conversation.whatsappNumberId);

        if (!sock) {
            // Attempt to restore session maybe? 
            // For now, fail so it retries. The BaileysService should handle reconnection.
            throw new Error("WhatsApp socket not available (Disconnected?)");
        }

        // Baileys Send
        const jid = conversation.contactPhone + "@s.whatsapp.net"; // Format JID

        let sentMsg;
        if (chatMessage.messageType === 'text') {
            sentMsg = await sock.sendMessage(jid, { text: chatMessage.content || "" });
        } else if (chatMessage.messageType === 'image' && chatMessage.mediaUrl) {
            sentMsg = await sock.sendMessage(jid, {
                image: { url: chatMessage.mediaUrl },
                caption: chatMessage.content || ""
            });
        } else {
            // Handle other types as needed
            sentMsg = await sock.sendMessage(jid, { text: `[Unsupported type: ${chatMessage.messageType}] ${chatMessage.content}` });
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
