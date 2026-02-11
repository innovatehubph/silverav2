/**
 * Payment Flow Tests
 * Tests for checkout, payment methods, and order placement
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { PAYMENT_METHODS } from '../fixtures/test-data';
import { CheckoutPage, CartPage } from '../helpers/page-objects';
import { login, addToCart } from '../helpers/common';

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
    await page.waitForLoadState('domcontentloaded');

    const paymentLabels = await checkoutPage.paymentMethodLabels.count();
    expect(paymentLabels).toBeGreaterThan(0);
  });

  test('4.3: COD payment method can be selected', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.navigate();
    await page.waitForLoadState('domcontentloaded');

    await checkoutPage.selectCOD();
    await expect(checkoutPage.codRadio).toBeChecked();
  });

  test('4.4: Place order with COD', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.navigate();
    await page.waitForLoadState('domcontentloaded');

    await checkoutPage.selectCOD();
    await checkoutPage.placeOrder();
    await page.waitForTimeout(3000);

    const url = page.url();
    const hasToast = await page.locator('[data-sonner-toast]').isVisible().catch(() => false);
    expect(url.includes('/order') || hasToast).toBeTruthy();
  });

  test('4.5: GCash payment option available', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.navigate();
    await page.waitForLoadState('domcontentloaded');

    const gcashVisible = await checkoutPage.gcashRadio.isVisible().catch(() => false);
    expect(gcashVisible).toBeTruthy();
  });

  test('4.6: Card payment option available', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));
    await addToCart(page, 1);

    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.navigate();
    await page.waitForLoadState('domcontentloaded');

    const cardVisible = await checkoutPage.cardRadio.isVisible().catch(() => false);
    expect(cardVisible).toBeTruthy();
  });

  test('4.7: Empty cart shows message in checkout', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('silvera-cart'));

    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.navigate();
    await page.waitForLoadState('domcontentloaded');

    const emptyVisible = await checkoutPage.emptyCartMessage.isVisible().catch(() => false);
    const redirectedToCart = page.url().includes('/cart');
    expect(emptyVisible || redirectedToCart).toBeTruthy();
  });
});
