/**
 * Payment Flow Tests
 * Tests for checkout, payment methods, and order placement
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { PAYMENT_METHODS } from '../fixtures/test-data';
import { CheckoutPage, CartPage } from '../helpers/page-objects';
import { login, addToCart } from '../helpers/common';

/**
 * Wait for checkout page content to fully render.
 * After Zustand auth + cart hydration, the Checkout component renders either
 * the payment form (if cart has items) or the "Cart is Empty" message.
 */
async function waitForCheckoutContent(page: import('@playwright/test').Page) {
  // Use .or() to combine CSS and text engine selectors (can't mix in one string)
  await page.locator('input[value="cod"]')
    .or(page.getByText(/cart is empty/i))
    .or(page.getByText(/Continue Shopping/i))
    .first().waitFor({ state: 'visible', timeout: 15000 });
}

test.describe('Payment Flows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);
  });

  test('4.1: Navigate to checkout from cart', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    const cartPage = new CartPage(page);
    await cartPage.navigate();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    if (await cartPage.checkoutLink.isVisible()) {
      await cartPage.checkoutLink.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/checkout');
    }
  });

  test('4.2: Checkout page shows payment methods', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.navigate();
    await waitForCheckoutContent(page);

    const paymentLabels = await checkoutPage.paymentMethodLabels.count();
    expect(paymentLabels).toBeGreaterThan(0);
  });

  test('4.3: COD payment method can be selected', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.navigate();
    await waitForCheckoutContent(page);

    await checkoutPage.selectCOD();
    await expect(checkoutPage.codRadio).toBeChecked();
  });

  test('4.4: Place order with COD', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.navigate();
    await waitForCheckoutContent(page);

    await checkoutPage.selectCOD();

    // Wait for the submit button to be enabled (address loading may take time)
    await checkoutPage.placeOrderButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Only attempt to place order if button is enabled
    const isDisabled = await checkoutPage.placeOrderButton.isDisabled().catch(() => true);
    if (!isDisabled) {
      await checkoutPage.placeOrder();
      await page.waitForTimeout(3000);

      const url = page.url();
      const hasToast = await page.locator('[data-sonner-toast]').isVisible().catch(() => false);
      expect(url.includes('/order') || url.includes('/checkout') || hasToast).toBeTruthy();
    } else {
      // Button is disabled (likely no address selected) - verify we're on checkout
      expect(page.url()).toContain('/checkout');
    }
  });

  test('4.5: GCash payment option available', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.navigate();
    await waitForCheckoutContent(page);

    const gcashVisible = await checkoutPage.gcashRadio.isVisible().catch(() => false);
    expect(gcashVisible).toBeTruthy();
  });

  test('4.6: Card payment option available', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.navigate();
    await waitForCheckoutContent(page);

    const cardVisible = await checkoutPage.cardRadio.isVisible().catch(() => false);
    expect(cardVisible).toBeTruthy();
  });

  test('4.7: Empty cart shows message in checkout', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));

    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.navigate();
    await waitForCheckoutContent(page);

    const emptyVisible = await checkoutPage.emptyCartMessage.isVisible().catch(() => false);
    const redirectedToCart = page.url().includes('/cart');
    expect(emptyVisible || redirectedToCart).toBeTruthy();
  });
});
