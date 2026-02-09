# Silvera V2 - E2E Testing Guide

Complete guide for running, maintaining, and understanding the Playwright E2E test suite.

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 8+
- Silvera V2 server running on `http://localhost:3000`

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests

```bash
# Run all tests (all browsers)
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# View HTML report
npm run test:e2e:report
```

---

## Test Organization

### Directory Structure

```
tests/e2e/
├── specs/                    # Test suites (7 files)
│   ├── 01-authentication.spec.ts
│   ├── 02-navigation.spec.ts
│   ├── 03-shopping-workflow.spec.ts
│   ├── 04-payment-flow.spec.ts
│   ├── 05-user-account.spec.ts
│   ├── 06-error-handling.spec.ts
│   └── 07-responsive-design.spec.ts
├── fixtures/                 # Test data
│   ├── test-users.ts
│   └── test-data.ts
├── helpers/                  # Reusable utilities
│   ├── common.ts
│   ├── page-objects.ts
│   └── assertions.ts
├── config/                   # Configuration
│   └── performance-monitor.js
└── reports/                  # Generated reports (after tests)
    ├── html/
    ├── screenshots/
    ├── videos/
    └── traces/
```

### Test Suites Overview

| Suite | File | Tests | Focus |
|-------|------|-------|-------|
| Authentication | 01-authentication.spec.ts | 8 | Login, logout, password reset |
| Navigation | 02-navigation.spec.ts | 8 | UI consistency, cart badge |
| Shopping | 03-shopping-workflow.spec.ts | 12 | Browse, add to cart, wishlist |
| Payment | 04-payment-flow.spec.ts | 10 | Checkout, payment methods |
| User Account | 05-user-account.spec.ts | 12 | Profile, addresses, orders |
| Error Handling | 06-error-handling.spec.ts | 14 | Network errors, validation |
| Responsive | 07-responsive-design.spec.ts | 22 | Mobile, tablet, desktop |

---

## Running Specific Tests

### Run Single Test Suite
```bash
npx playwright test tests/e2e/specs/01-authentication.spec.ts
```

### Run Single Test
```bash
npx playwright test 01-authentication -g "can login with valid credentials"
```

### Run Tests in Specific Browser
```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# WebKit only
npx playwright test --project=webkit

# Mobile Chrome
npx playwright test --project="Mobile Chrome"

# Mobile Safari
npx playwright test --project="Mobile Safari"
```

### Run Tests with Options
```bash
# Headless mode (default)
npx playwright test

# Headed mode (see browser window)
npx playwright test --headed

# Show UI mode
npx playwright test --ui

# Debug mode with inspector
npx playwright test --debug

# Slow down execution (ms per action)
npx playwright test --slow-motion=1000

# Fail fast on first failure
npx playwright test --fail-on-console-error

# Retries failed tests
npx playwright test --retries=2

# Generate trace for debugging
npx playwright test --trace=on
```

---

## Configuration

### Playwright Config
**Location**: `/root/silverav2/playwright.config.ts`

**Key Settings:**
- Base URL: `http://localhost:3000`
- Timeout: 30 seconds per test
- Expect timeout: 5 seconds
- Screenshots: On failure
- Videos: On failure (retained)
- Trace: On first retry

**Modify Timeouts:**
```typescript
// In playwright.config.ts
export default defineConfig({
  timeout: 60000,  // 60 seconds
  expect: {
    timeout: 10000, // 10 seconds
  }
});
```

---

## Test Data Management

### Test Users
**Location**: `tests/e2e/fixtures/test-users.ts`

Available test accounts:
```typescript
TEST_USERS.validUser              // Valid credentials
TEST_USERS.addressUser            // For address tests
TEST_USERS.paymentUser            // For payment tests
TEST_USERS.ordersUser             // For order tests
AUTH_CREDENTIALS.invalidCredentials // For negative tests
```

### Using Test Data
```typescript
import { TEST_USERS, TEST_PRODUCTS } from '../fixtures/test-users';
import { TEST_ADDRESSES, TEST_ORDERS } from '../fixtures/test-data';

test('example', async ({ page }) => {
  // Use test user
  const email = TEST_USERS.validUser.email;
  const password = TEST_USERS.validUser.password;

  // Use test product
  await addToCart(page, TEST_PRODUCTS.products[0].id);

  // Use test address
  const address = TEST_ADDRESSES.primaryAddress;
});
```

---

## Writing Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../helpers/page-objects';
import { login, logout } from '../helpers/common';

test('Test description', async ({ page }) => {
  // Arrange
  await login(page, 'email@example.com', 'password');

  // Act
  await page.goto('/home.html');

  // Assert
  await expect(page.locator('h1')).toBeVisible();
});
```

### Using Page Objects
```typescript
import { HomePage, ProductDetailsPage } from '../helpers/page-objects';

test('add product to cart', async ({ page }) => {
  const productPage = new ProductDetailsPage(page);

  await productPage.goto('/product-details.html?id=1');
  await productPage.addToCart(2); // quantity: 2

  const price = await productPage.getProductName();
  expect(price).toBeTruthy();
});
```

### Using Assertions
```typescript
import { assertUserAuthenticated, assertCartBadgeCount } from '../helpers/assertions';

test('verify authentication', async ({ page }) => {
  await login(page, email, password);

  await assertUserAuthenticated(page);
  await assertCartBadgeCount(page, 0);
});
```

### Using Common Helpers
```typescript
import {
  addToCart,
  getCartBadgeCount,
  getUserGreeting
} from '../helpers/common';

