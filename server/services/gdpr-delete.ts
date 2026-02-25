import { eq, and, isNotNull, lt } from "drizzle-orm";
import { getDb } from "../db";
import {
    users,
    leads,
    chatMessages,
    accessLogs,
    sessions
} from "../../drizzle/schema";
import { logger } from "../_core/logger";

/**
 * GDPR Deletion Service
 * Implements Right to Erasure (Art. 17).
 */

/**
 * Scheduled job to find users with dataRetentionUntil past due and purge them.
 */
export async function processScheduledDeletions() {
    const db = await getDb();
    if (!db) return;

    const now = new Date();

    // Find users whose retention period has expired
    const expiredUsers = await db
        .select({ id: users.id, tenantId: users.tenantId, email: users.email })
        .from(users)
        .where(and(
            isNotNull(users.dataRetentionUntil),
            lt(users.dataRetentionUntil, now)
        ));

    if (expiredUsers.length === 0) return;

    logger.info({ count: expiredUsers.length }, "[GDPR] Processing scheduled deletions");

    for (const user of expiredUsers) {
        try {
            await purgeUserData(user.id, user.tenantId);
            logger.info({ userId: user.id, email: user.email }, "[GDPR] User purged successfully");
        } catch (err) {
            logger.error({ userId: user.id, err }, "[GDPR] Failed to purge user");
        }
    }
}

/**
 * Hard delete/Anonymize all data for a specific user
 */
export async function purgeUserData(userId: number, tenantId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.transaction(async (tx) => {
        // 1. Anonymize Leads (keep commercial data but remove PII)
        await tx.update(leads)
            .set({
                name: "[ANONYMIZED]",
                email: "deleted@gdpr.local",
                phone: "[DELETED]",
                assignedToId: null
            } as any)
            .where(and(eq(leads.tenantId, tenantId), eq(leads.assignedToId, userId)));

        // 2. Clear Messages PII
        await tx.update(chatMessages)
            .set({
                content: "[MESSAGE PURGED BY GDPR REQUEST]",
                mediaUrl: null
            } as any)
            .where(and(eq(chatMessages.tenantId, tenantId), eq((chatMessages as any).userId, userId)));

        // 3. Delete Logs
        await tx.delete(accessLogs)
            .where(and(eq(accessLogs.tenantId, tenantId), eq(accessLogs.userId, userId)));

        // 4. Delete Sessions
        await tx.delete(sessions)
            .where(and(eq(sessions.tenantId, tenantId), eq(sessions.userId, userId)));

        // 5. Finally delete the user account
        await tx.delete(users)
            .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
    });
}
