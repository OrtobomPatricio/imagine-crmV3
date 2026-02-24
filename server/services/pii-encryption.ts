import crypto from "node:crypto";
import { logger } from "../_core/logger";

/**
 * PII (Personally Identifiable Information) Field-Level Encryption
 *
 * Encrypts sensitive data at rest using AES-256-GCM.
 * The encryption key is derived from PII_ENCRYPTION_KEY env var.
 *
 * Fields to encrypt: phoneNumber, email, fullName (depending on compliance needs)
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length
const TAG_LENGTH = 16;
const ENCODING = "base64" as const;

// Key derivation from env
function getEncryptionKey(): Buffer {
    const rawKey = process.env.PII_ENCRYPTION_KEY;
    if (!rawKey) {
        logger.warn("[PII] PII_ENCRYPTION_KEY not set - encryption disabled");
        return Buffer.alloc(0);
    }
    // Derive a 256-bit key from the provided secret using SHA-256
    return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Encrypt a plaintext string.
 * Returns base64-encoded: IV + AuthTag + Ciphertext
 */
export function encryptPII(plaintext: string): string {
    const key = getEncryptionKey();
    if (key.length === 0) return plaintext; // Passthrough if no key

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();

    // Pack: IV (12) + Tag (16) + Ciphertext
    const packed = Buffer.concat([iv, tag, encrypted]);
    return `pii:${packed.toString(ENCODING)}`;
}

/**
 * Decrypt a PII-encrypted string.
 * Returns the original plaintext.
 */
export function decryptPII(ciphertext: string): string {
    if (!ciphertext.startsWith("pii:")) return ciphertext; // Not encrypted

    const key = getEncryptionKey();
    if (key.length === 0) return ciphertext;

    try {
        const packed = Buffer.from(ciphertext.slice(4), ENCODING);

        const iv = packed.subarray(0, IV_LENGTH);
        const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const encrypted = packed.subarray(IV_LENGTH + TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString("utf8");
    } catch (error) {
        logger.error({ err: error }, "[PII] Decryption failed");
        return "[ENCRYPTED]";
    }
}

/**
 * Check if a value is PII-encrypted.
 */
export function isEncrypted(value: string): boolean {
    return value.startsWith("pii:");
}
