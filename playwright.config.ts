import { defineConfig } from '@playwright/test';

const PORT = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 3000;

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `ENABLE_TEST_ROUTES=1 MOCK_BAILEYS_QR=1 ALLOW_DEV_LOGIN=1 OWNER_OPEN_ID=e2e_owner pnpm dev`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
