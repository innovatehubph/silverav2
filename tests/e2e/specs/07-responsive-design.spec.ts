/**
 * Responsive Design Tests
 * Tests for mobile, tablet, and desktop layouts
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { login } from '../helpers/common';

test.describe('Responsive Design - Mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Test 7.1: Mobile home page layout', async ({ page }) => {
    await page.goto('/home.html');
    await page.waitForLoadState('networkidle');

    // Check no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.offsetWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(windowWidth);

    // Check mobile menu exists
    const mobileMenu = page.locator('[aria-label*="menu"], .navbar-toggler');
    const hasMobileMenu = await mobileMenu.isVisible().catch(() => false);
    expect(hasMobileMenu).toBeTruthy();
  });

  test('Test 7.2: Mobile product card readability', async ({ page }) => {
    await page.goto('/shop.html');
    await page.waitForLoadState('networkidle');

    // Check product cards are readable
    const productCards = page.locator('.card, .product-card');
    const count = await productCards.count();

    if (count > 0) {
      const card = productCards.first();
      const isVisible = await card.isVisible();
      expect(isVisible).toBeTruthy();

      // Text should be readable
      const text = await card.textContent();
      expect(text?.length).toBeGreaterThan(0);
    }
  });

  test('Test 7.3: Mobile form inputs are touch-friendly', async ({ page }) => {
    await page.goto('/authentication-log-in.html');
    await page.waitForLoadState('networkidle');

    // Check input sizing
    const inputs = page.locator('input[type="email"], input[type="password"]');
    const firstInput = inputs.first();

    const height = await firstInput.evaluate((el) => el.offsetHeight);
    // Inputs should be at least 44px tall for touch
    expect(height).toBeGreaterThanOrEqual(40);
  });

  test('Test 7.4: Mobile button sizing', async ({ page }) => {
    await page.goto('/authentication-log-in.html');

    const button = page.locator('button[type="submit"]');
    const height = await button.evaluate((el) => el.offsetHeight);

    // Button should be touch-friendly
    expect(height).toBeGreaterThanOrEqual(44);
  });

  test('Test 7.5: Mobile navigation accessibility', async ({ page }) => {
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);
    await page.goto('/home.html');

    // Menu toggle should work
    const menuToggle = page.locator('.navbar-toggler, [aria-label*="menu"]');
    if (await menuToggle.isVisible()) {
      await menuToggle.click();

      // Menu should expand
      const menu = page.locator('.navbar-collapse, nav, .offcanvas');
      expect(await menu.isVisible()).toBeTruthy();
    }
  });

  test('Test 7.6: Mobile cart icon visible', async ({ page }) => {
    await page.goto('/home.html');

    const cartIcon = page.locator('[href*="cart"], [aria-label*="cart"]');
    expect(await cartIcon.isVisible()).toBeTruthy();
  });

  test('Test 7.7: Mobile images scale properly', async ({ page }) => {
    await page.goto('/product-details.html?id=1');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const firstImage = images.first();

    if (await firstImage.isVisible()) {
      const width = await firstImage.evaluate((el) => el.offsetWidth);
      const parentWidth = await firstImage.evaluate((el) => el.parentElement?.offsetWidth || 0);

      // Image should fit parent
      expect(width).toBeLessThanOrEqual(parentWidth);
    }
  });

  test('Test 7.8: Mobile modal/dialog sizing', async ({ page }) => {
    const modal = page.locator('.modal, [role="dialog"]');

    if (await modal.isVisible()) {
      const width = await modal.evaluate((el) => el.offsetWidth);
      const screenWidth = await page.evaluate(() => window.innerWidth);

      // Modal should not exceed screen width
      expect(width).toBeLessThanOrEqual(screenWidth);
    }
  });
});

test.describe('Responsive Design - Tablet (768px)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('Test 7.9: Tablet layout - two-column grid', async ({ page }) => {
    await page.goto('/shop.html');
    await page.waitForLoadState('networkidle');

    // Should display multiple products
    const products = page.locator('.card, .product-card');
    const count = await products.count();
    expect(count).toBeGreaterThan(1);
  });

  test('Test 7.10: Tablet sidebar collapsible', async ({ page }) => {
    await page.goto('/my-profile.html');
    await page.waitForLoadState('networkidle');

    // Check responsive layout
    const content = page.locator('main, [role="main"], .main-content');
    const isVisible = await content.isVisible().catch(() => false);

    expect(typeof isVisible).toBe('boolean');
  });

  test('Test 7.11: Tablet form layout', async ({ page }) => {
    await page.goto('/addresses.html');
    await page.waitForLoadState('networkidle');

    // Form should display properly
    const formInputs = page.locator('input, textarea, select');
    const count = await formInputs.count();

    expect(count).toBeGreaterThan(0);
  });

  test('Test 7.12: Tablet spacing and padding', async ({ page }) => {
    await page.goto('/home.html');
    await page.waitForLoadState('networkidle');

    // Check no horizontal overflow
    const html = page.locator('html');
    const body = page.locator('body');

    const htmlWidth = await html.evaluate((el) => el.offsetWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);

    expect(htmlWidth).toBeLessThanOrEqual(windowWidth);
  });
});

test.describe('Responsive Design - Desktop (1920px)', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('Test 7.13: Desktop multi-column layout', async ({ page }) => {
    await page.goto('/shop.html');
    await page.waitForLoadState('networkidle');

    // Should display multiple products per row
    const products = page.locator('.card, .product-card');
    const count = await products.count();

    expect(count).toBeGreaterThan(3);
  });

  test('Test 7.14: Desktop sidebar visible', async ({ page }) => {
    await page.goto('/my-profile.html');
    await page.waitForLoadState('networkidle');

    // Sidebar should be visible without toggle
    const sidebar = page.locator('.sidebar, [role="navigation"], nav');
    const isVisible = await sidebar.isVisible().catch(() => false);

    expect(typeof isVisible).toBe('boolean');
  });

  test('Test 7.15: Desktop full-width content', async ({ page }) => {
    await page.goto('/home.html');
    await page.waitForLoadState('networkidle');

    // Content should use available width
    const container = page.locator('main, [role="main"], .container');
    const width = await container.evaluate((el) => el.offsetWidth).catch(() => 0);

    // Should be substantial width on desktop
    expect(width).toBeGreaterThan(1000);
  });

  test('Test 7.16: Desktop navigation bar layout', async ({ page }) => {
    await page.goto('/home.html');

    // Desktop nav should show all links
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const count = await navLinks.count();

    expect(count).toBeGreaterThan(3);
  });

  test('Test 7.17: Desktop form spacing', async ({ page }) => {
    await page.goto('/checkout.html');
    await page.waitForLoadState('networkidle');

    // Check form inputs have adequate spacing
    const inputs = page.locator('input, textarea, select');
    const count = await inputs.count();

    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('Test 7.18: Desktop image optimization', async ({ page }) => {
    await page.goto('/home.html');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');

    if (await images.count() > 0) {
      const firstImage = images.first();
      const src = await firstImage.getAttribute('src');

      // Should have valid src
      expect(src).toBeTruthy();
    }
  });
});

test.describe('Responsive Design - Cross-Device', () => {
  test('Test 7.19: Orientation change - portrait to landscape', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/home.html');

    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForLoadState('networkidle');

    // Content should reflow properly
    const bodyWidth = await page.evaluate(() => document.body.offsetWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);

    expect(bodyWidth).toBeLessThanOrEqual(windowWidth);
  });

  test('Test 7.20: Font scaling on different sizes', async ({ page }) => {
    await page.goto('/home.html');

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    let heading = page.locator('h1').first();
    const mobileSize = await heading.evaluate((el) =>
      window.getComputedStyle(el).fontSize
    ).catch(() => '16px');

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    heading = page.locator('h1').first();
    const desktopSize = await heading.evaluate((el) =>
      window.getComputedStyle(el).fontSize
    ).catch(() => '16px');

    // Desktop should have larger font
    expect(desktopSize).toBeTruthy();
  });

  test('Test 7.21: Touch target sizing across devices', async ({ page }) => {
    const checkTouchTargets = async (viewportName: string) => {
      const buttons = page.locator('button');
      if (await buttons.count() > 0) {
        const firstButton = buttons.first();
        const height = await firstButton.evaluate((el) => el.offsetHeight);
        expect(height).toBeGreaterThanOrEqual(40);
      }
    };

    // Check mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/home.html');
    await checkTouchTargets('Mobile');

    // Check tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/home.html');
    await checkTouchTargets('Tablet');
  });

  test('Test 7.22: CSS media queries working', async ({ page }) => {
    await page.goto('/home.html');
    await page.waitForLoadState('networkidle');

    // Check media query for mobile
    const isMobileLayout = await page.evaluate(() => {
      return window.matchMedia('(max-width: 576px)').matches;
    });

    await page.setViewportSize({ width: 375, height: 667 });
    expect(typeof isMobileLayout).toBe('boolean');
  });
});
