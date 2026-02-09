// ==================== DYNAMIC PRODUCT DETAILS PAGE ====================
// FIXED: Loads REAL product data from API instead of showing hardcoded mock data

let currentProduct = null;
let currentReviews = [];
let selectedSize = null;
let selectedQuantity = 1;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
  // Verify authentication first
  if (!checkAuthenticationRequired()) {
    return;
  }

  updateUserGreeting();
  await loadCartBadge();

  // Extract product ID from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    console.error('Product ID not provided in URL');
    alert('Product not found. Please go back and select a product.');
    window.location.href = '/shop.html';
    return;
  }

  console.log('Loading product details for ID:', productId);
  await loadProductDetails(productId);
  await loadReviews(productId);
});

// ==================== LOAD PRODUCT DETAILS ====================
async function loadProductDetails(productId) {
  try {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`/api/products/${productId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load product: ${response.status}`);
    }

    currentProduct = await response.json();
    console.log('Product loaded:', currentProduct);

    // Update page title
    document.title = `${currentProduct.name} - Silvera Philippines`;

    // Populate product information
    updateProductDisplay();
    // NOTE: updateProductImages() already handles Slick reinitialization, so we don't call initializeImageSlider() again

  } catch (error) {
    console.error('Error loading product details:', error);
    alert('Failed to load product details. Please try again.');
    window.location.href = '/shop.html';
  }
}

// ==================== UPDATE PRODUCT DISPLAY ====================
function updateProductDisplay() {
  if (!currentProduct) return;

  // Update header brand name
  const brandName = document.querySelector('.brand-name h6');
  if (brandName) {
    brandName.textContent = currentProduct.name;
  }

  // Update product title and description
  const productTitle = document.querySelector('.product-title');
  if (productTitle) {
    productTitle.textContent = currentProduct.name;
  }

  const productDescription = document.querySelector('.product-info > p:nth-of-type(1)');
  if (productDescription) {
    productDescription.textContent = currentProduct.description || '';
  }

  // Update rating display
  const ratingNumber = document.querySelector('.rating-number');
  if (ratingNumber) {
    ratingNumber.textContent = (currentProduct.rating || 0).toFixed(1);
  }

  // Update price
  const priceElements = document.querySelectorAll('.product-price .h5');
  if (priceElements.length >= 2) {
    const salePrice = currentProduct.sale_price || currentProduct.price;
    const originalPrice = currentProduct.price;
    const discount = originalPrice > salePrice
      ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
      : 0;

    // Sale price
    priceElements[0].textContent = `₱${parseFloat(salePrice).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Original price
    priceElements[1].textContent = `₱${parseFloat(originalPrice).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Discount
    if (priceElements[2]) {
      priceElements[2].textContent = discount > 0 ? `(${discount}% off)` : '';
    }
  }

  // Update product images
  updateProductImages();

  // Update stock status
  const stockStatus = document.querySelector('.product-info .text-success');
  if (stockStatus) {
    if (currentProduct.stock > 0) {
      stockStatus.textContent = 'In Stock';
      stockStatus.className = 'fw-bold mb-0 mt-0 text-success';
    } else {
      stockStatus.textContent = 'Out of Stock';
      stockStatus.className = 'fw-bold mb-0 mt-0 text-danger';
    }
  }
}

// ==================== UPDATE PRODUCT IMAGES ====================
function updateProductImages() {
  if (!currentProduct) return;

  const imageSlider = document.querySelector('.product-image-slider');
  if (!imageSlider) return;

  // Parse images from JSON or use default
  let images = [];
  if (currentProduct.images) {
    if (typeof currentProduct.images === 'string') {
      try {
        images = JSON.parse(currentProduct.images);
      } catch (e) {
        images = [currentProduct.images];
      }
    } else if (Array.isArray(currentProduct.images)) {
      images = currentProduct.images;
    }
  }

  // Use default images if none provided
  if (images.length === 0) {
    images = [
      'assets/images/product-images/01.webp',
      'assets/images/product-images/02.webp',
      'assets/images/product-images/03.webp',
      'assets/images/product-images/04.webp',
      'assets/images/product-images/05.webp'
    ];
  }

  // Clear existing items (but keep slider intact)
  const items = imageSlider.querySelectorAll('.banner-item');
  items.forEach(item => item.remove());

  // Add new images
  images.forEach(image => {
    const bannerItem = document.createElement('div');
    bannerItem.className = 'banner-item';
    bannerItem.innerHTML = `<a href="javascript:;"><img src="${image}" class="img-fluid rounded-0" alt="${currentProduct.name}"></a>`;
    imageSlider.appendChild(bannerItem);
  });

  // Reinitialize slick slider with proper configuration
  if (typeof $ !== 'undefined' && $.fn.slick) {
    if (imageSlider.classList.contains('slick-initialized')) {
      $(imageSlider).slick('unslick');
    }
    $(imageSlider).slick({
      infinite: true,
      speed: 300,
      slidesToShow: 1,
      slidesToScroll: 1,
      adaptiveHeight: true,
      dots: true,
      arrows: true,
      autoplay: true,
      prevArrow: "<button type='button' class='slick-prev pull-left'><i class='bi bi-chevron-left'></i></button>",
      nextArrow: "<button type='button' class='slick-next pull-right'><i class='bi bi-chevron-right'></i></button>"
    });
  }
}

// ==================== LOAD REVIEWS ====================
async function loadReviews(productId) {
  try {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`/api/products/${productId}/reviews`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('Failed to load reviews, will show empty state');
      updateReviewsDisplay([], productId);
      return;
    }

    currentReviews = await response.json();
    console.log('Reviews loaded:', currentReviews);

    updateRatingDistribution(currentReviews);
    updateReviewsDisplay(currentReviews, productId);

  } catch (error) {
    console.error('Error loading reviews:', error);
    updateReviewsDisplay([], productId);
  }
}

