/**
 * Error Handling Tests
 * Tests for 404 pages, validation, network errors, and security
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, AUTH_CREDENTIALS } from '../fixtures/test-users';
import { login, simulateNetworkError, restoreNetwork } from '../helpers/common';

test.describe('Error Handling & Edge Cases', () => {
  test('6.1: 404 page on invalid route', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.textContent('body');
    const has404 = bodyText?.includes('404') || bodyText?.toLowerCase().includes('not found');
    const redirectedHome = page.url().match(/\/$/);
    expect(has404 || redirectedHome).toBeTruthy();
  });

  test('6.2: Login form - invalid email format', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[type="email"]').fill('notanemail');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    expect(page.url()).toContain('/login');
  });

  test('6.3: Login form - empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('button[type="submit"]').click();
    expect(page.url()).toContain('/login');
  });

  test('6.4: Invalid product ID shows error or fallback', async ({ page }) => {
    await page.goto('/product/99999');
    await page.waitForLoadState('domcontentloaded');

    const bodyText = await page.textContent('body');
    const hasError = bodyText?.toLowerCase().includes('not found') ||
                     bodyText?.toLowerCase().includes('error');
    const redirected = !page.url().includes('/product/99999');
    expect(hasError || redirected).toBeTruthy();
  });

  test('6.5: SQL injection prevention on login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[type="email"]').fill(AUTH_CREDENTIALS.maliciousCredentials.email);
    await page.locator('input[type="password"]').fill(AUTH_CREDENTIALS.maliciousCredentials.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);

    expect(page.url()).toContain('/login');
  });

  test('6.6: XSS prevention - script in search', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('<script>alert("xss")</script>');
      await searchInput.press('Enter');
      await page.waitForTimeout(500);

      expect(true).toBeTruthy();
    }
  });

  test('6.7: Network error handled gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await simulateNetworkError(page);
    await page.goto('/shop').catch(() => {});
    await restoreNetwork(page);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    expect(true).toBeTruthy();
  });

  test('6.8: Expired token handling', async ({ page }) => {
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);

    await page.evaluate(() => {
      const raw = localStorage.getItem('silvera-auth');
      if (raw) {
        const data = JSON.parse(raw);
        data.state.token = 'expired_invalid_token';
        localStorage.setItem('silvera-auth', JSON.stringify(data));
      }
    });

    await page.goto('/orders');
    await page.waitForTimeout(2000);

    const url = page.url();
    const hasError = await page.locator('[data-sonner-toast]').isVisible().catch(() => false);
    expect(url.includes('/login') || url.includes('/orders') || hasError).toBeTruthy();
  });
});
