// Dynamic Payment Method Selection with QRPH and DirectPay Integration

let selectedPaymentMethod = null;
let selectedPaymentType = null;
let paymentMethods = {};

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('user');

  // Check authentication
  if (!token || !userStr) {
    window.location.href = '/authentication-log-in.html';
    return;
  }

  if (checkAuthenticationRequired()) {
    updateUserGreeting();
    console.error('Error loading payment method page:', error);
  }
});

// Load available payment methods
async function loadPaymentMethods() {
  if (checkAuthenticationRequired()) {
    updateUserGreeting();
    console.error('Error loading payment methods:', error);
  }
}

// Initialize event listeners
function initializeEventListeners() {
  // QRPH Radio button - show modal on selection
  const qrphRadio = document.getElementById('flexRadioQRPH');
  if (qrphRadio) {
    qrphRadio.addEventListener('change', () => {
      if (qrphRadio.checked) {
        showQRPHModal();
      }
    });
  }

  // Payment method selection in modals
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('payment-method-btn')) {
      selectPaymentMethod(e.target);
    }
  });

  // Complete order button
  const completeBtn = document.querySelector('.btn-complete-order');
  if (completeBtn) {
    completeBtn.addEventListener('click', completePayment);
  }
}

// Show QRPH modal with options
function showQRPHModal() {
  const modalHTML = `
    <div class="modal fade" id="qrphModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-fullscreen-sm-down">
        <div class="modal-content bg-dark text-white rounded-3">
          <div class="modal-header border-bottom border-secondary">
            <h5 class="modal-title fw-bold">QRPH Payment</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <!-- Tab Navigation -->
            <ul class="nav nav-tabs mb-4 border-bottom border-secondary" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active text-white fw-bold" id="ewalletTab" data-bs-toggle="tab"
                  data-bs-target="#ewalletContent" type="button" role="tab">E-Wallets</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link text-white fw-bold" id="bankTab" data-bs-toggle="tab"
                  data-bs-target="#bankContent" type="button" role="tab">Banks</button>
              </li>
            </ul>

            <!-- E-Wallets Tab -->
            <div class="tab-content">
              <div class="tab-pane fade show active" id="ewalletContent" role="tabpanel">
                <!-- Local E-Wallets Section -->
                <div class="mb-4">
                  <h6 class="fw-bold text-info mb-3">Local E-Wallets (Philippines)</h6>
                  <div id="ewalletLocalContainer" class="d-grid gap-2">
                    <!-- Will be populated by JavaScript -->
                  </div>
                </div>

                <!-- International E-Wallets Section -->
                <div>
                  <h6 class="fw-bold text-warning mb-3">International E-Wallets</h6>
                  <div id="ewalletInternationalContainer" class="d-grid gap-2">
                    <!-- Will be populated by JavaScript -->
                  </div>
                </div>
              </div>

              <!-- Banks Tab -->
              <div class="tab-pane fade" id="bankContent" role="tabpanel">
                <!-- Local Banks Section -->
                <div class="mb-4">
                  <h6 class="fw-bold text-info mb-3">Local Banks (Philippines)</h6>
                  <div id="bankLocalContainer" class="d-grid gap-2">
                    <!-- Will be populated by JavaScript -->
                  </div>
                </div>

                <!-- International Cards Section -->
                <div>
                  <h6 class="fw-bold text-warning mb-3">International Cards</h6>
                  <div id="bankInternationalContainer" class="d-grid gap-2">
                    <!-- Will be populated by JavaScript -->
                  </div>
                </div>
              </div>
            </div>

            <!-- Selected Payment Display -->
            <div id="selectedPaymentDisplay" class="mt-4 p-3 bg-secondary rounded-3" style="display:none;">
              <p class="mb-2"><small class="text-muted">Selected Payment Method</small></p>
              <div class="d-flex align-items-center gap-3">
                <img id="selectedPaymentIcon" src="" alt="" width="40" class="rounded-2">
                <div>
                  <p class="mb-0 fw-bold" id="selectedPaymentName">-</p>
                  <small class="text-muted" id="selectedPaymentType">-</small>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer border-top border-secondary">
            <button type="button" class="btn btn-outline-light rounded-3" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary rounded-3" id="confirmQRPHBtn" onclick="confirmQRPHSelection()">
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add modal to DOM
  let modal = document.getElementById('qrphModal');
  if (modal) {
    modal.remove();
  }
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Populate payment method buttons
  populatePaymentMethods();

  // Show modal
  const modal_instance = new bootstrap.Modal(document.getElementById('qrphModal'));
  modal_instance.show();
}

// Populate payment method buttons in modal
function populatePaymentMethods() {
  // E-Wallets Local
  const ewalletLocal = document.getElementById('ewalletLocalContainer');
  if (ewalletLocal && paymentMethods.ewallets_local) {
    ewalletLocal.innerHTML = paymentMethods.ewallets_local
      .map(method => createPaymentMethodButton(method))
      .join('');
  }

  // E-Wallets International
  const ewalletIntl = document.getElementById('ewalletInternationalContainer');
  if (ewalletIntl && paymentMethods.ewallets_international) {
    ewalletIntl.innerHTML = paymentMethods.ewallets_international
      .map(method => createPaymentMethodButton(method))
      .join('');
  }

  // Banks Local
  const bankLocal = document.getElementById('bankLocalContainer');
  if (bankLocal && paymentMethods.banks_local) {
    bankLocal.innerHTML = paymentMethods.banks_local
      .map(method => createPaymentMethodButton(method))
      .join('');
  }

  // Banks International
  const bankIntl = document.getElementById('bankInternationalContainer');
  if (bankIntl && paymentMethods.banks_international) {
    bankIntl.innerHTML = paymentMethods.banks_international
      .map(method => createPaymentMethodButton(method))
      .join('');
  }
}

// Create payment method button HTML
function createPaymentMethodButton(method) {
  return `
    <button type="button" class="payment-method-btn btn btn-outline-light d-flex align-items-center gap-3 p-3 rounded-2 text-start"
      data-method-id="${method.id}" data-method-name="${method.name}" data-method-icon="${method.icon}" data-method-type="${method.type}">
      <img src="${method.icon}" alt="${method.name}" width="40" class="rounded-2" onerror="this.src='assets/images/placeholder.webp'">
      <div>
        <p class="mb-0 fw-bold">${method.name}</p>
        <small class="text-muted">${method.type === 'local' ? '🇵🇭 Local' : '🌍 International'}</small>
      </div>
      <i class="bi bi-check-circle ms-auto text-success" style="display:none;"></i>
    </button>
  `;
}

// Select payment method
function selectPaymentMethod(button) {
  // Remove previous selection
  document.querySelectorAll('.payment-method-btn').forEach(btn => {
    btn.classList.remove('active', 'border-success');
    btn.querySelector('.bi-check-circle').style.display = 'none';
  });

  // Mark as selected
  button.classList.add('active', 'border-success');
  button.querySelector('.bi-check-circle').style.display = 'block';

  selectedPaymentMethod = button.dataset.methodId;
  selectedPaymentType = button.dataset.methodType;

  // Update selected display
  const display = document.getElementById('selectedPaymentDisplay');
  document.getElementById('selectedPaymentIcon').src = button.dataset.methodIcon;
  document.getElementById('selectedPaymentName').textContent = button.dataset.methodName;
  document.getElementById('selectedPaymentType').textContent = button.dataset.methodType === 'local' ? '🇵🇭 Local Payment' : '🌍 International Payment';
  display.style.display = 'block';
}

// Confirm QRPH selection
async function confirmQRPHSelection() {
  if (!selectedPaymentMethod) {
    alert('Please select a payment method');
    return;
  }

  // Close modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('qrphModal'));
  modal.hide();

  // Update page to show selected method
  const qrphLabel = document.querySelector('label[for="flexRadioQRPH"]');
  if (qrphLabel) {
    qrphLabel.innerHTML += ` <span class="badge bg-success ms-2">${document.getElementById('selectedPaymentName').textContent}</span>`;
  }
}

// Complete payment (called when order is confirmed)
async function completePayment() {
  if (checkAuthenticationRequired()) {
    updateUserGreeting();
    console.error('Error completing payment:', error);
    alert('Error processing payment');
  }
}

// Process Cash on Delivery
async function processCOD(token) {
  // Get order ID from session/storage
  const orderId = sessionStorage.getItem('order_id');
  if (!orderId) {
    alert('No order found');
    return;
  }

  // Update order status
  const response = await fetch(`/api/orders/${orderId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      payment_method: 'cash_on_delivery',
      payment_status: 'pending'
    })
  });

  if (response.ok) {
    window.location.href = '/payment-completed.html';
  }
}