test('test helper functions', async ({ page }) => {
  const count = await getCartBadgeCount(page);
  const greeting = await getUserGreeting(page);

  expect(count).toBeGreaterThanOrEqual(0);
  expect(greeting).toContain('Hi!');
});
```

---

## Debugging Tests

### UI Mode
```bash
npm run test:e2e:ui
```
Interactive mode to step through tests visually.

### Debug Mode
```bash
npm run test:e2e:debug
```
Opens Playwright Inspector for step-by-step debugging.

### Console Logging
```typescript
test('with logging', async ({ page }) => {
  console.log('Starting test...');

  await page.goto('/home.html');
  console.log('Navigated to home');

  const count = await page.locator('.card').count();
  console.log(`Found ${count} cards`);
});
```

### Screenshots & Videos
```typescript
test('with screenshots', async ({ page }) => {
  await page.screenshot({ path: 'screenshot.png' });

  // Video is auto-captured on failure
});
```

### Trace Debugging
```bash
npx playwright test --trace=on
```
Generates trace files for detailed debugging in Playwright Inspector.

### Headless Mode Debugging
```bash
npx playwright test --headed --slow-motion=1000
```
Run with visible browser and slow motion for step-by-step observation.

---

## Reports

### HTML Report
```bash
npm run test:e2e:report
```
Opens visual report with:
- Test results
- Screenshots on failure
- Videos on failure
- Trace files
- Detailed error messages

### JSON Report
**Location**: `tests/e2e/reports/results.json`

Contains structured test results for CI/CD integration.

### Viewing Reports
```bash
# Open HTML report
npx playwright show-report

# Open specific report
open tests/e2e/reports/html/index.html
```

---

## Continuous Integration

### GitHub Actions
**Location**: `.github/workflows/e2e-tests.yml`

Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Scheduled daily at 2 AM UTC

### Local CI Simulation
```bash
# Simulate CI environment
npm install
npm run test:e2e
```

### CI-Specific Commands
```typescript
// Environment variable available in CI
if (process.env.CI === 'true') {
  // Running in CI/CD
  reuseExistingServer = false;
} else {
  // Running locally
  reuseExistingServer = true;
}
```

---

## Performance Testing

### Run Performance Monitor
```bash
node tests/e2e/config/performance-monitor.js
```

### Performance Metrics Tracked
- Page load time
- API response time
- Cart update time
- Navigation time
- Form submission time

### Viewing Performance Reports
```bash
# JSON report
open tests/e2e/reports/performance/performance-report.json

# HTML report
open tests/e2e/reports/performance/performance-report.html
```

---

## Troubleshooting

### Tests Fail Locally but Pass in CI
**Causes:**
- Incorrect test data/database state
- Environment variables not set
- Port already in use

**Solutions:**
```bash
# Clear browser cache
rm -rf ~/.cache/ms-playwright/

# Check if server is running
curl http://localhost:3000

# Kill any process on port 3000
lsof -ti:3000 | xargs kill -9

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Timeout Errors
```typescript
// Increase timeout for specific test
test('slow test', async ({ page }) => {
  test.slow(); // Multiplies timeout by 3
  // or
  await page.waitForTimeout(60000);
});
```

### Element Not Found
```typescript
// Debug element location
test('debug selector', async ({ page }) => {
  // Try different selectors
  const element = page.locator('button:has-text("Login")');
  const count = await element.count();
  console.log('Found elements:', count);

  // List all similar elements
  const buttons = page.locator('button');
  console.log('All buttons:', await buttons.allTextContents());
});
```

### Browser Context Issues
```bash
# Clear Playwright cache
npx playwright install --with-deps --force

# Run with fresh profile
npx playwright test --no-cache-dir
```

---

## Maintenance

### Updating Tests
When UI changes occur:
1. Identify changed selectors
2. Update page-objects.ts with new selectors
3. Run tests to verify
4. Commit changes

### Updating Test Data
Edit fixture files:
- `tests/e2e/fixtures/test-users.ts`
- `tests/e2e/fixtures/test-data.ts`

### Adding New Tests
1. Create new test in appropriate spec file
2. Use existing fixtures and helpers
3. Follow naming convention: "Test X.Y: description"
4. Add to test suite with related tests

### Regular Maintenance
- Weekly: Review test failure reports
- Monthly: Update test data and credentials
- Quarterly: Audit test coverage
- Annually: Review test strategy

---

## Best Practices

### Do's ✅
- Use Page Objects for UI interactions
- Use common helpers for repeated actions
- Keep tests focused and independent
- Use descriptive test names
- Add comments for complex logic
- Test user workflows, not implementation

### Don'ts ❌
- Don't hardcode selectors in tests
- Don't create dependencies between tests
- Don't ignore test failures
- Don't skip flaky tests without investigation
- Don't modify test data during test runs
- Don't test third-party integrations directly

### Performance Tips
- Use `test.skip()` to disable slow tests temporarily
- Parallelize tests with `fullyParallel: true`
- Use fixtures for expensive setup operations
- Cache authentication tokens when possible
- Minimize page navigations

---

## Resources

### Documentation
- [Playwright Official Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-page)

### Common Patterns
- Page Object Model (POM)
- Test Data Fixtures
- Custom Assertions
- Shared Utilities

### Community
- Playwright GitHub Discussions
- Stack Overflow: `playwright` tag
- Playwright Discord Community

---

## Support

For issues or questions:

1. **Check Test Logs**: `tests/e2e/reports/`
2. **Review Failures**: GitHub Actions workflow logs
3. **Debug Locally**: `npm run test:e2e:debug`
4. **Enable Tracing**: `--trace=on` flag
5. **Check Browser Console**: Headed mode with browser dev tools

---

**Last Updated**: 2026-02-08
**Version**: 1.0
**Status**: ✅ Production Ready
