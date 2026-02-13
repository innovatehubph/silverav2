import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { login } from '../helpers/common';

const BASE_URL = process.env.BASE_URL || (process.env.CI ? 'http://localhost:3865' : 'https://silvera.innoserver.cloud');

test.describe.serial('Admin Performance Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.adminUser.email, TEST_USERS.adminUser.password);
  });

  test('8.1: Performance page loads and shows stat cards', async ({ page }) => {
    await page.goto('/admin/performance');
    await page.waitForLoadState('domcontentloaded');

    // Wait for loading spinner to disappear (metrics loaded)
    await expect(page.locator('text=Loading performance metrics')).toBeHidden({ timeout: 15000 });

    // Verify the page header
    await expect(page.locator('h1:has-text("Performance")')).toBeVisible();

    // Verify the 4 stat cards are present (use exact text match)
    await expect(page.getByText('Avg Response Time', { exact: true })).toBeVisible();
    await expect(page.getByText('Requests (1hr)', { exact: true })).toBeVisible();
    await expect(page.getByText('Error Rate', { exact: true })).toBeVisible();
    await expect(page.getByText('Uptime', { exact: true })).toBeVisible();
  });

  test('8.2: Performance page shows charts and endpoint table', async ({ page }) => {
    await page.goto('/admin/performance');
    await expect(page.locator('text=Loading performance metrics')).toBeHidden({ timeout: 15000 });

    // Check chart section headers
    await expect(page.getByText('Response Time (last 60 min)')).toBeVisible();
    await expect(page.getByText('Throughput (req/min)')).toBeVisible();

    // Endpoint Performance section
    await expect(page.getByText('Endpoint Performance')).toBeVisible();
  });

  test('8.3: Refresh button triggers data reload', async ({ page }) => {
    await page.goto('/admin/performance');
    await expect(page.locator('text=Loading performance metrics')).toBeHidden({ timeout: 15000 });

    // Click the exact "Refresh" button (not "Auto-refresh")
    const refreshBtn = page.getByRole('button', { name: 'Refresh', exact: true });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    // The "Updated" timestamp should appear/update
    await expect(page.getByText(/Updated \d/)).toBeVisible({ timeout: 5000 });
  });

  test('8.4: Auto-refresh toggle works', async ({ page }) => {
    await page.goto('/admin/performance');
    await expect(page.locator('text=Loading performance metrics')).toBeHidden({ timeout: 15000 });

    // Auto-refresh should default to ON
    const toggleBtn = page.locator('button:has-text("Auto-refresh")');
    await expect(toggleBtn).toContainText('ON');

    // Toggle OFF
    await toggleBtn.click();
    await expect(toggleBtn).toContainText('OFF');

    // Toggle back ON
    await toggleBtn.click();
    await expect(toggleBtn).toContainText('ON');
  });

  test('8.5: Performance API returns valid metrics structure', async ({ page }) => {
    // Retrieve token from localStorage (seeded by login() in beforeEach)
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();

    const response = await page.request.get(`${BASE_URL}/api/admin/performance/metrics`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Validate overall stats
    expect(data.overall).toBeDefined();
    expect(typeof data.overall.avgResponseTime).toBe('number');
    expect(typeof data.overall.p95ResponseTime).toBe('number');
    expect(typeof data.overall.p99ResponseTime).toBe('number');
    expect(typeof data.overall.totalRequests).toBe('number');
    expect(typeof data.overall.errorRate).toBe('number');
    expect(typeof data.overall.uptimeHours).toBe('number');

    // Validate endpoints array
    expect(Array.isArray(data.endpoints)).toBeTruthy();

    // Validate timeSeries array (60 entries, one per minute)
    expect(Array.isArray(data.timeSeries)).toBeTruthy();
    expect(data.timeSeries.length).toBe(60);
    for (const entry of data.timeSeries) {
      expect(typeof entry.time).toBe('string');
      expect(typeof entry.avgResponseTime).toBe('number');
      expect(typeof entry.requests).toBe('number');
      expect(typeof entry.errors).toBe('number');
    }
  });

  test('8.6: Unauthenticated request is rejected', async ({ page }) => {
    // No auth header → should get 401
    const metricsRes = await page.request.get(`${BASE_URL}/api/admin/performance/metrics`);
    expect(metricsRes.status()).toBe(401);
  });

  test('8.7: Performance nav link exists in admin sidebar', async ({ page }) => {
    await page.goto('/admin/performance');
    await page.waitForLoadState('domcontentloaded');

    // Wait for admin layout to hydrate (RequireAdmin guard + Suspense)
    await expect(page.locator('h1:has-text("Performance")')).toBeVisible({ timeout: 15000 });

    const perfLink = page.locator('a[href="/admin/performance"]');
    await expect(perfLink).toBeVisible({ timeout: 10000 });
    await expect(perfLink).toContainText('Performance');
  });
});
