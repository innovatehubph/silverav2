// Checkout Page - Dynamic Content Loading

let checkoutData = {
  cartItems: [],
  addresses: [],
  selectedAddress: null,
  paymentMethod: null
};

document.addEventListener('DOMContentLoaded', async () => {
  // Verify authentication first
  if (!checkAuthenticationRequired()) {
    return;
  }

  updateUserGreeting();
  await loadCartBadge();

  // Load all checkout data
  await loadCheckoutData();
});

// Load all checkout data (cart items, addresses, payment methods)
async function loadCheckoutData() {
  try {
    const token = localStorage.getItem('auth_token');

    // Load cart items
    console.log('Loading cart items...');
    const cartResponse = await fetch('/api/cart', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!cartResponse.ok) {
      throw new Error(`Failed to load cart: ${cartResponse.status}`);
    }

    checkoutData.cartItems = await cartResponse.json();
    console.log('Cart items loaded:', checkoutData.cartItems);

    // Load delivery addresses
    console.log('Loading addresses...');
    const addressResponse = await fetch('/api/addresses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (addressResponse.ok) {
      checkoutData.addresses = await addressResponse.json();
      console.log('Addresses loaded:', checkoutData.addresses);
    }

    // Update displays
    updateCheckoutSummary(checkoutData.cartItems);
    updateAddressSelection(checkoutData.addresses);
    updatePaymentMethods();

  } catch (error) {
    console.error('Error loading checkout data:', error);
    alert('Failed to load checkout data. Please try again.');
    window.location.href = '/cart.html';
  }
}

// Update checkout order summary
function updateCheckoutSummary(cartItems) {
  // Calculate totals
  const subtotal = Array.isArray(cartItems)
    ? cartItems.reduce((sum, item) => sum + ((item.sale_price || item.price) * (item.quantity || 1)), 0)
    : 0;

  const originalTotal = Array.isArray(cartItems)
    ? cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
    : 0;

  const discount = originalTotal - subtotal;
  const deliveryFee = subtotal > 0 ? 100 : 0;
  const total = subtotal + deliveryFee;

  // Update summary display
  const summaryDiv = document.querySelector('.order-summary') || document.querySelector('.checkout-summary');

  if (summaryDiv) {
    summaryDiv.innerHTML = `
      <div class="card rounded-3">
        <div class="card-body">
          <h5 class="fw-bold mb-3">Order Summary</h5>

          <div class="mb-3">
            <h6 class="fw-bold">Items (${Array.isArray(cartItems) ? cartItems.length : 0})</h6>
            ${Array.isArray(cartItems) && cartItems.length > 0
              ? cartItems.map(item => `
                <div class="d-flex justify-content-between small mb-2">
                  <span>${escapeHtml(item.name)} x${item.quantity || 1}</span>
                  <span>₱${((item.sale_price || item.price) * (item.quantity || 1)).toFixed(2)}</span>
                </div>
              `).join('')
              : '<p class="text-muted small">No items in cart</p>'
            }
          </div>

          <hr>
          <div class="hstack align-items-center justify-content-between">
            <p class="mb-0">Subtotal</p>
            <p class="mb-0">₱${subtotal.toFixed(2)}</p>
          </div>
          <hr>
          <div class="hstack align-items-center justify-content-between">
            <p class="mb-0">Discount</p>
            <p class="mb-0 text-success">- ₱${discount.toFixed(2)}</p>
          </div>
          <hr>
          <div class="hstack align-items-center justify-content-between">
            <p class="mb-0">Delivery Fee</p>
            <p class="mb-0">₱${deliveryFee.toFixed(2)}</p>
          </div>
          <hr>
          <div class="hstack align-items-center justify-content-between fw-bold">
            <p class="mb-0">Total Amount</p>
            <p class="mb-0" style="font-size: 1.2rem; color: #e74c3c;">₱${total.toFixed(2)}</p>
          </div>
        </div>
      </div>
    `;
  }
}

