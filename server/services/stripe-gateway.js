/**
 * Stripe Payment Gateway Service for Silvera V2
 * Handles Stripe PaymentIntent creation and webhook verification
 */

class StripeGateway {
  constructor() {
    this.stripe = null;
    this.secretKey = null;
    this.webhookSecret = null;
  }

  /**
   * Lazy-initialize Stripe SDK so the server starts even without keys
   */
  _init() {
    if (this.stripe) return this.stripe;

    this.secretKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!this.secretKey) {
      console.warn('⚠️  STRIPE_SECRET_KEY not configured — Stripe payments disabled');
      return null;
    }

    this.stripe = require('stripe')(this.secretKey);
    console.log('✅ Stripe SDK initialized');
    return this.stripe;
  }

  /**
   * Create a PaymentIntent for an order
   * @param {Object} params
   * @param {number} params.orderId
   * @param {number} params.amount - Amount in PHP (pesos, e.g. 1500.50)
   * @param {string} params.customerEmail
   * @returns {Promise<Object>} PaymentIntent details
   */
  async createPaymentIntent({ orderId, amount, customerEmail }) {
    const stripe = this._init();
    if (!stripe) {
      return { success: false, error: 'Stripe is not configured' };
    }

    try {
      // Convert PHP pesos to centavos (Stripe expects smallest currency unit)
      const amountInCentavos = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCentavos,
        currency: 'php',
        metadata: {
          order_id: String(orderId),
          platform: 'silvera',
        },
        receipt_email: customerEmail || undefined,
        automatic_payment_methods: { enabled: true },
      });

      console.log(`✅ Stripe PaymentIntent created for order #${orderId}: ${paymentIntent.id}`);

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: amountInCentavos,
      };
    } catch (error) {
      console.error('Stripe PaymentIntent creation error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify and construct a Stripe webhook event
   * @param {Buffer} rawBody - Raw request body
   * @param {string} signature - Stripe-Signature header value
   * @returns {Object} Constructed event or error
   */
  constructWebhookEvent(rawBody, signature) {
    const stripe = this._init();
    if (!stripe) {
      return { success: false, error: 'Stripe is not configured' };
    }

    if (!this.webhookSecret) {
      console.warn('⚠️  STRIPE_WEBHOOK_SECRET not configured — cannot verify webhook');
      return { success: false, error: 'Webhook secret not configured' };
    }

    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
      return { success: true, event };
    } catch (error) {
      console.error('Stripe webhook verification failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Health check / status info
   */
  getStatus() {
    return {
      secretKey: this.secretKey ? '✓ configured' : '✗ not set',
      webhookSecret: this.webhookSecret ? '✓ configured' : '✗ not set',
      initialized: !!this.stripe,
      ready: !!this.secretKey,
    };
  }
}

// Singleton
const stripeGateway = new StripeGateway();
module.exports = stripeGateway;
