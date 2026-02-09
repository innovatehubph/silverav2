// Dynamic My Profile Page - Load and update real user data

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

// Handle profile update
async function handleProfileUpdate(event, fromButton = false) {
  if (event) {
    event.preventDefault();
  }

  if (checkAuthenticationRequired()) {
    updateUserGreeting();
    console.error('Error updating profile:', error);
    alert('Error updating profile. Please try again.');
  }
}

