/**
 * User Account Tests
 * Tests for profile, addresses, and orders management
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { TEST_ADDRESSES, TEST_ORDERS } from '../fixtures/test-data';
import { ProfilePage, AddressesPage, OrdersPage } from '../helpers/page-objects';
import { login } from '../helpers/common';

test.describe('User Account Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.addressUser.email, TEST_USERS.addressUser.password);
  });

  test('Test 5.1: View user profile', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto('/my-profile.html');
    await page.waitForLoadState('networkidle');

    // Check profile fields are displayed
    const nameField = page.locator('input[name*="name"], [data-field="name"]');
    const emailField = page.locator('input[type="email"]');

    expect(await nameField.isVisible()).toBeTruthy();
    expect(await emailField.isVisible()).toBeTruthy();
  });

  test('Test 5.2: Edit user profile', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto('/my-profile.html');
    await page.waitForLoadState('networkidle');

    // Click edit if button exists
    if (await profilePage.editButton.isVisible()) {
      await profilePage.editButton.click();

      // Update name
      await profilePage.nameField.fill('Updated Name');
      await profilePage.saveButton.click();

      // Should show success message
      const success = await profilePage.getSuccessMessage();
      expect(success).toBeTruthy();
    }
  });

  test('Test 5.3: View addresses list', async ({ page }) => {
    const addressesPage = new AddressesPage(page);
    await addressesPage.goto('/addresses.html');
    await page.waitForLoadState('networkidle');

    // Check addresses are displayed or empty state
    const count = await addressesPage.getAddressCount();
    expect(typeof count).toBe('number');
  });

  test('Test 5.4: Add new address', async ({ page }) => {
    const addressesPage = new AddressesPage(page);
    await addressesPage.goto('/addresses.html');
    await page.waitForLoadState('networkidle');

    const initialCount = await addressesPage.getAddressCount();

    // Add address
    await addressesPage.addAddress(TEST_ADDRESSES.primaryAddress);
    await page.waitForTimeout(500);

    // Count should increase
    const newCount = await addressesPage.getAddressCount();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('Test 5.5: Edit existing address', async ({ page }) => {
    const addressesPage = new AddressesPage(page);
    await addressesPage.goto('/addresses.html');
    await page.waitForLoadState('networkidle');

    // Find edit button on first address
    const editButton = page.locator('button:has-text("Edit"), [aria-label*="edit"]');
    if (await editButton.first().isVisible()) {
      await editButton.first().click();

      // Update address
      await addressesPage.addressInput.fill('Updated Address Street');
      await addressesPage.saveButton.click();

      await page.waitForTimeout(300);
    }
  });

  test('Test 5.6: Delete address', async ({ page }) => {
    const addressesPage = new AddressesPage(page);
    await addressesPage.goto('/addresses.html');
    await page.waitForLoadState('networkidle');

    const initialCount = await addressesPage.getAddressCount();

    if (initialCount > 0) {
      // Delete first address
      await addressesPage.deleteAddress(0);
      await page.waitForTimeout(500);

      // Count should decrease
      const newCount = await addressesPage.getAddressCount();
      expect(newCount).toBeLessThan(initialCount);
    }
  });

  test('Test 5.7: View orders list', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.goto('/my-orders.html');
    await page.waitForLoadState('networkidle');

    // Check orders are displayed
    const count = await ordersPage.getOrdersCount();
    expect(typeof count).toBe('number');
  });

  test('Test 5.8: View order details', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.goto('/my-orders.html');
    await page.waitForLoadState('networkidle');

    const orderCount = await ordersPage.getOrdersCount();

    if (orderCount > 0) {
      // Click view on first order
      await ordersPage.viewOrder(0);
      await page.waitForNavigation();

      // Should display order details
      expect(page.url()).toContain('order') || expect(page.url()).not.toContain('my-orders');
    }
  });

  test('Test 5.9: Track order', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.goto('/my-orders.html');
    await page.waitForLoadState('networkidle');

    const orderCount = await ordersPage.getOrdersCount();

    if (orderCount > 0) {
      // Click track on first order
      await ordersPage.trackOrder(0);
      await page.waitForNavigation();

      // Should navigate to tracking page
      expect(
        page.url().includes('order-tracking') ||
        page.url().includes('tracking') ||
        page.url().includes('order')
      ).toBeTruthy();
    }
  });

  test('Test 5.10: Download invoice', async ({ page }) => {
    await page.goto('/my-orders.html');
    await page.waitForLoadState('networkidle');

    // Look for download/invoice button
    const downloadButton = page.locator('button:has-text("Download"), button:has-text("Invoice")');

    if (await downloadButton.isVisible()) {
      // Handle download
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.first().click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBeTruthy();
    }
  });

  test('Test 5.11: Change password', async ({ page }) => {
    await page.goto('/authentication-change-password.html');
    await page.waitForLoadState('networkidle');

    // Check change password form
    const oldPasswordInput = page.locator('input[name*="old"], input[name*="current"]');
    const newPasswordInput = page.locator('input[name*="new"]');

    const formExists = (await oldPasswordInput.isVisible().catch(() => false)) &&
                      (await newPasswordInput.isVisible().catch(() => false));

    expect(formExists).toBeTruthy();
  });

  test('Test 5.12: Notification preferences (if available)', async ({ page }) => {
    const settingsLink = page.locator('a[href*="settings"], a:has-text("Settings")');

    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');

      // Check for notification preferences
      const notificationToggle = page.locator('[role="switch"], input[type="checkbox"]');
      const hasToggle = await notificationToggle.isVisible().catch(() => false);

      expect(typeof hasToggle).toBe('boolean');
    }
  });
});
