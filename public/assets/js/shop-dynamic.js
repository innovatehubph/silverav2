// Shop Page - Dynamic Content Loading

let currentProducts = [];
let selectedCategory = null;
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  // Verify authentication (optional for shop page)
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    // User is logged in
    if (checkAuthenticationRequired()) {
      updateUserGreeting();
    }
  }

  // Load cart badge (supports both guest and authenticated)
  await loadCartBadgeWithGuest();

  // Get category filter from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  selectedCategory = urlParams.get('category');

  // Update page title
  if (selectedCategory) {
    const categoryTitle = document.querySelector('.category-name h6');
    if (categoryTitle) {
      categoryTitle.textContent = decodeURIComponent(selectedCategory);
    }
  }

  // Load and display products
  await loadShopProducts();

  // Setup search functionality
  setupSearchFunctionality();
});

// Load shop products from API
async function loadShopProducts() {
  try {
    let apiUrl = '/api/products?limit=50';

    // If category is selected, filter by it
    if (selectedCategory) {
      apiUrl += `&category=${encodeURIComponent(selectedCategory)}`;
    }

    console.log('Loading products from:', apiUrl);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Failed to load products: ${response.status}`);
    }

    currentProducts = await response.json();
    console.log('Products loaded:', currentProducts);

    // Update item count
    updateItemCount(currentProducts.length);

    // Display products in grid
    displayProducts(currentProducts);

  } catch (error) {
    console.error('Error loading products:', error);
    const container = document.querySelector('.product-grid .row');
    if (container) {
      container.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger" role="alert">
            Failed to load products. Please try again.
          </div>
        </div>
      `;
    }
  }
}

// Display products in grid
function displayProducts(products) {
  const container = document.querySelector('.product-grid .row');

  if (!container) {
    console.warn('Product grid container not found');
    return;
  }

  // Clear existing products (keep structure)
  const existingProducts = container.querySelectorAll('[data-product-id]');
  existingProducts.forEach(el => el.remove());

  if (!Array.isArray(products) || products.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="text-center py-5">
          <p class="text-muted">No products found</p>
          <a href="shop.html" class="btn btn-ecomm rounded-3 mt-2">View All Products</a>
        </div>
      </div>
    `;
    return;
  }

  // Render each product
  products.forEach(product => {
    const discountPercentage = product.price && product.sale_price
      ? Math.round(((product.price - product.sale_price) / product.price) * 100)
      : 0;

    // Get product image
    let productImage = 'assets/images/product-images/01.webp';
    if (product.images) {
      try {
        const images = JSON.parse(product.images);
        if (Array.isArray(images) && images.length > 0) {
          productImage = images[0];
        }
      } catch (e) {
        if (typeof product.images === 'string' && product.images.startsWith('http')) {
          productImage = product.images;
        }
      }
    }

    const col = document.createElement('div');
    col.className = 'col';
    col.setAttribute('data-product-id', product.id);

    col.innerHTML = `
      <div class="card rounded-0 border-0">
        <div class="position-relative overflow-hidden">
          <a href="product-details.html?id=${product.id}">
            <img src="${productImage}" alt="${escapeHtml(product.name)}" 
              style="width: 100%; height: 150px; object-fit: cover;" 
              onerror="this.src='assets/images/product-images/01.webp'">
          </a>
          <div class="similar-products position-absolute bottom-0 end-0 me-3 mb-3">
            <a href="javascript:;" onclick="toggleWishlist(${product.id})">
              <i class="bi bi-heart${isInWishlist(product.id) ? '-fill' : ''}"></i>
            </a>
          </div>
        </div>
        <div class="card-body">
          <div class="hstack align-items-center justify-content-between">
            <h5 class="mb-0 fw-bold product-short-title">${escapeHtml(product.name)}</h5>
            <div class="wishlist">
              <i class="bi bi-heart${isInWishlist(product.id) ? '-fill' : ''}"></i>
            </div>
          </div>
          <p class="mt-1 mb-0 product-short-name font-12 fw-bold">${escapeHtml(product.description || '')}</p>
          <div class="product-price d-flex align-items-center gap-1 mt-2 font-12">
            <div class="fw-bold text-dark">₱${parseFloat(product.sale_price || product.price).toFixed(2)}</div>
            ${product.price && product.sale_price && product.price !== product.sale_price
              ? `<div class="fw-light text-muted text-decoration-line-through">₱${parseFloat(product.price).toFixed(2)}</div>`
              : ''
            }
            ${discountPercentage > 0
              ? `<div class="fw-bold text-danger">(${discountPercentage}% off)</div>`
              : ''
            }
          </div>
          <button class="btn btn-sm btn-ecomm rounded-3 mt-2 w-100" onclick="addToCartQuick(${product.id})">
            Add to Cart
          </button>
        </div>
      </div>
    `;

    container.appendChild(col);
  });

  console.log(`[Shop Display Updated] Total products: ${products.length}`);
}

// Update item count in header
function updateItemCount(count) {
  const itemCountEl = document.querySelector('.category-name p');
  if (itemCountEl) {
    itemCountEl.textContent = `${count} Items`;
  }
}

// Setup search functionality
function setupSearchFunctionality() {
  const searchInput = document.querySelector('.searchbar input');
  const searchCloseIcon = document.querySelector('.search-close-icon');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      filterProducts();
    });
  }

  if (searchCloseIcon) {
    searchCloseIcon.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        filterProducts();
      }
    });
  }
}

// Filter products based on search query
function filterProducts() {
  if (!searchQuery) {
    displayProducts(currentProducts);
    return;
  }

  const filtered = currentProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery) ||
    (product.description && product.description.toLowerCase().includes(searchQuery))
  );

  displayProducts(filtered);
  updateItemCount(filtered.length);
}

// Add to cart from shop page
async function addToCartQuick(productId) {
  const token = localStorage.getItem('auth_token');
  const product = currentProducts.find(p => p.id === productId);
  
  if (!product) {
    alert('Product not found');
    return;
  }

  if (!token) {
    // Guest user - add to localStorage cart
    addToGuestCart(product, 1);
    alert('Product added to cart! (Guest mode)');
    return;
  }

  // Authenticated user - add to server cart
  try {
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

  } catch (error) {
    console.error('Error adding to cart:', error);
    alert('Failed to add to cart: ' + error.message);
  }
}

// Toggle wishlist
async function toggleWishlist(productId) {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    alert('Please login to use wishlist');
    window.location.href = '/authentication-log-in.html';
    return;
  }

  try {
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
      throw new Error('Failed to toggle wishlist');
    }

    alert('Wishlist updated!');
    // You could also update the UI to show the heart is filled
    location.reload(); // Simple refresh for now

  } catch (error) {
    console.error('Error toggling wishlist:', error);
    alert('Failed to update wishlist: ' + error.message);
  }
}

// Check if product is in wishlist (simple check, can be improved with API call)
function isInWishlist(productId) {
  // This would require fetching the user's wishlist from API
  // For now, return false (not filled)
  return false;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
