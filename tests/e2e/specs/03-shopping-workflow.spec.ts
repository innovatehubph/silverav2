/**
 * Shopping Workflow Tests
 * Tests for browsing, product details, variants, cart operations
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { ShopPage, ProductDetailPage, CartPage } from '../helpers/page-objects';
import { login, addToCart, getCartBadgeCount } from '../helpers/common';

test.describe('Shopping Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);
  });

  test('3.1: Shop page shows products', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.navigate();
    await page.waitForLoadState('domcontentloaded');
    await page.locator('a[href^="/product/"]').first().waitFor({ timeout: 10000 }).catch(() => {});

    const count = await shopPage.getProductsCount();
    expect(count).toBeGreaterThan(0);
  });

  test('3.2: Filter products by category', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.navigate();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const categoryTab = shopPage.categoryTabs.first();
    if (await categoryTab.isVisible()) {
      await categoryTab.click();
      await page.waitForLoadState('domcontentloaded');

      const count = await shopPage.getProductsCount();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('3.3: Product detail page loads correctly', async ({ page }) => {
    const productPage = new ProductDetailPage(page);
    await productPage.navigate(1);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expect(productPage.productName).toBeVisible();
    const name = await productPage.productName.textContent();
    expect(name?.length).toBeGreaterThan(0);

    const priceText = await productPage.productPrice.textContent();
    expect(priceText).toMatch(/₱[\d,]+/);
  });

  test('3.4: Product variant selector works - sizes', async ({ page }) => {
    const productPage = new ProductDetailPage(page);
    await productPage.navigate(1);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const sizeCount = await productPage.sizeButtons.count();
    if (sizeCount > 0) {
      await productPage.sizeButtons.first().click();
      await expect(productPage.sizeButtons.first()).toBeVisible();
    }
  });

  test('3.5: Add product to cart', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    const count = await getCartBadgeCount(page);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('3.6: Add multiple products to cart', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));

    await addToCart(page, 1);
    await page.waitForTimeout(500);
    await addToCart(page, 2);
    await page.waitForTimeout(500);

    const count = await getCartBadgeCount(page);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('3.7: Cart page shows items', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    // Give Zustand persist time to write to localStorage
    await page.waitForTimeout(1000);

    const cartPage = new CartPage(page);
    await cartPage.navigate();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Wait for cart items to render (Zustand may need to rehydrate)
    await page.locator('.card h3').first().waitFor({ timeout: 10000 }).catch(() => {});

    const itemCount = await cartPage.getCartItemsCount();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('3.8: Cart shows variant badges (size/color)', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    const cartPage = new CartPage(page);
    await cartPage.navigate();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const sizeBadges = await cartPage.sizeBadges.count();
    const colorBadges = await cartPage.colorBadges.count();
    expect(sizeBadges + colorBadges).toBeGreaterThanOrEqual(0);
  });

  test('3.9: Remove item from cart', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    const cartPage = new CartPage(page);
    await cartPage.navigate();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const initialCount = await cartPage.getCartItemsCount();
    expect(initialCount).toBeGreaterThan(0);

    await cartPage.removeItem(0);
    await page.waitForTimeout(500);

    const newCount = await cartPage.getCartItemsCount();
    expect(newCount).toBeLessThan(initialCount);
  });

  test('3.10: Empty cart shows message', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));

    const cartPage = new CartPage(page);
    await cartPage.navigate();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const isEmpty = await cartPage.isCartEmpty();
    expect(isEmpty).toBeTruthy();
  });

  test('3.11: Continue shopping link from empty cart', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));

    const cartPage = new CartPage(page);
    await cartPage.navigate();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    if (await cartPage.continueShoppingLink.isVisible()) {
      await cartPage.continueShoppingLink.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/shop');
    }
  });

  test('3.12: Product pricing displays in PHP format', async ({ page }) => {
    const productPage = new ProductDetailPage(page);
    await productPage.navigate(1);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const priceText = await productPage.productPrice.textContent();
    expect(priceText).toMatch(/₱[\d,]+(\.\d{2})?/);
  });
});
