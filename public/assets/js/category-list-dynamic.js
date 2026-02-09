// Category List - Load Real Categories from Database

document.addEventListener('DOMContentLoaded', async () => {
  // Verify authentication first
  if (!checkAuthenticationRequired()) {
    return;
  }

  updateUserGreeting();
  await loadCartBadge();
  await loadCategories();
});

// Load categories from API
async function loadCategories() {
  try {
    const token = localStorage.getItem('auth_token');

    const response = await fetch('/api/categories', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load categories: ${response.status}`);
    }

    const categories = await response.json();
    console.log('Categories loaded:', categories);

    renderCategoryList(categories);

  } catch (error) {
    console.error('[Category Load Error]', error);
    const container = document.querySelector('.row.row-cols-1');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger" role="alert">
          Failed to load categories. Please try again.
        </div>
      `;
    }
  }
}

// Render categories in list layout
function renderCategoryList(categories) {
  const container = document.querySelector('.row.row-cols-1');

  if (!container) {
    console.warn('Category list container not found');
    return;
  }

  // Clear existing categories
  const existingCategories = container.querySelectorAll('[data-category-id]');
  existingCategories.forEach(el => el.remove());

  // Map category names to images (based on existing images in assets)
  const categoryImages = {
    'Fashion': 'assets/images/circular-category/01.webp',
    'Electronics': 'assets/images/circular-category/04.webp',
    'Home & Living': 'assets/images/circular-category/06.webp',
    'Beauty': 'assets/images/circular-category/02.webp',
    'Sports': 'assets/images/circular-category/07.webp',
    'Men': 'assets/images/circular-category/01.webp',
    'Women': 'assets/images/circular-category/02.webp',
    'Kids': 'assets/images/circular-category/03.webp',
    'Mobiles': 'assets/images/circular-category/04.webp',
    'Laptops': 'assets/images/circular-category/05.webp',
    'Furniture': 'assets/images/circular-category/06.webp',
    'Shoes': 'assets/images/circular-category/07.webp',
    'Headphones': 'assets/images/circular-category/08.webp'
  };

  // Render each category
  categories.forEach((category, index) => {
    const imageNum = (index % 8) + 1;
    const imagePath = categoryImages[category.name] || `assets/images/circular-category/${String(imageNum).padStart(2, '0')}.webp`;

    const categoryHtml = `
      <div class="col" data-category-id="${category.id}">
        <a href="shop.html?category=${encodeURIComponent(category.slug)}">
          <div class="card rounded-3 mb-0">
            <div class="card-body">
              <div class="d-flex flex-row align-items-center justify-content-between gap-2">
                <div class="category-name">
                  <h6 class="mb-0 fw-bold text-dark fs-5">${escapeHtml(category.name)}</h6>
                </div>
                <div class="category-img">
                  <img src="${imagePath}" class="img-fluid" width="100" alt="${escapeHtml(category.name)}"/>
                </div>
              </div>
            </div>
          </div>
        </a>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', categoryHtml);
  });

  console.log(`[Categories Rendered] Total: ${categories.length}`);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

