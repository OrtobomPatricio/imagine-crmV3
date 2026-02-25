import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import {
    users,
    leads,
    conversations,
    chatMessages,
    accessLogs,
    sessions,
    appSettings,
    integrations
} from "../../drizzle/schema";

/**
 * GDPR Export Service
 * implements Right of Access (Art. 15) and Data Portability (Art. 20).
 */

export async function exportUserData(userId: number, tenantId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 1. Basic User Profile
    const [userRecord] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .limit(1);

    if (!userRecord) return null;

    // 2. Leads assigned to user
    const userLeads = await db
        .select()
        .from(leads)
        .where(and(eq(leads.tenantId, tenantId), eq(leads.assignedToId, userId)));

    // 3. Conversations and Messages
    const userConversations = await db
        .select()
        .from(conversations)
        .where(eq(conversations.tenantId, tenantId));

    const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.tenantId, tenantId));

    // 4. Activity Logs
    const logs = await db
        .select()
        .from(accessLogs)
        .where(and(eq(accessLogs.tenantId, tenantId), eq(accessLogs.userId, userId)))
        .limit(500); // Caps for export sanity

    // 5. Active Sessions
    const userSessions = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.tenantId, tenantId), eq(sessions.userId, userId)));

    // 6. Settings & Integrations
    const settings = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.tenantId, tenantId));

    const tenantIntegrations = await db
        .select()
        .from(integrations)
        .where(eq(integrations.tenantId, tenantId));

    return {
        metadata: {
            exportDate: new Date().toISOString(),
            schemaVersion: "1.0.0",
            tenantId,
            userId,
        },
        profile: {
            name: userRecord.name,
            email: userRecord.email,
            role: userRecord.role,
            createdAt: userRecord.createdAt,
            lastSignedIn: userRecord.lastSignedIn,
            gdpr: {
                consentAt: userRecord.gdprConsentAt,
                marketingConsent: userRecord.marketingConsent,
            }
        },
        data: {
            leads: userLeads,
            conversations: userConversations,
            messages: messages.filter(m => (m as any).userId === userId),
            activityLogs: logs,
            sessions: userSessions,
            settings,
            integrations: tenantIntegrations
        }
    };
}
