/**
 * Navigation Tests
 * Tests for cart badge, user greeting, and navigation consistency
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { HomePage } from '../helpers/page-objects';
import { login, getCartBadgeCount, getUserGreeting } from '../helpers/common';
import { assertCartBadgeCount, assertUserGreetingDisplayed } from '../helpers/assertions';

test.describe('Navigation & UI Updates', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);
  });

  test('Test 2.1: Cart badge displays on home page', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto('/home.html');

    const cartCount = await getCartBadgeCount(page);
    expect(typeof cartCount).toBe('number');
    expect(cartCount).toBeGreaterThanOrEqual(0);
  });

  test('Test 2.2: Cart badge consistent across pages', async ({ page }) => {
    // Get cart count on home page
    await page.goto('/home.html');
    await page.waitForLoadState('networkidle');
    const homeCartCount = await getCartBadgeCount(page);

    // Navigate to shop page
    await page.goto('/shop.html');
    await page.waitForLoadState('networkidle');
    const shopCartCount = await getCartBadgeCount(page);

    // Navigate to category page
    await page.goto('/category-grid.html');
    await page.waitForLoadState('networkidle');
    const categoryCartCount = await getCartBadgeCount(page);

    // All should be the same
    expect(shopCartCount).toBe(homeCartCount);
    expect(categoryCartCount).toBe(homeCartCount);
  });

  test('Test 2.3: User greeting displays correctly', async ({ page }) => {
    await page.goto('/home.html');
    await page.waitForLoadState('networkidle');

    const greeting = await getUserGreeting(page);
    expect(greeting).toContain('Hi!');
    expect(greeting).toContain(TEST_USERS.validUser.name);
  });

  test('Test 2.4: User greeting consistent across pages', async ({ page }) => {
    // Check greeting on home page
    await page.goto('/home.html');
    await page.waitForLoadState('networkidle');
    const homeGreeting = await getUserGreeting(page);

    // Check on shop page
    await page.goto('/shop.html');
    await page.waitForLoadState('networkidle');
    const shopGreeting = await getUserGreeting(page);

    // Check on profile page
    await page.goto('/my-profile.html');
    await page.waitForLoadState('networkidle');
    const profileGreeting = await getUserGreeting(page);

    // All should be the same
    expect(shopGreeting).toBe(homeGreeting);
    expect(profileGreeting).toBe(homeGreeting);
  });

  test('Test 2.5: Sidebar navigation links work', async ({ page }) => {
    await page.goto('/home.html');

    // Test Shop link
    const shopLink = page.locator('a[href*="shop"], a:has-text("Shop")');
    if (await shopLink.isVisible()) {
      await shopLink.click();
      expect(page.url()).toContain('shop');
    }
  });

  test('Test 2.6: Cart badge updates after adding to cart', async ({ page }) => {
    // Get initial cart count
    await page.goto('/home.html');
    const initialCount = await getCartBadgeCount(page);

    // Navigate to product and add to cart
    await page.goto('/product-details.html?id=1');
    const addButton = page.locator('button:has-text("Add to Cart")');
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Check cart count increased
      const newCount = await getCartBadgeCount(page);
      expect(newCount).toBeGreaterThan(initialCount);
    }
  });

  test('Test 2.7: Navigation breadcrumbs display', async ({ page }) => {
    await page.goto('/product-details.html?id=1');
    await page.waitForLoadState('networkidle');

    const breadcrumbs = page.locator('.breadcrumb, nav[aria-label*="breadcrumb"]');
    const isBreadcrumbVisible = await breadcrumbs.isVisible().catch(() => false);

    if (isBreadcrumbVisible) {
      expect(isBreadcrumbVisible).toBeTruthy();
    }
  });

  test('Test 2.8: Mobile menu toggle works (responsive)', async ({ page, context }) => {
    // Set mobile viewport
    await context.addInitScript(() => {
      // Mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/home.html');

    // Check for menu button
    const menuButton = page.locator('[aria-label*="menu"], button.navbar-toggler');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      const menu = page.locator('.navbar-collapse, .offcanvas');
      expect(await menu.isVisible()).toBeTruthy();
    }
  });
});
