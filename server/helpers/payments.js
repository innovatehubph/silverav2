const crypto = require('crypto');
const db = require('../db');
const emailService = require('../services/email-service');

function logWebhook({ source, event_type, payment_ref, transaction_id, status, amount, signature_valid, response_code, error_message, raw_payload, processed, duplicate }) {
  try {
    db.prepare(`INSERT INTO webhook_logs (source, event_type, payment_ref, transaction_id, status, amount, signature_valid, response_code, error_message, raw_payload, processed, duplicate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      source || 'unknown', event_type || null, payment_ref || null, transaction_id || null,
      status || null, amount || null, signature_valid ? 1 : 0, response_code || 200,
      error_message || null, raw_payload ? JSON.stringify(raw_payload).slice(0, 4000) : null,
      processed ? 1 : 0, duplicate ? 1 : 0
    );
  } catch (err) {
    console.error('Webhook log insert error:', err.message);
  }
}

function isDuplicateWebhook(payment_ref, status) {
  if (!payment_ref || !status) return false;
  const existing = db.prepare(
    'SELECT id FROM webhook_logs WHERE payment_ref = ? AND status = ? AND processed = 1 AND duplicate = 0 LIMIT 1'
  ).get(payment_ref, status);
  return !!existing;
}

/**
 * Verify NexusPay/DirectPay webhook signature
 * Uses HMAC-SHA256 with DIRECTPAY_MERCHANT_KEY as secret
 */
function verifyPaymentSignature(payload, receivedSignature) {
  try {
    const DIRECTPAY_MERCHANT_KEY = process.env.DIRECTPAY_MERCHANT_KEY;

    if (!DIRECTPAY_MERCHANT_KEY) {
      // In production, reject unsigned webhooks; in dev/test, allow
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ DIRECTPAY_MERCHANT_KEY not configured in production');
        return false;
      }
      console.warn('⚠️  DIRECTPAY_MERCHANT_KEY not configured, skipping signature verification (non-production)');
      return true;
    }

    if (!receivedSignature) {
      console.error('❌ No signature provided in webhook');
      return false;
    }

    // Create signature from payload
    const signatureData = `${payload.payment_ref}:${payload.status}:${payload.amount}:${payload.timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', DIRECTPAY_MERCHANT_KEY)
      .update(signatureData)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const receivedBuf = Buffer.from(receivedSignature, 'hex');
    const isValid = expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf);

    if (!isValid) {
      console.error('❌ Signature mismatch');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error.message);
    return false;
  }
}

/**
 * Send order confirmation email after successful payment
 */
async function sendOrderConfirmationEmail(orderId) {
  try {
    // Fetch order details with items
    const order = db.prepare(`
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `).get(orderId);

    if (!order) {
      console.error('❌ Order not found for confirmation email:', orderId);
      return;
    }

    // Parse order items
    const items = JSON.parse(order.items || '[]');

    // Parse shipping address
    const shippingAddress = JSON.parse(order.shipping_address || '{}');

    // Send confirmation email
    await emailService.sendOrderConfirmation(order.customer_email, {
      customerName: order.customer_name,
      orderNumber: order.id,
      orderDate: new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      total: order.total,
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      shippingAddress: shippingAddress,
      paymentMethod: order.payment_method === 'cod' ? 'Cash on Delivery' : (order.payment_method || 'NexusPay')
    });

    console.log(`✅ Order confirmation email sent for order #${orderId}`);
  } catch (error) {
    console.error(`❌ Failed to send order confirmation email for order #${orderId}:`, error.message);
  }
}

module.exports = { verifyPaymentSignature, logWebhook, isDuplicateWebhook, sendOrderConfirmationEmail };
