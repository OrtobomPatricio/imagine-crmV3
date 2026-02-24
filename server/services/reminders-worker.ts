/**
 * Lead Reminders Worker
 * 
 * Processes scheduled reminders and sends WhatsApp messages
 * at the scheduled time. Supports:
 * - One-time reminders
 * - Recurring reminders (daily, weekly, monthly)
 * - Messages with interactive buttons
 * - Media attachments (images, documents)
 */

import { eq, lte, and } from "drizzle-orm";
import { leadReminders, conversations, leads, whatsappNumbers } from "../../drizzle/schema";
import { getDb } from "../db";
import { logger } from "../_core/logger";
import { emitToConversation } from "./websocket";
import { BaileysService } from "./baileys";
import path from "path";
import fs from "fs";

const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
let intervalId: NodeJS.Timeout | null = null;

/**
 * Calculate next occurrence for recurring reminders
 */
function getNextOccurrence(date: Date, pattern: "daily" | "weekly" | "monthly"): Date {
    const next = new Date(date);
    
    switch (pattern) {
        case "daily":
            next.setDate(next.getDate() + 1);
            break;
        case "weekly":
            next.setDate(next.getDate() + 7);
            break;
        case "monthly":
            next.setMonth(next.getMonth() + 1);
            break;
    }
    
    return next;
}

/**
 * Send WhatsApp message via Baileys with optional buttons
 */
async function sendReminderMessage(reminder: typeof leadReminders.$inferSelect): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) {
        return { success: false, error: "Database not available" };
    }

    try {
        // Get conversation and lead details
        const convRows = await db
            .select({
                id: conversations.id,
                contactPhone: conversations.contactPhone,
                whatsappNumberId: conversations.whatsappNumberId,
                channel: conversations.channel,
            })
            .from(conversations)
            .where(eq(conversations.leadId, reminder.leadId))
            .limit(1);

        const conversation = convRows[0];
        if (!conversation) {
            return { success: false, error: "No conversation found for lead" };
        }

        if (conversation.channel !== 'whatsapp') {
            return { success: false, error: "Only WhatsApp reminders are supported" };
        }

        // Get WhatsApp number
        const waNumberRows = await db
            .select({ id: whatsappNumbers.id, phoneNumber: whatsappNumbers.phoneNumber })
            .from(whatsappNumbers)
            .where(eq(whatsappNumbers.id, conversation.whatsappNumberId))
            .limit(1);

        if (!waNumberRows[0]) {
            return { success: false, error: "WhatsApp number not found" };
        }

        const whatsappNumberId = waNumberRows[0].id;

        // Check Baileys connection
        const baileysSocket = BaileysService.getSocket(whatsappNumberId);
        if (!baileysSocket) {
            return { success: false, error: "Baileys not connected" };
        }

        // Format phone number for Baileys
        const phoneNumber = conversation.contactPhone.replace(/[^0-9]/g, '');
        const jid = `${phoneNumber}@s.whatsapp.net`;

        // Prepare message content
        let baileysContent: any;

        // Build message with buttons if provided
        const buttons = reminder.buttons as Array<{ id: string; text: string }> | null;
        
        if (buttons && buttons.length > 0) {
            // Interactive message with buttons
            baileysContent = {
                text: reminder.message,
                footer: "Selecciona una opción:",
                buttons: buttons.map(btn => ({
                    buttonId: `reminder_${reminder.id}_${btn.id}`,
                    buttonText: { displayText: btn.text },
                    type: 1,
                })),
                headerType: 1,
            };
        } else if (reminder.messageType === 'image' && reminder.mediaUrl) {
            // Image message
            const filePath = path.join(process.cwd(), "storage/uploads", path.basename(reminder.mediaUrl));
            if (!fs.existsSync(filePath)) {
                return { success: false, error: "Image file not found" };
            }
            baileysContent = {
                image: { url: filePath },
                caption: reminder.message,
            };
        } else if (reminder.messageType === 'document' && reminder.mediaUrl) {
            // Document message
            const filePath = path.join(process.cwd(), "storage/uploads", path.basename(reminder.mediaUrl));
            if (!fs.existsSync(filePath)) {
                return { success: false, error: "Document file not found" };
            }
            baileysContent = {
                document: { url: filePath },
                fileName: reminder.mediaName || 'document',
                caption: reminder.message,
            };
        } else {
            // Text message
            baileysContent = { text: reminder.message };
        }

        // Send message
        const result = await BaileysService.sendMessage(whatsappNumberId, jid, baileysContent);

        // Emit WebSocket event for real-time UI update
        emitToConversation(conversation.id, "message:new", {
            id: Date.now(), // Temporary ID
            conversationId: conversation.id,
            content: reminder.message,
            fromMe: true,
            createdAt: new Date(),
            reminderId: reminder.id,
        });

        logger.info(`[RemindersWorker] Sent reminder ${reminder.id} to lead ${reminder.leadId}`);
        return { success: true };

    } catch (error: any) {
        logger.error({ error, reminderId: reminder.id }, "[RemindersWorker] Failed to send reminder");
        return { success: false, error: error.message };
    }
}

