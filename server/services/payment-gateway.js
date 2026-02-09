/**
 * Payment Gateway Service for Silvera V2
 * Handles DirectPay/NexusPay/PayGram integration
 * Based on PayVerse and Silvera payment implementations
 */

const crypto = require('crypto');
const axios = require('axios');

class PaymentGateway {
  constructor() {
    this.directPayBaseUrl = process.env.DIRECTPAY_BASE_URL || 'https://directpay.innovatehub.ph';
    this.nexusPayBaseUrl = process.env.NEXUSPAY_BASE_URL || 'https://nexuspay.cloud';
    this.apiKey = process.env.DIRECTPAY_API_KEY;
    this.merchantId = process.env.DIRECTPAY_MERCHANT_ID;
  }

  /**
   * Generate payment reference ID
   */
  generatePaymentRef(orderId) {
    const timestamp = Date.now();
    return `QRPH-${timestamp}-${orderId}`;
  }

  /**
   * Generate payment hash for DirectPay
   */
  generatePaymentHash(data) {
    try {
      const hashString = `${data.amount}|${data.currency}|${data.merchantId}|${data.reference}|${this.apiKey}`;
      return crypto.createHash('sha256').update(hashString).digest('hex');
    } catch (error) {
      console.error('Error generating payment hash:', error.message);
      return null;
    }
  }

