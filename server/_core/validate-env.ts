import { ENV } from "./env";

export function validateProductionSecrets() {
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) return;

    const INSECURE_DEFAULTS = [
        "dev-secret-change-me",
        "CHANGE_ME",
        "dev-owner",
        "",
    ];

    // Check JWT_SECRET
    if (INSECURE_DEFAULTS.includes(ENV.cookieSecret)) {
        throw new Error(
            "🔴 PRODUCTION SECURITY ERROR: JWT_SECRET must be set to a secure value. Cannot use default 'dev-secret-change-me'"
        );
    }

    // Check DATA_ENCRYPTION_KEY if encryption features are used
    if (ENV.dataEncryptionKey && (INSECURE_DEFAULTS.includes(ENV.dataEncryptionKey) || ENV.dataEncryptionKey.length < 32)) {
        throw new Error(
            "🔴 PRODUCTION SECURITY ERROR: DATA_ENCRYPTION_KEY must be set to a secure value. Debe tener al menos 32 caracteres y no puede ser el valor por defecto 'CHANGE_ME'"
        );
    }

    // Check for OWNER_OPEN_ID or OWNER_EMAIL
    if (!process.env.OWNER_OPEN_ID && !process.env.OWNER_EMAIL) {
        const error = new Error("🔴 PRODUCTION SECURITY ERROR: Either OWNER_OPEN_ID or OWNER_EMAIL must be set. Cannot use 'dev-owner'");
        logger.fatal({ err: safeError(error) }, "startup failed");
        throw error;
    }

    if (process.env.OWNER_OPEN_ID === "dev-owner" && !process.env.OWNER_EMAIL) {
        const error = new Error("🔴 PRODUCTION SECURITY ERROR: OWNER_OPEN_ID cannot be 'dev-owner' in production unless OWNER_EMAIL is set");
        logger.fatal({ err: safeError(error) }, "startup failed");
        throw error;
    }
    console.log("✅ Production environment variables validated successfully");
}
