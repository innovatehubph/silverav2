const express = require('express');
const router = express.Router();
const db = require('../../db');
const { auth, adminOnly } = require('../../middleware/auth');
const emailService = require('../../services/email-service');

router.get('/admin/orders', auth, adminOnly, (req, res) => {
  try {
    const { status, payment_status, search, start_date, end_date } = req.query;

    let query = `
      SELECT o.*, u.email, u.name as customer_name, u.phone as customer_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by status
    if (status && status !== 'all') {
      query += ' AND o.status = ?';
      params.push(status);
    }

    // Filter by payment status
    if (payment_status && payment_status !== 'all') {
      query += ' AND o.payment_status = ?';
      params.push(payment_status);
    }

    // Search by order ID or customer name/email
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query += ' AND (CAST(o.id AS TEXT) LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Filter by date range
    if (start_date) {
      query += ' AND DATE(o.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND DATE(o.created_at) <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY o.created_at DESC';

    const orders = db.prepare(query).all(...params);
    res.json(orders);
  } catch (e) {
    console.error('Admin orders fetch error:', e.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order with full details
router.get('/admin/orders/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    // Get order with customer info
    const order = db.prepare(`
      SELECT o.*, u.email, u.name as customer_name, u.phone as customer_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `).get(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order notes
    const notes = db.prepare(`
      SELECT n.*, u.name as admin_name
      FROM order_notes n
      LEFT JOIN users u ON n.admin_id = u.id
      WHERE n.order_id = ?
      ORDER BY n.created_at DESC
    `).all(id);

    // Get status history
    const statusHistory = db.prepare(`
      SELECT h.*, u.name as changed_by_name
      FROM order_status_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.order_id = ?
      ORDER BY h.created_at ASC
    `).all(id);

    // Parse items JSON and enrich with product data
    let items = [];
    try {
      const rawItems = JSON.parse(order.items || '[]');
      items = rawItems.map(item => {
        const product = db.prepare('SELECT name, images, price, sale_price FROM products WHERE id = ?').get(item.product_id);
        return {
          ...item,
          name: product?.name || item.name || 'Unknown Product',
          images: product?.images || item.images || '[]',
          unit_price: item.sale_price || item.price || product?.sale_price || product?.price || 0
        };
      });
    } catch (e) {
      console.error('Failed to parse order items:', e.message);
    }

    res.json({
      ...order,
      items,
      notes,
      status_history: statusHistory
    });
  } catch (e) {
    console.error('Admin order fetch error:', e.message);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

router.put('/admin/orders/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const { status, payment_status, tracking_number, carrier } = req.body;
    const safeStatus = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status) ? status : undefined;
    const safePaymentStatus = ['pending', 'paid', 'refunded', 'failed'].includes(payment_status) ? payment_status : undefined;

    // Get current order for history and notifications
    const currentOrder = db.prepare('SELECT status, user_id FROM orders WHERE id = ?').get(id);

    if (safeStatus && currentOrder && currentOrder.status !== safeStatus) {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(safeStatus, id);

      // Record status change in history
      db.prepare('INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, ?, ?)')
        .run(id, safeStatus, req.user.id);

      // Update timestamp fields + tracking info + notifications
      if (safeStatus === 'shipped') {
        const safeTracking = tracking_number ? tracking_number.trim() : null;
        const safeCarrier = carrier ? carrier.trim() : null;
        db.prepare('UPDATE orders SET shipped_at = CURRENT_TIMESTAMP, tracking_number = COALESCE(?, tracking_number), carrier = COALESCE(?, carrier) WHERE id = ?')
          .run(safeTracking, safeCarrier, id);
        // Notify customer
        const trackingMsg = safeTracking ? ` Tracking: ${safeCarrier ? safeCarrier + ' ' : ''}${safeTracking}` : '';
        db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)')
          .run(currentOrder.user_id, 'order_update', 'Order Shipped', `Your order #${id} has been shipped!${trackingMsg}`);
        // Fire-and-forget shipping email
        const shippedUser = db.prepare('SELECT email, name FROM users WHERE id = ?').get(currentOrder.user_id);
        if (shippedUser) {
          emailService.sendShippingUpdate(shippedUser.email, {
            customerName: shippedUser.name,
            orderNumber: id,
            trackingNumber: safeTracking,
            carrier: safeCarrier
          }).catch(err => console.error('Shipping email failed:', err.message));
        }
      } else if (safeStatus === 'delivered') {
        db.prepare('UPDATE orders SET delivered_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        // Notify customer
        db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)')
          .run(currentOrder.user_id, 'order_update', 'Order Delivered', `Your order #${id} has been delivered. Thank you for shopping with Silvera!`);
        // Fire-and-forget delivery email
        const deliveredUser = db.prepare('SELECT email, name FROM users WHERE id = ?').get(currentOrder.user_id);
        if (deliveredUser) {
          emailService.sendDeliveryConfirmation(deliveredUser.email, {
            customerName: deliveredUser.name,
            orderNumber: id
          }).catch(err => console.error('Delivery email failed:', err.message));
        }
      }
    }
    // Save tracking/carrier even without status change
    if (tracking_number && (!safeStatus || safeStatus !== 'shipped')) {
      db.prepare('UPDATE orders SET tracking_number = ? WHERE id = ?').run(tracking_number.trim(), id);
    }
    if (carrier && (!safeStatus || safeStatus !== 'shipped')) {
      db.prepare('UPDATE orders SET carrier = ? WHERE id = ?').run(carrier.trim(), id);
    }
    if (safePaymentStatus) {
      db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(safePaymentStatus, id);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Update tracking number
router.put('/admin/orders/:id/tracking', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const { tracking_number, carrier } = req.body;
    if (!tracking_number || typeof tracking_number !== 'string') {
      return res.status(400).json({ error: 'Tracking number required' });
    }

    const safeCarrier = carrier ? carrier.trim() : null;
    db.prepare('UPDATE orders SET tracking_number = ?, carrier = COALESCE(?, carrier) WHERE id = ?')
      .run(tracking_number.trim(), safeCarrier, id);

    // Add note about tracking number update
    const carrierNote = safeCarrier ? ` (${safeCarrier})` : '';
    db.prepare('INSERT INTO order_notes (order_id, admin_id, note) VALUES (?, ?, ?)')
      .run(id, req.user.id, `Tracking number added: ${tracking_number.trim()}${carrierNote}`);

    res.json({ success: true, tracking_number: tracking_number.trim(), carrier: safeCarrier });
  } catch (e) {
    console.error('Update tracking error:', e.message);
    res.status(500).json({ error: 'Failed to update tracking number' });
  }
});

