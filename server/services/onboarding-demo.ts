import { getDb } from "../db";
import { leads, pipelines, pipelineStages, chatMessages, conversations } from "../../drizzle/schema";
import { logger } from "../_core/logger";

/**
 * Onboarding Demo Service
 * Seeds initial data to make the CRM feel alive for new users.
 */

export async function createDemoData(tenantId: number, userId: number) {
    const db = await getDb();
    if (!db) return;

    try {
        logger.info({ tenantId }, "[Onboarding] Seeding demo data");

        // 1. Create a Default Pipeline if none exists
        const [pipeline] = await db.insert(pipelines).values({
            tenantId,
            name: "Ventas Demo",
            description: "Pipeline de ejemplo cargado durante el onboarding",
        } as any);

        const pipelineId = (pipeline as any).insertId;

        // 2. Create Stages
        const stages = [
            { name: "Contacto Inicial", color: "#3b82f6", order: 1 },
            { name: "En Negociación", color: "#f59e0b", order: 2 },
            { name: "Cerrado Ganado", color: "#10b981", order: 3 },
        ];

        for (const s of stages) {
            await db.insert(pipelineStages).values({
                tenantId,
                pipelineId,
                name: s.name,
                color: s.color,
                order: s.order
            });
        }

        // Get the first stage ID for leads
        const [firstStage] = await db
            .select()
            .from(pipelineStages)
            .where(eq(pipelineStages.pipelineId, pipelineId))
            .limit(1);

        // 3. Create Demo Leads
        const demoLeads = [
            { name: "Juan Pérez", email: "juan@ejemplo.com", phone: "+541122334455" },
            { name: "María García", email: "maria@ejemplo.com", phone: "+541166778899" },
            { name: "Tech Solutions", email: "info@tech.com", phone: "+541199887766" },
        ];

        for (const l of demoLeads) {
            await db.insert(leads).values({
                tenantId,
                name: l.name,
                email: l.email,
                phone: l.phone,
                status: "new",
                pipelineStageId: firstStage?.id ?? null,
                assignedToId: userId
            } as any);
        }

        return { success: true };
    } catch (err) {
        logger.error({ tenantId, err }, "[Onboarding] Demo seeding failed");
        return { success: false };
    }
}

import { eq } from "drizzle-orm";
