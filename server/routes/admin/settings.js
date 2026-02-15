const express = require('express');
const router = express.Router();
const db = require('../../db');
const { auth, adminOnly } = require('../../middleware/auth');

// Get all settings
router.get('/admin/settings', auth, adminOnly, (req, res) => {
  try {
    const settings = db.prepare('SELECT key, value, updated_at FROM settings').all();
    res.json(settings);
  } catch (e) {
    console.error('Get settings error:', e.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings (batch update)
router.put('/admin/settings', auth, adminOnly, (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object required' });
    }

    const allowedKeys = [
      'store_name', 'store_logo', 'contact_email', 'contact_phone', 'store_address', 'currency',
      'social_facebook', 'social_instagram', 'social_twitter',
      'free_shipping_threshold', 'default_shipping_fee',
      'payment_cod_enabled', 'payment_gcash_enabled', 'payment_card_enabled',
      'payment_nexuspay_enabled',
      'email_sender_name', 'email_sender_email',
      'email_order_confirmation', 'email_shipping_updates', 'email_order_delivered',
      'email_order_cancelled', 'email_password_reset', 'email_promotional'
    ];

    const upsertStmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    const updateMany = db.transaction((settingsObj) => {
      for (const [key, value] of Object.entries(settingsObj)) {
        if (allowedKeys.includes(key)) {
          upsertStmt.run(key, String(value || ''));
        }
      }
    });

    updateMany(settings);

    console.log(`✅ Settings updated by admin user ${req.user.id}`);
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (e) {
    console.error('Update settings error:', e.message);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
