/**
 * Payment Gateway Service for Silvera V2
 * Handles DirectPay integration for Philippine payments
 */

const crypto = require('crypto');
const axios = require('axios');

class PaymentGateway {
  constructor() {
    this.baseUrl = process.env.DIRECTPAY_BASE_URL || 'https://sandbox.directpayph.com/api';
    this.username = process.env.DIRECTPAY_USERNAME;
    this.password = process.env.DIRECTPAY_PASSWORD;
    this.merchantId = process.env.DIRECTPAY_MERCHANT_ID;
    this.merchantKey = process.env.DIRECTPAY_MERCHANT_KEY;
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Get CSRF Token from DirectPay
   */
  async getCsrfToken() {
    try {
      const response = await axios.get(`${this.baseUrl}/csrf_token`);
      return response.data.csrf_token;
    } catch (error) {
      console.error('Error getting CSRF token:', error.message);
      return null;
    }
  }

  /**
   * Login to DirectPay and get auth token
   */
  async login() {
    try {
      // Check if we have a valid token
      if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.token;
      }

      const csrfToken = await this.getCsrfToken();
      if (!csrfToken) {
        throw new Error('Failed to get CSRF token');
      }

      const response = await axios.post(`${this.baseUrl}/create/login`, {
        username: this.username,
        password: this.password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken
        }
      });

      if (response.data.status === 'success') {
        this.token = response.data.data.token;
        this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000); // 23 hours
        console.log('✅ DirectPay login successful');
        return this.token;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('DirectPay login error:', error.message);
      return null;
    }
  }

  /**
   * Generate payment reference ID
   */
  generatePaymentRef(orderId) {
    const timestamp = Date.now();
    return `SILVERA-${timestamp}-${orderId}`;
  }

  /**
   * Create Cash-In Payment via DirectPay
   */
  async createPayment(data) {
    try {
      const {
        orderId,
        amount,
        redirectUrl,
        webhookUrl
      } = data;

      if (!orderId || !amount) {
        throw new Error('Missing required payment data');
      }

      if (amount < 100) {
        throw new Error('Minimum amount is ₱100');
      }

      const token = await this.login();
      if (!token) {
        throw new Error('Failed to authenticate with DirectPay');
      }

      const paymentRef = this.generatePaymentRef(orderId);

      const response = await axios.post(`${this.baseUrl}/pay_cashin`, {
        amount: parseFloat(amount),
        webhook: webhookUrl || `${process.env.APP_URL || 'https://silvera.innoserver.cloud'}/api/payments/webhook`,
        redirectUrl: redirectUrl || `${process.env.APP_URL || 'https://silvera.innoserver.cloud'}/checkout/success`,
        merchantpaymentreferences: paymentRef
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.status === 'success') {
        console.log(`✅ DirectPay payment created: ${response.data.transactionId}`);
        return {
          success: true,
          paymentRef: paymentRef,
          transactionId: response.data.transactionId,
          paymentUrl: response.data.link,
          qrData: response.data.qrphraw,
          amount: parseFloat(amount),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };
      } else {
        throw new Error(response.data.message || 'Payment creation failed');
      }
    } catch (error) {
      console.error('Error creating DirectPay payment:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check Payment Status
   */
  async checkPaymentStatus(transactionId) {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Failed to authenticate with DirectPay');
      }

      const response = await axios.get(
        `${this.baseUrl}/cashin_transactions_status/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        const statusMap = {
          'COMPLETED': 'paid',
          'SUCCESS': 'paid',
          'PENDING': 'pending',
          'FAILED': 'failed',
          'CANCELLED': 'failed',
          'EXPIRED': 'failed'
        };

        return {
          success: true,
          transactionId: response.data.reference_number,
          status: statusMap[response.data.transaction_status] || 'pending',
          amount: response.data.total_amount
        };
      }

      return {
        success: false,
        error: 'Failed to get status'
      };
    } catch (error) {
      console.error('Error checking payment status:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get Account Balance
   */
  async getBalance() {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Failed to authenticate with DirectPay');
      }

      const response = await axios.get(`${this.baseUrl}/user/info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.status === 'success') {
        return {
          success: true,
          balance: parseFloat(response.data.data.wallet_funds),
          username: response.data.data.username
        };
      }

      return {
        success: false,
        error: 'Failed to get balance'
      };
    } catch (error) {
      console.error('Error getting balance:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify Webhook Signature
   */
  verifyWebhookSignature(payload, signature) {
    try {
      if (!this.merchantKey) {
        console.warn('⚠️ DIRECTPAY_MERCHANT_KEY not configured');
        return true; // Skip verification if no key
      }

      const dataString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', this.merchantKey)
        .update(dataString)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error.message);
      return false;
    }
  }

  /**
   * Process Webhook from DirectPay
   */
  processWebhook(webhookData) {
    try {
      const {
        reference_number,
        transaction_status,
        total_amount,
        merchantpaymentreferences
      } = webhookData;

      console.log(`🔔 DirectPay webhook: ${reference_number} - ${transaction_status}`);

      const statusMap = {
        'COMPLETED': 'paid',
        'SUCCESS': 'paid',
        'PENDING': 'pending',
        'FAILED': 'failed',
        'CANCELLED': 'failed'
      };

      return {
        success: true,
        transactionId: reference_number,
        paymentRef: merchantpaymentreferences,
        status: statusMap[transaction_status] || 'pending',
        amount: total_amount
      };
    } catch (error) {
      console.error('Error processing webhook:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate payment amount against method limits
   */
  validatePaymentAmount(amount, paymentMethod) {
    const num = parseFloat(amount);
    if (!num || num <= 0) return { valid: false, error: 'Invalid amount' };

    const methods = this.getSupportedPaymentMethods();
    const allMethods = [...methods.qrph, ...methods.banks];
    const method = allMethods.find(m => m.id === paymentMethod);

    if (!method) {
      // Unknown method — allow it (COD etc.)
      return { valid: true };
    }
    if (num < method.min) return { valid: false, error: `Minimum amount for ${method.name} is ₱${method.min}` };
    if (num > method.max) return { valid: false, error: `Maximum amount for ${method.name} is ₱${method.max.toLocaleString()}` };
    return { valid: true };
  }

  /**
   * Format amount as PHP currency string
   */
  formatAmount(amount) {
    return `₱${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }

  /**
   * Create QRPH payment (delegates to createPayment)
   */
  async createQRPHPayment(data) {
    return this.createPayment(data);
  }

  /**
   * Get Supported Payment Methods
   */
  getSupportedPaymentMethods() {
    return {
      qrph: [
        { id: 'gcash', name: 'GCash', icon: 'gcash.webp', min: 100, max: 100000 },
        { id: 'maya', name: 'Maya', icon: 'maya.webp', min: 100, max: 50000 },
        { id: 'grabpay', name: 'GrabPay', icon: 'grabpay.webp', min: 100, max: 50000 }
      ],
      banks: [
        { id: 'bdo', name: 'BDO', icon: 'bdo.webp', min: 100, max: 999999 },
        { id: 'bpi', name: 'BPI', icon: 'bpi.webp', min: 100, max: 999999 },
        { id: 'unionbank', name: 'UnionBank', icon: 'unionbank.webp', min: 100, max: 999999 }
      ]
    };
  }

  /**
   * Check Service Status
   */
  getStatus() {
    return {
      baseUrl: this.baseUrl,
      merchantId: this.merchantId ? '✓ configured' : '✗ not set',
      merchantKey: this.merchantKey ? '✓ configured' : '✗ not set',
      username: this.username ? '✓ configured' : '✗ not set',
      authenticated: !!this.token,
      ready: !!(this.username && this.password && this.merchantId)
    };
  }
}

// Create singleton instance
const paymentGateway = new PaymentGateway();

module.exports = paymentGateway;
