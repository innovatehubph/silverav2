const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.get('/wishlist', auth, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT w.id, w.product_id, w.created_at, p.name, p.price, p.sale_price, p.images, p.status
      FROM wishlist w JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `).all(req.user.id);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

router.post('/wishlist', auth, (req, res) => {
  try {
    const product_id = parseInt(req.body.product_id);

    if (!Number.isInteger(product_id) || product_id < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Verify product exists
    const product = db.prepare('SELECT id FROM products WHERE id = ? AND status = ?').get(product_id, 'active');
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already in wishlist
    const existing = db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
    if (existing) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }

    db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, product_id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

router.delete('/wishlist/:id', auth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid wishlist item ID' });
    }
    db.prepare('DELETE FROM wishlist WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

module.exports = router;
