import { logger } from "../_core/logger";

/**
 * Image compression middleware using Sharp.
 * Optimizes uploaded images to reduce storage and bandwidth costs.
 *
 * Features:
 * - Resizes images above MAX_DIMENSION to fit within bounds
 * - Converts to WebP format for best compression
 * - Maintains aspect ratio
 * - Falls back gracefully if Sharp is not installed
 */

const MAX_DIMENSION = 1920; // Max width or height
const QUALITY = 80;         // WebP quality (0-100)

/**
 * Compress an image buffer and return the optimized version.
 * Returns the original buffer if Sharp is unavailable or compression fails.
 */
export async function compressImage(
    buffer: Buffer,
    mimeType: string,
    options?: { maxDimension?: number; quality?: number }
): Promise<{ buffer: Buffer; mimeType: string; compressed: boolean }> {
    // Only process actual images
    const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!imageTypes.includes(mimeType)) {
        return { buffer, mimeType, compressed: false };
    }

    // Skip GIFs (animation would be lost)
    if (mimeType === "image/gif") {
        return { buffer, mimeType, compressed: false };
    }

    try {
        const sharp = (await import("sharp")).default;
        const maxDim = options?.maxDimension ?? MAX_DIMENSION;
        const quality = options?.quality ?? QUALITY;

        const metadata = await sharp(buffer).metadata();
        const needsResize =
            (metadata.width && metadata.width > maxDim) ||
            (metadata.height && metadata.height > maxDim);

        let pipeline = sharp(buffer);

        if (needsResize) {
            pipeline = pipeline.resize(maxDim, maxDim, {
                fit: "inside",
                withoutEnlargement: true,
            });
        }

        const compressed = await pipeline
            .webp({ quality })
            .toBuffer();

        const savings = buffer.length - compressed.length;
        const savingsPercent = Math.round((savings / buffer.length) * 100);

        logger.info(
            { originalKB: Math.round(buffer.length / 1024), compressedKB: Math.round(compressed.length / 1024), savingsPercent },
            "[ImageCompress] Optimized image"
        );

        return { buffer: compressed, mimeType: "image/webp", compressed: true };
    } catch (error: any) {
        if (error?.code === "MODULE_NOT_FOUND") {
            logger.warn("[ImageCompress] Sharp not installed, skipping compression");
        } else {
            logger.error({ err: error }, "[ImageCompress] Compression failed, using original");
        }
        return { buffer, mimeType, compressed: false };
    }
}