// Add order note
router.post('/admin/orders/:id/notes', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const { note } = req.body;
    if (!note || typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({ error: 'Note content required' });
    }

    const result = db.prepare('INSERT INTO order_notes (order_id, admin_id, note) VALUES (?, ?, ?)')
      .run(id, req.user.id, note.trim());

    const newNote = db.prepare(`
      SELECT n.*, u.name as admin_name
      FROM order_notes n
      LEFT JOIN users u ON n.admin_id = u.id
      WHERE n.id = ?
    `).get(result.lastInsertRowid);

    res.json(newNote);
  } catch (e) {
    console.error('Add note error:', e.message);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// ==================== ADMIN RETURNS ====================

// List all returns
router.get('/admin/returns', auth, adminOnly, (req, res) => {
  try {
    const returns = db.prepare(`
      SELECT r.*, o.total as order_total, o.status as order_status, o.payment_status as order_payment_status,
             u.name as customer_name, u.email as customer_email
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(returns);
  } catch (e) {
    console.error('Admin returns fetch error:', e.message);
    res.status(500).json({ error: 'Failed to fetch returns' });
  }
});

// Process a return (approve/reject)
router.put('/admin/returns/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid return ID' });
    }

    const { status, admin_notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const returnReq = db.prepare('SELECT * FROM returns WHERE id = ?').get(id);
    if (!returnReq) {
      return res.status(404).json({ error: 'Return request not found' });
    }
    if (returnReq.status !== 'pending') {
      return res.status(400).json({ error: 'Return has already been processed' });
    }

    const newStatus = status === 'approved' ? 'approved' : 'rejected';
    db.prepare('UPDATE returns SET status = ?, admin_notes = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newStatus, admin_notes || null, id);

    if (status === 'approved') {
      // Update order: set payment_status to refunded and status to cancelled
      db.prepare('UPDATE orders SET payment_status = ?, status = ? WHERE id = ?')
        .run('refunded', 'cancelled', returnReq.order_id);
      db.prepare('INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, ?, ?)')
        .run(returnReq.order_id, 'cancelled', req.user.id);

      // Restore stock
      try {
        const order = db.prepare('SELECT items FROM orders WHERE id = ?').get(returnReq.order_id);
        if (order) {
          const items = JSON.parse(order.items || '[]');
          const restoreStmt = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
          for (const item of items) {
            restoreStmt.run(item.quantity, item.product_id);
          }
        }
      } catch (restoreErr) {
        console.error('Stock restore on return error:', restoreErr.message);
      }

      // Notify customer of approval
      db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)')
        .run(returnReq.user_id, 'return_update', 'Return Approved', `Your return for order #${returnReq.order_id} has been approved. Refund of ₱${returnReq.refund_amount?.toLocaleString() || '0'} will be processed.`);
    } else {
      // Notify customer of rejection
      const noteMsg = admin_notes ? ` Reason: ${admin_notes}` : '';
      db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)')
        .run(returnReq.user_id, 'return_update', 'Return Rejected', `Your return for order #${returnReq.order_id} has been rejected.${noteMsg}`);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Process return error:', e.message);
    res.status(500).json({ error: 'Failed to process return' });
  }
});

module.exports = router;
