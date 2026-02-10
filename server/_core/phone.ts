/**
 * Phone helpers
 *
 * We store contactPhone in the DB using a predictable E.164-ish format: "+<digits>".
 * (No spaces, no dashes, no @domain suffix)
 *
 * For WhatsApp Cloud API requests, Meta expects digits only (international format),
 * so use toWhatsAppCloudTo().
 */

export function normalizeContactPhone(input: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  // Remove WhatsApp JID suffix if present (e.g. 595...@s.whatsapp.net)
  const beforeAt = raw.includes("@") ? raw.split("@")[0] : raw;

  // Keep digits only
  const digits = beforeAt.replace(/\D+/g, "");
  if (!digits) return "";

  return `+${digits}`;
}

export function toWhatsAppCloudTo(e164ish: string): string {
  return String(e164ish ?? "").replace(/\D+/g, "");
}
