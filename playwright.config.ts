import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/specs',
  timeout: 60000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  retries: 1,
  reporter: [
    ['html', { outputFolder: 'tests/e2e/reports/html' }],
    ['json', { outputFile: 'tests/e2e/reports/results.json' }],
    ['junit', { outputFile: 'tests/e2e/reports/junit.xml' }],
    ['list'],
  ],
  globalSetup: './tests/e2e/config/global-setup.ts',
  use: {
    baseURL: process.env.BASE_URL || 'https://silvera.innoserver.cloud',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  /* webServer disabled — tests run against the live deployment at BASE_URL */
});
