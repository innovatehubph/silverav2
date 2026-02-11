import { Page, expect } from '@playwright/test';

export async function assertUserAuthenticated(page: Page) {
  const authData = await page.evaluate(() => {
    const raw = localStorage.getItem('silvera-auth');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });
  expect(authData?.state?.token).toBeTruthy();
}

export async function assertUserNotAuthenticated(page: Page) {
  const authData = await page.evaluate(() => {
    const raw = localStorage.getItem('silvera-auth');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });
  expect(authData?.state?.token).toBeFalsy();
}

export async function assertOnLoginPage(page: Page) {
  expect(page.url()).toContain('/login');
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible();
}

export async function assertOnHomePage(page: Page) {
  const url = new URL(page.url());
  expect(url.pathname).toBe('/');
}

export async function assertErrorToastDisplayed(page: Page, expectedText?: string) {
  const toast = page.locator('[data-sonner-toast]').first();
  await expect(toast).toBeVisible({ timeout: 5000 });
  if (expectedText) {
    await expect(toast).toContainText(expectedText);
  }
}

export async function assertSuccessToastDisplayed(page: Page, expectedText?: string) {
  const toast = page.locator('[data-sonner-toast]').first();
  await expect(toast).toBeVisible({ timeout: 5000 });
  if (expectedText) {
    await expect(toast).toContainText(expectedText);
  }
}

export async function assertCartBadgeCount(page: Page, expectedCount: number) {
  const badge = page.locator('header span').filter({ hasText: /^\d+$/ }).first();
  await expect(badge).toHaveText(expectedCount.toString());
}

export async function assertPriceFormat(page: Page, selector: string) {
  const priceElement = page.locator(selector);
  const text = await priceElement.textContent();
  const priceRegex = /₱[\d,]+(\.\d{2})?/;
  expect(text).toMatch(priceRegex);
}

export async function assertRedirectHappened(page: Page, toUrl: string) {
  expect(page.url()).toContain(toUrl);
}