// Process QRPH Payment
async function processQRPH(token) {
  const orderId = sessionStorage.getItem('order_id');
  if (!orderId) {
    alert('No order found');
    return;
  }

  const response = await fetch('/api/payments/qrph/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      order_id: parseInt(orderId),
      payment_method: selectedPaymentMethod,
      payment_type: selectedPaymentType
    })
  });

  if (response.ok) {
    const data = await response.json();
    // Redirect to DirectPay checkout with QR code
    window.location.href = data.checkout_url;
  } else {
    alert('Error creating QRPH payment');
  }
}

// Process PayPal Payment
async function processPayPal(token) {
  const orderId = sessionStorage.getItem('order_id');
  alert(`Redirecting to PayPal for payment processing...`);
  // Integration with PayPal would go here
}

// Process Card Payment
async function processCard(token) {
  const orderId = sessionStorage.getItem('order_id');
  const cardNumber = document.getElementById('floatingCardNumber')?.value;
  const cardName = document.getElementById('floatingNameonCard')?.value;
  const validity = document.getElementById('floatingValidity')?.value;
  const ccv = document.getElementById('floatingCCV')?.value;

  if (!cardNumber || !cardName || !validity || !ccv) {
    alert('Please fill in all card details');
    return;
  }

  alert(`Processing card payment: ${cardNumber.slice(-4).padStart(cardNumber.length, '*')}`);
  // Integration with payment gateway would go here
}

