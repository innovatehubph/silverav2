const express = require('express');
const router = express.Router();
const db = require('../../db');
const { auth, adminOnly } = require('../../middleware/auth');

router.get('/admin/dashboard', auth, adminOnly, (req, res) => {
  try {
    const lowStockProducts = db.prepare(`
      SELECT id, name, stock, low_stock_threshold
      FROM products
      WHERE stock <= COALESCE(low_stock_threshold, 10) AND status = 'active'
      ORDER BY stock ASC
      LIMIT 10
    `).all();

    const stats = {
      totalOrders: db.prepare('SELECT COUNT(*) as count FROM orders').get().count,
      totalRevenue: db.prepare('SELECT COALESCE(SUM(total), 0) as sum FROM orders WHERE payment_status = ?').get('paid').sum,
      totalProducts: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
      totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      recentOrders: db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all(),
      pendingOrders: db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = ?').get('pending').count,
      lowStockProducts,
      lowStockCount: lowStockProducts.length
    };
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
