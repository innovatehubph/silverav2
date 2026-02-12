import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

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
    baseURL: process.env.BASE_URL || (isCI ? 'http://localhost:3865' : 'https://silvera.innoserver.cloud'),
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
  /*
   * In CI, spin up a local test server. Locally, tests default to the live
   * deployment unless BASE_URL=http://localhost:3865 is set explicitly.
   */
  ...(isCI ? {
    webServer: {
      command: 'ADMIN_EMAIL=admin-test@example.com ADMIN_PASSWORD=AdminTestPass123! NODE_ENV=test DATABASE_PATH=./data/silvera-test.db node server/index.js',
      url: 'http://localhost:3865/api/health',
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 30 * 1000,
    },
  } : {}),
});
