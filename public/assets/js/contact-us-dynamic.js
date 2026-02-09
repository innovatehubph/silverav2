// Contact Us Page - Dynamic Content Loading

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('user');

  // Check authentication
  if (!token || !userStr) {
    console.warn('User not authenticated. Using guest mode.');
  } else {
    try {
      const user = JSON.parse(userStr);

      // Update user greeting
      const userGreeting = document.getElementById('userGreeting');
      if (userGreeting && user.name) {
        userGreeting.textContent = `Hi! ${user.name}`;
      }
    } catch (error) {
      console.error('Error parsing user:', error);
    }
  }

  // Load cart badge
  await loadCartBadge();

  // Setup contact form submission
  setupContactForm();
});

// Setup contact form submission
function setupContactForm() {
  const sendButton = document.querySelector('a.btn-dark');
  if (sendButton) {
    sendButton.addEventListener('click', function(e) {
      e.preventDefault();
      handleContactFormSubmit();
    });
  }
}

// Handle contact form submission
function handleContactFormSubmit() {
  const nameInput = document.querySelector('input[placeholder*="Name"]');
  const emailInput = document.querySelector('input[placeholder*="Email"]');
  const phoneInput = document.querySelector('input[placeholder*="Phone"]');
  const messageTextarea = document.querySelector('textarea');

  if (!nameInput || !emailInput || !phoneInput || !messageTextarea) {
    console.warn('Form inputs not found');
    return;
  }

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = phoneInput.value.trim();
  const message = messageTextarea.value.trim();

  // Validate
  if (!name || !email || !phone || !message) {
    showAlert('Please fill in all fields', 'warning');
    return;
  }

  if (!validateEmail(email)) {
    showAlert('Please enter a valid email address', 'error');
    return;
  }

  // Show success message (in real implementation, send to backend)
  console.log('Contact form submitted:', { name, email, phone, message });

  showAlert('Message sent successfully! We\'ll get back to you soon.', 'success');

  // Clear form
  nameInput.value = '';
  emailInput.value = '';
  phoneInput.value = '';
  messageTextarea.value = '';
}

// Show alert notification
function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  const alertClass = type === 'error' ? 'alert-danger' : type === 'success' ? 'alert-success' : type === 'warning' ? 'alert-warning' : 'alert-info';

  alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
  alertDiv.style.zIndex = '9999';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  document.body.appendChild(alertDiv);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

// Validate email
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

