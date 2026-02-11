# Payment Webhook Integration Documentation

**Project**: Silvera V2 E-Commerce Platform
**Payment Gateway**: NexusPay / DirectPay
**Version**: 2.0.2
**Last Updated**: February 11, 2026

---

## Overview

Silvera V2 integrates with NexusPay/DirectPay payment gateway using secure webhook callbacks to process payment confirmations. This document provides complete technical details for the webhook integration.

---

## Webhook Endpoints

### 1. Payment Webhook (Server-to-Server)

**Endpoint**: `POST /api/payments/webhook`
**Purpose**: Receives server-to-server payment notifications from NexusPay
**Authentication**: HMAC-SHA256 signature verification

#### Request Payload

```json
{
  "payment_ref": "PAY-1234567890-123",
  "status": "paid",
  "amount": "5000.00",
  "timestamp": 1770796195426,
  "signature": "a7d8f0716bed40b2b511aad21de41c992c286cebdd3e20ed25997dba4e5cf527"
}
```

#### Payload Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payment_ref` | string | ✅ | Unique payment reference ID |
| `status` | string | ✅ | Payment status: `paid`, `failed`, `cancelled`, `pending` |
| `amount` | string | ✅ | Payment amount (formatted as string) |
| `timestamp` | number | ✅ | Unix timestamp (milliseconds) |
| `signature` | string | ✅ | HMAC-SHA256 signature for verification |

#### Response

**Success (200 OK)**:
```json
{
  "received": true,
  "payment_ref": "PAY-1234567890-123",
  "status": "processed"
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "Invalid webhook data"
}
```

**Error (401 Unauthorized)**:
```json
{
  "error": "Invalid webhook signature"
}
```

---

### 2. Payment Callback (User Return)

**Endpoint**: `POST /api/payments/callback`
**Purpose**: Handles user redirect after payment completion
**Authentication**: HMAC-SHA256 signature verification

#### Request Payload

```json
{
  "ref": "PAY-1234567890-123",
  "status": "paid",
  "amount": "5000.00",
  "timestamp": 1770796195426,
  "signature": "a7d8f0716bed40b2b511aad21de41c992c286cebdd3e20ed25997dba4e5cf527"
}
```

#### Response

**Success**:
```json
{
  "success": true,
  "message": "Payment confirmed",
  "payment_ref": "PAY-1234567890-123",
  "status": "paid"
}
```

**Failed Payment**:
```json
{
  "success": false,
  "message": "Payment failed or cancelled",
  "payment_ref": "PAY-1234567890-123",
  "status": "failed"
}
```

---

## Security Implementation

### Signature Verification

All webhook requests are verified using HMAC-SHA256 signatures to prevent fraud and ensure authenticity.

#### Signature Generation Algorithm

```javascript
const crypto = require('crypto');

function generateSignature(payload, secretKey) {
  const signatureData = `${payload.payment_ref}:${payload.status}:${payload.amount}:${payload.timestamp}`;
  return crypto
    .createHmac('sha256', secretKey)
    .update(signatureData)
    .digest('hex');
}
```

#### Verification Process

1. Extract signature from webhook payload
2. Reconstruct signature data string: `payment_ref:status:amount:timestamp`
3. Generate expected signature using `NEXUSPAY_KEY`
4. Compare received signature with expected signature
5. Reject request if signatures don't match

#### Code Implementation

```javascript
function verifyPaymentSignature(payload, receivedSignature) {
  const NEXUSPAY_KEY = process.env.NEXUSPAY_KEY;

  if (!receivedSignature) {
    return false;
  }

  const signatureData = `${payload.payment_ref}:${payload.status}:${payload.amount}:${payload.timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', NEXUSPAY_KEY)
    .update(signatureData)
    .digest('hex');

  return expectedSignature === receivedSignature;
}
```

---

## Payment Status Flow

### Status Transitions

```
pending → paid → processing → shipped → completed
        ↓
      failed
        ↓
    cancelled
