import crypto from "node:crypto";
import { logger } from "../_core/logger";

/**
 * TOTP (Time-based One-Time Password) 2FA Service
 * Based on RFC 6238. Uses HMAC-SHA1 with 30-second time windows.
 *
 * Usage:
 * 1. Generate secret: `const secret = generateTOTPSecret()`
 * 2. Store secret on user record (encrypted)
 * 3. Show QR URI to user: `getTOTPUri(secret, email, 'CRM PRO')`
 * 4. On login, verify: `verifyTOTP(secret, userCode)`
 */

const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // seconds
const TOTP_WINDOW = 1;  // Allow 1 period before/after

/**
 * Generate a random Base32-encoded secret for TOTP.
 */
export function generateTOTPSecret(): string {
    const buffer = crypto.randomBytes(20);
    return base32Encode(buffer);
}

/**
 * Generate the current TOTP code for a given secret.
 */
export function generateTOTP(secret: string, timeOffset = 0): string {
    const time = Math.floor(Date.now() / 1000 / TOTP_PERIOD) + timeOffset;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(time));

    const key = base32Decode(secret);
    const hmac = crypto.createHmac("sha1", key);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const code =
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff);

    return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

/**
 * Verify a TOTP code against a secret.
 * Allows codes from the current window and ±TOTP_WINDOW periods.
 */
export function verifyTOTP(secret: string, code: string): boolean {
    for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
        const expected = generateTOTP(secret, i);
        if (timingSafeEqual(expected, code)) {
            return true;
        }
    }
    return false;
}

/**
 * Generate an otpauth:// URI for QR code generation.
 * Compatible with Google Authenticator, Authy, etc.
 */
export function getTOTPUri(secret: string, userEmail: string, issuer = "CRM PRO"): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedEmail = encodeURIComponent(userEmail);
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

// ── Helpers ──

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return crypto.timingSafeEqual(bufA, bufB);
}

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
    let result = "";
    let bits = 0;
    let value = 0;

    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            bits -= 5;
            result += BASE32_CHARS[(value >>> bits) & 0x1f];
        }
    }

    if (bits > 0) {
        result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
    }

    return result;
}

function base32Decode(encoded: string): Buffer {
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of encoded.toUpperCase()) {
        const idx = BASE32_CHARS.indexOf(char);
        if (idx === -1) continue;
        value = (value << 5) | idx;
        bits += 5;
        while (bits >= 8) {
            bits -= 8;
            bytes.push((value >>> bits) & 0xff);
        }
    }

    return Buffer.from(bytes);
}
