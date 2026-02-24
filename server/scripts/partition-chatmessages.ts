import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { logger } from "../_core/logger";

/**
 * Sets up monthly partitioning for chat_messages table.
 * This significantly improves query performance for time-range queries
 * and allows efficient data archival by dropping old partitions.
 *
 * IMPORTANT: This is a one-time migration. It converts the existing
 * chat_messages table to be RANGE partitioned by YEAR(timestamp), MONTH(timestamp).
 *
 * Run manually: `npx tsx server/scripts/partition-chatmessages.ts`
 */
export async function partitionChatMessages(): Promise<void> {
    const db = await getDb();
    if (!db) {
        logger.error("Cannot partition: database not available");
        return;
    }

    try {
        // Check if table is already partitioned
        const [partInfo] = await db.execute(sql`
            SELECT PARTITION_METHOD
            FROM INFORMATION_SCHEMA.PARTITIONS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'chat_messages'
              AND PARTITION_METHOD IS NOT NULL
            LIMIT 1
        `) as any[];

        if (partInfo && (partInfo as any[]).length > 0) {
            logger.info("[Partition] chat_messages is already partitioned, skipping");
            return;
        }

        // Generate partition definitions for current year and next year
        const currentYear = new Date().getFullYear();
        const partitions: string[] = [];

        for (let year = currentYear; year <= currentYear + 1; year++) {
            for (let month = 1; month <= 12; month++) {
                const nextMonth = month === 12 ? 1 : month + 1;
                const nextYear = month === 12 ? year + 1 : year;
                const partName = `p${year}_${String(month).padStart(2, "0")}`;
                partitions.push(
                    `PARTITION ${partName} VALUES LESS THAN ('${nextYear}-${String(nextMonth).padStart(2, "0")}-01')`
                );
            }
        }
        partitions.push("PARTITION p_future VALUES LESS THAN MAXVALUE");

        const alterSQL = `
            ALTER TABLE chat_messages
            PARTITION BY RANGE COLUMNS(timestamp) (
                ${partitions.join(",\n                ")}
            )
        `;

        logger.info("[Partition] Partitioning chat_messages table (this may take a while for large tables)...");
        await db.execute(sql.raw(alterSQL));
        logger.info("[Partition] chat_messages partitioned successfully");

    } catch (error: any) {
        if (error?.message?.includes("already partitioned") || error?.errno === 1505) {
            logger.info("[Partition] chat_messages already partitioned");
        } else {
            logger.error({ err: error }, "[Partition] Failed to partition chat_messages");
        }
    }
}

// Allow running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
    partitionChatMessages()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
