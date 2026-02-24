/**
 * Environment Variable Validation
 * 
 * Validates critical environment variables on startup.
 * Prevents the application from running with weak/insecure configuration.
 */

import { logger } from "./logger";

const CRITICAL_SECRETS = [
    { name: "JWT_SECRET", minLength: 32 },
    { name: "DATA_ENCRYPTION_KEY", minLength: 32 },
    { name: "COOKIE_SECRET", minLength: 32 },
];

const WEAK_PATTERNS = [
    /^(password|secret|key|test|dev|123|abc)/i,
    /^(change_me|changeme|default|example)/i,
];

export function validateEnvironment(): void {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check Node environment
    if (process.env.NODE_ENV === "production") {
        // In production, ensure dev flags are disabled
        if (process.env.VITE_DEV_BYPASS_AUTH === "1") {
            errors.push("VITE_DEV_BYPASS_AUTH must be disabled in production");
        }
        if (process.env.ALLOW_DEV_LOGIN === "1") {
            errors.push("ALLOW_DEV_LOGIN must be disabled in production");
        }
    }

    // Validate critical secrets
    for (const secret of CRITICAL_SECRETS) {
        const value = process.env[secret.name];
        
        if (!value) {
            errors.push(`${secret.name} is not set`);
            continue;
        }

        if (value.length < secret.minLength) {
            errors.push(`${secret.name} must be at least ${secret.minLength} characters long (current: ${value.length})`);
        }

        // Check for weak patterns
        for (const pattern of WEAK_PATTERNS) {
            if (pattern.test(value)) {
                errors.push(`${secret.name} appears to be using a weak/default value`);
                break;
            }
        }

        // Check for predictable patterns
        if (/^[a-zA-Z0-9]*$/.test(value) && value.length < 50) {
            warnings.push(`${secret.name} should be more complex (include special characters)`);
        }
    }

    // Validate database URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        errors.push("DATABASE_URL is not set");
    } else if (dbUrl.includes("@localhost") || dbUrl.includes("@127.0.0.1")) {
        if (process.env.NODE_ENV === "production") {
            warnings.push("DATABASE_URL points to localhost - ensure this is intentional");
        }
    }

    // Validate Redis URL
    if (!process.env.REDIS_URL && process.env.NODE_ENV === "production") {
        warnings.push("REDIS_URL is not set - some features may not work correctly");
    }

    // Log warnings
    for (const warning of warnings) {
        logger.warn(`[EnvValidation] WARNING: ${warning}`);
    }

    // Throw error if critical issues found
    if (errors.length > 0) {
        logger.error("[EnvValidation] CRITICAL ERRORS FOUND:");
        for (const error of errors) {
            logger.error(`  - ${error}`);
        }
        logger.error("\n[EnvValidation] Application startup aborted due to insecure configuration.");
        logger.error("[EnvValidation] Please fix the above issues in your .env file.\n");
        
        throw new Error(`Environment validation failed: ${errors.join(", ")}`);
    }

    logger.info("[EnvValidation] ✓ Environment variables validated successfully");
}
