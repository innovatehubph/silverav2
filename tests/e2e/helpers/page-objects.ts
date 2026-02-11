import { Page, Locator } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string) {
    await this.page.goto(path);
  }

  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  get toastMessage(): Locator {
    return this.page.locator('[data-sonner-toast]');
  }
}

export class LoginPage extends BasePage {
  get emailInput(): Locator {
    return this.page.locator('input[type="email"]');
  }

  get passwordInput(): Locator {
    return this.page.locator('input[type="password"]');
  }

  get submitButton(): Locator {
    return this.page.locator('button[type="submit"]');
  }

  get errorToast(): Locator {
    return this.page.locator('[data-sonner-toast]');
  }

  get registerLink(): Locator {
    return this.page.locator('a[href="/register"]');
  }

  get forgotPasswordLink(): Locator {
    return this.page.locator('a[href="/forgot-password"]');
  }

  async navigate() {
    await this.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

export class RegisterPage extends BasePage {
  get nameInput(): Locator {
    return this.page.locator('input[name="name"], input[placeholder*="name" i]');
  }

  get emailInput(): Locator {
    return this.page.locator('input[type="email"]');
  }

  get passwordInput(): Locator {
    return this.page.locator('input[type="password"]');
  }

  get submitButton(): Locator {
    return this.page.locator('button[type="submit"]');
  }

  async navigate() {
    await this.goto('/register');
  }

  async register(name: string, email: string, password: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

export class HomePage extends BasePage {
  get heroSection(): Locator {
    return this.page.locator('section#hero, section:has(h1)').first();
  }

  get featuredProducts(): Locator {
    return this.page.locator('a[href^="/product/"]');
  }

  get shopNowButton(): Locator {
    return this.page.locator('a[href="/shop"]').first();
  }

  get categoryLinks(): Locator {
    return this.page.locator('a[href*="/shop?category="]');
  }

  async navigate() {
    await this.goto('/');
  }

  async getFeaturedProductsCount() {
    return this.featuredProducts.count();
  }
}

export class ShopPage extends BasePage {
  get productCards(): Locator {
    return this.page.locator('a[href^="/product/"]');
  }

  get categoryTabs(): Locator {
    return this.page.locator('button').filter({ hasText: /Apparel|Footwear|Accessories|Dresses|All/i });
  }

  get searchInput(): Locator {
    return this.page.locator('input[placeholder*="search" i], input[type="search"]');
  }

  get sortSelect(): Locator {
    return this.page.locator('select');
  }

  async navigate() {
    await this.goto('/shop');
  }

  async getProductsCount() {
    return this.productCards.count();
  }

  async filterByCategory(category: string) {
    await this.page.locator(`button:has-text("${category}")`).click();
  }
}

export class ProductDetailPage extends BasePage {
  get productName(): Locator {
    return this.page.locator('h1');
  }

  get productPrice(): Locator {
    return this.page.locator('text=/₱[\\d,]+/').first();
  }

  get productImages(): Locator {
    return this.page.locator('img[src*="product"], img[alt]').first();
  }

  get sizeButtons(): Locator {
    return this.page.locator('button').filter({ hasText: /^(XS|S|M|L|XL|XXL|Free Size|\d+)$/ });
  }

  get colorSwatches(): Locator {
    return this.page.locator('[class*="rounded-full"][class*="cursor-pointer"]');
  }

  get addToCartButton(): Locator {
    return this.page.locator('button:has-text("Add to Cart")');
  }

  get buyNowButton(): Locator {
    return this.page.locator('button:has-text("Buy Now")');
  }

  async navigate(productId: number) {
    await this.goto(`/product/${productId}`);
  }

  async selectSize(size: string) {
    await this.page.locator(`button:has-text("${size}")`).click();
  }

  async selectColor(index: number = 0) {
    await this.colorSwatches.nth(index).click();
  }

  async addToCart() {
    await this.addToCartButton.click();
  }
}

export class CartPage extends BasePage {
  get itemNames(): Locator {
    return this.page.locator('.card h3');
  }

  get removeButtons(): Locator {
    return this.page.locator('button.text-red-500');
  }

  get checkoutLink(): Locator {
    return this.page.locator('a[href="/checkout"]');
  }

  get emptyCartMessage(): Locator {
    return this.page.locator('text=/cart is empty/i');
  }

  get continueShoppingLink(): Locator {
    return this.page.locator('a[href="/shop"]');
  }

  get sizeBadges(): Locator {
    return this.page.locator('.rounded-full.text-xs.bg-bg-tertiary');
  }

  get colorBadges(): Locator {
    return this.page.locator('.rounded-full.text-xs.bg-bg-tertiary');
  }

  async navigate() {
    await this.goto('/cart');
  }

  async getCartItemsCount() {
    return this.itemNames.count();
  }

  async removeItem(index: number) {
    await this.removeButtons.nth(index).click();
  }

  async isCartEmpty() {
    return this.emptyCartMessage.isVisible();
  }
}

export class CheckoutPage extends BasePage {
  get codRadio(): Locator {
    return this.page.locator('input[value="cod"]');
  }

  get gcashRadio(): Locator {
    return this.page.locator('input[value="gcash"]');
  }

  get cardRadio(): Locator {
    return this.page.locator('input[value="card"]');
  }

  get paymentMethodLabels(): Locator {
    return this.page.locator('label').filter({ has: this.page.locator('input[type="radio"]') });
  }

  get placeOrderButton(): Locator {
    return this.page.locator('button[type="submit"], button:has-text("Place Order")');
  }

  get emptyCartMessage(): Locator {
    return this.page.locator('text=/cart is empty/i');
  }

  async navigate() {
    await this.goto('/checkout');
  }

  async selectCOD() {
    await this.codRadio.click({ force: true });
  }

  async placeOrder() {
    await this.placeOrderButton.click();
  }
}

export class ProfilePage extends BasePage {
  get nameDisplay(): Locator {
    return this.page.locator('h2, h1').first();
  }

  get emailDisplay(): Locator {
    return this.page.locator('text=@');
  }

  get editButton(): Locator {
    return this.page.locator('button:has-text("Edit")');
  }

  get saveButton(): Locator {
    return this.page.locator('button:has-text("Save")');
  }

  get logoutButton(): Locator {
    return this.page.locator('button:has-text("Sign Out"), button:has-text("Logout"), button:has-text("Log Out")');
  }

  get ordersLink(): Locator {
    return this.page.locator('a[href="/orders"]');
  }

  get wishlistLink(): Locator {
    return this.page.locator('a[href="/wishlist"]');
  }

  async navigate() {
    await this.goto('/profile');
  }
}

export class OrdersPage extends BasePage {
  get orderCards(): Locator {
    return this.page.locator('a[href^="/orders/"]').filter({ hasText: /Order #/i });
  }

  get orderStatuses(): Locator {
    return this.page.locator('text=/pending|processing|shipped|delivered/i');
  }

  get emptyMessage(): Locator {
    return this.page.locator('text=/no orders/i');
  }

  async navigate() {
    await this.goto('/orders');
  }

  async getOrdersCount() {
    return this.orderCards.count();
  }
}
