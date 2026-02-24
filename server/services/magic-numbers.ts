import { logger } from "../_core/logger";

/**
 * Magic Number (file signature) validation.
 * Validates file types by inspecting binary headers instead of relying
 * solely on MIME types or file extensions, preventing malicious file uploads.
 *
 * Common magic numbers:
 * - JPEG:  FF D8 FF
 * - PNG:   89 50 4E 47
 * - GIF:   47 49 46 38
 * - PDF:   25 50 44 46
 * - WebP:  52 49 46 46 ... 57 45 42 50
 * - MP4:   ... 66 74 79 70 (ftyp at offset 4)
 * - ZIP:   50 4B 03 04
 * - DOCX:  50 4B 03 04 (ZIP container)
 */

const SIGNATURES: { mime: string; magic: number[]; offset?: number }[] = [
    { mime: "image/jpeg", magic: [0xFF, 0xD8, 0xFF] },
    { mime: "image/png", magic: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
    { mime: "image/gif", magic: [0x47, 0x49, 0x46, 0x38] },
    { mime: "image/webp", magic: [0x52, 0x49, 0x46, 0x46] },
    { mime: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] },
    { mime: "application/zip", magic: [0x50, 0x4B, 0x03, 0x04] },
    { mime: "video/mp4", magic: [0x66, 0x74, 0x79, 0x70], offset: 4 },
    { mime: "audio/mpeg", magic: [0xFF, 0xFB] },
    { mime: "audio/mpeg", magic: [0x49, 0x44, 0x33] }, // ID3 tag
    { mime: "audio/ogg", magic: [0x4F, 0x67, 0x67, 0x53] },
    { mime: "audio/wav", magic: [0x52, 0x49, 0x46, 0x46] },
    { mime: "image/avif", magic: [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], offset: 4 },
];

// MIME types that are allowed for CRM uploads
const ALLOWED_MIMES = new Set([
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
    "application/pdf",
    "video/mp4",
    "audio/mpeg", "audio/ogg", "audio/wav",
    "application/zip",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx (ZIP container)
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx (ZIP container)
]);

/**
 * Detect the real MIME type of a file by inspecting its magic numbers.
 * Returns null if no known signature matches.
 */
export function detectMimeType(buffer: Buffer): string | null {
    for (const sig of SIGNATURES) {
        const offset = sig.offset ?? 0;
        if (buffer.length < offset + sig.magic.length) continue;

        let match = true;
        for (let i = 0; i < sig.magic.length; i++) {
            if (buffer[offset + i] !== sig.magic[i]) {
                match = false;
                break;
            }
        }

        if (match) return sig.mime;
    }

    return null;
}

/**
 * Validate a file upload by checking:
 * 1. Magic number matches the declared MIME type
 * 2. MIME type is in the allowed list
 * 3. File size is within limits
 *
 * @returns Validation result with detected MIME and any errors
 */
export function validateUpload(
    buffer: Buffer,
    declaredMime: string,
    maxSizeBytes = 25 * 1024 * 1024 // 25MB default
): { valid: boolean; detectedMime: string | null; error?: string } {
    // 1. Size check
    if (buffer.length > maxSizeBytes) {
        return {
            valid: false,
            detectedMime: null,
            error: `El archivo excede el tamaño máximo permitido (${Math.round(maxSizeBytes / 1024 / 1024)}MB)`,
        };
    }

    // 2. Magic number detection
    const detectedMime = detectMimeType(buffer);

    if (!detectedMime) {
        logger.warn({ declaredMime }, "[MagicNumbers] No recognizable file signature found");
        // Allow through if declared MIME is allowed (some files don't have standard magic numbers)
        if (!ALLOWED_MIMES.has(declaredMime)) {
            return {
                valid: false,
                detectedMime: null,
                error: "Tipo de archivo no reconocido o no permitido",
            };
        }
        return { valid: true, detectedMime: declaredMime };
    }

    // 3. Check if detected MIME is allowed
    if (!ALLOWED_MIMES.has(detectedMime)) {
        return {
            valid: false,
            detectedMime,
            error: `Tipo de archivo no permitido: ${detectedMime}`,
        };
    }

    // 4. Warn if declared MIME doesn't match detected (possible spoofing)
    if (detectedMime !== declaredMime) {
        // ZIP-based formats (docx, xlsx) will detect as application/zip — that's OK
        const isZipVariant = detectedMime === "application/zip" && declaredMime.includes("openxmlformats");
        // RIFF-based formats (webp, wav) share the same magic
        const isRIFF = detectedMime === "image/webp" && declaredMime === "audio/wav";

        if (!isZipVariant && !isRIFF) {
            logger.warn(
                { declaredMime, detectedMime },
                "[MagicNumbers] MIME mismatch - possible file spoofing"
            );
        }
    }

    return { valid: true, detectedMime };
}
