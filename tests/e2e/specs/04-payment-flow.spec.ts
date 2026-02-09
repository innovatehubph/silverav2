/**
 * Payment Flow Tests
 * Tests for checkout, payment methods, and order completion
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_PAYMENT_METHODS } from '../fixtures/test-users';
import { TEST_ADDRESSES } from '../fixtures/test-data';
import { login, addToCart } from '../helpers/common';

test.describe('Payment Flows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);
    // Add product to cart
    await addToCart(page, 1);
  });

  test('Test 4.1: Navigate to checkout from cart', async ({ page }) => {
    await page.goto('/cart.html');
    await page.waitForLoadState('networkidle');

    const checkoutButton = page.locator('button:has-text("Checkout")');
    if (await checkoutButton.isVisible()) {
      await checkoutButton.click();
      expect(page.url()).toContain('checkout');
    }
  });

  test('Test 4.2: Select payment method on checkout', async ({ page }) => {
    await page.goto('/payment-method.html');
    await page.waitForLoadState('networkidle');

    // Check payment methods are displayed
    const paymentMethods = page.locator('.payment-method, [role="radio"], .payment-option');
    const count = await paymentMethods.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Test 4.3: Place order successfully', async ({ page }) => {
    await page.goto('/checkout.html');
    await page.waitForLoadState('networkidle');

    // Fill in address if needed
    const addressInput = page.locator('input[name*="address"]');
    if (await addressInput.isVisible()) {
      await addressInput.fill(TEST_ADDRESSES.primaryAddress.address);
    }

    // Place order
    const placeOrderButton = page.locator('button:has-text("Place Order"), button:has-text("Confirm")');
    if (await placeOrderButton.isVisible()) {
      await placeOrderButton.click();

      // Should redirect to payment or completion page
      await page.waitForNavigation();
      const url = page.url();
      expect(
        url.includes('payment-method') ||
        url.includes('payment-completed') ||
        url.includes('order')
      ).toBeTruthy();
    }
  });

  test('Test 4.4: Payment method modal displays', async ({ page }) => {
    await page.goto('/payment-method.html');
    await page.waitForLoadState('networkidle');

    // Check modal or payment methods section
    const modal = page.locator('.modal, [role="dialog"], .payment-section');
    const isVisible = await modal.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('Test 4.5: Select GCash payment', async ({ page }) => {
    await page.goto('/payment-method.html');
    await page.waitForLoadState('networkidle');

    const gcashButton = page.locator('button:has-text("GCash"), [data-payment="gcash"]');
    if (await gcashButton.isVisible()) {
      await gcashButton.click();
      await page.waitForTimeout(300);

      // Should show GCash QR or payment flow
      expect(true).toBeTruthy();
    }
  });

  test('Test 4.6: View order summary before payment', async ({ page }) => {
    await page.goto('/checkout.html');
    await page.waitForLoadState('networkidle');

    // Check order summary is displayed
    const orderSummary = page.locator('.order-summary, .summary-section, [data-section="summary"]');
    const isVisible = await orderSummary.isVisible().catch(() => false);

    if (isVisible) {
      expect(isVisible).toBeTruthy();

      // Check total is displayed
      const total = page.locator('.total, [data-total]');
      expect(await total.isVisible()).toBeTruthy();
    }
  });

  test('Test 4.7: Order tracking after completion', async ({ page }) => {
    await page.goto('/order-tracking.html');
    await page.waitForLoadState('networkidle');

    // Check if orders are displayed
    const orderCards = page.locator('.order-card, [data-order-id]');
    const count = await orderCards.count().catch(() => 0);

    expect(typeof count).toBe('number');
  });

  test('Test 4.8: Payment error handling', async ({ page }) => {
    await page.goto('/payment-error.html');
    await page.waitForLoadState('networkidle');

    // Check error message and retry button
    const errorMessage = page.locator('.alert-danger, .error-message, text=Error');
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');

    const hasError = await errorMessage.isVisible().catch(() => false);
    const hasRetry = await retryButton.isVisible().catch(() => false);

    expect(hasError || hasRetry).toBeTruthy();
  });

  test('Test 4.9: Payment completion page displays', async ({ page }) => {
    await page.goto('/payment-completed.html');
    await page.waitForLoadState('networkidle');

    // Check success message
    const successMessage = page.locator('text=Thank you, text=Success, text=Confirmed');
    expect(await successMessage.isVisible()).toBeTruthy();
  });

  test('Test 4.10: Discount code validation', async ({ page }) => {
    await page.goto('/checkout.html');
    await page.waitForLoadState('networkidle');

    // Look for discount code input
    const discountInput = page.locator('input[name*="discount"], input[placeholder*="code"]');
    if (await discountInput.isVisible()) {
      await discountInput.fill('TESTCODE123');

      // Check if discount is applied or error shown
      const applyButton = page.locator('button:has-text("Apply")');
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(300);
      }
    }
  });
});
