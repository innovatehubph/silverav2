// Dynamic Profile Page - Load real user data from API

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
    console.error('Error loading profile:', error);
  }
});

