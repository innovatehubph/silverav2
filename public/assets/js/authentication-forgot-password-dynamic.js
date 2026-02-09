// Forgot Password Flow

let resetToken = null;
let otpExpiryTime = null;
let otpTimerInterval = null;

// Send Verification Code
async function sendVerificationCode() {
  const email = document.getElementById('emailInput').value.trim();

  if (!email) {
    showAlert('Please enter your email address', 'error');
    return;
  }

  if (!validateEmail(email)) {
    showAlert('Please enter a valid email address', 'error');
    return;
  }

  try {
    showButtonLoading('sendBtnText', 'sendBtnSpinner');

    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert(data.error || 'Failed to send verification code', 'error');
      return;
    }

    // Store reset token
    resetToken = data.reset_token;

    // Show OTP section
    document.getElementById('otpSection').style.display = 'block';
    document.getElementById('emailInput').disabled = true;

    // Start OTP timer
    startOTPTimer();

    showAlert('Verification code sent to your email', 'success');
    console.log('[Forgot Password] Code sent, reset_token:', resetToken);

    // For testing: log the OTP (remove in production)
    if (data.otp) {
      console.log('[TEST OTP]:', data.otp);
    }
  } catch (error) {
    console.error('Error sending verification code:', error);
    showAlert('Network error. Please try again.', 'error');
  } finally {
    hideButtonLoading('sendBtnText', 'sendBtnSpinner');
  }
}

// Verify OTP
async function verifyOTP() {
  if (!resetToken) {
    showAlert('Session expired. Please start over.', 'error');
    return;
  }

  const otp = document.getElementById('otpInput').value.trim();

  if (!otp || otp.length !== 6) {
    showAlert('Please enter a 6-digit verification code', 'error');
    return;
  }

  try {
    showButtonLoading('verifyBtnText', 'verifyBtnSpinner');

    const response = await fetch('/api/auth/verify-reset-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reset_token: resetToken, otp })
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert(data.error || 'Invalid verification code', 'error');
      return;
    }

    // Clear OTP timer
    clearInterval(otpTimerInterval);

    // Hide OTP section, show password section
    document.getElementById('otpSection').style.display = 'none';
    document.getElementById('passwordSection').style.display = 'block';

    showAlert('Code verified. Please set your new password.', 'success');
    console.log('[Forgot Password] OTP verified');
  } catch (error) {
    console.error('Error verifying OTP:', error);
    showAlert('Network error. Please try again.', 'error');
  } finally {
    hideButtonLoading('verifyBtnText', 'verifyBtnSpinner');
  }
}

// Resend Code
async function resendCode() {
  const email = document.getElementById('emailInput').value.trim();

  if (!email) {
    showAlert('Email address not found', 'error');
    return;
  }

  try {
    showButtonLoading('sendBtnText', 'sendBtnSpinner');

    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert(data.error || 'Failed to resend code', 'error');
      return;
    }

    resetToken = data.reset_token;
    startOTPTimer();

    showAlert('Verification code resent to your email', 'success');
    document.getElementById('otpInput').value = '';
    console.log('[Forgot Password] Code resent, OTP:', data.otp);
  } catch (error) {
    console.error('Error resending code:', error);
    showAlert('Network error. Please try again.', 'error');
  } finally {
    hideButtonLoading('sendBtnText', 'sendBtnSpinner');
  }
}

// Reset Password
async function resetPassword() {
  if (!resetToken) {
    showAlert('Session expired. Please start over.', 'error');
    return;
  }

  const newPassword = document.getElementById('newPasswordInput').value;
  const confirmPassword = document.getElementById('confirmPasswordInput').value;

  if (!newPassword || !confirmPassword) {
    showAlert('Please enter both passwords', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showAlert('Password must be at least 6 characters', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showAlert('Passwords do not match', 'error');
    return;
  }

  try {
    showButtonLoading('resetBtnText', 'resetBtnSpinner');

    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert(data.error || 'Password reset failed', 'error');
      return;
    }

    showAlert('Password reset successfully! Redirecting to login...', 'success');
    console.log('[Forgot Password] Reset successful');

    setTimeout(() => {
      window.location.href = '/authentication-log-in.html';
    }, 2000);
  } catch (error) {
    console.error('Error resetting password:', error);
    showAlert('Network error. Please try again.', 'error');
  } finally {
    hideButtonLoading('resetBtnText', 'resetBtnSpinner');
  }
}

// Start OTP Timer (15 minutes)
function startOTPTimer() {
  otpExpiryTime = Date.now() + 15 * 60 * 1000; // 15 minutes from now

  if (otpTimerInterval) clearInterval(otpTimerInterval);

  otpTimerInterval = setInterval(() => {
    const timeLeft = otpExpiryTime - Date.now();

    if (timeLeft <= 0) {
      clearInterval(otpTimerInterval);
      document.getElementById('otpTimer').textContent = 'Expired';
      document.getElementById('otpInput').disabled = true;
      showAlert('Verification code expired. Please request a new one.', 'warning');
      return;
    }

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    document.getElementById('otpTimer').textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, 1000);
}

// Show Alert
function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');
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
  document.getElementById(textSpanId).style.display = 'none';
  document.getElementById(spinnerSpanId).style.display = 'inline-block';
}

// Hide Button Loading State
function hideButtonLoading(textSpanId, spinnerSpanId) {
  document.getElementById(textSpanId).style.display = 'inline';
  document.getElementById(spinnerSpanId).style.display = 'none';
}

// Validate Email
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Toggle Password Visibility
function togglePasswordVisibility(inputId, element) {
  const input = document.getElementById(inputId);
  const icon = element.querySelector('i');

  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('bi-eye-slash');
    icon.classList.add('bi-eye');
  } else {
    input.type = 'password';
    icon.classList.remove('bi-eye');
    icon.classList.add('bi-eye-slash');
  }
}

// Allow only numbers in OTP input
document.addEventListener('DOMContentLoaded', () => {
  const otpInput = document.getElementById('otpInput');
  if (otpInput) {
    otpInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
  }
});
