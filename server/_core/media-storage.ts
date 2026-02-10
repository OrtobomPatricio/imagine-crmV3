import fs from "fs";
import path from "path";
import crypto from "crypto";

export const UPLOADS_DIR = path.resolve(process.cwd(), "storage", "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function sanitizeFilename(name: string): string {
  const base = path.basename(name || "file");
  // keep letters/numbers/.-_ and spaces; collapse others
  return base
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9._\- ]+/g, "_")
    .trim()
    .slice(0, 180) || "file";
}

function extFromMime(mime: string | null | undefined): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("jpeg")) return ".jpg";
  if (m.includes("png")) return ".png";
  if (m.includes("webp")) return ".webp";
  if (m.includes("gif")) return ".gif";
  if (m.includes("mp4")) return ".mp4";
  if (m.includes("3gpp")) return ".3gp";
  if (m.includes("quicktime")) return ".mov";
  if (m.includes("webm")) return ".webm";
  if (m.includes("mpeg")) return ".mp3";
  if (m.includes("mp3")) return ".mp3";
  if (m.includes("aac")) return ".aac";
  if (m.includes("m4a") || m.includes("mp4a") || m.includes("audio/mp4")) return ".m4a";
  if (m.includes("ogg")) return ".ogg";
  if (m.includes("opus")) return ".opus";
  if (m.includes("pdf")) return ".pdf";
  if (m.includes("zip")) return ".zip";
  if (m.includes("msword")) return ".doc";
  if (m.includes("wordprocessingml")) return ".docx";
  if (m.includes("spreadsheetml")) return ".xlsx";
  if (m.includes("presentationml")) return ".pptx";
  if (m.includes("text/plain")) return ".txt";
  return "";
}

export function saveBufferToUploads(opts: {
  buffer: Buffer;
  originalname?: string | null;
  mimetype?: string | null;
}): { filename: string; originalname: string; mimetype: string | null; url: string; size: number } {
  ensureUploadsDir();

  const original = sanitizeFilename(opts.originalname || "file");
  const ext = path.extname(original) || extFromMime(opts.mimetype);
  const baseNoExt = ext ? original.slice(0, -ext.length) : original;

  const safeBase = sanitizeFilename(baseNoExt).replace(/\s+/g, "_");
  const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  const filename = `${unique}-${safeBase}${ext || ""}`.slice(0, 240);

  const filepath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filepath, opts.buffer);

  return {
    filename,
    originalname: original,
    mimetype: opts.mimetype ?? null,
    url: `/api/uploads/${filename}`,
    size: opts.buffer.length,
  };
}
