import { logger } from "../_core/logger";
import { cacheGet, cacheSet, cacheInvalidate } from "./app-cache";

/**
 * Feature Flags Service
 *
 * Tenant-level feature toggles that control which features are available.
 * Flags can be set per-tenant or globally as defaults.
 *
 * Usage:
 * ```ts
 * if (await isFeatureEnabled("advanced_reports", tenantId)) { ... }
 * ```
 */

// Default feature flags (all tenants get these unless overridden)
const GLOBAL_DEFAULTS: Record<string, boolean> = {
    "whatsapp_cloud_api": true,
    "facebook_messenger": true,
    "helpdesk": true,
    "campaigns": true,
    "automations": true,
    "gamification": false,
    "advanced_reports": false,
    "ai_suggestions": false,
    "custom_fields": true,
    "csv_import": true,
    "api_access": false,
    "sla_management": false,
    "audit_logs": true,
    "2fa_required": false,
    "data_export": true,
    "onboarding_completed": false,
};

// In-memory store for tenant-specific overrides
// In production, this would come from a `feature_flags` DB table
const tenantOverrides = new Map<number, Record<string, boolean>>();

/**
 * Check if a feature is enabled for a specific tenant.
 */
export async function isFeatureEnabled(flag: string, tenantId: number): Promise<boolean> {
    // 1. Check cache
    const cacheKey = `flags:${tenantId}`;
    const cached = await cacheGet<Record<string, boolean>>(cacheKey);
    if (cached && flag in cached) return cached[flag];

    // 2. Check tenant overrides
    const overrides = tenantOverrides.get(tenantId);
    if (overrides && flag in overrides) return overrides[flag];

    // 3. Fall back to global defaults
    return GLOBAL_DEFAULTS[flag] ?? false;
}

/**
 * Get all feature flags for a tenant (merged: defaults + overrides).
 */
export async function getAllFlags(tenantId: number): Promise<Record<string, boolean>> {
    const overrides = tenantOverrides.get(tenantId) ?? {};
    const merged = { ...GLOBAL_DEFAULTS, ...overrides };

    // Cache for 5 min
    await cacheSet(`flags:${tenantId}`, merged, "settings");

    return merged;
}

/**
 * Set a feature flag override for a specific tenant.
 */
export async function setFeatureFlag(
    tenantId: number,
    flag: string,
    enabled: boolean
): Promise<void> {
    const current = tenantOverrides.get(tenantId) ?? {};
    current[flag] = enabled;
    tenantOverrides.set(tenantId, current);

    // Invalidate cache
    await cacheInvalidate(`flags:${tenantId}`);

    logger.info({ tenantId, flag, enabled }, "[FeatureFlags] Flag updated");
}

/**
 * Get available flag definitions with descriptions.
 */
export function getFlagDefinitions(): Array<{ key: string; label: string; category: string }> {
    return [
        { key: "whatsapp_cloud_api", label: "WhatsApp Cloud API", category: "Channels" },
        { key: "facebook_messenger", label: "Facebook Messenger", category: "Channels" },
        { key: "helpdesk", label: "Mesa de Ayuda", category: "Modules" },
        { key: "campaigns", label: "Campañas Marketing", category: "Modules" },
        { key: "automations", label: "Automatizaciones", category: "Modules" },
        { key: "gamification", label: "Gamificación", category: "Modules" },
        { key: "advanced_reports", label: "Reportes Avanzados", category: "Analytics" },
        { key: "ai_suggestions", label: "Sugerencias IA", category: "AI" },
        { key: "custom_fields", label: "Campos Personalizados", category: "Data" },
        { key: "csv_import", label: "Importación CSV", category: "Data" },
        { key: "api_access", label: "Acceso API", category: "Developer" },
        { key: "sla_management", label: "Gestión SLA", category: "Enterprise" },
        { key: "audit_logs", label: "Logs de Auditoría", category: "Security" },
        { key: "2fa_required", label: "2FA Obligatorio", category: "Security" },
        { key: "data_export", label: "Exportación de Datos", category: "GDPR" },
    ];
}
