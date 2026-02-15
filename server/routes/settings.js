const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

// Get single setting (public, for frontend use)
router.get('/settings/:key', (req, res) => {
  try {
    const { key } = req.params;
    const publicKeys = ['store_name', 'store_logo', 'currency', 'social_facebook', 'social_instagram', 'social_twitter',
                        'free_shipping_threshold', 'default_shipping_fee',
                        'payment_cod_enabled', 'payment_gcash_enabled', 'payment_card_enabled',
                        'payment_nexuspay_enabled'];

    if (!publicKeys.includes(key)) {
      return res.status(403).json({ error: 'Setting not accessible' });
    }

    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    res.json({ key, value: setting?.value || null });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Get all public settings (for frontend)
router.get('/settings', (req, res) => {
  try {
    const publicKeys = ['store_name', 'store_logo', 'currency', 'social_facebook', 'social_instagram', 'social_twitter',
                        'free_shipping_threshold', 'default_shipping_fee',
                        'payment_cod_enabled', 'payment_gcash_enabled', 'payment_card_enabled',
                        'payment_nexuspay_enabled'];

    const settings = db.prepare(`SELECT key, value FROM settings WHERE key IN (${publicKeys.map(() => '?').join(',')})`).all(...publicKeys);

    // Convert to object for easier frontend use
    const settingsObj = {};
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });

    res.json(settingsObj);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Validate coupon (public endpoint for checkout)
router.post('/coupons/validate', auth, (req, res) => {
  try {
    const { code, order_total } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(code.toUpperCase().trim());

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or inactive coupon code' });
    }

    const now = new Date();

    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return res.status(400).json({ error: 'Coupon is not yet active' });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    if (coupon.min_order_amount > 0 && order_total < coupon.min_order_amount) {
      return res.status(400).json({
        error: `Minimum order amount is ₱${coupon.min_order_amount.toLocaleString()}`
      });
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (order_total * coupon.value) / 100;
    } else {
      discount = Math.min(coupon.value, order_total);
    }

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      discount: Math.round(discount * 100) / 100,
      new_total: Math.round((order_total - discount) * 100) / 100,
    });
  } catch (e) {
    console.error('Validate coupon error:', e.message);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

module.exports = router;
