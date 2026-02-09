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
