/**
 * Authentication Tests
 * Tests for login, logout, forgot password, and PIN setup flows
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, AUTH_CREDENTIALS, TEST_PINS } from '../fixtures/test-users';
import { LoginPage, HomePage } from '../helpers/page-objects';
import {
  login,
  logout,
  isAuthenticated,
  getAuthenticatedUser,
} from '../helpers/common';
import {
  assertUserAuthenticated,
  assertUserNotAuthenticated,
  assertOnLoginPage,
  assertOnHomePage,
  assertErrorMessageDisplayed,
} from '../helpers/assertions';

test.describe('Authentication Flows', () => {
  test('Test 1.1: User can login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const homePage = new HomePage(page);

    await loginPage.goto('/authentication-log-in.html');
    await loginPage.login(TEST_USERS.validUser.email, TEST_USERS.validUser.password);

    // Wait for navigation
    await page.waitForURL('**/home.html');

    // Assert user is authenticated
    await assertUserAuthenticated(page);
    await assertOnHomePage(page);
  });

  test('Test 1.2: Login fails with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto('/authentication-log-in.html');
    await loginPage.login(AUTH_CREDENTIALS.invalidCredentials.email, AUTH_CREDENTIALS.invalidCredentials.password);

    // Should still be on login page
    await assertOnLoginPage(page);

    // Error message should be displayed
    const errorText = await loginPage.getErrorMessage();
    expect(errorText).toBeTruthy();
  });

  test('Test 1.3: User can logout successfully', async ({ page }) => {
    // First login
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);
    await assertUserAuthenticated(page);

    const homePage = new HomePage(page);

    // Now logout
    await homePage.logout();

    // Should be redirected to login page
    await assertOnLoginPage(page);

    // User data should be cleared
    await assertUserNotAuthenticated(page);
  });

  test('Test 1.4: Forgot password flow works', async ({ page }) => {
    await page.goto('/authentication-forgot-password.html');

    // Fill in email
    await page.fill('input[type="email"]', TEST_USERS.validUser.email);

    // Submit form
    await page.click('button[type="submit"]');

    // Should see OTP page or success message
    const successOrOTP = await page.locator(
      'text=Check your email, text=Enter OTP, text=OTP sent'
    );

    // Either redirected to OTP page or see success message
    const isOTPPage = page.url().includes('otp-verification');
    const hasMessage = await successOrOTP.isVisible().catch(() => false);

    expect(isOTPPage || hasMessage).toBeTruthy();
  });

  test('Test 1.5: PIN setup for new user', async ({ page }) => {
    // First login
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);

    // Navigate to profile or trigger PIN setup
    await page.goto('/my-profile.html');

    // Try to set up PIN
    const pinSetupButton = page.locator('button:has-text("Set PIN"), button:has-text("Setup PIN")');
    if (await pinSetupButton.isVisible()) {
      await pinSetupButton.click();

      // Enter PIN
      const pinInputs = page.locator('input[data-pin], input[maxlength="1"]');
      const pinArray = TEST_PINS.validPIN.split('');

      for (let i = 0; i < pinArray.length; i++) {
        const inputs = await pinInputs.all();
        if (inputs[i]) {
          await inputs[i].fill(pinArray[i]);
        }
      }

      // Confirm PIN - enter again
      for (let i = 0; i < pinArray.length; i++) {
        const inputs = await pinInputs.all();
        // Skip first 6 inputs (first PIN entry) and go to confirmation inputs
        if (inputs[i + 6]) {
          await inputs[i + 6].fill(pinArray[i]);
        }
      }

      // Submit
      await page.click('button:has-text("Confirm")');

      // Should see success message or redirect
      await page.waitForTimeout(500);
    }
  });

  test('Test 1.6: Session persists on page reload', async ({ page }) => {
    // Login
    await login(page, TEST_USERS.validUser.email, TEST_USERS.validUser.password);
    await assertUserAuthenticated(page);

    // Reload page
    await page.reload();

    // Should still be authenticated
    await assertUserAuthenticated(page);

    // User data should still be in localStorage
    const user = await getAuthenticatedUser(page);
    expect(user).toBeTruthy();
    expect(user.name).toBe(TEST_USERS.validUser.name);
  });

  test('Test 1.7: Unauthenticated user redirected to login', async ({ page }) => {
    // Clear authentication
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    });

    // Try to access protected page
    await page.goto('/my-profile.html');

    // Should be redirected to login
    await assertOnLoginPage(page);
  });

  test('Test 1.8: Login form validation', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto('/authentication-log-in.html');

    // Try to submit empty form
    await loginPage.submitButton.click();

    // Should show validation errors or remain on page
    const isStillOnLogin = page.url().includes('authentication-log-in');
    expect(isStillOnLogin).toBeTruthy();
  });
});
