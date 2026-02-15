const express = require('express');
const router = express.Router();
const db = require('../../db');
const { auth, adminOnly } = require('../../middleware/auth');

// Get all coupons
router.get('/admin/coupons', auth, adminOnly, (req, res) => {
  try {
    const coupons = db.prepare(`
      SELECT id, code, type, value, min_order_amount, max_uses, used_count,
             is_active, starts_at, expires_at, created_at
      FROM coupons
      ORDER BY created_at DESC
    `).all();
    res.json(coupons);
  } catch (e) {
    console.error('Get coupons error:', e.message);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Create coupon
router.post('/admin/coupons', auth, adminOnly, (req, res) => {
  try {
    const { code, type, value, min_order_amount, max_uses, is_active, starts_at, expires_at } = req.body;

    if (!code || !type || !value) {
      return res.status(400).json({ error: 'Code, type, and value are required' });
    }

    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ error: 'Type must be percentage or fixed' });
    }

    if (type === 'percentage' && (value < 0 || value > 100)) {
      return res.status(400).json({ error: 'Percentage value must be between 0 and 100' });
    }

    const result = db.prepare(`
      INSERT INTO coupons (code, type, value, min_order_amount, max_uses, is_active, starts_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code.toUpperCase().trim(),
      type,
      value,
      min_order_amount || 0,
      max_uses || 0,
      is_active !== false ? 1 : 0,
      starts_at || null,
      expires_at || null
    );

    const newCoupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(result.lastInsertRowid);
    console.log(`✅ Coupon created: ${code} by admin ${req.user.id}`);
    res.status(201).json(newCoupon);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    console.error('Create coupon error:', e.message);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// Update coupon
router.put('/admin/coupons/:id', auth, adminOnly, (req, res) => {
  try {
    const couponId = parseInt(req.params.id);
    if (!Number.isInteger(couponId) || couponId < 1) {
      return res.status(400).json({ error: 'Invalid coupon ID' });
    }

    const existing = db.prepare('SELECT id FROM coupons WHERE id = ?').get(couponId);
    if (!existing) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const { code, type, value, min_order_amount, max_uses, is_active, starts_at, expires_at } = req.body;

    if (type && !['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ error: 'Type must be percentage or fixed' });
    }

    if (type === 'percentage' && value !== undefined && (value < 0 || value > 100)) {
      return res.status(400).json({ error: 'Percentage value must be between 0 and 100' });
    }

    db.prepare(`
      UPDATE coupons
      SET code = COALESCE(?, code),
          type = COALESCE(?, type),
          value = COALESCE(?, value),
          min_order_amount = COALESCE(?, min_order_amount),
          max_uses = COALESCE(?, max_uses),
          is_active = COALESCE(?, is_active),
          starts_at = ?,
          expires_at = ?
      WHERE id = ?
    `).run(
      code ? code.toUpperCase().trim() : null,
      type || null,
      value !== undefined ? value : null,
      min_order_amount !== undefined ? min_order_amount : null,
      max_uses !== undefined ? max_uses : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      starts_at !== undefined ? starts_at : null,
      expires_at !== undefined ? expires_at : null,
      couponId
    );

    const updatedCoupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(couponId);
    console.log(`✅ Coupon updated: ${updatedCoupon.code} by admin ${req.user.id}`);
    res.json(updatedCoupon);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    console.error('Update coupon error:', e.message);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// Delete coupon
router.delete('/admin/coupons/:id', auth, adminOnly, (req, res) => {
  try {
    const couponId = parseInt(req.params.id);
    if (!Number.isInteger(couponId) || couponId < 1) {
      return res.status(400).json({ error: 'Invalid coupon ID' });
    }

    const existing = db.prepare('SELECT code FROM coupons WHERE id = ?').get(couponId);
    if (!existing) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    db.prepare('DELETE FROM coupons WHERE id = ?').run(couponId);
    console.log(`✅ Coupon deleted: ${existing.code} by admin ${req.user.id}`);
    res.json({ success: true });
  } catch (e) {
    console.error('Delete coupon error:', e.message);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

module.exports = router;