/**
 * Process due reminders
 */
async function processDueReminders(): Promise<number> {
    const db = await getDb();
    if (!db) {
        logger.warn("[RemindersWorker] Database not available");
        return 0;
    }

    try {
        const now = new Date();

        // Get all scheduled reminders that are due
        const dueReminders = await db
            .select()
            .from(leadReminders)
            .where(
                and(
                    eq(leadReminders.status, "scheduled"),
                    lte(leadReminders.scheduledAt, now)
                )
            );

        if (dueReminders.length === 0) {
            return 0;
        }

        logger.info(`[RemindersWorker] Processing ${dueReminders.length} due reminders`);

        let processedCount = 0;

        for (const reminder of dueReminders) {
            try {
                // Send the message
                const result = await sendReminderMessage(reminder);

                if (result.success) {
                    // Mark as sent
                    await db
                        .update(leadReminders)
                        .set({
                            status: "sent",
                            sentAt: new Date(),
                        })
                        .where(eq(leadReminders.id, reminder.id));

                    // Handle recurring reminders
                    if (reminder.isRecurring && reminder.recurrencePattern) {
                        const nextDate = getNextOccurrence(
                            new Date(reminder.scheduledAt),
                            reminder.recurrencePattern
                        );

                        // Check if we should create next occurrence
                        if (!reminder.recurrenceEndDate || nextDate <= reminder.recurrenceEndDate) {
                            await db.insert(leadReminders).values({ tenantId: 1, 
                                leadId: reminder.leadId,
                                conversationId: reminder.conversationId,
                                createdById: reminder.createdById,
                                scheduledAt: nextDate,
                                timezone: reminder.timezone,
                                message: reminder.message,
                                messageType: reminder.messageType,
                                mediaUrl: reminder.mediaUrl,
                                mediaName: reminder.mediaName,
                                buttons: reminder.buttons,
                                isRecurring: true,
                                recurrencePattern: reminder.recurrencePattern,
                                recurrenceEndDate: reminder.recurrenceEndDate,
                                parentReminderId: reminder.parentReminderId || reminder.id,
                                status: "scheduled",
                            });

                            logger.info(`[RemindersWorker] Created next occurrence for recurring reminder ${reminder.id}`);
                        }
                    }

                    processedCount++;
                } else {
                    // Mark as failed
                    await db
                        .update(leadReminders)
                        .set({
                            status: "failed",
                            errorMessage: result.error || "Unknown error",
                        })
                        .where(eq(leadReminders.id, reminder.id));

                    logger.error(`[RemindersWorker] Failed to send reminder ${reminder.id}: ${result.error}`);
                }
            } catch (error: any) {
                logger.error({ error, reminderId: reminder.id }, "[RemindersWorker] Error processing reminder");
                
                // Mark as failed
                await db
                    .update(leadReminders)
                    .set({
                        status: "failed",
                        errorMessage: error.message,
                    })
                    .where(eq(leadReminders.id, reminder.id));
            }
        }

        return processedCount;

    } catch (error) {
        logger.error({ error }, "[RemindersWorker] Error in processDueReminders");
        return 0;
    }
}

export function startRemindersWorker(): void {
    if (intervalId) {
        logger.info("[RemindersWorker] Already running");
        return;
    }

    logger.info(`[RemindersWorker] Starting - checking every ${CHECK_INTERVAL_MS / 1000} seconds`);
    
    // Run immediately
    processDueReminders().catch(console.error);
    
    // Schedule periodic checks
    intervalId = setInterval(() => {
        processDueReminders().catch(console.error);
    }, CHECK_INTERVAL_MS);
    
    intervalId.unref();
}

export function stopRemindersWorker(): void {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger.info("[RemindersWorker] Stopped");
    }
}