// Update address selection display
function updateAddressSelection(addresses) {
  const container = document.querySelector('.addresses-container') || document.querySelector('[data-addresses]');

  if (!container) {
    console.warn('Addresses container not found');
    return;
  }

  if (!Array.isArray(addresses) || addresses.length === 0) {
    container.innerHTML = `
      <div class="alert alert-warning">
        No delivery addresses. <a href="/addresses.html" class="alert-link">Add an address</a>
      </div>
    `;
    return;
  }

  let html = '<div class="mb-3"><h6 class="fw-bold">Delivery Address</h6>';

  addresses.forEach(addr => {
    html += `
      <div class="form-check mb-2">
        <input
          class="form-check-input address-radio"
          type="radio"
          name="address"
          id="address_${addr.id}"
          value="${addr.id}"
          onchange="selectAddress(${addr.id})">
        <label class="form-check-label" for="address_${addr.id}">
          <strong>${escapeHtml(addr.name)}</strong> - ${escapeHtml(addr.street)}, ${escapeHtml(addr.city)}
          ${addr.default ? '<span class="badge bg-primary ms-2">Default</span>' : ''}
        </label>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;

  // Auto-select first or default address
  const defaultAddr = addresses.find(a => a.default) || addresses[0];
  if (defaultAddr) {
    const radioBtn = document.getElementById(`address_${defaultAddr.id}`);
    if (radioBtn) {
      radioBtn.checked = true;
      checkoutData.selectedAddress = defaultAddr;
    }
  }
}

// Select address
function selectAddress(addressId) {
  checkoutData.selectedAddress = checkoutData.addresses.find(a => a.id === addressId);
  console.log('Selected address:', checkoutData.selectedAddress);
}

// Update payment methods display
function updatePaymentMethods() {
  const container = document.querySelector('.payment-methods-container') || document.querySelector('[data-payment]');

  if (!container) {
    console.warn('Payment methods container not found');
    return;
  }

  const methods = [
    { id: 'qrph', name: 'QRPH Payment', icon: '💳' },
    { id: 'cod', name: 'Cash on Delivery', icon: '🚚' },
    { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦' }
  ];

  let html = '<div class="mb-3"><h6 class="fw-bold">Payment Method</h6>';

  methods.forEach(method => {
    html += `
      <div class="form-check mb-2">
        <input
          class="form-check-input payment-radio"
          type="radio"
          name="payment"
          id="payment_${method.id}"
          value="${method.id}"
          onchange="selectPaymentMethod('${method.id}')">
        <label class="form-check-label" for="payment_${method.id}">
          ${method.icon} ${escapeHtml(method.name)}
        </label>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;

  // Auto-select first method
  const firstRadio = container.querySelector('.payment-radio');
  if (firstRadio) {
    firstRadio.checked = true;
    checkoutData.paymentMethod = firstRadio.value;
  }
}

// Select payment method
function selectPaymentMethod(method) {
  checkoutData.paymentMethod = method;
  console.log('Selected payment method:', method);
}

// Place order
async function placeOrder() {
  if (!checkoutData.selectedAddress) {
    alert('Please select a delivery address');
    return;
  }

  if (!checkoutData.paymentMethod) {
    alert('Please select a payment method');
    return;
  }

  if (!Array.isArray(checkoutData.cartItems) || checkoutData.cartItems.length === 0) {
    alert('Your cart is empty');
    return;
  }

  try {
    const token = localStorage.getItem('auth_token');

    const orderData = {
      items: checkoutData.cartItems.map(item => ({
        productId: item.product_id || item.id,
        quantity: item.quantity,
        price: item.sale_price || item.price
      })),
      addressId: checkoutData.selectedAddress.id,
      paymentMethod: checkoutData.paymentMethod
    };

    console.log('Placing order:', orderData);

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to place order: ${response.status}`);
    }

    const order = await response.json();
    console.log('Order placed:', order);

    // Redirect to payment or confirmation
    if (checkoutData.paymentMethod === 'cod') {
      // Cash on Delivery - go directly to confirmation
      window.location.href = `/order-tracking.html?order_id=${order.id}`;
    } else {
      // QRPH or Bank Transfer - go to payment
      window.location.href = `/payment-method.html?order_id=${order.id}`;
    }

  } catch (error) {
    console.error('Error placing order:', error);
    alert('Failed to place order: ' + error.message);
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
