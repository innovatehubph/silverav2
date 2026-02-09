import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Silvera V2 E2E Tests
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e/specs',

  // Test timeout
  timeout: 30000,

  // Expected test execution time
  expect: {
    timeout: 5000,
  },

  // Fail on console errors
  fullyParallel: false,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'tests/e2e/reports/html' }],
    ['json', { outputFile: 'tests/e2e/reports/results.json' }],
    ['junit', { outputFile: 'tests/e2e/reports/junit.xml' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3000',

    // Screenshot on failure
    screenshot: 'only-on-failure',
    screenshotDir: 'tests/e2e/reports/screenshots',

    // Video on failure
    video: 'retain-on-failure',
    videoDir: 'tests/e2e/reports/videos',

    // Trace on failure
    trace: 'on-first-retry',
    traceDir: 'tests/e2e/reports/traces',
  },

  // Browser configurations
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

    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Web Server configuration (runs before tests)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 120 * 1000,
  },
});
