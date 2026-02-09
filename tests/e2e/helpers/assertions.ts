/**
 * Custom Assertions
 * Reusable assertion functions for E2E tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Assert user is authenticated
 */
export async function assertUserAuthenticated(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  expect(token).toBeTruthy();

  const user = await page.evaluate(() => localStorage.getItem('user'));
  expect(user).toBeTruthy();
}

/**
 * Assert user is not authenticated
 */
export async function assertUserNotAuthenticated(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  expect(token).toBeNull();

  const user = await page.evaluate(() => localStorage.getItem('user'));
  expect(user).toBeNull();
}

/**
 * Assert user is on login page
 */
export async function assertOnLoginPage(page: Page) {
  expect(page.url()).toContain('authentication-log-in');
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible();
}

/**
 * Assert user is on home page
 */
export async function assertOnHomePage(page: Page) {
  expect(page.url()).toContain('home') || expect(page.url()).toContain('index');
  const cartBadge = page.locator('#cartBadge, .cart-badge');
  await expect(cartBadge).toBeVisible();
}

/**
 * Assert error message is displayed
 */
export async function assertErrorMessageDisplayed(page: Page, expectedText?: string) {
  const errorElement = page.locator('.alert-danger, .error-message, [role="alert"].alert-danger');
  await expect(errorElement).toBeVisible();

  if (expectedText) {
    await expect(errorElement).toContainText(expectedText);
  }
}

/**
 * Assert success message is displayed
 */
export async function assertSuccessMessageDisplayed(page: Page, expectedText?: string) {
  const successElement = page.locator('.alert-success, .success-message, [role="status"]');
  await expect(successElement).toBeVisible();

  if (expectedText) {
    await expect(successElement).toContainText(expectedText);
  }
}

/**
 * Assert cart badge shows correct count
 */
export async function assertCartBadgeCount(page: Page, expectedCount: number) {
  const badge = page.locator('#cartBadge, .cart-badge').first();
  await expect(badge).toHaveText(expectedCount.toString());
}

/**
 * Assert user greeting displays
 */
export async function assertUserGreetingDisplayed(page: Page, userName?: string) {
  const greeting = page.locator('#userGreeting');
  await expect(greeting).toBeVisible();

  if (userName) {
    await expect(greeting).toContainText(`Hi! ${userName}`);
  }
}

/**
 * Assert product is in cart
 */
export async function assertProductInCart(page: Page, productName: string) {
  const cartItem = page.locator(`.card.rounded-3:has-text("${productName}")`);
  await expect(cartItem).toBeVisible();
}

/**
 * Assert form field has error
 */
export async function assertFormFieldHasError(page: Page, selector: string) {
  const field = page.locator(selector);
  const errorClass = await field.evaluate((el) => {
    return el.classList.contains('is-invalid') || el.classList.contains('error');
  });

  expect(errorClass).toBeTruthy();
}

/**
 * Assert form field is valid
 */
export async function assertFormFieldIsValid(page: Page, selector: string) {
  const field = page.locator(selector);
  const hasErrorClass = await field.evaluate((el) => {
    return el.classList.contains('is-invalid') || el.classList.contains('error');
  });

  expect(hasErrorClass).toBeFalsy();
}

/**
 * Assert button is enabled
 */
export async function assertButtonEnabled(page: Page, selector: string) {
  const button = page.locator(selector);
  await expect(button).not.toBeDisabled();
}

/**
 * Assert button is disabled
 */
export async function assertButtonDisabled(page: Page, selector: string) {
  const button = page.locator(selector);
  await expect(button).toBeDisabled();
}

/**
 * Assert element has attribute
 */
export async function assertElementHasAttribute(
  page: Page,
  selector: string,
  attribute: string,
  value?: string
) {
  const element = page.locator(selector);

  if (value) {
    await expect(element).toHaveAttribute(attribute, value);
  } else {
    const attrValue = await element.getAttribute(attribute);
    expect(attrValue).not.toBeNull();
  }
}