// ==================== UPDATE RATING DISTRIBUTION ====================
function updateRatingDistribution(reviews) {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);

  reviews.forEach(review => {
    if (review.rating && review.rating >= 1 && review.rating <= 5) {
      distribution[review.rating]++;
    }
  });

  const avgRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : (currentProduct?.rating || 0).toFixed(1);

  // Update overall rating
  const ratingDisplay = document.querySelector('.customer-ratings span.rating-number');
  if (ratingDisplay) {
    ratingDisplay.textContent = avgRating;
  }

  const verifiedBuyers = document.querySelector('.customer-ratings p:nth-of-type(2)');
  if (verifiedBuyers) {
    verifiedBuyers.innerHTML = `<span id="verifiedCount">${reviews.length}</span> Verified Buyers`;
  }

  // Update progress bars
  const progressBars = document.querySelectorAll('.rating-wrrap');
  progressBars.forEach((bar, index) => {
    const rating = 5 - index;
    const count = distribution[rating];
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;

    const progressBar = bar.querySelector('.progress-bar');
    if (progressBar) {
      progressBar.style.width = percentage + '%';
    }

    const countDisplay = bar.querySelector('p:last-of-type');
    if (countDisplay) {
      countDisplay.textContent = count;
    }
  });
}

// ==================== UPDATE REVIEWS DISPLAY ====================
function updateReviewsDisplay(reviews, productId) {
  const reviewsWrapper = document.querySelector('.reviews-wrapper');
  const reviewsTitle = document.querySelector('.customer-reviews h6');

  if (!reviewsWrapper) return;

  if (reviewsTitle) {
    reviewsTitle.innerHTML = `Customer Reviews (<span id="reviewCount">${reviews.length}</span>)`;
  }

  if (reviews.length === 0) {
    reviewsWrapper.innerHTML = `
      <div class="text-center py-5">
        <p class="text-muted">No reviews yet. Be the first to review this product!</p>
        <a href="/write-a-review.html?product_id=${productId}" class="btn btn-ecomm rounded-3 mt-2">Write a Review</a>
      </div>
    `;
    return;
  }

  reviewsWrapper.innerHTML = '';

  // Display first 3 reviews
  reviews.slice(0, 3).forEach(review => {
    const reviewDiv = document.createElement('div');
    reviewDiv.className = 'd-flex flex-column flex-lg-row gap-3';

    const badgeColor = review.rating >= 4 ? 'bg-green' : review.rating >= 3 ? 'bg-warning text-dark' : 'bg-danger';

    reviewDiv.innerHTML = `
      <div class=""><span class="badge ${badgeColor} rounded-0">${review.rating}<i class="bi bi-star-fill ms-1"></i></span></div>
      <div class="flex-grow-1">
        <p class="mb-2 fw-bold">${review.title || 'Great product!'}</p>
        <p class="mb-2">${review.comment || review.description || ''}</p>
        <div class="d-flex flex-column flex-sm-row gap-3 mt-3">
          <div class="hstack flex-grow-1 gap-3">
            <p class="mb-0">${review.user_name || review.author || 'Anonymous Buyer'}</p>
            <div class="vr"></div>
            <div class="date-posted">${review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Recently'}</div>
          </div>
          <div class="hstack">
            <div class=""><i class="bi bi-hand-thumbs-up me-2"></i>${review.helpful_count || 0}</div>
            <div class="mx-3"></div>
            <div class=""><i class="bi bi-hand-thumbs-down me-2"></i>${review.unhelpful_count || 0}</div>
          </div>
        </div>
      </div>
    `;

    reviewsWrapper.appendChild(reviewDiv);

    const hr = document.createElement('hr');
    reviewsWrapper.appendChild(hr);
  });

  // Add View All Reviews button
  const viewAllDiv = document.createElement('div');
  viewAllDiv.className = 'd-grid';
  viewAllDiv.innerHTML = `<a href="/reviews-and-ratings.html?product_id=${productId}" class="btn btn-ecomm rounded-3 border">View All Reviews<i class="bi bi-arrow-right ms-2"></i></a>`;
  reviewsWrapper.appendChild(viewAllDiv);
}

// ==================== ADD TO CART ====================
async function addToCart() {
  if (!currentProduct) {
    alert('Product not loaded');
    return;
  }

  if (!selectedSize) {
    alert('Please select a size');
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');

    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId: currentProduct.id,
        quantity: selectedQuantity,
        size: selectedSize
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

// ==================== ADD TO WISHLIST ====================
async function addToWishlist() {
  if (!currentProduct) {
    alert('Product not loaded');
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');

    const response = await fetch('/api/wishlist', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId: currentProduct.id
      })
    });

    if (!response.ok) {
      throw new Error('Failed to add to wishlist');
    }

    alert('Product added to wishlist!');

  } catch (error) {
    console.error('Error adding to wishlist:', error);
    alert('Failed to add to wishlist: ' + error.message);
  }
}

// ==================== SIZE SELECTION ====================
document.addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON' && e.target.parentElement?.className.includes('size-chart')) {
    // Remove previous selection
    document.querySelectorAll('.size-chart button').forEach(btn => {
      btn.classList.remove('active');
    });

    // Mark as selected
    e.target.classList.add('active');
    selectedSize = e.target.textContent;
    console.log('Size selected:', selectedSize);
  }
});

