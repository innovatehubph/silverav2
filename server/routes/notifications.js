const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.get('/notifications', auth, (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT id, type, title, message, is_read, datetime(created_at) as created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.user.id);
    res.json(notifications);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/notifications/:id/read', auth, (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);

    // Verify ownership
    const notification = db.prepare('SELECT user_id FROM notifications WHERE id = ?').get(notificationId);
    if (!notification || notification.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.get('/notifications/unread/count', auth, (req, res) => {
  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
    res.json({ unread_count: result.count });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

module.exports = router;
