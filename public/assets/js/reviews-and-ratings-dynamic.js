// Reviews & Ratings - Load Real Reviews from Database

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('user');

  // Check authentication (optional for viewing reviews)
  if (token && userStr) {
    // User is logged in
    if (checkAuthenticationRequired()) {
      updateUserGreeting();
    }
  }

  // Load cart badge
  await loadCartBadge();

  // Get product ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('product_id');

  if (productId) {
    // Load reviews for specific product
    await loadReviews(productId);
  }
});

// Load reviews from API
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
      console.warn('Failed to load reviews, showing default state');
      renderDefaultReviews();
      return;
    }

    const reviews = await response.json();
    console.log('Reviews loaded:', reviews);

    renderReviews(reviews);

  } catch (error) {
    console.error('[Review Load Error]', error);
    renderDefaultReviews();
  }
}

// Render reviews with real data
function renderReviews(reviews) {
  if (!reviews || reviews.length === 0) {
    renderDefaultReviews();
    return;
  }

  // Calculate overall rating
  let totalRating = 0;
  let ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  reviews.forEach(review => {
    const rating = Math.round(review.rating);
    if (rating >= 1 && rating <= 5) {
      ratingCounts[rating]++;
    }
    totalRating += review.rating;
  });

  const averageRating = (totalRating / reviews.length).toFixed(1);

  // Update overall rating
  const overallRatingEl = document.getElementById('overallRating');
  if (overallRatingEl) {
    overallRatingEl.textContent = averageRating;
  }

  const verifiedCountEl = document.getElementById('verifiedCount');
  if (verifiedCountEl) {
    verifiedCountEl.textContent = formatNumber(reviews.length);
  }

  const reviewCountEl = document.getElementById('reviewCount');
  if (reviewCountEl) {
    reviewCountEl.textContent = reviews.length;
  }

  // Update rating distribution bars
  updateRatingBars(ratingCounts, reviews.length);

  // Render individual reviews
  const container = document.getElementById('reviewsContainer');
  if (container) {
    container.innerHTML = '';

    reviews.slice(0, 10).forEach((review, index) => {
      const stars = generateStars(review.rating);
      const reviewDate = formatDate(review.created_at);
      const userName = escapeHtml(review.user_name || 'Anonymous Buyer');
      const reviewText = escapeHtml(review.comment || review.description || '');
      const reviewTitle = escapeHtml(review.title || '');

      const reviewHtml = `
        <div class="d-flex flex-column flex-lg-row gap-3">
          <div class=""><span class="badge bg-${getRatingColor(review.rating)} rounded-0">${Math.round(review.rating)}${stars}</span></div>
          <div class="flex-grow-1">
            <p class="mb-2 fw-bold">${reviewTitle}</p>
            <p class="mb-2">${reviewText}</p>
            ${review.images ? `
              <div class="review-img">
                <img src="${review.images}" class="rounded-3" alt="Review" width="70">
              </div>
            ` : ''}
            <div class="d-flex flex-column flex-sm-row gap-3 mt-3">
              <div class="hstack flex-grow-1 gap-3">
                <p class="mb-0">${userName}</p>
                <div class="vr"></div>
                <div class="date-posted">${reviewDate}</div>
              </div>
              <div class="hstack">
                <div class=""><i class="bi bi-hand-thumbs-up me-2"></i>${review.helpful_count || 0}</div>
                <div class="mx-3"></div>
                <div class=""><i class="bi bi-hand-thumbs-down me-2"></i>${review.unhelpful_count || 0}</div>
              </div>
            </div>
          </div>
        </div>
        <hr>
      `;

      container.insertAdjacentHTML('beforeend', reviewHtml);
    });

    console.log(`[Reviews Rendered] Total: ${reviews.length}`);
  }
}

// Update rating distribution bars
function updateRatingBars(ratingCounts, totalReviews) {
  const ratingWrappers = document.querySelectorAll('.rating-wrrap');

  ratingWrappers.forEach((wrapper, index) => {
    const rating = 5 - index; // Assuming bars are ordered 5,4,3,2,1
    const count = ratingCounts[rating] || 0;
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

    const progressBar = wrapper.querySelector('.progress-bar');
    if (progressBar) {
      progressBar.style.width = percentage + '%';
    }

    const countSpan = wrapper.querySelector('p:last-child');
    if (countSpan) {
      countSpan.textContent = count;
    }
  });
}

// Render default reviews (fallback)
function renderDefaultReviews() {
  console.log('[Using Default Reviews]');
  const container = document.getElementById('reviewsContainer');
  if (container) {
    container.innerHTML = `
      <div class="text-center py-5">
        <p class="text-muted">No reviews yet. Be the first to review this product!</p>
      </div>
    `;
  }
}

// Generate star icons
function generateStars(rating) {
  const filledStars = Math.round(rating);
  let html = '';

  for (let i = 0; i < filledStars; i++) {
    html += '<i class="bi bi-star-fill ms-1"></i>';
  }

  return html;
}

// Get rating color
function getRatingColor(rating) {
  if (rating >= 4) return 'success';
  if (rating >= 3) return 'warning';
  if (rating >= 2) return 'info';
  return 'danger';
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return 'Recently';

  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

    return date.toLocaleDateString();
  } catch (error) {
    return 'Recently';
  }
}

// Format number with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
