// Dynamic Cart Page - Load real cart data from API

let cartItems = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Verify authentication first
  if (!checkAuthenticationRequired()) {
    return;
  }

  updateUserGreeting();
  await loadCartBadge();
  await loadCartItems();
});

// Load cart items from API
async function loadCartItems() {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/cart', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load cart: ${response.status}`);
    }

    cartItems = await response.json();
    console.log('Cart items loaded:', cartItems);

    // Update cart display
    updateCartDisplay(cartItems);
    updateOrderSummary(cartItems);
    updateCartBadge(cartItems);

  } catch (error) {
    console.error('Error loading cart items:', error);
    const container = document.querySelector('.cart-items-container');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger" role="alert">
          Failed to load cart items. Please try again.
        </div>
      `;
    }
  }
}

// Update cart display with items
function updateCartDisplay(items) {
  const container = document.querySelector('.cart-items-container');
  if (!container) {
    console.warn('Cart items container not found');
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5">
        <p class="text-muted">Your cart is empty</p>
        <a href="/shop.html" class="btn btn-ecomm rounded-3 mt-2">Continue Shopping</a>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  items.forEach((item, index) => {
    const cartItemCard = createCartItemCard(item, index);
    container.appendChild(cartItemCard);
  });

  console.log(`[Cart Display Updated] Total items: ${items.length}`);
}

// Create cart item card element
function createCartItemCard(item, index) {
  const discountPercentage = item.sale_price && item.price
    ? Math.round(((item.price - item.sale_price) / item.price) * 100)
    : 0;

  const div = document.createElement('div');
  div.className = 'card rounded-3 overflow-hidden';
  div.innerHTML = `
    <div class="card-body">
      <div class="d-flex flex-row align-items-start align-items-stretch gap-3">
        <div class="product-img">
          <div style="width: 100px; height: 100px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; text-align: center;">
            ${item.name}
          </div>
        </div>
        <div class="product-info flex-grow-1">
          <h6 class="fw-bold mb-0">${item.name}</h6>
          <div class="product-price d-flex align-items-center gap-2 mt-2">
            <div class="fw-bold">₱${item.sale_price || item.price}</div>
            ${item.price && item.sale_price ? `
              <div class="fw-light text-muted text-decoration-line-through">₱${item.price}</div>
              <div class="fw-bold text-danger">(${discountPercentage}% off)</div>
            ` : ''}
          </div>
          <div class="mt-2 hstack gap-2">
            <button type="button" class="btn btn-sm btn-light rounded-3">Qty: ${item.quantity || 1}</button>
          </div>
        </div>
      </div>
    </div>
    <div class="card-footer bg-transparent p-0">
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-grid flex-fill">
          <button class="btn btn-ecomm" onclick="removeFromCart(${item.id}, ${index})">Remove</button>
        </div>
        <div class="vr"></div>
        <div class="d-grid flex-fill">
          <button class="btn btn-ecomm" onclick="moveToWishlist(${item.product_id})">Move To Wishlist</button>
        </div>
      </div>
    </div>
  `;
  return div;
}

// Remove item from cart
async function removeFromCart(cartItemId, index) {
  try {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`/api/cart/${cartItemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to remove item: ${response.status}`);
    }

    alert('Item removed from cart!');
    // Reload cart
    await loadCartItems();
    await loadCartBadge();

  } catch (error) {
    console.error('Error removing item from cart:', error);
    alert('Failed to remove item: ' + error.message);
  }
}

// Move to wishlist
async function moveToWishlist(productId) {
  try {
    const token = localStorage.getItem('auth_token');

    const response = await fetch('/api/wishlist', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId: productId
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to add to wishlist: ${response.status}`);
    }

    alert('Item moved to wishlist!');
    // Reload cart to reflect the removal (item was moved, not deleted)
    await loadCartItems();
    await loadCartBadge();

  } catch (error) {
    console.error('Error moving to wishlist:', error);
    alert('Failed to move to wishlist: ' + error.message);
  }
}

// Update order summary
function updateOrderSummary(cartItems) {
  // Calculate totals
  const subtotal = Array.isArray(cartItems)
    ? cartItems.reduce((sum, item) => sum + ((item.sale_price || item.price) * (item.quantity || 1)), 0)
    : 0;

  const originalTotal = Array.isArray(cartItems)
    ? cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
    : 0;

  const discount = originalTotal - subtotal;
  const deliveryFee = subtotal > 0 ? 100 : 0; // Fixed delivery fee or free shipping over threshold
  const total = subtotal + deliveryFee;

  // Update summary display
  const summaryDiv = document.querySelector('.order-summary-container') || createOrderSummary();

  summaryDiv.innerHTML = `
    <div class="card rounded-3">
      <div class="card-body">
        <h5 class="fw-bold mb-3">Order Summary</h5>
        <div class="hstack align-items-center justify-content-between">
          <p class="mb-0">Bag Total</p>
          <p class="mb-0">₱${subtotal.toFixed(2)}</p>
        </div>
        <hr>
        <div class="hstack align-items-center justify-content-between">
          <p class="mb-0">Bag discount</p>
          <p class="mb-0 text-success">- ₱${discount.toFixed(2)}</p>
        </div>
        <hr>
        <div class="hstack align-items-center justify-content-between">
          <p class="mb-0">Delivery</p>
          <p class="mb-0">₱${deliveryFee.toFixed(2)}</p>
        </div>
        <hr>
        <div class="hstack align-items-center justify-content-between fw-bold text-content">
          <p class="mb-0">Total Amount</p>
          <p class="mb-0">₱${total.toFixed(2)}</p>
        </div>
      </div>
    </div>
  `;
}

// Create order summary container if it doesn't exist
function createOrderSummary() {
  let container = document.querySelector('.order-summary-container');
  if (!container) {
    const pageContent = document.querySelector('.page-content');
    container = document.createElement('div');
    container.className = 'order-summary-container mt-4';
    if (pageContent) {
      pageContent.appendChild(container);
    }
  }
  return container;
}

// Update cart badge count
function updateCartBadge(cartItems) {
  const badge = document.querySelector('.cart-badge');
  if (badge) {
    const totalItems = Array.isArray(cartItems)
      ? cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0)
      : 0;
    badge.textContent = totalItems;
  }
}

