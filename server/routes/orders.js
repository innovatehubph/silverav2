const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');
const { sanitizeString } = require('../helpers/validators');
const { checkAndNotifyLowStock } = require('../helpers/notifications');
const { sendOrderConfirmationEmail } = require('../helpers/payments');

router.get('/orders', auth, (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/orders/:id', auth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(id, req.user.id);
    order ? res.json(order) : res.status(404).json({ error: 'Order not found' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

router.post('/orders', auth, (req, res) => {
  try {
    // Support multiple payload shapes for compatibility with different frontends
    // shipping address may come as: shipping_address, shippingAddress, shipping, or address
    let rawShipping = req.body.shipping_address
      || req.body.shippingAddress
      || req.body.shipping
      || req.body.address;

    if (typeof rawShipping === 'string') {
      try {
        rawShipping = JSON.parse(rawShipping);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid shipping address format' });
      }
    }

    const shipping_address = rawShipping;

    if (!shipping_address || typeof shipping_address !== 'object') {
      return res.status(400).json({ error: 'Shipping address required' });
    }

    // payment method may come as: payment_method, paymentMethod, payment, or method
    const rawPayment = req.body.payment_method
      || req.body.paymentMethod
      || req.body.payment
      || req.body.method;

    const payment_method = typeof rawPayment === 'string' ? rawPayment : (rawPayment && String(rawPayment));

    if (!payment_method || typeof payment_method !== 'string') {
      return res.status(400).json({ error: 'Payment method required' });
    }

    // Items can either come directly from the request body (preferred)
    // or fall back to the server-side cart for backward compatibility.
    const bodyItems = Array.isArray(req.body.items) ? req.body.items : null;

    let items = [];
    let usedCartTable = false;

    if (bodyItems && bodyItems.length > 0) {
      items = bodyItems;
    } else {
      const cartItems = db.prepare(
        'SELECT c.*, p.price, p.sale_price, p.name FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?'
      ).all(req.user.id);

      if (cartItems.length > 0) {
        items = cartItems;
        usedCartTable = true;
      }
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const total = items.reduce((sum, item) => {
      const price = item.sale_price || item.price || 0;
      const qty = item.quantity || 1;
      return sum + price * qty;
    }, 0);

    let result;

    if (usedCartTable) {
      // Original behavior: use cart table, decrement stock, and clear cart.
      const createOrderWithCart = db.transaction(() => {
        const r = db.prepare(
          'INSERT INTO orders (user_id, total, shipping_address, payment_method, items) VALUES (?, ?, ?, ?, ?)'
        ).run(
          req.user.id,
          total,
          JSON.stringify(shipping_address),
          sanitizeString(payment_method),
          JSON.stringify(items)
        );

        const decrementStmt = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
        for (const item of items) {
          if (item.product_id && item.quantity != null) {
            decrementStmt.run(item.quantity, item.product_id);
          }
        }

        db.prepare('DELETE FROM cart WHERE user_id = ?').run(req.user.id);

        return r;
      });

      result = createOrderWithCart();

      // Check low stock notifications outside the transaction for cart-based orders
      for (const item of items) {
        if (item.product_id) {
          checkAndNotifyLowStock(item.product_id);
        }
      }
    } else {
      // Body-provided items: create order and decrement stock (no cart table to clear).
      const createOrderFromBody = db.transaction(() => {
        const r = db.prepare(
          'INSERT INTO orders (user_id, total, shipping_address, payment_method, items) VALUES (?, ?, ?, ?, ?)'
        ).run(
          req.user.id,
          total,
          JSON.stringify(shipping_address),
          sanitizeString(payment_method),
          JSON.stringify(items)
        );

        const decrementStmt = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
        for (const item of items) {
          if (item.product_id && item.quantity != null) {
            decrementStmt.run(item.quantity, item.product_id);
          }
        }

        return r;
      });

      result = createOrderFromBody();

      for (const item of items) {
        if (item.product_id) {
          checkAndNotifyLowStock(item.product_id);
        }
      }
    }

    res.json({ order_id: result.lastInsertRowid, total });

    // Fire-and-forget order confirmation email for COD orders
    // (Online payment orders get their confirmation email via the payment webhook)
    if (payment_method.toLowerCase() === 'cod') {
      sendOrderConfirmationEmail(result.lastInsertRowid).catch(err =>
        console.error('COD order confirmation email failed:', err.message));
    }
  } catch (e) {
    console.error('Error creating order', e);
    res.status(500).json({ error: 'Failed to create order' });
  }
});


// ==================== RETURN REQUESTS ====================

// Customer: Request a return
router.post('/orders/:id/return', auth, (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (!Number.isInteger(orderId) || orderId < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'Return reason is required' });
    }

    // Verify order ownership
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.user.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check eligibility (delivered, shipped, or processing)
    if (!['delivered', 'shipped', 'processing'].includes(order.status)) {
      return res.status(400).json({ error: 'This order is not eligible for return' });
    }

    // Check for existing pending return
    const existingReturn = db.prepare('SELECT id FROM returns WHERE order_id = ? AND status = ?').get(orderId, 'pending');
    if (existingReturn) {
      return res.status(400).json({ error: 'A return request already exists for this order' });
    }

    const result = db.prepare('INSERT INTO returns (order_id, user_id, reason, refund_amount) VALUES (?, ?, ?, ?)')
      .run(orderId, req.user.id, reason.trim(), order.total);

    // Notify admins
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
    const insertNotif = db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)');
    for (const admin of admins) {
      insertNotif.run(admin.id, 'return_request', 'New Return Request', `Return requested for order #${orderId}`);
    }

    res.json({ id: result.lastInsertRowid, status: 'pending' });
  } catch (e) {
    console.error('Return request error:', e.message);
    res.status(500).json({ error: 'Failed to submit return request' });
  }
});

// Customer: Get return status for an order
router.get('/orders/:id/return', auth, (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (!Number.isInteger(orderId) || orderId < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const returnReq = db.prepare('SELECT * FROM returns WHERE order_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(orderId, req.user.id);

    if (!returnReq) {
      return res.status(404).json({ error: 'No return request found' });
    }

    res.json(returnReq);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch return status' });
  }
});

module.exports = router;
