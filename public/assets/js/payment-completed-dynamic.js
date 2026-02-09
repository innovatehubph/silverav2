// Payment Completion Page - Verify DirectPay Callback and Display Order Details

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
    console.error('Error on payment completed page:', error);
    showErrorState();
  }
});

// Verify payment status with DirectPay callback
async function verifyPaymentStatus(paymentRef, token) {
  if (checkAuthenticationRequired()) {
    updateUserGreeting();
    console.error('[Payment Verification Error]', error);
    // Don't fail, just show unknown state
    document.getElementById('paymentRef').textContent = paymentRef;
  }
}

// Poll payment status periodically
function pollPaymentStatus(paymentRef, token, maxSeconds = 120) {
  const interval = setInterval(async () => {
  if (checkAuthenticationRequired()) {
    updateUserGreeting();
      console.error('[Poll Error]', error);
    }

    // Stop polling after max seconds
    maxSeconds -= 2;
    if (maxSeconds <= 0) {
      clearInterval(interval);
      console.log('[Polling Timeout] Status not confirmed within timeout');
    }
  }, 2000); // Poll every 2 seconds
}

// Load order details (fallback)
async function loadOrderDetails(orderId, token) {
  if (checkAuthenticationRequired()) {
    updateUserGreeting();
    console.error('Error loading order details:', error);
  }
}

// Update order UI based on status
function updateOrderUI(status) {
  const orderDetails = document.getElementById('orderDetails');

  if (!orderDetails) return;

  if (status === 'paid' || status === 'success' || status === 'completed') {
    orderDetails.classList.remove('bg-warning', 'bg-danger');
    orderDetails.classList.add('bg-dark');

    // Update confirmation message
    const heading = document.querySelector('h5');
    if (heading) {
      heading.textContent = '✓ Payment Confirmed!';
      heading.classList.add('text-success');
    }
  } else if (status === 'pending') {
    orderDetails.classList.remove('bg-danger');
    orderDetails.classList.add('bg-warning');
  } else if (status === 'failed' || status === 'cancelled') {
    orderDetails.classList.remove('bg-dark', 'bg-warning');
    orderDetails.classList.add('bg-danger');
  }
}

// Show error state
function showErrorState() {
  const heading = document.querySelector('h5');
  const description = document.querySelector('p:not(.text-muted)');

  if (heading) {
    heading.textContent = 'Payment Processing...';
    heading.classList.add('text-warning');
  }

  if (description) {
    description.textContent = 'Please wait while we confirm your payment status.';
  }

  document.getElementById('paymentStatus').textContent = 'PROCESSING';
  document.getElementById('paymentStatus').classList.add('bg-warning');
}

// Redirect to payment error page
function redirectToError(paymentRef) {
  // Wait 3 seconds before redirecting
  setTimeout(() => {
    window.location.href = `/payment-error.html?ref=${paymentRef}`;
  }, 3000);
}

