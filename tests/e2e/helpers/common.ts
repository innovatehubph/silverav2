/**
 * Common Test Helpers
 * Shared utilities for E2E tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Login helper function
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/authentication-log-in.html');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
}

/**
 * Logout helper function
 */
export async function logout(page: Page) {
  // Click logout button
  const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }

  // Verify redirected to login page
  await page.waitForURL('**/authentication-log-in.html');
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  return !!token;
}

/**
 * Get authenticated user data
 */
export async function getAuthenticatedUser(page: Page) {
  const userStr = await page.evaluate(() => localStorage.getItem('user'));
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Add product to cart
 */
export async function addToCart(page: Page, productId: number) {
  await page.goto(`/product-details.html?id=${productId}`);
  await page.click('button:has-text("Add to Cart")');
  // Wait for confirmation
  await page.waitForTimeout(500);
}

/**
 * Get cart badge count
 */
export async function getCartBadgeCount(page: Page): Promise<number> {
  const badge = page.locator('#cartBadge, .cart-badge').first();
  const text = await badge.textContent();
  return parseInt(text || '0', 10);
}

/**
 * Get user greeting text
 */
export async function getUserGreeting(page: Page): Promise<string | null> {
  const greeting = page.locator('#userGreeting');
  return greeting.isVisible() ? greeting.textContent() : null;
}

/**
 * Check if element is visible
 */
export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  return element.isVisible();
}

/**
 * Fill form field
 */
export async function fillFormField(page: Page, selector: string, value: string) {
  await page.fill(selector, value);
}

/**
 * Click button by text
 */
export async function clickButtonByText(page: Page, text: string) {
  await page.click(`button:has-text("${text}")`);
}

/**
 * Click link by text
 */
export async function clickLinkByText(page: Page, text: string) {
  await page.click(`a:has-text("${text}")`);
}

/**
 * Get error message from form
 */
export async function getFormErrorMessage(page: Page): Promise<string | null> {
  const errorElement = page.locator('.alert-danger, .error-message, [role="alert"]');
  return errorElement.isVisible() ? errorElement.textContent() : null;
}

/**
 * Wait for API response
 */
export async function waitForAPIResponse(page: Page, url: string | RegExp) {
  return page.waitForResponse(response =>
    typeof url === 'string' ? response.url().includes(url) : url.test(response.url())
  );
}

/**
 * Get localStorage value
 */
export async function getLocalStorageValue(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

/**
 * Set localStorage value
 */
export async function setLocalStorageValue(page: Page, key: string, value: string) {
  await page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: key, v: value });
}

/**
 * Clear localStorage
 */
export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

/**
 * Take screenshot for debugging
 */
export async function debugScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `tests/e2e/reports/debug-${name}-${Date.now()}.png` });
}

/**
 * Check network error
 */
export async function checkForNetworkError(page: Page): Promise<boolean> {
  const errors = await page.evaluate(() => {
    return (window as any).__networkErrors?.length > 0 || false;
  });
  return errors;
}

/**
 * Simulate network error
 */
export async function simulateNetworkError(page: Page) {
  await page.context().setOffline(true);
}

/**
 * Restore network
 */
export async function restoreNetwork(page: Page) {
  await page.context().setOffline(false);
}

/**
 * Wait for element with timeout
 */
export async function waitForElement(page: Page, selector: string, timeout: number = 5000) {
  await page.waitForSelector(selector, { timeout });
}

/**
 * Get table data
 */
export async function getTableData(page: Page, tableSelector: string) {
  return page.evaluate((selector) => {
    const table = document.querySelector(selector);
    if (!table) return [];

    const rows = table.querySelectorAll('tbody tr');
    return Array.from(rows).map(row => {
      const cells = row.querySelectorAll('td');
      return Array.from(cells).map(cell => cell.textContent?.trim() || '');
    });
  }, tableSelector);
}

/**
 * Count elements
 */
export async function countElements(page: Page, selector: string): Promise<number> {
  return page.locator(selector).count();
}

/**
 * Check if button is enabled
 */
export async function isButtonEnabled(page: Page, selector: string): Promise<boolean> {
  const button = page.locator(selector);
  return !await button.isDisabled();
}

/**
 * Assert text content
 */
export async function assertTextContent(page: Page, selector: string, expectedText: string) {
  const element = page.locator(selector);
  await expect(element).toContainText(expectedText);
}

/**
 * Assert URL contains
 */
export async function assertURLContains(page: Page, urlPart: string) {
  expect(page.url()).toContain(urlPart);
}

/**
 * Assert element count
 */
export async function assertElementCount(page: Page, selector: string, count: number) {
  const elements = page.locator(selector);
  await expect(elements).toHaveCount(count);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'PHP'): string {
  if (currency === 'PHP') {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generate unique email for testing
 */
export function generateTestEmail(): string {
  return `test-${generateRandomString()}@example.com`;
}

/**
 * Delay execution (in milliseconds)
 */
export async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
