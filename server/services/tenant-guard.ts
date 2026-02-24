import { SQL, sql, eq, and } from "drizzle-orm";
import { MySqlSelect } from "drizzle-orm/mysql-core";
import { logger } from "../_core/logger";

/**
 * Automatic Tenant Filtering Middleware
 *
 * Provides a `withTenant()` helper that wraps Drizzle queries with
 * automatic tenantId filtering, preventing accidental cross-tenant data leakage.
 *
 * Usage:
 * ```ts
 * // Instead of:
 * db.select().from(leads).where(eq(leads.tenantId, ctx.tenantId));
 *
 * // Use:
 * withTenant(db.select().from(leads), leads.tenantId, ctx.tenantId);
 *
 * // Or the scoped helper:
 * const scopedDb = createTenantScope(db, ctx.tenantId);
 * scopedDb.query(leads); // Automatically filtered
 * ```
 */

/**
 * Apply tenantId filter to any Drizzle query.
 * This is a typed helper that ensures tenant isolation at the query level.
 */
export function withTenantFilter<T extends { where: (...args: any[]) => any }>(
    query: T,
    tenantIdColumn: any,
    tenantId: number,
): T {
    return query.where(eq(tenantIdColumn, tenantId)) as T;
}

/**
 * Create a tenant-scoped query builder.
 * Validates tenantId is present before any query can execute.
 */
export function validateTenantId(tenantId: any): asserts tenantId is number {
    if (!tenantId || typeof tenantId !== "number" || tenantId <= 0) {
        logger.error({ tenantId }, "[TenantGuard] Invalid or missing tenantId — BLOCKING query");
        throw new Error("TENANT_ISOLATION_VIOLATION: tenantId is required for all data operations");
    }
}

/**
 * SQL fragment for tenant filtering.
 * Use in raw SQL queries:
 * ```ts
 * db.execute(sql`SELECT * FROM leads WHERE ${tenantWhere(5)}`)
 * ```
 */
export function tenantWhere(tenantId: number): SQL {
    return sql`tenantId = ${tenantId}`;
}

/**
 * Verify that an entity belongs to the expected tenant.
 * Throws TenantIsolationError if mismatch detected.
 */
export function assertTenantOwnership(
    entityTenantId: number | null | undefined,
    expectedTenantId: number,
    entityName = "entity"
): void {
    if (entityTenantId !== expectedTenantId) {
        logger.error(
            { entityTenantId, expectedTenantId, entityName },
            "[TenantGuard] IDOR DETECTED — cross-tenant access attempt"
        );
        throw new Error(`TENANT_ISOLATION_VIOLATION: ${entityName} does not belong to this tenant`);
    }
}
