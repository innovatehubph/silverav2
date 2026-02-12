import { Page, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3865';

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
}

export async function login(page: Page, email: string, password: string) {
  // Use API-based login to avoid UI race conditions in CI.
  // UI login is tested separately in 01-authentication.spec.ts.
  const response = await page.request.post(`${BASE_URL}/api/auth/login`, {
    data: { email, password },
  });
  const body = await response.json();
  const { user, token } = body.data ?? body;

  // Seed localStorage so the Zustand persist store and axios interceptor pick up the session
  await page.goto('/');
  await page.evaluate(({ user, token }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('silvera-auth', JSON.stringify({
      state: { user, token, isAuthenticated: true },
      version: 0,
    }));
  }, { user, token });

  // Reload so the app rehydrates with the authenticated state
  await page.reload();
  await page.waitForLoadState('domcontentloaded');

  // Wait for React + Zustand to hydrate auth state (Firefox is slower)
  await page.locator('a[href="/cart"], a[href="/profile"]').first().waitFor({ timeout: 8000 }).catch(() => {});
}

export async function logout(page: Page) {
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
}

export async function isAuthenticated(page: Page): Promise<boolean> {
  const authData = await page.evaluate(() => {
    const raw = localStorage.getItem('silvera-auth');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });
  return !!(authData?.state?.token);
}

export async function getAuthUser(page: Page) {
  const authData = await page.evaluate(() => {
    const raw = localStorage.getItem('silvera-auth');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });
  return authData?.state?.user ?? null;
}

export async function addToCart(page: Page, productId: number) {
  await page.goto(`/product/${productId}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  const sizeBtn = page.locator('button').filter({ hasText: /^(XS|S|M|L|XL|XXL|Free Size|\d+)$/ }).first();
  if (await sizeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sizeBtn.click();
  }
  await page.locator('button:has-text("Add to Cart")').click();
  await page.locator('[data-sonner-toast]').waitFor({ timeout: 5000 }).catch(() => {});
}

export async function getCartBadgeCount(page: Page): Promise<number> {
  const badge = page.locator('a[href="/cart"] span.absolute').first();
  if (await badge.isVisible({ timeout: 2000 }).catch(() => false)) {
    const text = await badge.textContent();
    return parseInt(text || '0', 10);
  }
  return 0;
}

export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).isVisible();
}

export async function fillFormField(page: Page, selector: string, value: string) {
  await page.locator(selector).fill(value);
}

export async function clickButtonByText(page: Page, text: string) {
  await page.locator(`button:has-text("${text}")`).click();
}

export async function clickLinkByText(page: Page, text: string) {
  await page.locator(`a:has-text("${text}")`).click();
}

export async function getToastMessage(page: Page): Promise<string | null> {
  const toast = page.locator('[data-sonner-toast]').first();
  if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
    return toast.textContent();
  }
  return null;
}

export async function waitForAPIResponse(page: Page, url: string | RegExp) {
  return page.waitForResponse(response =>
    typeof url === 'string' ? response.url().includes(url) : url.test(response.url())
  );
}

export async function getLocalStorageValue(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

export async function setLocalStorageValue(page: Page, key: string, value: string) {
  await page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: key, v: value });
}

export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

export async function simulateNetworkError(page: Page) {
  await page.context().setOffline(true);
}

export async function restoreNetwork(page: Page) {
  await page.context().setOffline(false);
}

export async function waitForElement(page: Page, selector: string, timeout: number = 5000) {
  await page.waitForSelector(selector, { timeout });
}

export async function countElements(page: Page, selector: string): Promise<number> {
  return page.locator(selector).count();
}

export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

export function generateRandomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

export function generateTestEmail(): string {
  return `test-${generateRandomString()}@example.com`;
}

export async function registerUser(email: string, password: string, name: string) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, phone: '09171234567' }),
  });
  return res;
}
