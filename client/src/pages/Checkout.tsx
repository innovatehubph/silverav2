import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, Shield, CheckCircle, Wallet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore, useAuthStore } from '../stores';
import { ordersApi, paymentsApi } from '../utils/api';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    paymentMethod: 'cod', // cod, card, gcash
  });

  if (items.length === 0) {
    return (
      <div className="container-custom py-16 text-center">
        <div className="w-20 h-20 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-txt-tertiary" />
        </div>
        <h1 className="section-title">Your Cart is Empty</h1>
        <p className="text-txt-secondary mb-6">Add some items to proceed to checkout</p>
        <button onClick={() => navigate('/shop')} className="btn-primary">
          Continue Shopping
        </button>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Step 1: Create the order
      setProcessingStep('Creating order...');
      const orderResponse = await ordersApi.create({
        items: items.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
        shipping_address: `${formData.address}, ${formData.city} ${formData.zipCode}`,
        payment_method: formData.paymentMethod,
      });

      const orderId: number = orderResponse.data.id || orderResponse.data.orderId;

      // Step 2: Handle payment based on method
      if (formData.paymentMethod === 'cod') {
        // COD: No payment gateway needed, go straight to success
        clearCart();
        navigate('/order-success');
        return;
      }

      // Step 3: For non-COD, create a payment session via NexusPay
      setProcessingStep('Connecting to NexusPay...');

      // Map frontend method names to payment gateway types
      const paymentTypeMap: Record<string, string> = {
        gcash: 'ewallet',
        card: 'card',
        maya: 'ewallet',
        grabpay: 'ewallet',
        bdo: 'bank',
        bpi: 'bank',
        unionbank: 'bank',
      };

      const paymentResponse = await paymentsApi.create({
        order_id: orderId,
        payment_method: formData.paymentMethod,
        payment_type: paymentTypeMap[formData.paymentMethod] || 'ewallet',
      });

      const paymentData = paymentResponse.data;

      // Clear cart since order was created
      clearCart();

      if (paymentData.success && paymentData.checkout_url) {
        // Navigate to payment status page with checkout URL
        const params = new URLSearchParams({
          checkout_url: paymentData.checkout_url,
          amount: String(paymentData.amount || total),
          method: formData.paymentMethod,
        });
        navigate(`/payment/${paymentData.payment_ref}?${params.toString()}`);
      } else if (paymentData.payment_ref) {
        // Payment created but no checkout URL (fallback)
        navigate(`/payment/${paymentData.payment_ref}?amount=${total}&method=${formData.paymentMethod}`);
      } else {
        // Payment creation returned unexpected data
        toast.error('Payment setup failed. Your order was placed — pay from your orders page.');
        navigate('/orders');
      }
    } catch (error: unknown) {
      console.error('Checkout failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to process order';
      // Check if it's an axios error with response data
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(axiosError?.response?.data?.error || message);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const subtotal = getTotalPrice();
  const shipping = subtotal > 1000 ? 0 : 99;
  const total = subtotal + shipping;

  const isOnlinePayment = formData.paymentMethod !== 'cod';

  return (
    <div className="container-custom py-8 animate-fade-in">
      <h1 className="section-title mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Information */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gold text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                <h2 className="text-xl font-semibold">Contact Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-txt-secondary mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-txt-secondary mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-txt-secondary mb-1">Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="+63 912 345 6789"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gold text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                <h2 className="text-xl font-semibold">Shipping Address</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-txt-secondary mb-1">Address *</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="input-field"
                    placeholder="Street address, building, unit number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-txt-secondary mb-1">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-txt-secondary mb-1">ZIP Code *</label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                      placeholder="1234"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gold text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                <h2 className="text-xl font-semibold">Payment Method</h2>
              </div>

              <div className="space-y-3">
                <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.paymentMethod === 'cod' ? 'border-gold bg-gold/10' : 'border-bdr hover:border-bdr-strong'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={formData.paymentMethod === 'cod'}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-gold accent-gold-400"
                  />
                  <Truck className="w-6 h-6 text-txt-secondary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-txt-tertiary">Pay when you receive your order</p>
                  </div>
                </label>

                <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.paymentMethod === 'gcash' ? 'border-gold bg-gold/10' : 'border-bdr hover:border-bdr-strong'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="gcash"
                    checked={formData.paymentMethod === 'gcash'}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-gold accent-gold-400"
                  />
                  <Wallet className="w-6 h-6 text-blue-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">GCash</p>
                    <p className="text-sm text-txt-tertiary">Pay via GCash e-wallet</p>
                  </div>
                  <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 flex-shrink-0">
                    NexusPay
                  </span>
                </label>

                <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.paymentMethod === 'card' ? 'border-gold bg-gold/10' : 'border-bdr hover:border-bdr-strong'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={formData.paymentMethod === 'card'}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-gold accent-gold-400"
                  />
                  <CreditCard className="w-6 h-6 text-txt-secondary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Credit / Debit Card</p>
                    <p className="text-sm text-txt-tertiary">Visa, Mastercard, JCB</p>
                  </div>
                  <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 flex-shrink-0">
                    NexusPay
                  </span>
                </label>
              </div>

              {/* NexusPay notice for online methods */}
              {isOnlinePayment && (
                <div className="mt-4 flex items-start gap-3 p-3 bg-bg-tertiary rounded-xl">
                  <Shield className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-txt-secondary">
                    You'll be redirected to NexusPay to complete your payment securely.
                    Your card details are never stored on our servers.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {processingStep || 'Processing...'}
                </>
              ) : isOnlinePayment ? (
                <>Pay ₱{total.toFixed(2)} with NexusPay</>
              ) : (
                <>Place Order — ₱{total.toFixed(2)}</>
              )}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
              {items.map((item) => (
                <div key={item.product_id} className="flex gap-3">
                  <img
                    src={item.images || '/assets/images/product-images/01.webp'}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg bg-bg-tertiary"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                    <p className="text-sm text-txt-tertiary">Qty: {item.quantity}</p>
                    <p className="text-sm font-medium text-gold">₱{((item.sale_price || item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <hr className="my-4 border-bdr-subtle" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-txt-secondary">
                <span>Subtotal</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-txt-secondary">
                <span>Shipping</span>
                <span>{shipping === 0 ? <span className="text-green-400">Free</span> : `₱${shipping.toFixed(2)}`}</span>
              </div>
            </div>

            <hr className="my-4 border-bdr-subtle" />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-gold">₱{total.toFixed(2)}</span>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-txt-tertiary">
              <Shield className="w-4 h-4" />
              <span>Secure checkout powered by NexusPay</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
