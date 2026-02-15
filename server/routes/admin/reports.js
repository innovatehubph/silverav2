const express = require('express');
const router = express.Router();
const db = require('../../db');
const { auth, adminOnly } = require('../../middleware/auth');

// Sales overview report
router.get('/admin/reports/sales', auth, adminOnly, (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Revenue calculations (only paid orders)
    const todayRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as sum
      FROM orders
      WHERE payment_status = 'paid' AND created_at >= ?
    `).get(todayStart).sum;

    const weekRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as sum
      FROM orders
      WHERE payment_status = 'paid' AND created_at >= ?
    `).get(weekStart).sum;

    const monthRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as sum
      FROM orders
      WHERE payment_status = 'paid' AND created_at >= ?
    `).get(monthStart).sum;

    const allTimeRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as sum
      FROM orders
      WHERE payment_status = 'paid'
    `).get().sum;

    // Order counts
    const ordersToday = db.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ?').get(todayStart).count;
    const ordersThisWeek = db.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ?').get(weekStart).count;
    const ordersThisMonth = db.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ?').get(monthStart).count;
    const ordersAllTime = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;

    res.json({
      today: todayRevenue,
      thisWeek: weekRevenue,
      thisMonth: monthRevenue,
      allTime: allTimeRevenue,
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      ordersAllTime,
    });
  } catch (e) {
    console.error('Sales report error:', e.message);
    res.status(500).json({ error: 'Failed to fetch sales report' });
  }
});

