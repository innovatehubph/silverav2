// About Us Page - Dynamic Content Loading

document.addEventListener('DOMContentLoaded', async () => {
  if (checkAuthenticationOptional()) {
    updateUserGreeting();
  }
  await loadCartBadge();
});
