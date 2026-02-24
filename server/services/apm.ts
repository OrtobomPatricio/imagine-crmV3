import * as Sentry from "@sentry/node";
import { logger } from "../_core/logger";

/**
 * APM (Application Performance Monitoring) with Sentry
 *
 * Initializes Sentry for error tracking AND performance monitoring.
 * Captures:
 * - Unhandled exceptions and rejections
 * - tRPC procedure performance (transactions)
 * - Database query durations
 * - HTTP request spans
 *
 * Environment Variables:
 * - SENTRY_DSN: Your Sentry project DSN
 * - SENTRY_TRACES_SAMPLE_RATE: Sampling rate 0.0 - 1.0 (default: 0.2)
 * - SENTRY_ENVIRONMENT: 'production' | 'staging' | 'development'
 */

const SENTRY_DSN = process.env.SENTRY_DSN;
const TRACES_SAMPLE_RATE = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.2");
const ENVIRONMENT = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development";

/**
 * Initialize Sentry APM. Call once during server startup.
 */
export function initAPM(): void {
    if (!SENTRY_DSN) {
        logger.info("[APM] Sentry DSN not set — performance monitoring disabled");
        return;
    }

    Sentry.init({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,
        tracesSampleRate: TRACES_SAMPLE_RATE,
        profilesSampleRate: TRACES_SAMPLE_RATE,
        integrations: [
            Sentry.httpIntegration(),
            Sentry.expressIntegration(),
        ],
        beforeSend(event) {
            // Scrub PII from error reports
            if (event.request?.headers) {
                delete event.request.headers["authorization"];
                delete event.request.headers["cookie"];
            }
            return event;
        },
    });

    logger.info(
        { environment: ENVIRONMENT, tracesSampleRate: TRACES_SAMPLE_RATE },
        "[APM] Sentry initialized with performance monitoring"
    );
}

/**
 * Create a performance transaction for a tRPC procedure.
 */
export function startTransaction(name: string, op = "trpc.procedure") {
    if (!SENTRY_DSN) return null;
    return Sentry.startSpan({ name, op }, () => { });
}

/**
 * Capture a custom metric.
 */
export function captureMetric(name: string, value: number, unit: string = "millisecond") {
    if (!SENTRY_DSN) return;
    try {
        Sentry.metrics.distribution(name, value, { unit });
    } catch {
        // Sentry metrics may not be available in all SDKs
    }
}

/**
 * Wrap an async function with Sentry error capturing.
 */
export async function withAPM<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!SENTRY_DSN) return fn();

    return Sentry.startSpan({ name, op: "function" }, async () => {
        try {
            return await fn();
        } catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
