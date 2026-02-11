/**
 * Authentication Tests
 * Tests for login, registration, session persistence, and protected routes
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, AUTH_CREDENTIALS } from '../fixtures/test-users';
import { LoginPage, RegisterPage, HomePage } from '../helpers/page-objects';
import { login, logout, isAuthenticated, getAuthUser } from '../helpers/common';
import {
  assertUserAuthenticated,
  assertUserNotAuthenticated,
  assertOnLoginPage,
  assertOnHomePage,
  assertToastVisible,
  assertErrorToast,
} from '../helpers/assertions';

test.describe('Authentication Flows', () => {
  test('1.1: User can login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(TEST_USERS.validUser.email, TEST_USERS.validUser.password);

    await page.waitForURL('**/');
    await assertUserAuthenticated(page);
    await assertOnHomePage(page);
  });

  test('1.2: Login fails with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(AUTH_CREDENTIALS.invalid.email, AUTH_CREDENTIALS.invalid.password);

    await assertOnLoginPage(page);
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]').first();
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test('1.3: User can register a new account', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.navigate();

    const uniqueEmail = `test-${Date.now()}@example.com`;
    await registerPage.register('New Test User', uniqueEmail, 'TestPassword123!');

    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url.includes('/login') || url.match(/\/$/)).toBeTruthy();
  });

  test('1.4: Session persists on page reload', async ({ page }) => {
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);
    await assertUserAuthenticated(page);

    await page.reload();
    await page.waitForLoadState('networkidle');

    await assertUserAuthenticated(page);
    const user = await getAuthUser(page);
    expect(user).toBeTruthy();
  });

  test('1.5: Unauthenticated user redirected to login from profile', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    await page.goto('/profile');
    await page.waitForTimeout(1000);
    await assertOnLoginPage(page);
  });

  test('1.6: User can logout', async ({ page }) => {
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);
    await assertUserAuthenticated(page);

    await logout(page);
    await assertOnLoginPage(page);
    await assertUserNotAuthenticated(page);
  });

  test('1.7: Login form validation - empty fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    await loginPage.submitButton.click();
    await assertOnLoginPage(page);
  });

  test('1.8: SQL injection prevention', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(AUTH_CREDENTIALS.malicious.email, AUTH_CREDENTIALS.malicious.password);

    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/login');
  });
});
