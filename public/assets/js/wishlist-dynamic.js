// Dynamic Wishlist Page - Load real wishlist items

let wishlistItems = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Verify authentication first
  if (!checkAuthenticationRequired()) {
    return;
  }

  updateUserGreeting();
  await loadCartBadge();
  await loadWishlist();
});

// Load wishlist from API
async function loadWishlist() {
  try {
    const token = localStorage.getItem('auth_token');

    const response = await fetch('/api/wishlist', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load wishlist: ${response.status}`);
    }

    wishlistItems = await response.json();
    console.log('Wishlist loaded:', wishlistItems);

    // Display wishlist items
    displayWishlist(wishlistItems);

  } catch (error) {
    console.error('Error loading wishlist:', error);
    const container = document.querySelector('.wishlist-items-container');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger" role="alert">
          Failed to load wishlist. Please try again.
        </div>
      `;
    }
  }
}

// Display wishlist items
function displayWishlist(items) {
  const container = document.querySelector('.wishlist-items-container') || document.querySelector('.row');

  if (!container) {
    console.warn('Wishlist container not found');
    return;
  }

  // Clear existing items
  const existingItems = container.querySelectorAll('[id^="wishlist-item-"]');
  existingItems.forEach(el => el.remove());

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="text-center py-5">
          <p class="text-muted">Your wishlist is empty</p>
          <a href="/shop.html" class="btn btn-ecomm rounded-3 mt-2">Continue Shopping</a>
        </div>
      </div>
    `;
    return;
  }

  // Render each wishlist item
  items.forEach(item => {
    const wishlistCard = createWishlistCard(item);
    container.appendChild(wishlistCard);
  });

  console.log(`[Wishlist Display Updated] Total items: ${items.length}`);
}

// Create wishlist item card element
function createWishlistCard(item) {
  const col = document.createElement('div');
  col.className = 'col';
  col.id = `wishlist-item-${item.id}`;

  const card = document.createElement('div');
  card.className = 'card rounded-0 border-0';

  const images = item.images ? JSON.parse(item.images) : [];
  const imageUrl = images.length > 0 ? images[0] : 'assets/images/placeholder.webp';
  const salePrice = item.sale_price || item.price;
  const discount = item.price > salePrice ? Math.round(((item.price - salePrice) / item.price) * 100) : 0;

  card.innerHTML = `
    <div class="position-relative overflow-hidden">
      <a href="product-details.html?id=${item.product_id || item.id}">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 150px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; text-align: center; padding: 20px;">
          ${escapeHtml(item.name)}
        </div>
      </a>
      <div class="similar-products position-absolute top-0 end-0 me-3 mt-3">
        <a href="javascript:;" onclick="removeFromWishlist(${item.id}, event)"><i class="bi bi-x-lg"></i></a>
      </div>
    </div>
    <div class="card-body">
      <h5 class="mb-0 fw-bold product-short-title">${escapeHtml(item.name)}</h5>
      <div class="product-price d-flex align-items-center gap-1 mt-2 font-12">
        <div class="fw-bold text-dark">₱${parseFloat(salePrice).toFixed(2)}</div>
        ${item.price > salePrice ? `
          <div class="fw-light text-muted text-decoration-line-through">₱${parseFloat(item.price).toFixed(2)}</div>
          <div class="fw-bold text-danger">(${discount}% off)</div>
        ` : ''}
      </div>
      <div class="mt-3">
        <button class="btn btn-sm btn-ecomm rounded-2 w-100" onclick="addToCartFromWishlist(${item.product_id || item.id}, ${item.id})">
          <i class="bi bi-bag me-2"></i>Add to Cart
        </button>
      </div>
    </div>
  `;

  col.appendChild(card);
  return col;
}

// Remove item from wishlist
async function removeFromWishlist(wishlistId, event) {
  event.preventDefault();

  try {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`/api/wishlist/${wishlistId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to remove item: ${response.status}`);
    }

    alert('Item removed from wishlist!');
    // Reload wishlist
    await loadWishlist();

  } catch (error) {
    console.error('Error removing from wishlist:', error);
    alert('Failed to remove item: ' + error.message);
  }
}

// Add item to cart from wishlist
async function addToCartFromWishlist(productId, wishlistId) {
  try {
    const token = localStorage.getItem('auth_token');

    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId: productId,
        quantity: 1,
        size: 'M' // Default size
      })
    });

    if (!response.ok) {
      throw new Error('Failed to add to cart');
    }

    alert('Product added to cart!');
    await loadCartBadge();
    // Optional: Remove from wishlist after adding to cart
    // await removeFromWishlist(wishlistId, new Event('click'));

  } catch (error) {
    console.error('Error adding to cart:', error);
    alert('Failed to add to cart: ' + error.message);
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
