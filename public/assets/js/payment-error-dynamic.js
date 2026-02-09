// Payment Error Page - Dynamic Content Loading

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('user');

  // Check authentication
  if (!token || !userStr) {
    console.warn('User not authenticated. Using guest mode.');
  } else {
  if (checkAuthenticationRequired()) {
    updateUserGreeting();
      console.error('Error parsing user:', error);
    }
  }

  // Load cart badge
  await loadCartBadge();
});

