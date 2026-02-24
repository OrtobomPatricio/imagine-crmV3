import cron from "node-cron";
import { logger } from "../_core/logger";
import { BaileysService } from "./baileys";
import { getDb } from "../db";
import { whatsappNumbers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * WhatsApp Connection Health Check Service
 * Periodically pings all active Baileys connections and marks
 * stale/disconnected sessions for reconnection.
 *
 * Runs every 5 minutes.
 */
export function startWAHealthCheck(): void {
    cron.schedule("*/5 * * * *", async () => {
        try {
            const db = await getDb();
            if (!db) return;

            // Get all WA connections that should be active
            const activeNumbers = await db
                .select({ id: whatsappNumbers.id })
                .from(whatsappNumbers)
                .where(eq(whatsappNumbers.status, "active"));

            let healthy = 0;
            let stale = 0;

            for (const num of activeNumbers) {
                const status = BaileysService.getStatus(num.id);

                if (status === "connected") {
                    healthy++;
                    // Try to get the socket and verify it's truly alive
                    const socket = BaileysService.getSocket(num.id);
                    if (!socket) {
                        stale++;
                        healthy--;
                        logger.warn({ numberId: num.id }, "[WAHealthCheck] Socket missing for connected number, marking stale");
                        await db.update(whatsappNumbers)
                            .set({ status: "disconnected" })
                            .where(eq(whatsappNumbers.id, num.id));
                    }
                } else {
                    stale++;
                    logger.warn({ numberId: num.id, status }, "[WAHealthCheck] Stale connection detected");
                    // Update DB status to reflect reality
                    await db.update(whatsappNumbers)
                        .set({ status: "disconnected" })
                        .where(eq(whatsappNumbers.id, num.id));
                }
            }

            if (activeNumbers.length > 0) {
                logger.info({ healthy, stale, total: activeNumbers.length }, "[WAHealthCheck] Health check completed");
            }
        } catch (error) {
            logger.error({ err: error }, "[WAHealthCheck] Health check failed");
        }
    });

    logger.info("[WAHealthCheck] Scheduled every 5 minutes");
}