  /**
   * Create QRPH Payment via DirectPay
   * Supports E-wallets, Banks, Cards through DirectPay's unified API
   */
  createQRPHPayment(data) {
    try {
      const {
        orderId,
        amount,
        currency = 'PHP',
        paymentMethod,
        customerEmail,
        customerName,
        redirectUrl,
        webhookUrl
      } = data;

      if (!orderId || !amount || !customerEmail) {
        throw new Error('Missing required payment data');
      }

      const paymentRef = this.generatePaymentRef(orderId);

      // DirectPay QRPH Checkout URL
      // This integrates with QRPH standard for Philippine payments
      const checkoutUrl = `${this.directPayBaseUrl}/qrph/checkout`;

      const paymentParams = {
        ref: paymentRef,
        amount: parseFloat(amount),
        currency: currency,
        method: paymentMethod, // GCash, PayMaya, BDO, BPI, etc.
        customer_name: customerName,
        customer_email: customerEmail,
        redirect_url: redirectUrl,
        callback_url: webhookUrl,
        webhook_url: webhookUrl,
        description: `Order #${orderId} - Silvera E-Commerce`
      };

      // Build URL with query parameters
      const queryString = new URLSearchParams(paymentParams).toString();
      const paymentUrl = `${checkoutUrl}?${queryString}`;

      console.log(`✅ QRPH Payment created: ${paymentRef}`);

      return {
        success: true,
        paymentRef: paymentRef,
        paymentUrl: paymentUrl,
        amount: parseFloat(amount),
        currency: currency,
        method: paymentMethod,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
    } catch (error) {
      console.error('Error creating QRPH payment:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify Payment Status with DirectPay
   */
  async verifyPaymentStatus(paymentRef) {
    try {
      if (!paymentRef) {
        throw new Error('Payment reference required');
      }

      // DirectPay Status Check Endpoint
      const statusUrl = `${this.directPayBaseUrl}/api/payment/status`;

      const response = await axios.get(statusUrl, {
        params: {
          ref: paymentRef,
          api_key: this.apiKey
        },
        timeout: 5000
      });

      const data = response.data;

      // Map DirectPay response to standard status
      const statusMap = {
        'success': 'paid',
        'completed': 'paid',
        'paid': 'paid',
        'pending': 'pending',
        'processing': 'pending',
        'failed': 'failed',
        'cancelled': 'failed',
        'expired': 'failed'
      };

      const paymentStatus = statusMap[data.status] || 'pending';

      console.log(`📊 Payment status verified: ${paymentRef} - ${paymentStatus}`);

      return {
        success: true,
        paymentRef: paymentRef,
        status: paymentStatus,
        amount: data.amount,
        currency: data.currency,
        transactionId: data.transaction_id,
        timestamp: data.timestamp
      };
    } catch (error) {
      console.error('Error verifying payment status:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process Payment Callback from DirectPay
   * Called after customer completes payment
   */
  processPaymentCallback(callbackData) {
    try {
      const {
        ref,
        status,
        amount,
        transaction_id,
        signature
      } = callbackData;

      if (!ref || !status) {
        throw new Error('Missing callback data');
      }

      // Verify callback signature (if signature provided)
      if (signature) {
        const expectedSignature = this.generatePaymentHash({
          amount: amount,
          currency: 'PHP',
          merchantId: this.merchantId,
          reference: ref
        });

        if (signature !== expectedSignature) {
          console.warn('Invalid payment callback signature');
          // Continue anyway but log warning
        }
      }

      // Map status
      const statusMap = {
        'success': 'paid',
        'completed': 'paid',
        'failed': 'failed',
        'cancelled': 'failed',
        'pending': 'pending'
      };

      const paymentStatus = statusMap[status] || 'pending';

      console.log(`✅ Payment callback processed: ${ref} - ${paymentStatus}`);

      return {
        success: true,
        paymentRef: ref,
        status: paymentStatus,
        transactionId: transaction_id,
        amount: amount
      };
    } catch (error) {
      console.error('Error processing payment callback:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process Webhook from DirectPay (Server-to-Server)
   * Called asynchronously after payment is complete
   */
  processPaymentWebhook(webhookData) {
    try {
      const {
        ref,
        status,
        amount,
        transaction_id,
        timestamp
      } = webhookData;

      if (!ref || !status) {
        throw new Error('Missing webhook data');
      }

      console.log(`🔔 Payment webhook received: ${ref} - ${status}`);

      // Map status
      const statusMap = {
        'success': 'paid',
        'completed': 'paid',
        'paid': 'paid',
        'failed': 'failed',
        'cancelled': 'failed'
      };

      const paymentStatus = statusMap[status] || 'pending';

      return {
        success: true,
        paymentRef: ref,
        status: paymentStatus,
        transactionId: transaction_id,
        amount: amount,
        timestamp: timestamp
      };
    } catch (error) {
      console.error('Error processing payment webhook:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get Supported Payment Methods
   */
  getSupportedPaymentMethods() {
    return {
      eWallets: [
        { id: 'gcash', name: 'GCash', icon: 'gcash.webp', min: 100, max: 100000 },
        { id: 'paymaya', name: 'PayMaya', icon: 'paymaya.webp', min: 100, max: 50000 },
        { id: 'paypal', name: 'PayPal PH', icon: 'paypal.webp', min: 100, max: 100000 }
      ],
      banks: [
        { id: 'bdo', name: 'BDO Online Banking', icon: 'bdo.webp', min: 100, max: 999999 },
        { id: 'bpi', name: 'BPI Online', icon: 'bpi.webp', min: 100, max: 999999 },
        { id: 'metrobank', name: 'Metrobank Online', icon: 'metrobank.webp', min: 100, max: 999999 },
        { id: 'unionbank', name: 'UnionBank Online', icon: 'unionbank.webp', min: 100, max: 999999 },
        { id: 'securitybank', name: 'Security Bank', icon: 'securitybank.webp', min: 100, max: 999999 }
      ],
      cards: [
        { id: 'visa', name: 'Visa Card', icon: 'visa.webp', min: 100, max: 999999 },
        { id: 'mastercard', name: 'Mastercard', icon: 'mastercard.webp', min: 100, max: 999999 },
        { id: 'amex', name: 'American Express', icon: 'amex.webp', min: 100, max: 999999 }
      ],
      international: [
        { id: 'paypal_intl', name: 'PayPal International', icon: 'paypal.webp', min: 100, max: 100000 },
        { id: 'apple_pay', name: 'Apple Pay', icon: 'applepay.webp', min: 100, max: 100000 },
        { id: 'google_pay', name: 'Google Pay', icon: 'googlepay.webp', min: 100, max: 100000 }
      ]
    };
  }

  /**
   * Validate Payment Amount
   */
  validatePaymentAmount(amount, method) {
    try {
      const methods = this.getSupportedPaymentMethods();

      // Find method in all categories
      for (const category of Object.values(methods)) {
        const methodData = category.find(m => m.id === method);

        if (methodData) {
          if (amount < methodData.min || amount > methodData.max) {
            return {
              valid: false,
              error: `Amount must be between ₱${methodData.min} and ₱${methodData.max}`
            };
          }
          return { valid: true };
        }
      }

      return {
        valid: false,
        error: 'Invalid payment method'
      };
    } catch (error) {
      console.error('Error validating payment amount:', error.message);
      return {
        valid: false,
        error: 'Validation failed'
      };
    }
  }

  /**
   * Format Payment Amount for Display
   */
  formatAmount(amount, currency = 'PHP') {
    if (currency === 'PHP') {
      return `₱${parseFloat(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    }
    return `${currency} ${parseFloat(amount).toFixed(2)}`;
  }

  /**
   * Check Payment Service Status
   */
  getStatus() {
    return {
      directPayUrl: this.directPayBaseUrl,
      merchantId: this.merchantId ? '***' : 'not-set',
      apiKeySet: !!this.apiKey,
      ready: !!(this.apiKey && this.merchantId)
    };
  }
}

// Create singleton instance
const paymentGateway = new PaymentGateway();

module.exports = paymentGateway;
