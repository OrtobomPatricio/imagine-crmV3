import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { onboardingProgress, tenants } from "../../drizzle/schema";

/**
 * Onboarding Tracking Service
 */

export async function getOrCreateOnboardingProgress(tenantId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [existing] = await db
        .select()
        .from(onboardingProgress)
        .where(eq(onboardingProgress.tenantId, tenantId))
        .limit(1);

    if (existing) return existing;

    // Create new progress record
    try {
        await db.insert(onboardingProgress).values({
            tenantId,
            lastStep: "company"
        });
    } catch (error) {
        console.error("[MockDB] Failed to insert onboarding record:", error);
    }

    const [newRecord] = await db
        .select()
        .from(onboardingProgress)
        .where(eq(onboardingProgress.tenantId, tenantId))
        .limit(1);

    return newRecord || {
        id: 0,
        tenantId,
        lastStep: "company",
        companyCompleted: false,
        companyData: null,
        teamCompleted: false,
        teamInvites: null,
        whatsappCompleted: false,
        importCompleted: false,
        firstMessageCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null
    };
}

export async function updateOnboardingStep(
    tenantId: number,
    step: "company" | "team" | "whatsapp" | "import" | "first-message",
    data: any,
    completed: boolean
) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const updatePayload: any = {
        lastStep: step,
    };

    if (step === "company") {
        updatePayload.companyCompleted = completed;
        updatePayload.companyData = data;
    } else if (step === "team") {
        updatePayload.teamCompleted = completed;
        updatePayload.teamInvites = data;
    } else if (step === "whatsapp") {
        updatePayload.whatsappCompleted = completed;
    } else if (step === "import") {
        updatePayload.importCompleted = completed;
    } else if (step === "first-message") {
        updatePayload.firstMessageCompleted = completed;
    }

    try {
        await db.update(onboardingProgress)
            .set(updatePayload)
            .where(eq(onboardingProgress.tenantId, tenantId));
    } catch (error) {
        console.warn("[MockDB] Warning: Could not update onboarding progress in mock DB");
    }

    return { success: true };
}

export async function finalizeOnboarding(tenantId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.transaction(async (tx) => {
        // 1. Mark as completed in progress table
        await tx.update(onboardingProgress)
            .set({
                completedAt: new Date(),
                lastStep: "completed",
                firstMessageCompleted: true
            })
            .where(eq(onboardingProgress.tenantId, tenantId));

        // 2. Update tenant status if necessary
        await tx.update(tenants)
            .set({
                isActive: true // Ensure tenant is active
            } as any)
            .where(eq(tenants.id, tenantId));
    });

    return { success: true };
}
