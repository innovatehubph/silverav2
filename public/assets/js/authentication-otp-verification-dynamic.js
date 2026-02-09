// OTP Verification & PIN Setup Page

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  const token = localStorage.getItem('auth_token');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    console.warn('Not authenticated. PIN setup is optional after registration.');
  }

  // Setup OTP input auto-advance
  setupOTPInputs();

  // Filter PIN inputs to numbers only
  const pinInputs = document.getElementById('pinInput');
  const confirmPinInput = document.getElementById('confirmPinInput');

  if (pinInputs) {
    pinInputs.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
  }

  if (confirmPinInput) {
    confirmPinInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
  }
});

// Setup OTP Input Auto-Advance
function setupOTPInputs() {
  const otpInputs = document.querySelectorAll('#otp1, #otp2, #otp3, #otp4, #otp5, #otp6');

  otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      // Only allow numbers
      e.target.value = e.target.value.replace(/[^0-9]/g, '');

      // Auto-advance to next input
      if (e.target.value.length === 1 && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }

      // Auto-verify when all digits entered
      if (allOTPFilled()) {
        verifyOTP();
      }
    });

    input.addEventListener('keydown', (e) => {
      // Backspace - go to previous input
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        otpInputs[index - 1].focus();
      }
    });
  });
}

// Check if all OTP digits are filled
function allOTPFilled() {
  const otpInputs = document.querySelectorAll('#otp1, #otp2, #otp3, #otp4, #otp5, #otp6');
  return Array.from(otpInputs).every(input => input.value.length === 1);
}

// Get OTP value
function getOTPValue() {
  const otpInputs = document.querySelectorAll('#otp1, #otp2, #otp3, #otp4, #otp5, #otp6');
  return Array.from(otpInputs).map(input => input.value).join('');
}

// Setup PIN
async function setupPIN() {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    showAlert('You must be logged in to setup PIN', 'error');
    return;
  }

  const pin = document.getElementById('pinInput').value.trim();
  const confirmPin = document.getElementById('confirmPinInput').value.trim();

  if (!pin || !confirmPin) {
    showAlert('Please enter and confirm your PIN', 'error');
    return;
  }

  if (!/^\d{4,6}$/.test(pin)) {
    showAlert('PIN must be 4-6 digits', 'error');
    return;
  }

  if (pin !== confirmPin) {
    showAlert('PINs do not match', 'error');
    return;
  }

  try {
    showButtonLoading('setupBtnText', 'setupBtnSpinner');

    const response = await fetch('/api/users/setup-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ pin, confirm_pin: confirmPin })
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert(data.error || 'PIN setup failed', 'error');
      return;
    }

    showAlert('PIN setup successful! Redirecting...', 'success');
    console.log('[PIN Setup] Success');

    setTimeout(() => {
      window.location.href = '/home.html';
    }, 2000);
  } catch (error) {
    console.error('Error setting up PIN:', error);
    showAlert('Network error. Please try again.', 'error');
  } finally {
    hideButtonLoading('setupBtnText', 'setupBtnSpinner');
  }
}

// Skip PIN Setup
function skipPINSetup() {
  if (confirm('Are you sure? You can set up PIN later in settings.')) {
    window.location.href = '/home.html';
  }
}

// Verify OTP (for password reset flow)
async function verifyOTP() {
  const otp = getOTPValue();

  if (otp.length !== 6) {
    showAlert('Please enter all 6 digits', 'error');
    return;
  }

  console.log('[OTP Verification]', otp);

  // This would integrate with password reset flow
  // For now, redirect to change password
  window.location.href = '/authentication-change-password.html';
}

// Resend OTP (for password reset)
function resendOTP() {
  showAlert('New code sent to your email', 'success');
  console.log('[OTP Resent]');

  // Clear inputs
  document.querySelectorAll('#otp1, #otp2, #otp3, #otp4, #otp5, #otp6').forEach(input => {
    input.value = '';
  });

  document.getElementById('otp1').focus();
}

// Show Alert
function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');

  if (!alertContainer) {
    alert(message);
    return;
  }

  const alertClass = type === 'error' ? 'alert-danger' : type === 'success' ? 'alert-success' : type === 'warning' ? 'alert-warning' : 'alert-info';

  const alertHtml = `
    <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;

  alertContainer.innerHTML = alertHtml;

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const alerts = alertContainer.querySelectorAll('.alert');
    alerts.forEach(alert => alert.remove());
  }, 5000);
}

// Show Button Loading State
function showButtonLoading(textSpanId, spinnerSpanId) {
  const textSpan = document.getElementById(textSpanId);
  const spinnerSpan = document.getElementById(spinnerSpanId);

  if (textSpan) textSpan.style.display = 'none';
  if (spinnerSpan) spinnerSpan.style.display = 'inline-block';
}

// Hide Button Loading State
function hideButtonLoading(textSpanId, spinnerSpanId) {
  const textSpan = document.getElementById(textSpanId);
  const spinnerSpan = document.getElementById(spinnerSpanId);

  if (textSpan) textSpan.style.display = 'inline';
  if (spinnerSpan) spinnerSpan.style.display = 'none';
}
