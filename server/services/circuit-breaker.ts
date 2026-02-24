import { logger } from "../_core/logger";

interface CircuitBreakerOptions {
    failureThreshold: number;   // Number of failures before opening
    resetTimeoutMs: number;     // Time in open state before half-open
    halfOpenMaxAttempts: number; // Max attempts in half-open state
    name: string;
}

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Circuit Breaker pattern implementation for external API calls (Meta, etc.).
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests are rejected immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 *
 * Usage:
 * ```ts
 * const metaCircuit = new CircuitBreaker({ name: "MetaAPI", failureThreshold: 5, resetTimeoutMs: 60000 });
 * const result = await metaCircuit.execute(() => callMetaAPI(payload));
 * ```
 */
export class CircuitBreaker {
    private state: CircuitState = "CLOSED";
    private failureCount = 0;
    private lastFailureTime = 0;
    private halfOpenAttempts = 0;
    private readonly options: CircuitBreakerOptions;

    constructor(options: Partial<CircuitBreakerOptions> & { name: string }) {
        this.options = {
            failureThreshold: 5,
            resetTimeoutMs: 60000,      // 1 minute
            halfOpenMaxAttempts: 2,
            ...options,
        };
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === "OPEN") {
            // Check if enough time has passed to transition to HALF_OPEN
            if (Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {
                this.state = "HALF_OPEN";
                this.halfOpenAttempts = 0;
                logger.info({ circuit: this.options.name }, "[CircuitBreaker] Transitioning to HALF_OPEN");
            } else {
                throw new Error(`[CircuitBreaker:${this.options.name}] Circuit is OPEN. Rejecting request.`);
            }
        }

        if (this.state === "HALF_OPEN" && this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
            throw new Error(`[CircuitBreaker:${this.options.name}] HALF_OPEN limit reached. Waiting for reset.`);
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        if (this.state === "HALF_OPEN") {
            logger.info({ circuit: this.options.name }, "[CircuitBreaker] Recovery confirmed, closing circuit");
        }
        this.failureCount = 0;
        this.state = "CLOSED";
        this.halfOpenAttempts = 0;
    }

    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.state === "HALF_OPEN") {
            this.halfOpenAttempts++;
            if (this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
                this.state = "OPEN";
                logger.warn({ circuit: this.options.name }, "[CircuitBreaker] HALF_OPEN failed, reopening");
            }
        } else if (this.failureCount >= this.options.failureThreshold) {
            this.state = "OPEN";
            logger.error(
                { circuit: this.options.name, failures: this.failureCount },
                "[CircuitBreaker] Failure threshold reached, circuit OPEN"
            );
        }
    }

    getState(): CircuitState {
        return this.state;
    }

    getStats() {
        return {
            name: this.options.name,
            state: this.state,
            failureCount: this.failureCount,
            lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
        };
    }
}

// ── Pre-configured Circuit Breakers ──

export const metaApiCircuit = new CircuitBreaker({
    name: "MetaCloudAPI",
    failureThreshold: 5,
    resetTimeoutMs: 60000,      // 1 min
    halfOpenMaxAttempts: 2,
});

export const metaWebhookCircuit = new CircuitBreaker({
    name: "MetaWebhookAPI",
    failureThreshold: 10,
    resetTimeoutMs: 30000,      // 30s
    halfOpenMaxAttempts: 3,
});
