/**
 * Page Object Models (POM)
 * Define interactions for each page in the application
 */

import { Page, Locator } from '@playwright/test';

/**
 * Base Page Object
 */
export class BasePage {
  constructor(protected page: Page) {}

  async goto(url: string) {
    await this.page.goto(url);
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Login Page
 */
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

  get errorMessage(): Locator {
    return this.page.locator('.alert-danger, .error-message');
  }

  get signupLink(): Locator {
    return this.page.locator('a[href*="sign-up"]');
  }

  get forgotPasswordLink(): Locator {
    return this.page.locator('a[href*="forgot-password"]');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage() {
    return this.errorMessage.textContent();
  }
}

/**
 * Home Page
 */
export class HomePage extends BasePage {
  get cartBadge(): Locator {
    return this.page.locator('#cartBadge, .cart-badge');
  }

  get userGreeting(): Locator {
    return this.page.locator('#userGreeting');
  }

  get logoutButton(): Locator {
    return this.page.locator('button:has-text("Logout")');
  }

  get shopButton(): Locator {
    return this.page.locator('a[href*="shop"], button:has-text("Shop")');
  }

  get trendingProducts(): Locator {
    return this.page.locator('.trending-category .card');
  }

  get categoryLinks(): Locator {
    return this.page.locator('nav a[href*="category"]');
  }

  async getCartCount() {
    const text = await this.cartBadge.first().textContent();
    return parseInt(text || '0', 10);
  }

  async getUserGreetingText() {
    return this.userGreeting.textContent();
  }

  async logout() {
    await this.logoutButton.click();
  }

  async clickShop() {
    await this.shopButton.first().click();
  }

  async getTrendingProductsCount() {
    return this.trendingProducts.count();
  }
}

/**
 * Product Details Page
 */
export class ProductDetailsPage extends BasePage {
  get productName(): Locator {
    return this.page.locator('h1, .product-name');
  }

  get productPrice(): Locator {
    return this.page.locator('.product-price, [data-price]');
  }

  get salePrice(): Locator {
    return this.page.locator('.sale-price, [data-sale-price]');
  }

  get addToCartButton(): Locator {
    return this.page.locator('button:has-text("Add to Cart")');
  }

  get addToWishlistButton(): Locator {
    return this.page.locator('button:has-text("Add to Wishlist"), [aria-label*="wishlist"]');
  }

  get quantityInput(): Locator {
    return this.page.locator('input[type="number"]');
  }

  get productReviews(): Locator {
    return this.page.locator('.review-item, .product-review');
  }

  async addToCart(quantity: number = 1) {
    if (quantity > 1 && (await this.quantityInput.isVisible())) {
      await this.quantityInput.fill(quantity.toString());
    }
    await this.addToCartButton.click();
  }

  async addToWishlist() {
    await this.addToWishlistButton.click();
  }

  async getProductName() {
    return this.productName.textContent();
  }

  async getReviewsCount() {
    return this.productReviews.count();
  }
}

/**
 * Cart Page
 */
export class CartPage extends BasePage {
  get cartItems(): Locator {
    return this.page.locator('.card.rounded-3, .cart-item');
  }

  get subtotal(): Locator {
    return this.page.locator('[data-subtotal], .subtotal');
  }

  get total(): Locator {
    return this.page.locator('[data-total], .total-amount');
  }

  get checkoutButton(): Locator {
    return this.page.locator('button:has-text("Checkout")');
  }

  get continueShoppingButton(): Locator {
    return this.page.locator('a:has-text("Continue Shopping")');
  }

  get removeButtons(): Locator {
    return this.page.locator('button:has-text("Remove")');
  }

  get emptyCartMessage(): Locator {
    return this.page.locator('text=Your cart is empty');
  }

  async getCartItemsCount() {
    return this.cartItems.count();
  }

  async removeItem(index: number) {
    const buttons = await this.removeButtons.all();
    if (buttons[index]) {
      await buttons[index].click();
    }
  }

  async getTotal() {
    const text = await this.total.textContent();
    // Extract number from text like "₱1000"
    return parseInt(text?.replace(/[^0-9]/g, '') || '0', 10);
  }

  async checkout() {
    await this.checkoutButton.click();
  }

  async isCartEmpty() {
    return this.emptyCartMessage.isVisible();
  }
}

/**
 * Checkout Page
 */
export class CheckoutPage extends BasePage {
  get addressSection(): Locator {
    return this.page.locator('[data-section="address"], .address-section');
  }

  get selectAddressButton(): Locator {
    return this.page.locator('button:has-text("Select Address")');
  }

  get paymentMethodSection(): Locator {
    return this.page.locator('[data-section="payment"], .payment-section');
  }

  get paymentMethods(): Locator {
    return this.page.locator('.payment-method, [role="radio"]');
  }

  get orderSummary(): Locator {
    return this.page.locator('.order-summary, .summary-section');
  }

  get placeOrderButton(): Locator {
    return this.page.locator('button:has-text("Place Order"), button:has-text("Confirm")');
  }

  get continueButton(): Locator {
    return this.page.locator('button:has-text("Continue")');
  }

  async selectPaymentMethod(methodName: string) {
    const method = this.page.locator(`[data-payment="${methodName}"], button:has-text("${methodName}")`);
    await method.click();
  }

  async placeOrder() {
    await this.placeOrderButton.click();
  }

  async getOrderSummary() {
    return this.orderSummary.textContent();
  }
}

/**
 * Profile Page
 */
export class ProfilePage extends BasePage {
  get nameField(): Locator {
    return this.page.locator('input[name*="name"]');
  }

  get emailField(): Locator {
    return this.page.locator('input[type="email"]');
  }

  get phoneField(): Locator {
    return this.page.locator('input[type="tel"], input[name*="phone"]');
  }

  get editButton(): Locator {
    return this.page.locator('button:has-text("Edit"), button[aria-label*="edit"]');
  }

  get saveButton(): Locator {
    return this.page.locator('button:has-text("Save")');
  }

  get successMessage(): Locator {
    return this.page.locator('.alert-success, [role="status"]');
  }

  get addressList(): Locator {
    return this.page.locator('.address-card, [data-address]');
  }

  get addAddressButton(): Locator {
    return this.page.locator('button:has-text("Add Address")');
  }

  async editProfile(data: Record<string, string>) {
    await this.editButton.click();

    for (const [key, value] of Object.entries(data)) {
      if (key === 'name' && (await this.nameField.isVisible())) {
        await this.nameField.fill(value);
      } else if (key === 'email' && (await this.emailField.isVisible())) {
        await this.emailField.fill(value);
      } else if (key === 'phone' && (await this.phoneField.isVisible())) {
        await this.phoneField.fill(value);
      }
    }

    await this.saveButton.click();
  }

  async getSuccessMessage() {
    return this.successMessage.textContent();
  }

  async getAddressCount() {
    return this.addressList.count();
  }
}

/**
 * Addresses Page
 */
export class AddressesPage extends BasePage {
  get addressCards(): Locator {
    return this.page.locator('.card.rounded-3, .address-card');
  }

  get addAddressButton(): Locator {
    return this.page.locator('button:has-text("Add"), a:has-text("Add")');
  }

  get nameInput(): Locator {
    return this.page.locator('#floatingName, input[name*="name"]');
  }

  get phoneInput(): Locator {
    return this.page.locator('#floatingMobileNo, input[name*="phone"]');
  }

  get addressInput(): Locator {
    return this.page.locator('#floatingAddress, input[name*="address"]');
  }

  get cityInput(): Locator {
    return this.page.locator('#floatingCity, input[name*="city"]');
  }

  get stateInput(): Locator {
    return this.page.locator('#floatingState, input[name*="state"]');
  }

  get pinCodeInput(): Locator {
    return this.page.locator('#floatingPinCode, input[name*="pin"]');
  }

  get saveButton(): Locator {
    return this.page.locator('.offcanvas-footer button:has-text("Save")');
  }

  get deleteButtons(): Locator {
    return this.page.locator('button:has-text("Delete")');
  }

  async addAddress(address: Record<string, string>) {
    await this.addAddressButton.click();

    if (address.name) await this.nameInput.fill(address.name);
    if (address.phone) await this.phoneInput.fill(address.phone);
    if (address.address) await this.addressInput.fill(address.address);
    if (address.city) await this.cityInput.fill(address.city);
    if (address.state) await this.stateInput.fill(address.state);
    if (address.pin_code) await this.pinCodeInput.fill(address.pin_code);

    await this.saveButton.click();
  }

  async getAddressCount() {
    return this.addressCards.count();
  }

  async deleteAddress(index: number) {
    const buttons = await this.deleteButtons.all();
    if (buttons[index]) {
      await buttons[index].click();
      // Confirm deletion if dialog appears
      await this.page.click('button:has-text("Confirm"), button:has-text("Yes")');
    }
  }
}

/**
 * Orders Page
 */
export class OrdersPage extends BasePage {
  get orderCards(): Locator {
    return this.page.locator('.card, .order-item');
  }

  get orderIds(): Locator {
    return this.page.locator('[data-order-id], .order-id');
  }

  get orderStatuses(): Locator {
    return this.page.locator('[data-status], .order-status');
  }

  get viewOrderButtons(): Locator {
    return this.page.locator('button:has-text("View"), a:has-text("View")');
  }

  get trackOrderButtons(): Locator {
    return this.page.locator('button:has-text("Track"), a:has-text("Track")');
  }

  async getOrdersCount() {
    return this.orderCards.count();
  }

  async viewOrder(index: number) {
    const buttons = await this.viewOrderButtons.all();
    if (buttons[index]) {
      await buttons[index].click();
    }
  }

  async trackOrder(index: number) {
    const buttons = await this.trackOrderButtons.all();
    if (buttons[index]) {
      await buttons[index].click();
    }
  }
}

/**
 * Shop/Category Page
 */
export class ShopPage extends BasePage {
  get productCards(): Locator {
    return this.page.locator('.card, .product-card');
  }

  get filterOptions(): Locator {
    return this.page.locator('.filter-option, [data-filter]');
  }

  get sortDropdown(): Locator {
    return this.page.locator('select[name*="sort"], button[aria-label*="sort"]');
  }

  get pagination(): Locator {
    return this.page.locator('nav[aria-label*="pagination"] a');
  }

  async getProductsCount() {
    return this.productCards.count();
  }

  async filterByCategory(category: string) {
    const filter = this.page.locator(`text=${category}`);
    await filter.click();
  }

  async sortBy(option: string) {
    await this.sortDropdown.selectOption(option);
  }

  async goToNextPage() {
    const nextButton = this.page.locator('a[aria-label*="Next"], button:has-text("Next")');
    await nextButton.click();
  }
}
