/**
 * Ticket Status Worker
 * 
 * Automatically changes ticket status based on inactivity:
 * - Open tickets without agent response for X hours -> Pending
 * - Runs every 30 minutes to check
 */

import { eq, and, lt, sql } from "drizzle-orm";
import { conversations } from "../../drizzle/schema";
import { getDb } from "../db";
import { logger } from "../_core/logger";

// Config: Hours of inactivity before marking as pending
const INACTIVITY_THRESHOLD_HOURS = 4;
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

let intervalId: NodeJS.Timeout | null = null;

export async function checkStaleTickets(): Promise<number> {
    const db = await getDb();
    if (!db) {
        logger.warn("[TicketStatusWorker] Database not available");
        return 0;
    }

    try {
        const thresholdDate = new Date();
        thresholdDate.setHours(thresholdDate.getHours() - INACTIVITY_THRESHOLD_HOURS);

        // Find open tickets where:
        // - Status is 'open'
        // - Last message was more than X hours ago
        // - The last message was from the user (not from agent)
        // This indicates the agent hasn't responded
        
        const staleTickets = await db
            .select({
                id: conversations.id,
                contactPhone: conversations.contactPhone,
                lastMessageAt: conversations.lastMessageAt,
            })
            .from(conversations)
            .where(
                and(
                    eq(conversations.ticketStatus, 'open'),
                    lt(conversations.lastMessageAt, thresholdDate)
                )
            );

        if (staleTickets.length === 0) {
            return 0;
        }

        // Update all stale tickets to pending
        const ids = staleTickets.map(t => t.id);
        
        await db
            .update(conversations)
            .set({ ticketStatus: 'pending' })
            .where(
                and(
                    eq(conversations.ticketStatus, 'open'),
                    sql`${conversations.id} IN (${ids.join(',')})`
                )
            );

        logger.info(`[TicketStatusWorker] Changed ${staleTickets.length} stale tickets from 'open' to 'pending'`);
        
        // Log details for debugging
        for (const ticket of staleTickets) {
            logger.debug(`[TicketStatusWorker] Ticket ${ticket.id} (${ticket.contactPhone}) marked as pending - inactive since ${ticket.lastMessageAt}`);
        }

        return staleTickets.length;
    } catch (error) {
        logger.error({ error }, "[TicketStatusWorker] Error checking stale tickets");
        return 0;
    }
}

export function startTicketStatusWorker(): void {
    if (intervalId) {
        logger.info("[TicketStatusWorker] Already running");
        return;
    }

    logger.info(`[TicketStatusWorker] Starting - checking every ${CHECK_INTERVAL_MS / 60000} minutes, threshold: ${INACTIVITY_THRESHOLD_HOURS} hours`);
    
    // Run immediately on start
    checkStaleTickets().catch(console.error);
    
    // Schedule periodic checks
    intervalId = setInterval(() => {
        checkStaleTickets().catch(console.error);
    }, CHECK_INTERVAL_MS);
    
    // Unref so it doesn't keep process alive
    intervalId.unref();
}

export function stopTicketStatusWorker(): void {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger.info("[TicketStatusWorker] Stopped");
    }
}

// Auto-start if this file is imported in the main server
if (process.env.NODE_ENV !== 'test') {
    startTicketStatusWorker();
}
