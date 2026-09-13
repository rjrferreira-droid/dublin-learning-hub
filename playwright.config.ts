import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Pure *.test.ts contracts run under node:test in CI, not twice under Playwright.
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: process.env.E2E_REQUIRE_AUTH === '1' ? 'off' : 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
