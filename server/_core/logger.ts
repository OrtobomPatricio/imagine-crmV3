import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

/**
 * Global structured logger.
 * - JSON logs by default (good for Loki/ELK/GCP/AWS)
 * - Redacts common secrets
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  base: undefined, // avoid pid/hostname noise; add in your log pipeline if needed
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers.x-hub-signature-256",
      "req.headers.x-hub-signature",
      "accessToken",
      "token",
      "password",
      "*.accessToken",
      "*.token",
      "*.password",
      "*.secret",
      "secret",
      "DATA_ENCRYPTION_KEY",
    ],
    remove: true,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function safeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: isProd ? undefined : err.stack,
    };
  }
  return { message: String(err) };
}
