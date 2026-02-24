import { describe, it, expect } from "vitest";
import { validatePassword } from "../../server/services/password-policy";
import { encryptPII, decryptPII, isEncrypted } from "../../server/services/pii-encryption";
import { maskEmail, maskPhone, maskName, maskIP, maskPII } from "../../server/services/pii-masking";
import { generateTOTPSecret, generateTOTP, verifyTOTP, getTOTPUri } from "../../server/services/totp";
import { detectMimeType, validateUpload } from "../../server/services/magic-numbers";

describe("Security Services Integration", () => {

    describe("Password Policy", () => {
        it("should reject short passwords", () => {
            const result = validatePassword("short");
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it("should accept strong passwords", () => {
            const result = validatePassword("MyStr0ng!Pass#2024");
            expect(result.valid).toBe(true);
            expect(result.strength).toBe("excellent");
        });

        it("should reject common passwords", () => {
            const result = validatePassword("password123");
            expect(result.valid).toBe(false);
        });

        it("should require all character types", () => {
            const noUpper = validatePassword("mystrongpass!123");
            expect(noUpper.valid).toBe(false);

            const noSpecial = validatePassword("MyStr0ngPassWord");
            expect(noSpecial.valid).toBe(false);
        });
    });

    describe("PII Encryption", () => {
        it("should encrypt and decrypt correctly", () => {
            // Only works if PII_ENCRYPTION_KEY is set, otherwise passthrough
            const original = "test@example.com";
            const encrypted = encryptPII(original);
            const decrypted = decryptPII(encrypted);

            // If key is set, it encrypts; otherwise passthrough
            if (encrypted.startsWith("pii:")) {
                expect(isEncrypted(encrypted)).toBe(true);
                expect(decrypted).toBe(original);
            } else {
                expect(encrypted).toBe(original);
            }
        });

        it("should passthrough non-encrypted values", () => {
            expect(decryptPII("plaintext")).toBe("plaintext");
            expect(isEncrypted("plaintext")).toBe(false);
        });
    });

    describe("PII Masking", () => {
        it("should mask emails", () => {
            expect(maskEmail("user@example.com")).toBe("u***@e***.com");
        });

        it("should mask phone numbers", () => {
            const masked = maskPhone("+5491155667788");
            expect(masked).toContain("***");
            expect(masked.length).toBeLessThan("+5491155667788".length);
        });

        it("should mask names", () => {
            expect(maskName("Juan Pérez")).toBe("J*** P***");
        });

        it("should mask IPs", () => {
            expect(maskIP("192.168.1.42")).toBe("192.168.*.*");
        });

        it("should deep-mask objects", () => {
            const masked = maskPII({
                email: "user@example.com",
                phoneNumber: "+5491155667788",
                fullName: "Juan Pérez",
                unrelated: "keep this",
            });
            expect(masked.email).toContain("***");
            expect(masked.phoneNumber).toContain("***");
            expect(masked.fullName).toContain("***");
            expect(masked.unrelated).toBe("keep this");
        });
    });

    describe("TOTP (2FA)", () => {
        it("should generate a Base32 secret", () => {
            const secret = generateTOTPSecret();
            expect(secret).toMatch(/^[A-Z2-7]+$/);
            expect(secret.length).toBeGreaterThanOrEqual(16);
        });

        it("should generate valid TOTP code", () => {
            const secret = generateTOTPSecret();
            const code = generateTOTP(secret);
            expect(code).toMatch(/^\d{6}$/);
        });

        it("should verify correct code", () => {
            const secret = generateTOTPSecret();
            const code = generateTOTP(secret);
            expect(verifyTOTP(secret, code)).toBe(true);
        });

        it("should reject wrong code", () => {
            const secret = generateTOTPSecret();
            expect(verifyTOTP(secret, "000000")).toBe(false);
        });

        it("should generate otpauth URI", () => {
            const secret = generateTOTPSecret();
            const uri = getTOTPUri(secret, "user@test.com");
            expect(uri).toContain("otpauth://totp/");
            expect(uri).toContain(secret);
            expect(uri).toContain("user%40test.com");
        });
    });

    describe("Magic Numbers Validation", () => {
        it("should detect JPEG", () => {
            const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
            expect(detectMimeType(jpeg)).toBe("image/jpeg");
        });

        it("should detect PNG", () => {
            const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
            expect(detectMimeType(png)).toBe("image/png");
        });

        it("should detect PDF", () => {
            const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E]);
            expect(detectMimeType(pdf)).toBe("application/pdf");
        });

        it("should return null for unknown signatures", () => {
            const unknown = Buffer.from([0x00, 0x00, 0x00, 0x00]);
            expect(detectMimeType(unknown)).toBeNull();
        });

        it("should validate uploads", () => {
            const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
            const result = validateUpload(jpeg, "image/jpeg");
            expect(result.valid).toBe(true);
        });

        it("should reject oversized files", () => {
            const big = Buffer.alloc(30 * 1024 * 1024); // 30MB
            const result = validateUpload(big, "image/jpeg");
            expect(result.valid).toBe(false);
            expect(result.error).toContain("tamaño");
        });
    });
});
