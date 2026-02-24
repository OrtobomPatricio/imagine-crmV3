import { logger as baseLogger } from "../_core/logger";

/**
 * PII Masking Utility for Logs
 * Redacts sensitive data (emails, phone numbers, names, IPs) from log output
 * to prevent accidental PII leakage into log files or aggregators.
 *
 * Usage:
 * ```ts
 * logger.info(maskPII({ email: "user@example.com", phone: "+5491155667788" }));
 * // → { email: "u***@e***.com", phone: "+54***67788" }
 * ```
 */

/**
 * Mask an email address: show first char + domain TLD
 * "user@example.com" → "u***@e***.com"
 */
export function maskEmail(email: string): string {
    if (!email || !email.includes("@")) return "***";
    const [local, domain] = email.split("@");
    const [domainName, ...tld] = domain.split(".");
    return `${local[0]}***@${domainName[0]}***.${tld.join(".")}`;
}

/**
 * Mask a phone number: show country code + last 5 digits
 * "+5491155667788" → "+54***67788"
 */
export function maskPhone(phone: string): string {
    if (!phone || phone.length < 8) return "***";
    const clean = phone.replace(/\s/g, "");
    return `${clean.slice(0, 3)}***${clean.slice(-5)}`;
}

/**
 * Mask a name: show first letter + asterisks
 * "Juan Pérez" → "J*** P***"
 */
export function maskName(name: string): string {
    if (!name) return "***";
    return name
        .split(" ")
        .map((part) => (part.length > 0 ? `${part[0]}***` : "***"))
        .join(" ");
}

/**
 * Mask an IP address
 * "192.168.1.42" → "192.168.*.*"
 */
export function maskIP(ip: string): string {
    if (!ip) return "***";
    const parts = ip.split(".");
    if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.*.*`;
    }
    return ip.replace(/:[\da-f]+:[\da-f]+$/i, ":*:*"); // IPv6
}

/**
 * Deep-mask an object by detecting and redacting PII fields.
 */
export function maskPII(obj: Record<string, any>): Record<string, any> {
    const masked: Record<string, any> = {};
    const PII_EMAIL_KEYS = ["email", "userEmail", "correo"];
    const PII_PHONE_KEYS = ["phone", "phoneNumber", "telefono", "whatsapp", "celular"];
    const PII_NAME_KEYS = ["fullName", "name", "nombre", "firstName", "lastName"];
    const PII_IP_KEYS = ["ip", "ipAddress", "remoteAddress"];

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string") {
            const lk = key.toLowerCase();
            if (PII_EMAIL_KEYS.some((k) => lk.includes(k.toLowerCase()))) {
                masked[key] = maskEmail(value);
            } else if (PII_PHONE_KEYS.some((k) => lk.includes(k.toLowerCase()))) {
                masked[key] = maskPhone(value);
            } else if (PII_NAME_KEYS.some((k) => lk.includes(k.toLowerCase()))) {
                masked[key] = maskName(value);
            } else if (PII_IP_KEYS.some((k) => lk.includes(k.toLowerCase()))) {
                masked[key] = maskIP(value);
            } else {
                masked[key] = value;
            }
        } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            masked[key] = maskPII(value);
        } else {
            masked[key] = value;
        }
    }

    return masked;
}
