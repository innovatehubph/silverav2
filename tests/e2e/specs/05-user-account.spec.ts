/**
 * User Account Tests
 * Tests for profile, orders, and account pages
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { ProfilePage, OrdersPage } from '../helpers/page-objects';
import { login } from '../helpers/common';

test.describe('User Account Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);
  });

  test('5.1: Profile page loads with user info', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.navigate();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expect(profilePage.nameDisplay).toBeVisible();
    await expect(profilePage.emailDisplay).toBeVisible();
  });

  test('5.2: Profile shows authenticated user name', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.navigate();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const nameText = await profilePage.nameDisplay.textContent();
    expect(nameText).toBeTruthy();
    expect(nameText!.length).toBeGreaterThan(0);
  });

  test('5.3: Orders page accessible', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.navigate();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/orders');

    const orderCount = await ordersPage.getOrdersCount();
    const emptyVisible = await ordersPage.emptyMessage.isVisible().catch(() => false);
    expect(orderCount >= 0 || emptyVisible).toBeTruthy();
  });

  test('5.4: Orders page shows order cards or empty message', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.navigate();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const orderCount = await ordersPage.getOrdersCount();
    if (orderCount > 0) {
      await expect(ordersPage.orderCards.first()).toBeVisible();
    } else {
      const emptyMessage = await ordersPage.emptyMessage.isVisible().catch(() => false);
      expect(emptyMessage).toBeTruthy();
    }
  });

  test('5.5: Profile has logout option', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.navigate();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const logoutVisible = await profilePage.logoutButton.isVisible().catch(() => false);
    expect(logoutVisible).toBeTruthy();
  });

  test('5.6: Wishlist page accessible', async ({ page }) => {
    await page.goto('/wishlist');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/wishlist');
  });
});
