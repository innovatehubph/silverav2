/**
 * Shared Utilities - Consolidated functions for all dynamic pages
 * This file contains common authentication, cart, and UI functions
 * to eliminate code duplication across 23 dynamic JS files.
 *
 * Functions included:
 * - logout() - Authentication logout with localStorage cleanup
 * - loadCartBadge() - Load cart count from API
 * - updateCartBadgeUI() - Update cart badge display (handles both ID and class selectors)
 * - updateUserGreeting() - Update user greeting from localStorage
 * - checkAuthenticationRequired() - Check auth and redirect if not authenticated
 * - checkAuthenticationOptional() - Check auth (optional, no redirect)
 */

/**
 * Logout function - Clear authentication and redirect to login
 * Removes auth_token and user from localStorage
 */
function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  window.location.href = '/authentication-log-in.html';
}

/**
 * Load cart badge count from API
 * Fetches current cart items and updates the cart badge UI
 * Handles both authenticated and unauthenticated users
 */
async function loadCartBadge() {
  try {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      // Set cart badge to 0 if not authenticated
      updateCartBadgeUI(0);
      return;
    }

    const response = await fetch('/api/cart', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) return;

    const cartItems = await response.json();
    const totalItems = Array.isArray(cartItems)
      ? cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0)
      : 0;

    updateCartBadgeUI(totalItems);
  } catch (error) {
    console.error('Error loading cart badge:', error);
  }
}

/**
 * Update cart badge UI
 * Unified function to update cart badge display
 * Tries by ID first (#cartBadge), then falls back to class selector (.cart-badge)
 * This handles both modern (ID) and legacy (class) implementations
 *
 * @param {number} count - The total cart item count to display
 */
function updateCartBadgeUI(count) {
  // Try by ID first (modern approach)
  let badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = count;
    return;
  }

  // Fallback to class selector (legacy approach)
  badge = document.querySelector('.cart-badge');
  if (badge) {
    badge.textContent = count;
  }
}

/**
 * Update user greeting display
 * Reads user data from localStorage and updates the greeting element
 * Handles parsing errors gracefully
 */
function updateUserGreeting() {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;

    const user = JSON.parse(userStr);
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting && user.name) {
      userGreeting.textContent = `Hi! ${user.name}`;
    }
  } catch (error) {
    console.error('Error updating user greeting:', error);
  }
}

/**
 * Check authentication (required)
 * Checks if user is authenticated. If not, redirects to login page.
 * Use this on pages that require authentication.
 *
 * @returns {boolean} - true if authenticated, false if redirecting to login
 */
function checkAuthenticationRequired() {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    console.warn('User not authenticated, redirecting to login...');
    window.location.href = '/authentication-log-in.html';
    return false;
  }
  return true;
}

/**
 * Check authentication (optional)
 * Checks if user is authenticated without redirecting.
 * Use this on pages that support both authenticated and guest users.
 *
 * @returns {boolean} - true if authenticated, false otherwise
 */
function checkAuthenticationOptional() {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('user');
  return !!(token && userStr);
}

// ==================== GUEST CART FUNCTIONS ====================

/**
 * Get guest cart from localStorage
 * @returns {Array} - Array of cart items
 */
function getGuestCart() {
  try {
    const cartStr = localStorage.getItem('guest_cart');
    return cartStr ? JSON.parse(cartStr) : [];
  } catch (error) {
    console.error('Error reading guest cart:', error);
    return [];
  }
}

/**
 * Save guest cart to localStorage
 * @param {Array} cart - Array of cart items
 */
function saveGuestCart(cart) {
  try {
    localStorage.setItem('guest_cart', JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving guest cart:', error);
  }
}

/**
 * Add item to guest cart
 * @param {Object} item - Product item to add
 * @param {number} quantity - Quantity to add
 */
function addToGuestCart(item, quantity = 1) {
  const cart = getGuestCart();
  const existingItem = cart.find(i => i.product_id === item.id);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      product_id: item.id,
      name: item.name,
      price: item.price,
      sale_price: item.sale_price,
      quantity: quantity,
      images: item.images,
      added_at: new Date().toISOString()
    });
  }
  
  saveGuestCart(cart);
  updateCartBadgeUI(cart.reduce((sum, i) => sum + i.quantity, 0));
  return cart;
}

/**
 * Remove item from guest cart
 * @param {number} productId - Product ID to remove
 */
function removeFromGuestCart(productId) {
  const cart = getGuestCart().filter(i => i.product_id !== productId);
  saveGuestCart(cart);
  updateCartBadgeUI(cart.reduce((sum, i) => sum + i.quantity, 0));
  return cart;
}

/**
 * Update guest cart item quantity
 * @param {number} productId - Product ID
 * @param {number} quantity - New quantity
 */
function updateGuestCartQuantity(productId, quantity) {
  const cart = getGuestCart();
  const item = cart.find(i => i.product_id === productId);
  
  if (item) {
    if (quantity <= 0) {
      return removeFromGuestCart(productId);
    }
    item.quantity = quantity;
    saveGuestCart(cart);
    updateCartBadgeUI(cart.reduce((sum, i) => sum + i.quantity, 0));
  }
  
  return cart;
}

/**
 * Clear guest cart
 */
function clearGuestCart() {
  localStorage.removeItem('guest_cart');
  updateCartBadgeUI(0);
}

/**
 * Sync guest cart to server after login
 * This should be called after successful authentication
 */
async function syncGuestCartToServer(token) {
  const guestCart = getGuestCart();
  if (!guestCart.length || !token) return;
  
  console.log('Syncing guest cart to server:', guestCart);
  
  for (const item of guestCart) {
    try {
      await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: item.product_id,
          quantity: item.quantity
        })
      });
    } catch (error) {
      console.error(`Error syncing item ${item.product_id}:`, error);
    }
  }
  
  // Clear guest cart after successful sync
  clearGuestCart();
  console.log('Guest cart synced to server');
}

/**
 * Load cart badge count (handles both guest and authenticated users)
 * Updated to support guest cart
 */
async function loadCartBadgeWithGuest() {
  try {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      // Use guest cart
      const guestCart = getGuestCart();
      const totalItems = guestCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      updateCartBadgeUI(totalItems);
      return;
    }

    const response = await fetch('/api/cart', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) return;

    const cartItems = await response.json();
    const totalItems = Array.isArray(cartItems)
      ? cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0)
      : 0;

    updateCartBadgeUI(totalItems);
  } catch (error) {
    console.error('Error loading cart badge:', error);
  }
}
