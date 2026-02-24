/**
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
    packageManager: "npm",
    reporters: ["html", "clear-text", "progress"],
    testRunner: "vitest",
    vitest: {
        configFile: "vitest.config.ts",
    },
    coverageAnalysis: "perTest",
    mutate: [
        "server/services/password-policy.ts",
        "server/services/pii-encryption.ts",
        "server/services/pii-masking.ts",
        "server/services/totp.ts",
        "server/services/magic-numbers.ts",
        "server/services/circuit-breaker.ts",
        "server/services/conflict-resolution.ts",
    ],
    thresholds: {
        high: 80,
        low: 60,
        break: 50,
    },
    timeoutMS: 30000,
    tempDirName: ".stryker-tmp",
};
