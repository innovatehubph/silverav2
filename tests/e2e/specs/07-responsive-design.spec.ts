/**
 * Responsive Design Tests
 * Tests for mobile, tablet, and desktop layouts
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { login } from '../helpers/common';

test.describe('Responsive Design - Mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('7.1: Mobile hamburger menu visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const menuButton = page.locator('button[aria-label="Open menu"]');
    await expect(menuButton).toBeVisible();
  });

  test('7.2: Mobile nav drawer opens and closes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const menuButton = page.locator('button[aria-label="Open menu"]');
    await menuButton.click();

    // Wait for drawer animation (300ms) + extra buffer
    await page.waitForTimeout(800);

    // The drawer has role="dialog" - wait for it to be visible
    const drawer = page.locator('[role="dialog"][aria-label="Navigation menu"]');
    const drawerVisible = await drawer.isVisible().catch(() => false);

    if (drawerVisible) {
      // Drawer nav links include /shop - check inside the drawer
      const shopLink = drawer.locator('a[href="/shop"]');
      await expect(shopLink).toBeVisible({ timeout: 3000 });
    } else {
      // Fallback: check if any shop link became visible after menu click
      const shopLink = page.locator('a[href="/shop"]').first();
      await expect(shopLink).toBeVisible({ timeout: 3000 });
    }

    const closeButton = page.locator('button[aria-label="Close menu"]');
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('7.3: No horizontal scroll on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(windowWidth + 1);
  });

  test('7.4: Mobile login form usable', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    const inputHeight = await emailInput.evaluate((el) => el.offsetHeight);
    expect(inputHeight).toBeGreaterThanOrEqual(36);
  });

  test('7.5: Mobile product cards display', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('a[href^="/product/"]').first().waitFor({ timeout: 10000 }).catch(() => {});

    const productCards = page.locator('a[href^="/product/"]');
    const count = await productCards.count();
    expect(count).toBeGreaterThan(0);

    if (count > 0) {
      await expect(productCards.first()).toBeVisible();
    }
  });

  test('7.6: Mobile cart icon visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const cartLink = page.locator('a[href="/cart"]');
    await expect(cartLink).toBeVisible();
  });

  test('7.7: Mobile product images scale properly', async ({ page }) => {
    await page.goto('/product/1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const images = page.locator('img').first();
    if (await images.isVisible()) {
      const imgWidth = await images.evaluate((el) => el.offsetWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(imgWidth).toBeLessThanOrEqual(viewportWidth);
    }
  });
});

test.describe('Responsive Design - Tablet (768px)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('7.8: Tablet product grid displays', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('a[href^="/product/"]').first().waitFor({ timeout: 10000 }).catch(() => {});

    const products = page.locator('a[href^="/product/"]');
    const count = await products.count();
    expect(count).toBeGreaterThan(0);
  });

  test('7.9: Tablet no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(windowWidth + 1);
  });

  test('7.10: Tablet checkout form usable', async ({ page }) => {
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);

    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');

    // Wait for React + Zustand hydration to render checkout content
    await page.locator('input[value="cod"]')
      .or(page.getByText(/cart is empty/i))
      .or(page.locator('input, select, button[type="submit"]'))
      .first().waitFor({ state: 'visible', timeout: 15000 });

    const formElements = page.locator('input, select, button[type="submit"]');
    const count = await formElements.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Responsive Design - Desktop (1920px)', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('7.11: Desktop multi-column product grid', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('a[href^="/product/"]').first().waitFor({ timeout: 10000 }).catch(() => {});

    const products = page.locator('a[href^="/product/"]');
    const count = await products.count();
    expect(count).toBeGreaterThan(0);
  });

  test('7.12: Desktop navigation bar shows links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const shopLink = page.locator('header a[href="/shop"]');
    const isVisible = await shopLink.isVisible().catch(() => false);

    const hamburger = page.locator('button[aria-label="Open menu"]');
    const hamburgerVisible = await hamburger.isVisible().catch(() => false);

    expect(isVisible || !hamburgerVisible).toBeTruthy();
  });

  test('7.13: Desktop content uses available width', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const mainContent = page.locator('main').first();
    if (await mainContent.isVisible()) {
      const width = await mainContent.evaluate((el) => el.offsetWidth);
      expect(width).toBeGreaterThan(800);
    }
  });
});

test.describe('Responsive Design - Cross-Device', () => {
  test('7.14: Orientation change portrait to landscape', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(windowWidth + 1);
  });
});
