// Dynamic Notification Page - Load real notifications

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
    console.error('Error loading notifications:', error);
  }
});

// Load notifications from API
async function loadNotifications() {
  if (checkAuthenticationRequired()) {
    updateUserGreeting();
    console.error('Error loading notifications:', error);
  }
}

// Group notifications by date
function groupByDate(notifications) {
  const grouped = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  notifications.forEach(notif => {
    const notifDate = new Date(notif.created_at);
    let dateGroup = 'Earlier';

    if (isSameDay(notifDate, today)) {
      dateGroup = 'Today';
    } else if (isSameDay(notifDate, yesterday)) {
      dateGroup = 'Yesterday';
    }

    if (!grouped[dateGroup]) {
      grouped[dateGroup] = [];
    }
    grouped[dateGroup].push(notif);
  });

  return grouped;
}

// Check if two dates are the same day
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

// Get icon and color for notification type
function getNotificationStyle(type) {
  const styles = {
    'order': { icon: 'bi-basket2', color: 'bg-red' },
    'delivery': { icon: 'bi-truck', color: 'bg-success' },
    'promo': { icon: 'bi-tag', color: 'bg-info' },
    'account': { icon: 'bi-person-circle', color: 'bg-purple' }
  };
  return styles[type] || { icon: 'bi-bell', color: 'bg-secondary' };
}

// Calculate time ago
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour(s) ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} day(s) ago`;

  return date.toLocaleDateString();
}

// Create notification card element
function createNotificationCard(notification) {
  const style = getNotificationStyle(notification.type);
  const timeAgo = getTimeAgo(notification.created_at);

  const card = document.createElement('div');
  card.className = 'card rounded-3 mb-3';
  card.id = `notification-${notification.id}`;
  card.innerHTML = `
    <div class="card-body">
      <div class="d-flex flex-row gap-3 align-items-start">
        <div class="noti-box mb-1 ${style.color}">
          <i class="bi ${style.icon}"></i>
        </div>
        <div class="flex-grow-1">
          <h6 class="text-dark fw-bold">${notification.title}</h6>
          <small>${timeAgo}</small>
          <p class="mb-0 fw-bold">${notification.message}</p>
        </div>
        ${!notification.is_read ? '<span class="badge bg-primary">New</span>' : ''}
      </div>
    </div>
  `;

  // Mark as read on click
  card.addEventListener('click', () => markAsRead(notification.id));

  return card;
}

// Mark notification as read
async function markAsRead(notificationId) {
  if (checkAuthenticationRequired()) {
    updateUserGreeting();
    console.error('Error marking notification as read:', error);
  }
}

