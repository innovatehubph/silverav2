const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.get('/cart', auth, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT c.*, p.name, p.price, p.sale_price, p.images
      FROM cart c JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `).all(req.user.id);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

router.post('/cart', auth, (req, res) => {
  try {
    const product_id = parseInt(req.body.product_id || req.body.productId);
    let quantity = parseInt(req.body.quantity) || 1;

    if (!Number.isInteger(product_id) || product_id < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    quantity = Math.min(Math.max(quantity, 1), 99); // Clamp 1-99

    // Verify product exists
    const product = db.prepare('SELECT id FROM products WHERE id = ? AND status = ?').get(product_id, 'active');
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existing = db.prepare('SELECT * FROM cart WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, 99);
      db.prepare('UPDATE cart SET quantity = ? WHERE id = ?').run(newQty, existing.id);
    } else {
      db.prepare('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, product_id, quantity);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

router.put('/cart/:id', auth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let quantity = parseInt(req.body.quantity);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid cart item ID' });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }
    quantity = Math.min(quantity, 99);

    db.prepare('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?').run(quantity, id, req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

router.delete('/cart/:id', auth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid cart item ID' });
    }
    db.prepare('DELETE FROM cart WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

module.exports = router;
