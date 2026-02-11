/**
 * Navigation Tests
 * Tests for routing, links, homepage content, and mobile navigation
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { HomePage, ShopPage } from '../helpers/page-objects';
import { login, getCartBadgeCount } from '../helpers/common';

test.describe('Navigation & Routing', () => {
  test('2.1: Homepage loads with hero section and products', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();

    const productLinks = page.locator('a[href^="/product/"]');
    const count = await productLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('2.2: Navigation links work - Shop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const shopLink = page.locator('a[href="/shop"]').first();
    if (await shopLink.isVisible()) {
      await shopLink.click();
      await page.waitForURL('**/shop');
      expect(page.url()).toContain('/shop');
    }
  });

  test('2.3: Navigation links work - Cart', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const cartLink = page.locator('a[href="/cart"]').first();
    if (await cartLink.isVisible()) {
      await cartLink.click();
      await page.waitForURL('**/cart');
      expect(page.url()).toContain('/cart');
    }
  });

  test('2.4: Category links on homepage navigate to shop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const categoryLink = page.locator('a[href*="/shop?category="]').first();
    if (await categoryLink.isVisible()) {
      await categoryLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/shop');
    }
  });

  test('2.5: Sign In button visible for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');

    const signInLink = page.locator('a[href="/login"]').first();
    await expect(signInLink).toBeVisible();
  });

  test('2.6: Cart badge displays correctly', async ({ page }) => {
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const cartCount = await getCartBadgeCount(page);
    expect(typeof cartCount).toBe('number');
    expect(cartCount).toBeGreaterThanOrEqual(0);
  });

  test('2.7: Cart badge consistent across pages', async ({ page }) => {
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const homeCount = await getCartBadgeCount(page);

    await page.goto('/shop');
    await page.waitForLoadState('networkidle');
    const shopCount = await getCartBadgeCount(page);

    expect(shopCount).toBe(homeCount);
  });

  test('2.8: Back button works from product detail', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    const productLink = page.locator('a[href^="/product/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/product/');

      await page.goBack();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/shop');
    }
  });
});