// Revenue trend data
router.get('/admin/reports/revenue', auth, adminOnly, (req, res) => {
  try {
    const { period = 'month' } = req.query;
    let days = 30;
    let groupBy = 'day';

    switch (period) {
      case 'day': days = 1; groupBy = 'hour'; break;
      case 'week': days = 7; groupBy = 'day'; break;
      case 'month': days = 30; groupBy = 'day'; break;
      case 'year': days = 365; groupBy = 'month'; break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let dateFormat;
    if (groupBy === 'hour') {
      dateFormat = '%Y-%m-%d %H:00';
    } else if (groupBy === 'month') {
      dateFormat = '%Y-%m';
    } else {
      dateFormat = '%Y-%m-%d';
    }

    const revenueData = db.prepare(`
      SELECT
        strftime('${dateFormat}', created_at) as date,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE created_at >= ?
      GROUP BY strftime('${dateFormat}', created_at)
      ORDER BY date ASC
    `).all(startDate.toISOString());

    res.json({ revenue: revenueData, period });
  } catch (e) {
    console.error('Revenue report error:', e.message);
    res.status(500).json({ error: 'Failed to fetch revenue report' });
  }
});

// Top selling products
router.get('/admin/reports/top-products', auth, adminOnly, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    // Get all orders with items and aggregate
    const orders = db.prepare(`
      SELECT items, total, payment_status
      FROM orders
      WHERE payment_status = 'paid'
    `).all();

    const productSales = {};

    orders.forEach(order => {
      try {
        const items = JSON.parse(order.items || '[]');
        items.forEach(item => {
          const productId = item.product_id || item.id;
          const name = item.name || `Product #${productId}`;
          const quantity = item.quantity || 1;
          const price = item.sale_price || item.price || 0;

          if (!productSales[productId]) {
            productSales[productId] = { id: productId, name, sold: 0, revenue: 0 };
          }
          productSales[productId].sold += quantity;
          productSales[productId].revenue += price * quantity;
        });
      } catch (e) {
        // Skip invalid items
      }
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    res.json({ products: topProducts });
  } catch (e) {
    console.error('Top products report error:', e.message);
    res.status(500).json({ error: 'Failed to fetch top products report' });
  }
});

// Orders by status
router.get('/admin/reports/orders-by-status', auth, adminOnly, (req, res) => {
  try {
    const statusData = db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM orders
      GROUP BY status
    `).all();

    const totalOrders = statusData.reduce((sum, s) => sum + s.count, 0);
    const statuses = statusData.map(s => ({
      status: s.status,
      count: s.count,
      percentage: totalOrders > 0 ? (s.count / totalOrders) * 100 : 0,
    }));

    // Payment methods breakdown
    const paymentData = db.prepare(`
      SELECT
        COALESCE(payment_method, 'Unknown') as method,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) as total
      FROM orders
      GROUP BY payment_method
      ORDER BY count DESC
    `).all();

    const totalPayments = paymentData.reduce((sum, p) => sum + p.count, 0);
    const paymentMethods = paymentData.map(p => ({
      method: p.method || 'Unknown',
      count: p.count,
      total: p.total,
      percentage: totalPayments > 0 ? (p.count / totalPayments) * 100 : 0,
    }));

    res.json({ statuses, paymentMethods });
  } catch (e) {
    console.error('Orders by status report error:', e.message);
    res.status(500).json({ error: 'Failed to fetch orders by status report' });
  }
});

// Customer growth data
router.get('/admin/reports/customers', auth, adminOnly, (req, res) => {
  try {
    const { period = 'month' } = req.query;
    let days = 30;

    switch (period) {
      case 'day': days = 1; break;
      case 'week': days = 7; break;
      case 'month': days = 30; break;
      case 'year': days = 365; break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Daily new customer registrations
    const growthData = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as newCustomers
      FROM users
      WHERE role = 'customer' AND created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(startDate.toISOString());

    // Calculate cumulative totals
    const totalBefore = db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'customer' AND created_at < ?
    `).get(startDate.toISOString()).count;

    let cumulative = totalBefore;
    const growth = growthData.map(d => {
      cumulative += d.newCustomers;
      return {
        date: d.date,
        newCustomers: d.newCustomers,
        totalCustomers: cumulative,
      };
    });

    // Total customers
    const totalCustomers = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE role = 'customer'
    `).get().count;

    res.json({ growth, totalCustomers, period });
  } catch (e) {
    console.error('Customer report error:', e.message);
    res.status(500).json({ error: 'Failed to fetch customer report' });
  }
});

// Revenue by category
router.get('/admin/reports/revenue-by-category', auth, adminOnly, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT items, total FROM orders WHERE payment_status = 'paid'
    `).all();

    const categoryMap = {};

    orders.forEach(order => {
      try {
        const items = JSON.parse(order.items || '[]');
        items.forEach(item => {
          const productId = item.product_id || item.id;
          const quantity = item.quantity || 1;
          const price = item.sale_price || item.price || 0;

          // Look up product to get category_id
          const product = db.prepare('SELECT category_id FROM products WHERE id = ?').get(productId);
          const categoryId = product?.category_id || null;

          if (!categoryMap[categoryId]) {
            // Look up category name
            const category = categoryId
              ? db.prepare('SELECT id, name FROM categories WHERE id = ?').get(categoryId)
              : null;
            categoryMap[categoryId] = {
              id: categoryId || 0,
              name: category?.name || 'Uncategorized',
              revenue: 0,
              orders: 0,
            };
          }
          categoryMap[categoryId].revenue += price * quantity;
        });
      } catch (e) {
        // Skip invalid items
      }
    });

    // Count distinct orders per category (increment once per order that has items in that category)
    orders.forEach(order => {
      try {
        const items = JSON.parse(order.items || '[]');
        const seenCategories = new Set();
        items.forEach(item => {
          const productId = item.product_id || item.id;
          const product = db.prepare('SELECT category_id FROM products WHERE id = ?').get(productId);
          const categoryId = product?.category_id || null;
          if (!seenCategories.has(categoryId) && categoryMap[categoryId]) {
            categoryMap[categoryId].orders += 1;
            seenCategories.add(categoryId);
          }
        });
      } catch (e) {
        // Skip invalid items
      }
    });

    const categories = Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);

    res.json({ categories });
  } catch (e) {
    console.error('Revenue by category error:', e.message);
    res.status(500).json({ error: 'Failed to fetch revenue by category' });
  }
});

module.exports = router;