```

### Status Handling Logic

| Webhook Status | Order Payment Status | Order Status | Action |
|----------------|---------------------|--------------|--------|
| `paid`, `success`, `completed` | `paid` | `processing` | ✅ Send confirmation email |
| `failed` | `failed` | `cancelled` | ❌ No email sent |
| `cancelled` | `failed` | `cancelled` | ❌ No email sent |
| `pending` | `pending` | `pending` | ⏳ Wait for final status |

---

## Order Confirmation Email

When a payment is successfully confirmed, the system automatically:

1. ✅ Updates order status to `paid` and `processing`
2. ✅ Sends order confirmation email to customer
3. ✅ Logs payment confirmation

### Email Template Content

- Order number and date
- Itemized product list with quantities and prices
- Total amount paid
- Shipping address
- Payment method (NexusPay)
- Link to order details page

### Email Service Implementation

```javascript
async function sendOrderConfirmationEmail(orderId) {
  const order = db.prepare(`
    SELECT o.*, u.name as customer_name, u.email as customer_email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `).get(orderId);

  await emailService.sendOrderConfirmation(order.customer_email, {
    customerName: order.customer_name,
    orderNumber: order.id,
    orderDate: new Date(order.created_at).toLocaleDateString(),
    total: order.total,
    items: JSON.parse(order.items),
    shippingAddress: JSON.parse(order.shipping_address),
    paymentMethod: 'NexusPay'
  });
}
```

---

## Testing

### Test Environment Setup

**Test Webhook Payload**:
```json
{
  "payment_ref": "TEST-PAY-1770796195426",
  "status": "paid",
  "amount": "5000.00",
  "timestamp": 1770796195426,
  "signature": "a7d8f0716bed40b2b511aad21de41c992c286cebdd3e20ed25997dba4e5cf527"
}
```

### Test Results (February 11, 2026)

#### ✅ Successful Tests

1. **Signature Verification**: ✅ PASSED
   - Valid signatures accepted
   - Invalid signatures rejected (401 Unauthorized)
   - Missing signatures rejected

2. **Webhook Reception**: ✅ PASSED
   - HTTP 200 response returned
   - Webhook data parsed correctly
   - Payment reference extracted properly

3. **Order Status Update**: ✅ PASSED
   - Order status updated from `pending` to `paid`
   - Order state changed to `processing`
   - Database updates completed successfully

4. **Email Notification**: ✅ PASSED
   - Order confirmation emails sent successfully
   - HTML template rendered correctly
   - Customer details included accurately

#### Test Commands

```bash
# Generate valid signature
node -e "
const crypto = require('crypto');
const NEXUSPAY_KEY = 'your-key-here';
const payment_ref = 'TEST-PAY-' + Date.now();
const status = 'paid';
const amount = '5000.00';
const timestamp = Date.now();
const signatureData = \`\${payment_ref}:\${status}:\${amount}:\${timestamp}\`;
const signature = crypto.createHmac('sha256', NEXUSPAY_KEY).update(signatureData).digest('hex');
console.log(JSON.stringify({ payment_ref, status, amount, timestamp, signature }, null, 2));
"

# Send test webhook
curl -X POST https://silvera.innoserver.cloud/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "payment_ref": "TEST-PAY-1770796195426",
    "status": "paid",
    "amount": "5000.00",
    "timestamp": 1770796195426,
    "signature": "a7d8f0716bed40b2b511aad21de41c992c286cebdd3e20ed25997dba4e5cf527"
  }'
```

---

## Environment Configuration

### Required Environment Variables

```env
# NexusPay Configuration
NEXUSPAY_BASE_URL=https://nexuspay.cloud/api
NEXUSPAY_USERNAME=your-username
NEXUSPAY_PASSWORD=your-password
NEXUSPAY_MERCHANT_ID=your-merchant-id
NEXUSPAY_KEY=your-secret-key

# SMTP Email Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=admin@innovatehub.ph
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@silvera.ph
```

---

## Error Handling

### Common Error Scenarios

#### 1. Invalid Signature
**Status**: 401 Unauthorized
**Cause**: Signature mismatch or missing signature
**Resolution**: Verify NEXUSPAY_KEY is correct and signature generation matches specification

#### 2. Missing Payment Reference
**Status**: 400 Bad Request
**Cause**: `payment_ref` not provided in webhook
**Resolution**: Ensure NexusPay is sending complete webhook data

#### 3. Order Not Found
**Status**: 404 Not Found (callback only)
**Cause**: Payment reference doesn't match any order
**Resolution**: Verify order was created before payment attempt

#### 4. Database Error
**Status**: 500 Internal Server Error
**Cause**: Database query failed
**Resolution**: Check database connection and schema

### Logging

All webhook events are logged with the following information:

```javascript
// Success log
console.log(`✅ [Webhook Confirmed] Payment: ${payment_ref}`);

// Error log
console.error(`❌ [Webhook Error] ${error.message}`);

// Signature verification log
console.log('✅ Webhook signature verified');
```

---

## Integration Checklist

- [x] Webhook endpoint implemented (`/api/payments/webhook`)
- [x] Callback endpoint implemented (`/api/payments/callback`)
- [x] HMAC-SHA256 signature verification
- [x] Order status update on payment success
- [x] Order confirmation email system
- [x] Error handling and logging
- [x] Database schema with `updated_at` column
- [x] Security headers (Helmet.js)
- [x] HTTPS enforcement
- [ ] Webhook retry mechanism (recommended)
- [ ] Webhook event logging to database (recommended)
- [ ] Refund processing endpoint (future)

---

## Production Deployment

### Pre-Launch Checklist

- ✅ Webhook signature verification tested
- ✅ Test payments processed successfully
- ✅ Email notifications working
- ✅ Error handling in place
- ⚠️  Webhook URL configured in NexusPay dashboard
- ⚠️  SSL certificate valid for webhook endpoint
- ⚠️  Monitoring and alerting set up

### Monitoring Recommendations

1. **Track webhook success rate**: Should be >99%
2. **Monitor email delivery**: Check SMTP logs
3. **Alert on signature failures**: May indicate attack or configuration issue
4. **Log all payment state changes**: For audit trail

---

## Support & Troubleshooting

### Debug Mode

Enable detailed logging by checking service logs:

```bash
# View recent webhook logs
docker service logs app-hack-back-end-feed-k88xup --tail 100 | grep -i webhook

# Check payment confirmation logs
docker service logs app-hack-back-end-feed-k88xup --tail 100 | grep -i payment
```

### Contact Information

**Technical Support**: development-team@silvera.ph
**Payment Gateway Support**: NexusPay Technical Support
**Documentation**: https://silvera.innoserver.cloud/docs (coming soon)

---

## Changelog

### Version 2.0.2 (February 11, 2026)
- ✅ Added HMAC-SHA256 signature verification
- ✅ Implemented order confirmation email system
- ✅ Added database schema `updated_at` column
- ✅ Enhanced error handling and logging
- ✅ Added security headers with Helmet.js

### Version 2.0.1 (Initial)
- Basic webhook framework
- No signature verification
- Manual order status updates

---

**End of Documentation**
