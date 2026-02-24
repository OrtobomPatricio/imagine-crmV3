import { logger } from "../_core/logger";

/** Simple in-memory email queue with retry logic.
 *
 * For production use with Redis, replace this with BullMQ:
 * ```ts
 * import { Queue, Worker } from "bullmq";
 * const emailQueue = new Queue("emails", { connection: redis });
 * ```
 *
 * This implementation uses an in-memory array with a processing loop,
 * suitable for single-server deployments.
 */

interface EmailJob {
    id: string;
    to: string;
    subject: string;
    html: string;
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
    status: "pending" | "processing" | "sent" | "failed";
    lastError?: string;
}

const queue: EmailJob[] = [];
let isProcessing = false;
const MAX_CONCURRENT = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Add an email to the sending queue.
 */
export function enqueueEmail(to: string, subject: string, html: string, maxAttempts = 3): string {
    const job: EmailJob = {
        id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        to,
        subject,
        html,
        attempts: 0,
        maxAttempts,
        createdAt: new Date(),
        status: "pending",
    };
    queue.push(job);
    logger.info({ jobId: job.id, to }, "[EmailQueue] Job enqueued");
    processQueue(); // Trigger processing
    return job.id;
}

/**
 * Process the email queue.
 * In a real implementation, this would use nodemailer or SES.
 */
async function processQueue(): Promise<void> {
    if (isProcessing) return;
    isProcessing = true;

    while (queue.some((j) => j.status === "pending")) {
        const batch = queue
            .filter((j) => j.status === "pending")
            .slice(0, MAX_CONCURRENT);

        await Promise.allSettled(
            batch.map(async (job) => {
                job.status = "processing";
                job.attempts++;

                try {
                    await sendEmail(job);
                    job.status = "sent";
                    logger.info({ jobId: job.id, to: job.to }, "[EmailQueue] Email sent");
                } catch (error: any) {
                    job.lastError = error?.message || "Unknown error";
                    if (job.attempts < job.maxAttempts) {
                        job.status = "pending";
                        logger.warn(
                            { jobId: job.id, attempt: job.attempts, maxAttempts: job.maxAttempts },
                            "[EmailQueue] Retrying"
                        );
                        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * job.attempts));
                    } else {
                        job.status = "failed";
                        logger.error(
                            { jobId: job.id, to: job.to, error: job.lastError },
                            "[EmailQueue] Max retries reached, failing"
                        );
                    }
                }
            })
        );
    }

    // Cleanup completed jobs (keep last 100)
    const completed = queue.filter((j) => j.status === "sent" || j.status === "failed");
    if (completed.length > 100) {
        const toRemove = completed.slice(0, completed.length - 100);
        toRemove.forEach((j) => {
            const idx = queue.indexOf(j);
            if (idx !== -1) queue.splice(idx, 1);
        });
    }

    isProcessing = false;
}

/**
 * Placeholder email sender. Replace with nodemailer/SES in production.
 */
async function sendEmail(job: EmailJob): Promise<void> {
    // TODO: Replace with actual email transport
    // Example with nodemailer:
    // const transporter = nodemailer.createTransport({ host: '...', port: 587, auth: { ... } });
    // await transporter.sendMail({ from: 'noreply@crm.com', to: job.to, subject: job.subject, html: job.html });

    const nodemailer = await import("nodemailer").catch(() => null);
    if (!nodemailer) {
        logger.warn("[EmailQueue] nodemailer not installed - email sending simulated");
        return; // Simulate success
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT ?? "587");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM ?? "noreply@crm.com";

    if (!smtpHost || !smtpUser) {
        logger.warn("[EmailQueue] SMTP not configured - email simulated");
        return;
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
        from: smtpFrom,
        to: job.to,
        subject: job.subject,
        html: job.html,
    });
}

/**
 * Get queue stats for monitoring.
 */
export function getEmailQueueStats() {
    return {
        total: queue.length,
        pending: queue.filter((j) => j.status === "pending").length,
        processing: queue.filter((j) => j.status === "processing").length,
        sent: queue.filter((j) => j.status === "sent").length,
        failed: queue.filter((j) => j.status === "failed").length,
    };
}