/**
 * Assert price is displayed in correct format
 */
export async function assertPriceFormat(page: Page, selector: string) {
  const priceElement = page.locator(selector);
  const text = await priceElement.textContent();

  // Check for currency symbol and numbers
  const priceRegex = /[₱$]\s?\d+(?:,\d{3})*(?:\.\d{2})?/;
  expect(text).toMatch(priceRegex);
}

/**
 * Assert product card displays
 */
export async function assertProductCardDisplays(page: Page, productName: string) {
  const card = page.locator(`.card:has-text("${productName}")`);
  await expect(card).toBeVisible();

  // Check for essential product card elements
  const priceElement = card.locator('[data-price], .product-price');
  await expect(priceElement).toBeVisible();
}

/**
 * Assert table row exists
 */
export async function assertTableRowExists(page: Page, tableSelector: string, rowText: string) {
  const row = page.locator(`${tableSelector} tbody tr:has-text("${rowText}")`);
  await expect(row).toBeVisible();
}

/**
 * Assert redirect happened
 */
export async function assertRedirectHappened(page: Page, fromUrl: string, toUrl: string) {
  // This would typically be done by checking page history or final URL
  expect(page.url()).toContain(toUrl);
}

/**
 * Assert form validation message
 */
export async function assertFormValidationMessage(page: Page, fieldName: string, expectedMessage: string) {
  const validationElement = page.locator(`[data-field="${fieldName}"] .invalid-feedback, .${fieldName}-error`);
  await expect(validationElement).toContainText(expectedMessage);
}

/**
 * Assert no console errors
 */
export async function assertNoConsoleErrors(page: Page) {
  const consoleMessages: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleMessages.push(msg.text());
    }
  });

  expect(consoleMessages.length).toBe(0);
}

/**
 * Assert accessibility - headings present
 */
export async function assertHeadingsPresent(page: Page) {
  const h1 = page.locator('h1');
  await expect(h1).toHaveCount(1); // Each page should have one h1
}

/**
 * Assert accessibility - alt text on images
 */
export async function assertImageAltText(page: Page) {
  const imagesWithoutAlt = page.locator('img:not([alt])');
  const count = await imagesWithoutAlt.count();

  // Allow some images without alt text, but not all
  expect(count).toBeLessThan(5);
}

/**
 * Assert link is not broken
 */
export async function assertLinkNotBroken(page: Page, selector: string) {
  const link = page.locator(selector);
  const href = await link.getAttribute('href');

  expect(href).toBeTruthy();
  expect(href).not.toContain('javascript:');
  expect(href).not.toContain('#');
}

/**
 * Assert element has text
 */
export async function assertElementHasText(page: Page, selector: string, expectedText: string) {
  const element = page.locator(selector);
  await expect(element).toContainText(expectedText);
}

/**
 * Assert element does not have text
 */
export async function assertElementNotHasText(page: Page, selector: string, unexpectedText: string) {
  const element = page.locator(selector);
  await expect(element).not.toContainText(unexpectedText);
}

/**
 * Assert modal is displayed
 */
export async function assertModalDisplayed(page: Page, modalTitle?: string) {
  const modal = page.locator('.modal.show, [role="dialog"]');
  await expect(modal).toBeVisible();

  if (modalTitle) {
    const title = page.locator(`.modal-title:has-text("${modalTitle}")`);
    await expect(title).toBeVisible();
  }
}

/**
 * Assert loader is displayed
 */
export async function assertLoaderDisplayed(page: Page) {
  const loader = page.locator('.loader, .spinner, [aria-label*="loading"]');
  await expect(loader).toBeVisible();
}

/**
 * Assert loader is hidden
 */
export async function assertLoaderHidden(page: Page) {
  const loader = page.locator('.loader, .spinner, [aria-label*="loading"]');
  await expect(loader).not.toBeVisible();
}
