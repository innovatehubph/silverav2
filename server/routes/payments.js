const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');
const paymentGateway = require('../services/payment-gateway');
const { verifyPaymentSignature, logWebhook, isDuplicateWebhook, sendOrderConfirmationEmail } = require('../helpers/payments');
const { sendTelegramAlert } = require('../helpers/notifications');

// Get supported payment methods (e-wallets and banks)
router.get('/payments/methods', (req, res) => {
  try {
    const methods = {
      ewallets_local: [
        { id: 'gcash', name: 'GCash', icon: 'assets/images/payment/gcash.webp', type: 'local', min: 100, max: 100000 },
        { id: 'paymaya', name: 'PayMaya', icon: 'assets/images/payment/paymaya.webp', type: 'local', min: 100, max: 50000 },
        { id: 'paypal_local', name: 'PayPal Philippines', icon: 'assets/images/payment/paypal.webp', type: 'local', min: 100, max: 100000 }
      ],
      ewallets_international: [
        { id: 'paypal', name: 'PayPal', icon: 'assets/images/payment/paypal.webp', type: 'international', min: 100, max: 100000 },
        { id: 'apple_pay', name: 'Apple Pay', icon: 'assets/images/payment/apple-pay.webp', type: 'international', min: 100, max: 100000 },
        { id: 'google_pay', name: 'Google Pay', icon: 'assets/images/payment/google-pay.webp', type: 'international', min: 100, max: 100000 }
      ],
      banks_local: [
        { id: 'bdo', name: 'BDO', icon: 'assets/images/payment/bdo.webp', type: 'local', min: 100, max: 999999 },
        { id: 'bpi', name: 'BPI', icon: 'assets/images/payment/bpi.webp', type: 'local', min: 100, max: 999999 },
        { id: 'metrobank', name: 'Metrobank', icon: 'assets/images/payment/metrobank.webp', type: 'local', min: 100, max: 999999 },
        { id: 'unionbank', name: 'UnionBank', icon: 'assets/images/payment/unionbank.webp', type: 'local', min: 100, max: 999999 },
        { id: 'security_bank', name: 'Security Bank', icon: 'assets/images/payment/securitybank.webp', type: 'local', min: 100, max: 999999 }
      ],
      banks_international: [
        { id: 'visa', name: 'Visa', icon: 'assets/images/payment/visa-2.webp', type: 'international', min: 100, max: 999999 },
        { id: 'mastercard', name: 'Mastercard', icon: 'assets/images/payment/mastercard.webp', type: 'international', min: 100, max: 999999 },
        { id: 'amex', name: 'American Express', icon: 'assets/images/payment/amex.webp', type: 'international', min: 100, max: 999999 }
      ]
    };
    res.json(methods);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Validate payment amount for selected method
router.post('/payments/validate', (req, res) => {
  try {
    const { amount, payment_method } = req.body;

    if (!amount || !payment_method) {
      return res.status(400).json({ error: 'Amount and payment method required' });
    }

    const validation = paymentGateway.validatePaymentAmount(
      parseFloat(amount),
      payment_method
    );

    if (validation.valid) {
      res.json({
        valid: true,
        amount: parseFloat(amount),
        formatted: paymentGateway.formatAmount(amount),
        payment_method: payment_method
      });
    } else {
      res.status(400).json({
        valid: false,
        error: validation.error
      });
    }
  } catch (e) {
    console.error('Payment validation error:', e.message);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Create QRPH payment via DirectPay
router.post('/payments/qrph/create', auth, async (req, res) => {
  try {
    const { order_id, payment_method, payment_type } = req.body;

    if (!order_id || !payment_method || !payment_type) {
      return res.status(400).json({ error: 'Missing required fields: order_id, payment_method, payment_type' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, req.user.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Validate payment amount for selected method
    const validation = paymentGateway.validatePaymentAmount(order.total, payment_method);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Create payment via payment gateway
    const baseUrl = process.env.APP_BASE_URL || 'https://silvera.innoserver.cloud';
    const paymentResult = await paymentGateway.createQRPHPayment({
      orderId: order_id,
      amount: order.total,
      currency: 'PHP',
      paymentMethod: payment_method,
      customerEmail: req.user.email,
      customerName: req.user.name || 'Valued Customer',
      redirectUrl: `${baseUrl}/payment-completed.html`,
      webhookUrl: `${baseUrl}/api/payments/webhook`
    });

    if (!paymentResult.success) {
      return res.status(400).json({ error: paymentResult.error });
    }

    // Update order with payment details
    db.prepare(`
      UPDATE orders
      SET payment_ref = ?, payment_method = ?, payment_status = ?
      WHERE id = ?
    `).run(paymentResult.paymentRef, payment_method, 'pending', order_id);

    console.log(`✅ QRPH Payment created for order #${order_id} - Ref: ${paymentResult.paymentRef}`);

    res.json({
      success: true,
      payment_ref: paymentResult.paymentRef,
      amount: order.total,
      formatted_amount: paymentGateway.formatAmount(order.total),
      payment_method: payment_method,
      payment_type: payment_type,
      checkout_url: paymentResult.paymentUrl,
      qr_code: `${paymentGateway.baseUrl}/qr/${paymentResult.paymentRef}`,
      redirect_url: `${baseUrl}/payment-completed.html?ref=${paymentResult.paymentRef}`,
      status: 'pending',
      expires_at: paymentResult.expiresAt.toISOString()
    });
  } catch (e) {
    console.error('QRPH Payment creation error:', e.message);
    res.status(500).json({ error: 'Failed to create QRPH payment' });
  }
});

// Check payment status
router.get('/payments/:paymentRef/status', auth, (req, res) => {
  try {
    const paymentRef = req.params.paymentRef;
    const order = db.prepare('SELECT id, payment_status, total FROM orders WHERE payment_ref = ? AND user_id = ?').get(paymentRef, req.user.id);

    if (!order) return res.status(404).json({ error: 'Payment not found' });

    res.json({
      payment_ref: paymentRef,
      status: order.payment_status,
      amount: order.total
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// DirectPay Callback Handler (called when user returns from payment)
router.post('/payments/callback', async (req, res) => {
  const logData = { source: 'callback', raw_payload: req.body };
  try {
    const { ref, status, amount, signature, timestamp } = req.body;

    if (!ref || !status) {
      logWebhook({ ...logData, event_type: 'invalid', response_code: 400, error_message: 'Missing ref or status' });
      return res.status(400).json({ error: 'Invalid callback data' });
    }

    logData.payment_ref = ref;
    logData.status = status;
    logData.amount = amount;

    // Verify signature for callback
    const callbackTimestamp = timestamp || Date.now();
    const sigValid = verifyPaymentSignature({ payment_ref: ref, status, amount, timestamp: callbackTimestamp }, signature);
    logData.signature_valid = sigValid;

    if (!sigValid) {
      logWebhook({ ...logData, event_type: 'signature_fail', response_code: 401, error_message: 'Invalid signature' });
      sendTelegramAlert(`⚠️ *Silvera Webhook Alert*\nInvalid callback signature\nRef: \`${ref}\`\nStatus: ${status}`).catch(() => {});
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check for duplicate
    if (isDuplicateWebhook(ref, status)) {
      logWebhook({ ...logData, event_type: 'callback', duplicate: true, processed: false, response_code: 200 });
      return res.json({ success: true, message: 'Duplicate callback ignored', payment_ref: ref, status });
    }

    // Update order based on payment status
    if (status === 'success' || status === 'completed' || status === 'paid') {
      const result = db.prepare('UPDATE orders SET payment_status = ?, status = ? WHERE payment_ref = ?')
        .run('paid', 'processing', ref);

      if (result.changes > 0) {
        const order = db.prepare('SELECT id FROM orders WHERE payment_ref = ?').get(ref);
        if (order) {
          sendOrderConfirmationEmail(order.id).catch(err =>
            console.error('Error sending confirmation email:', err)
          );
        }

        logWebhook({ ...logData, event_type: 'payment_success', processed: true, response_code: 200 });
        res.json({ success: true, message: 'Payment confirmed', payment_ref: ref, status: 'paid' });
      } else {
        logWebhook({ ...logData, event_type: 'order_not_found', processed: false, response_code: 404, error_message: 'Order not found' });
        sendTelegramAlert(`⚠️ *Silvera Webhook Alert*\nCallback for unknown order\nRef: \`${ref}\`\nStatus: ${status}`).catch(() => {});
        res.status(404).json({ error: 'Order not found' });
      }
    } else if (status === 'failed' || status === 'cancelled') {
      db.prepare('UPDATE orders SET payment_status = ? WHERE payment_ref = ?')
        .run('failed', ref);

      logWebhook({ ...logData, event_type: 'payment_failed', processed: true, response_code: 200 });
      sendTelegramAlert(`❌ *Silvera Payment Failed*\nRef: \`${ref}\`\nStatus: ${status}\nAmount: ${amount || 'N/A'}`).catch(() => {});

      res.json({ success: false, message: 'Payment failed or cancelled', payment_ref: ref, status: 'failed' });
    } else if (status === 'pending') {
      logWebhook({ ...logData, event_type: 'payment_pending', processed: true, response_code: 200 });
      res.json({ success: true, message: 'Payment pending', payment_ref: ref, status: 'pending' });
    }
  } catch (e) {
    logWebhook({ ...logData, event_type: 'error', response_code: 500, error_message: e.message, processed: false });
    sendTelegramAlert(`🔴 *Silvera Webhook Error*\nCallback processing failed\nError: ${e.message}`).catch(() => {});
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

// DirectPay Webhook Handler (server-to-server notification)
router.post('/payments/webhook', async (req, res) => {
  const logData = { source: 'webhook', raw_payload: req.body };
  try {
    // Support both DirectPay format and legacy format
    const {
      reference_number,
      transaction_status,
      total_amount,
      merchantpaymentreferences,
      payment_ref: legacyPaymentRef,
      status: legacyStatus,
      amount: legacyAmount,
      timestamp,
      signature
    } = req.body;

    // Normalize to common format
    const payment_ref = merchantpaymentreferences || legacyPaymentRef;
    const status = (transaction_status || legacyStatus || '').toLowerCase();
    const amount = total_amount || legacyAmount;
    const transactionId = reference_number;

    logData.payment_ref = payment_ref;
    logData.transaction_id = transactionId;
    logData.status = status;
    logData.amount = amount;

    if (!payment_ref && !transactionId) {
      logWebhook({ ...logData, event_type: 'invalid', response_code: 400, error_message: 'Missing payment reference' });
      return res.status(400).json({ error: 'Invalid webhook data' });
    }

    // Verify webhook signature
    const sigValid = verifyPaymentSignature({ payment_ref, status, amount, timestamp }, signature);
    logData.signature_valid = sigValid;

    if (!sigValid) {
      logWebhook({ ...logData, event_type: 'signature_fail', response_code: 401, error_message: 'Invalid webhook signature' });
      sendTelegramAlert(`⚠️ *Silvera Webhook Alert*\nInvalid webhook signature\nRef: \`${payment_ref}\`\nTxID: \`${transactionId || 'N/A'}\``).catch(() => {});
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Check for duplicate
    if (isDuplicateWebhook(payment_ref, status)) {
      logWebhook({ ...logData, event_type: 'webhook', duplicate: true, processed: false, response_code: 200 });
      return res.json({ received: true, payment_ref, status: 'duplicate_ignored' });
    }

    // Update order based on payment status
    const successStatuses = ['success', 'completed', 'paid'];
    const failedStatuses = ['failed', 'cancelled', 'expired'];

    if (successStatuses.includes(status)) {
      const result = db.prepare(`
        UPDATE orders SET payment_status = ?, status = ? WHERE payment_ref = ?
      `).run('paid', 'processing', payment_ref);

      if (result.changes > 0) {
        const order = db.prepare('SELECT id FROM orders WHERE payment_ref = ?').get(payment_ref);
        if (order) {
          sendOrderConfirmationEmail(order.id).catch(err =>
            console.error('Error sending confirmation email:', err)
          );
        }
        logWebhook({ ...logData, event_type: 'payment_success', processed: true, response_code: 200 });
      } else {
        logWebhook({ ...logData, event_type: 'order_not_found', processed: false, response_code: 200, error_message: 'No order found for payment_ref' });
        sendTelegramAlert(`⚠️ *Silvera Webhook Alert*\nWebhook for unknown order\nRef: \`${payment_ref}\`\nTxID: \`${transactionId || 'N/A'}\``).catch(() => {});
      }
    } else if (failedStatuses.includes(status)) {
      // Restore stock for failed payment
      const failedOrder = db.prepare('SELECT id, items FROM orders WHERE payment_ref = ?').get(payment_ref);
      if (failedOrder) {
        try {
          const failedItems = JSON.parse(failedOrder.items || '[]');
          const restoreStmt = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
          for (const item of failedItems) {
            restoreStmt.run(item.quantity, item.product_id);
          }
        } catch (restoreErr) {
          console.error('Stock restore error:', restoreErr.message);
        }
      }

      db.prepare(`
        UPDATE orders SET payment_status = ?, status = ? WHERE payment_ref = ?
      `).run('failed', 'cancelled', payment_ref);

      logWebhook({ ...logData, event_type: 'payment_failed', processed: true, response_code: 200 });
      sendTelegramAlert(`❌ *Silvera Payment Failed*\nRef: \`${payment_ref}\`\nTxID: \`${transactionId || 'N/A'}\`\nStatus: ${status}\nAmount: ${amount || 'N/A'}`).catch(() => {});
    } else {
      logWebhook({ ...logData, event_type: `status_${status}`, processed: true, response_code: 200 });
    }

    // Always respond with 200 to acknowledge receipt
    res.json({ received: true, payment_ref, status: 'processed' });
  } catch (e) {
    logWebhook({ ...logData, event_type: 'error', response_code: 200, error_message: e.message, processed: false });
    sendTelegramAlert(`🔴 *Silvera Webhook Error*\nWebhook processing failed\nError: ${e.message}`).catch(() => {});
    res.status(200).json({ received: true, error: e.message }); // Return 200 to prevent retries
  }
});

// Legacy payment create endpoint
router.post('/payments/create', auth, (req, res) => {
  try {
    const order_id = parseInt(req.body.order_id);
    if (!Number.isInteger(order_id) || order_id < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // NexusPay integration placeholder
    const paymentRef = `PAY-${Date.now()}-${order_id}`;
    db.prepare('UPDATE orders SET payment_ref = ? WHERE id = ?').run(paymentRef, order_id);

    res.json({
      payment_ref: paymentRef,
      amount: order.total,
      checkout_url: `https://directpay.innovatehub.ph/checkout/${paymentRef}`,
      status: 'pending'
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

module.exports = router;
