// Dynamic Home Page - Load real data from API instead of mocks

document.addEventListener('DOMContentLoaded', async () => {
  // Home page is PUBLIC - no auth required
  // Update greeting if user is logged in
  updateUserGreeting();
  
  // Load cart badge (supports both guest and authenticated)
  await loadCartBadgeWithGuest();

  // Load all dynamic content for everyone (guests and users)
  await loadTrendingProducts();
  await loadClientReviews();
  await loadFeaturedProducts();
});

// Load Trending Products (First row)
async function loadTrendingProducts() {
  try {
    const response = await fetch('/api/products?limit=6');
    if (!response.ok) throw new Error('Failed to load products');

    const products = await response.json();
    const container = document.querySelector('.trending-category .row');

    if (!container) return;

    container.innerHTML = '';

    products.slice(0, 6).forEach(product => {
      const col = document.createElement('div');
      col.className = 'col d-flex';
      
      // Get product image
      const productImage = getProductImage(product);
      
      col.innerHTML = `
        <div class="card rounded-0 w-100 rounded-3 overflow-hidden">
          <a href="product-details.html?id=${product.id}">
            <img src="${productImage}" alt="${escapeHtml(product.name)}" 
              style="width: 100%; height: 200px; object-fit: cover;" 
              onerror="this.src='assets/images/product-images/01.webp'">
          </a>
          <div class="card-body text-center">
            <p class="mb-0 fw-bold">${escapeHtml(product.name)}</p>
            <p class="mb-0 text-muted" style="font-size: 12px;">₱${product.sale_price || product.price}</p>
          </div>
        </div>
      `;
      container.appendChild(col);
    });
  } catch (error) {
    console.error('Error loading trending products:', error);
  }
}

// Load Client Reviews (Product Reviews from Database)
async function loadClientReviews() {
  try {
    const response = await fetch('/api/products/1/reviews');
    if (!response.ok) throw new Error('Failed to load reviews');

    const reviews = await response.json();
    const container = document.querySelector('.review-slider');

    if (!container || reviews.length === 0) return;

    container.innerHTML = '';

    reviews.slice(0, 5).forEach(review => {
      const stars = Array(review.rating).fill('<i class="bi bi-star-fill text-warning"></i>').join('');
      const emptyStar = Array(5 - review.rating).fill('<i class="bi bi-star text-warning"></i>').join('');

      const reviewDiv = document.createElement('div');
      reviewDiv.className = 'review-item p-3 border rounded-3 bg-light';
      reviewDiv.innerHTML = `
        <h6 class="client-name fw-bold">${review.user_name || 'Anonymous'}</h6>
        <div class="ratings mb-2">
          ${stars}${emptyStar}
        </div>
        <div class="review-text">
          <p><strong>${review.title}</strong></p>
          <p>${review.comment}</p>
          <p class="text-end mb-0 reviw-date">${new Date(review.created_at).toLocaleDateString()} at ${new Date(review.created_at).toLocaleTimeString()}</p>
        </div>
      `;
      container.appendChild(reviewDiv);
    });

    // Reinitialize Slick slider if it exists
    if (jQuery && jQuery.fn.slick) {
      jQuery('.review-slider').slick({
        dots: true,
        arrows: false,
        infinite: true,
        speed: 300,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        responsive: [
          { breakpoint: 1025, settings: { slidesToShow: 2, slidesToScroll: 1 } },
          { breakpoint: 769, settings: { slidesToShow: 2, slidesToScroll: 1, arrows: false } },
          { breakpoint: 500, settings: { slidesToShow: 1, slidesToScroll: 1, arrows: false } }
        ]
      });
    }
  } catch (error) {
    console.error('Error loading client reviews:', error);
  }
}

// Load Featured Products (Category-based sections)
async function loadFeaturedProducts() {
  try {
    const response = await fetch('/api/products?limit=50');
    if (!response.ok) throw new Error('Failed to load products');

    const products = await response.json();

    // Load Trending Shoes section (category 1 - Fashion)
    const shoesContainer = document.querySelector('.sales-category-slider');
    if (shoesContainer) {
      const fashionProducts = products.filter(p => p.category_id === 1).slice(0, 6);
      shoesContainer.innerHTML = '';
      fashionProducts.forEach(product => {
        const productImage = getProductImage(product);
        const item = document.createElement('div');
        item.className = 'card rounded-3 overflow-hidden';
        item.innerHTML = `
          <a href="product-details.html?id=${product.id}">
            <img src="${productImage}" alt="${escapeHtml(product.name)}" 
              style="width: 100%; height: 200px; object-fit: cover;" 
              onerror="this.src='assets/images/product-images/01.webp'">
          </a>
          <div class="card-body text-center">
            <p class="mb-0 fw-bold" style="font-size: 14px;">${escapeHtml(product.name)}</p>
            <p class="mb-0" style="font-size: 12px; color: #666;">₱${product.sale_price || product.price}</p>
          </div>
        `;
        shoesContainer.appendChild(item);
      });
    }

    // Load Top Brands section (category 2 - Electronics)
    const brandsContainer = document.querySelector('.brands-slider');
    if (brandsContainer) {
      const electronicsProducts = products.filter(p => p.category_id === 2).slice(0, 8);
      brandsContainer.innerHTML = '';
      electronicsProducts.forEach(product => {
        const productImage = getProductImage(product);
        const item = document.createElement('div');
        item.className = 'card rounded-3 overflow-hidden';
        item.innerHTML = `
          <a href="product-details.html?id=${product.id}">
            <img src="${productImage}" alt="${escapeHtml(product.name)}" 
              style="width: 100%; height: 150px; object-fit: cover;" 
              onerror="this.src='assets/images/product-images/01.webp'">
          </a>
          <div class="card-body text-center">
            <p class="mb-0" style="font-size: 12px; font-weight: 600;">${escapeHtml(product.name)}</p>
          </div>
        `;
        brandsContainer.appendChild(item);
      });
    }

    // Load Accessories section (category 3 - Home & Living, 4 - Beauty)
    const accessoriesContainer = document.querySelector('.sales-accessories-slider');
    if (accessoriesContainer) {
      const accessoryProducts = products.filter(p => p.category_id === 3 || p.category_id === 4).slice(0, 6);
      accessoriesContainer.innerHTML = '';
      accessoryProducts.forEach(product => {
        const productImage = getProductImage(product);
        const item = document.createElement('div');
        item.className = 'card rounded-3 overflow-hidden';
        item.innerHTML = `
          <a href="product-details.html?id=${product.id}">
            <img src="${productImage}" alt="${escapeHtml(product.name)}" 
              style="width: 100%; height: 200px; object-fit: cover;" 
              onerror="this.src='assets/images/product-images/01.webp'">
          </a>
          <div class="card-body text-center">
            <p class="mb-0 fw-bold" style="font-size: 14px;">${escapeHtml(product.name)}</p>
            <p class="mb-0" style="font-size: 12px; color: #666;">₱${product.sale_price || product.price}</p>
          </div>
        `;
        accessoriesContainer.appendChild(item);
      });
    }
  } catch (error) {
    console.error('Error loading featured products:', error);
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Get product image helper
function getProductImage(product) {
  if (!product.images) return 'assets/images/product-images/01.webp';
  
  try {
    const images = JSON.parse(product.images);
    if (Array.isArray(images) && images.length > 0) {
      return images[0];
    }
  } catch (e) {
    if (typeof product.images === 'string' && product.images.startsWith('http')) {
      return product.images;
    }
  }
  
  return 'assets/images/product-images/01.webp';
}
