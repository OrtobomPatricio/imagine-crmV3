import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { termsAcceptance } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logger } from "../_core/logger";

/**
 * Terms of Service Router
 *
 * Tracks user acceptance of Terms of Service versions.
 * Each acceptance is recorded with IP, user agent, and timestamp
 * for legal compliance and audit trail.
 */

/** Current active terms version */
const CURRENT_TERMS_VERSION = "1.0.0";

export const termsRouter = router({
    /** Get the current terms version */
    getCurrentVersion: protectedProcedure
        .query(() => {
            return {
                version: CURRENT_TERMS_VERSION,
                effectiveDate: "2026-02-24",
                lastUpdated: "2026-02-24",
            };
        }),

    /** Check if the current user has accepted the current version */
    checkAcceptance: protectedProcedure
        .query(async ({ ctx }) => {
            const db = await getDb();
            if (!db) return { accepted: false, version: CURRENT_TERMS_VERSION };

            const [record] = await db
                .select()
                .from(termsAcceptance)
                .where(and(
                    eq(termsAcceptance.tenantId, ctx.tenantId),
                    eq(termsAcceptance.userId, ctx.user!.id),
                    eq(termsAcceptance.termsVersion, CURRENT_TERMS_VERSION),
                ))
                .limit(1);

            return {
                accepted: !!record,
                version: CURRENT_TERMS_VERSION,
                acceptedAt: record?.acceptedAt?.toISOString() ?? null,
            };
        }),

    /** Accept the current terms version */
    accept: protectedProcedure
        .input(z.object({
            termsVersion: z.string().min(1),
            ipAddress: z.string().optional(),
            userAgent: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (input.termsVersion !== CURRENT_TERMS_VERSION) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: `Versión de términos inválida. Versión actual: ${CURRENT_TERMS_VERSION}`,
                });
            }

            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            // Check if already accepted
            const [existing] = await db
                .select({ id: termsAcceptance.id })
                .from(termsAcceptance)
                .where(and(
                    eq(termsAcceptance.tenantId, ctx.tenantId),
                    eq(termsAcceptance.userId, ctx.user!.id),
                    eq(termsAcceptance.termsVersion, input.termsVersion),
                ))
                .limit(1);

            if (existing) {
                return { success: true, message: "Términos ya aceptados previamente." };
            }

            await db.insert(termsAcceptance).values({
                tenantId: ctx.tenantId,
                userId: ctx.user!.id,
                termsVersion: input.termsVersion,
                ipAddress: input.ipAddress ?? null,
                userAgent: input.userAgent ?? null,
            });

            logger.info(
                { tenantId: ctx.tenantId, userId: ctx.user!.id, version: input.termsVersion },
                "[Terms] Acceptance recorded"
            );

            return { success: true, message: "Términos aceptados correctamente." };
        }),

    /** Get acceptance history for the current user */
    getHistory: protectedProcedure
        .query(async ({ ctx }) => {
            const db = await getDb();
            if (!db) return [];

            const history = await db
                .select({
                    id: termsAcceptance.id,
                    termsVersion: termsAcceptance.termsVersion,
                    acceptedAt: termsAcceptance.acceptedAt,
                    ipAddress: termsAcceptance.ipAddress,
                })
                .from(termsAcceptance)
                .where(and(
                    eq(termsAcceptance.tenantId, ctx.tenantId),
                    eq(termsAcceptance.userId, ctx.user!.id),
                ))
                .orderBy(desc(termsAcceptance.acceptedAt));

            return history;
        }),
});
