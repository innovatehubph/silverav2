import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || (process.env.CI ? 'http://localhost:3865' : 'https://silvera.innoserver.cloud');

// File-backed login cache — survives across workers and test runs so we don't
// exhaust the auth rate limiter (max 10 per 15 min in production).
const CACHE_DIR = path.join(__dirname, '..', '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'login-tokens.json');
const CACHE_MAX_AGE_MS = 14 * 60 * 1000; // 14 minutes (under the 15-min rate-limit window)

type CacheEntry = { user: unknown; token: string; ts: number };

function readCache(): Record<string, CacheEntry> {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch { return {}; }
}

function writeCache(cache: Record<string, CacheEntry>) {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
}

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
}

export async function login(page: Page, email: string, password: string) {
  // Use API-based login to avoid UI race conditions in CI.
  // UI login is tested separately in 01-authentication.spec.ts.
  const cacheKey = `${email}:${password}`;
  let user: unknown;
  let token: string;

  // Check file-backed cache first
  const cache = readCache();
  const cached = cache[cacheKey];
  if (cached && (Date.now() - cached.ts) < CACHE_MAX_AGE_MS) {
    user = cached.user;
    token = cached.token;
  } else {
    let response;
    for (let attempt = 0; attempt < 5; attempt++) {
      response = await page.request.post(`${BASE_URL}/api/auth/login`, {
        data: { email, password },
      });
      if (response.status() === 429) {
        // Rate limited — wait with exponential backoff
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }
      break;
    }

    if (!response!.ok()) {
      throw new Error(`Login API failed (${response!.status()}): ${response!.statusText()}`);
    }

    const body = await response!.json();
    const data = body.data ?? body;
    user = data.user;
    token = data.token;

    if (!user || !token) {
      throw new Error('Login API returned empty user or token');
    }

    // Persist to file so other workers and future runs reuse it
    const freshCache = readCache();
    freshCache[cacheKey] = { user, token, ts: Date.now() };
    writeCache(freshCache);
  }

  // Seed localStorage so the Zustand persist store and axios interceptor pick up the session.
  // Use /login (lightweight page) instead of / to avoid triggering product/category API calls
  // that count against the 100 req/min rate limit.
  await page.goto('/login');
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

  // Wait for Zustand persist to hydrate auth from localStorage
  await page.waitForFunction(() => {
    try {
      const raw = localStorage.getItem('silvera-auth');
      return raw ? JSON.parse(raw)?.state?.isAuthenticated === true : false;
    } catch { return false; }
  }, { timeout: 5000 });
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
  const addBtn = page.locator('button:has-text("Add to Cart")');
  const notFound = page.getByText(/Product Not Found/i);

  // Retry up to 5 times — "Product Not Found" can appear transiently when the
  // product API is rate-limited (429 → component treats error as "not found").
  // Use 5s exponential backoff to let the 1-minute rate limit window cool down.
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.goto(`/product/${productId}`);
    await page.waitForLoadState('domcontentloaded');

    await addBtn.or(notFound).first().waitFor({ state: 'visible', timeout: 30000 });

    if (await addBtn.isVisible().catch(() => false)) break;

    if (attempt < 4) {
      // "Product Not Found" likely due to rate limit — wait and retry
      await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
    } else {
      throw new Error(`Product ${productId} not found after ${attempt + 1} attempts`);
    }
  }

  const sizeBtn = page.locator('button').filter({ hasText: /^(XS|S|M|L|XL|XXL|Free Size|\d+)$/ }).first();
  if (await sizeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sizeBtn.click();
  }
  await addBtn.click();
  await page.locator('[data-sonner-toast]').waitFor({ timeout: 5000 }).catch(() => {});
}

/**
 * Navigate to the shop page and wait for products to appear, retrying on rate-limit-induced
 * empty results. Returns the count of visible product cards.
 */
export async function waitForShopProducts(page: Page, maxAttempts = 3): Promise<number> {
  const productCards = page.locator('a[href^="/product/"]');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 5000 * attempt));
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
    }

    // Wait for product cards to appear (or timeout)
    await productCards.first().waitFor({ state: 'attached', timeout: 20000 }).catch(() => {});
    const count = await productCards.count();
    if (count > 0) return count;
  }

  return 0;
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
