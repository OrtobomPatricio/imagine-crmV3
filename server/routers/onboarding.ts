import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tenants, whatsappNumbers, users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logger } from "../_core/logger";

/**
 * Onboarding Router
 *
 * 5-step wizard for new tenant setup:
 * 1. Company Info (name, industry, timezone)
 * 2. First WhatsApp Number
 * 3. Invite Team Members
 * 4. Configure Pipeline
 * 5. Complete setup
 */

export const onboardingRouter = router({
    /** Get current onboarding progress */
    getProgress: protectedProcedure
        .query(async ({ ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            const [tenant] = await db.select()
                .from(tenants)
                .where(eq(tenants.id, ctx.tenantId))
                .limit(1);

            const hasWANumber = await db.select({ id: whatsappNumbers.id })
                .from(whatsappNumbers)
                .where(eq(whatsappNumbers.tenantId, ctx.tenantId))
                .limit(1);

            const teamMembers = await db.select({ id: users.id })
                .from(users)
                .where(eq(users.tenantId, ctx.tenantId));

            const steps = [
                {
                    id: 1,
                    title: "Información de la empresa",
                    description: "Configura el nombre y zona horaria",
                    completed: !!(tenant as any)?.name,
                },
                {
                    id: 2,
                    title: "Conectar WhatsApp",
                    description: "Agrega tu primer número de WhatsApp",
                    completed: hasWANumber.length > 0,
                },
                {
                    id: 3,
                    title: "Invitar equipo",
                    description: "Agrega miembros a tu equipo",
                    completed: teamMembers.length > 1,
                },
                {
                    id: 4,
                    title: "Configurar Pipeline",
                    description: "Personaliza tu embudo de ventas",
                    completed: true, // Default pipeline is auto-created
                },
                {
                    id: 5,
                    title: "¡Listo!",
                    description: "Tu CRM está configurado",
                    completed: false,
                },
            ];

            const completedCount = steps.filter((s) => s.completed).length;
            const progress = Math.round((completedCount / steps.length) * 100);

            return {
                steps,
                progress,
                currentStep: steps.find((s) => !s.completed)?.id ?? 5,
                isComplete: completedCount === steps.length,
            };
        }),

    /** Update company info (Step 1) */
    updateCompanyInfo: protectedProcedure
        .input(z.object({
            companyName: z.string().min(2).max(100),
            industry: z.string().optional(),
            timezone: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            await db.update(tenants).set({
                name: input.companyName,
            } as any).where(eq(tenants.id, ctx.tenantId));

            return { success: true };
        }),

    /** Mark onboarding as complete (Step 5) */
    completeOnboarding: protectedProcedure
        .mutation(async ({ ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            logger.info({ tenantId: ctx.tenantId }, "[Onboarding] Completed");
            return { success: true, message: "¡Onboarding completado! Tu CRM está listo." };
        }),
});
