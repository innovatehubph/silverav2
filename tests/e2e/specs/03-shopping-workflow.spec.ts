/**
 * Shopping Workflow Tests
 * Tests for browsing products, adding to cart, wishlist, and checkout
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_PRODUCTS } from '../fixtures/test-users';
import { TEST_ADDRESSES } from '../fixtures/test-data';
import { ProductDetailsPage, CartPage, ShopPage } from '../helpers/page-objects';
import { login, addToCart, getCartBadgeCount } from '../helpers/common';

test.describe('Shopping Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);
  });

  test('Test 3.1: Browse products on home page', async ({ page }) => {
    const homePage = new ProductDetailsPage(page);
    await page.goto('/home.html');
    await page.waitForLoadState('networkidle');

    // Check trending products section
    const trendingProducts = page.locator('.trending-category .card, .product-item');
    const count = await trendingProducts.count();

    expect(count).toBeGreaterThan(0);
  });

  test('Test 3.2: Navigate to shop and view products', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto('/shop.html');
    await page.waitForLoadState('networkidle');

    // Count product cards
    const count = await shopPage.getProductsCount();
    expect(count).toBeGreaterThan(0);
  });

  test('Test 3.3: View product details', async ({ page }) => {
    const productPage = new ProductDetailsPage(page);
    await productPage.goto('/product-details.html?id=1');
    await page.waitForLoadState('networkidle');

    // Check product information is displayed
    const productName = await productPage.getProductName();
    expect(productName).toBeTruthy();

    // Check price is displayed
    const priceElement = page.locator('.product-price, [data-price]');
    await expect(priceElement).toBeVisible();
  });

  test('Test 3.4: Add product to cart', async ({ page }) => {
    const initialCount = await getCartBadgeCount(page);

    // Add product to cart
    await addToCart(page, 1);

    // Wait for badge update
    await page.waitForTimeout(500);

    // Cart count should increase
    const newCount = await getCartBadgeCount(page);
    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('Test 3.5: Add multiple products to cart', async ({ page }) => {
    const initialCount = await getCartBadgeCount(page);

    // Add multiple products
    await addToCart(page, 1);
    await page.waitForTimeout(300);
    await addToCart(page, 2);
    await page.waitForTimeout(300);

    // Cart count should increase
    const finalCount = await getCartBadgeCount(page);
    expect(finalCount).toBeGreaterThanOrEqual(initialCount + 1);
  });

  test('Test 3.6: View cart', async ({ page }) => {
    // Add product to cart first
    await addToCart(page, 1);
    await page.waitForTimeout(300);

    // Navigate to cart
    const cartPage = new CartPage(page);
    await cartPage.goto('/cart.html');
    await page.waitForLoadState('networkidle');

    // Check cart items are displayed
    const itemsCount = await cartPage.getCartItemsCount();
    expect(itemsCount).toBeGreaterThan(0);
  });

  test('Test 3.7: Remove item from cart', async ({ page }) => {
    // Add product to cart
    await addToCart(page, 1);
    await page.waitForTimeout(300);

    const cartPage = new CartPage(page);
    await cartPage.goto('/cart.html');
    await page.waitForLoadState('networkidle');

    const initialCount = await cartPage.getCartItemsCount();

    // Remove first item
    if (initialCount > 0) {
      await cartPage.removeItem(0);
      await page.waitForTimeout(300);

      const newCount = await cartPage.getCartItemsCount();
      expect(newCount).toBeLessThan(initialCount);
    }
  });

  test('Test 3.8: Add product to wishlist', async ({ page }) => {
    const productPage = new ProductDetailsPage(page);
    await productPage.goto('/product-details.html?id=1');
    await page.waitForLoadState('networkidle');

    // Add to wishlist
    if (await productPage.addToWishlistButton.isVisible()) {
      await productPage.addToWishlist();
      await page.waitForTimeout(300);

      // Check wishlist shows item
      await page.goto('/wishlist.html');
      await page.waitForLoadState('networkidle');

      const wishlistItems = page.locator('.card, .wishlist-item');
      const count = await wishlistItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('Test 3.9: Filter products by category', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto('/shop.html');
    await page.waitForLoadState('networkidle');

    // Get initial product count
    const initialCount = await shopPage.getProductsCount();

    // Try to filter (if filter exists)
    const filterOptions = page.locator('.filter-option, [data-filter]');
    if (await filterOptions.isVisible()) {
      await filterOptions.first().click();
      await page.waitForLoadState('networkidle');

      const filteredCount = await shopPage.getProductsCount();
      // Filtered count should be less than or equal to initial
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test('Test 3.10: Sort products', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto('/shop.html');
    await page.waitForLoadState('networkidle');

    // Try to sort (if sort dropdown exists)
    if (await shopPage.sortDropdown.isVisible()) {
      await shopPage.sortDropdown.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Products should still display
      const count = await shopPage.getProductsCount();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('Test 3.11: Product pricing displays correctly', async ({ page }) => {
    await page.goto('/product-details.html?id=1');
    await page.waitForLoadState('networkidle');

    // Check original price
    const priceElement = page.locator('.product-price, [data-price]');
    const priceText = await priceElement.textContent();

    // Should contain currency symbol and numbers
    expect(priceText).toMatch(/[₱$]\s?\d+/);
  });

  test('Test 3.12: Pagination works on shop page', async ({ page }) => {
    const shopPage = new ShopPage(page);
    await shopPage.goto('/shop.html');
    await page.waitForLoadState('networkidle');

    // Check if pagination exists
    const nextButton = page.locator('a[aria-label*="Next"], button:has-text("Next")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForLoadState('networkidle');

      // Should still show products
      const count = await shopPage.getProductsCount();
      expect(count).toBeGreaterThan(0);
    }
  });
});
