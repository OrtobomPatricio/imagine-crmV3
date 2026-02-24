import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

/**
 * Timestamp-based Optimistic Locking for concurrent edit resolution.
 *
 * Usage pattern in a router:
 * ```ts
 * .mutation(async ({ input, ctx }) => {
 *   await checkConflict(db, leads, leads.id, input.id, input.updatedAt, ctx.tenantId);
 *   // ... proceed with update
 * })
 * ```
 *
 * The client sends the `updatedAt` timestamp it last read. If the server's
 * row has a newer timestamp, we reject with CONFLICT to prevent silent overwrites.
 */
export async function checkConflict(
    db: any,
    table: any,
    idColumn: any,
    recordId: number,
    clientUpdatedAt: string | Date | undefined,
    tenantId: number,
): Promise<void> {
    if (!clientUpdatedAt) return; // Skip if client doesn't send timestamp

    const clientTs = new Date(clientUpdatedAt).getTime();

    const rows = await db.select({ updatedAt: table.updatedAt })
        .from(table)
        .where(and(eq(idColumn, recordId), eq(table.tenantId, tenantId)))
        .limit(1);

    if (rows.length === 0) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "El registro no existe o no tienes acceso.",
        });
    }

    const serverTs = new Date(rows[0].updatedAt).getTime();

    if (serverTs > clientTs) {
        throw new TRPCError({
            code: "CONFLICT",
            message: "Este registro fue modificado por otro usuario. Recarga la página e intenta de nuevo.",
        });
    }
}
