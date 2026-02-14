import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, Shield, CheckCircle, Wallet, Loader2, MapPin, Plus, Ticket, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore, useAuthStore } from '../stores';
import { ordersApi, paymentsApi, couponsApi } from '../utils/api';
import AddressForm from '../components/AddressForm';
import { SEO } from '../components/SEO';

interface Address {
  id: number;
  label: string;
  name: string;
  phone: string;
  region_code: string;
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  street_address: string;
  zip_code: string;
  is_default: boolean;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getTotalPrice } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const [cartHydrated, setCartHydrated] = useState(useCartStore.persist.hasHydrated());
  
  // Wait for cart to hydrate from localStorage
  useEffect(() => {
    const unsubscribe = useCartStore.persist.onFinishHydration(() => {
      setCartHydrated(true);
    });
    // Check if already hydrated
    if (useCartStore.persist.hasHydrated()) {
      setCartHydrated(true);
    }
    return unsubscribe;
  }, []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressMode, setAddressMode] = useState<'saved' | 'new'>('saved');
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: number; code: string; type: string; value: number; discount: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Form data for guest checkout or new address
  const [formData, setFormData] = useState({
    email: user?.email || '',
    paymentMethod: 'cod',
  });

  // Fetch saved addresses
  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses();
    } else {
      setLoadingAddresses(false);
      setAddressMode('new');
    }
  }, [isAuthenticated]);

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
        // Auto-select default address
        const defaultAddr = data.find((a: Address) => a.is_default);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setAddressMode('saved');
        } else if (data.length > 0) {
          setSelectedAddressId(data[0].id);
          setAddressMode('saved');
        } else {
          setAddressMode('new');
        }
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Store new/guest address data so handleSubmit can use it
  const [newAddressData, setNewAddressData] = useState<Record<string, string> | null>(null);

  const handleAddressSubmit = async (data: any) => {
    if (!isAuthenticated) {
      // Guest checkout - store the address data and use it directly
      setNewAddressData(data);
      setSelectedAddressId(-1); // Special ID for guest address
      setShowAddressForm(false);
      return;
    }

    // Save the address
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const newAddress = await res.json();
        toast.success('Address saved!');
        setAddresses(prev => [...prev, newAddress]);
        setSelectedAddressId(newAddress.id);
        setShowAddressForm(false);
        setAddressMode('saved');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save address');
      }
    } catch (error) {
      toast.error('Failed to save address');
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await couponsApi.validate(couponCode.trim(), getTotalPrice());
      const { coupon, discount } = res.data;
      setAppliedCoupon({ id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, discount });
      setCouponCode('');
      toast.success(`Coupon "${coupon.code}" applied! You save ₱${discount.toFixed(2)}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setCouponError(axiosErr?.response?.data?.error || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  // Wait for cart hydration before showing empty state
  if (!cartHydrated) {
    return (
      <div className="container-custom py-16 text-center">
        <div className="w-12 h-12 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-txt-secondary">Loading cart...</p>
      </div>
    );
  }

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

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);

  const formatAddress = (addr: Address) => {
    const parts = [
      addr.street_address,
      addr.barangay,
      addr.municipality,
      addr.province,
      addr.region,
      addr.zip_code
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate address selection
    if (addressMode === 'saved' && !selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }
    if (addressMode === 'new' && !newAddressData && !selectedAddress) {
      toast.error('Please fill in your delivery address');
      return;
    }

    setIsProcessing(true);

    try {
      // Build shipping address object (server expects an object, not a string)
      let shippingAddress: Record<string, string> = {};

      if (selectedAddress) {
        shippingAddress = {
          name: selectedAddress.name,
          phone: selectedAddress.phone,
          street_address: selectedAddress.street_address,
          barangay: selectedAddress.barangay,
          municipality: selectedAddress.municipality,
          province: selectedAddress.province,
          region: selectedAddress.region,
          region_code: selectedAddress.region_code,
          zip_code: selectedAddress.zip_code,
        };
      } else if (newAddressData) {
        shippingAddress = newAddressData;
      }

      // Step 1: Create the order
      // Get fresh cart items from store to avoid stale closure issues
      const currentItems = useCartStore.getState().items;
      
      if (!currentItems || currentItems.length === 0) {
        toast.error('Your cart is empty. Please add items before checkout.');
        navigate('/shop');
        return;
      }

      setProcessingStep('Creating order...');
      const orderResponse = await ordersApi.create({
        items: currentItems.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
        shipping_address: shippingAddress,
        payment_method: formData.paymentMethod,
      });

      const orderId: number = orderResponse.data.order_id || orderResponse.data.id || orderResponse.data.orderId;

      // Step 2: Handle payment based on method
      if (formData.paymentMethod === 'cod') {
        useCartStore.getState().clearCart();
        navigate('/order-success');
        return;
      }

      // Step 3: For non-COD, create a payment session (QRPH/DirectPay)
      setProcessingStep('Connecting to payment gateway...');

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
      useCartStore.getState().clearCart();

      if (paymentData.success && paymentData.checkout_url) {
        const params = new URLSearchParams({
          checkout_url: paymentData.checkout_url,
          amount: String(paymentData.amount || total),
          method: formData.paymentMethod,
        });
        navigate(`/payment/${paymentData.payment_ref}?${params.toString()}`);
      } else if (paymentData.payment_ref) {
        navigate(`/payment/${paymentData.payment_ref}?amount=${total}&method=${formData.paymentMethod}`);
      } else {
        toast.error('Payment setup failed. Your order was placed — pay from your orders page.');
        navigate('/orders');
      }
    } catch (error: unknown) {
      console.error('Checkout failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to process order';
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(axiosError?.response?.data?.error || message);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const subtotal = getTotalPrice();
  const shipping = subtotal > 1000 ? 0 : 99;
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const total = Math.max(0, subtotal + shipping - couponDiscount);
  const isOnlinePayment = formData.paymentMethod !== 'cod';

  return (
    <>
    <SEO title="Checkout" description="Complete your purchase securely. Multiple payment options including QRPH and Cash on Delivery." url="https://silvera.innoserver.cloud/checkout" />
    <div className="container-custom py-8 animate-fade-in">
      <h1 className="section-title mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Delivery Address */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-gold text-bg-primary rounded-full flex items-center justify-center font-bold text-sm">1</div>
                <h2 className="text-xl font-semibold text-txt-primary">Delivery Address</h2>
              </div>

              {loadingAddresses ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-20 bg-bg-tertiary rounded-lg"></div>
                </div>
              ) : (
                <>
                  {/* Address Mode Toggle */}
                  {isAuthenticated && addresses.length > 0 && !showAddressForm && (
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setAddressMode('saved')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          addressMode === 'saved'
                            ? 'bg-accent-gold text-bg-primary'
                            : 'bg-bg-tertiary text-txt-secondary hover:bg-bg-secondary'
                        }`}
                      >
                        Saved Addresses
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressMode('new');
                          setShowAddressForm(true);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                          addressMode === 'new'
                            ? 'bg-accent-gold text-bg-primary'
                            : 'bg-bg-tertiary text-txt-secondary hover:bg-bg-secondary'
                        }`}
                      >
                        <Plus className="w-4 h-4" /> New Address
                      </button>
                    </div>
                  )}

                  {/* Saved Addresses */}
                  {addressMode === 'saved' && !showAddressForm && (
                    <div className="space-y-3">
                      {addresses.map(address => (
                        <label
                          key={address.id}
                          className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedAddressId === address.id
                              ? 'border-accent-gold bg-accent-gold/5'
                              : 'border-bdr hover:border-bdr-strong'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="selectedAddress"
                              value={address.id}
                              checked={selectedAddressId === address.id}
                              onChange={() => setSelectedAddressId(address.id)}
                              className="mt-1 w-4 h-4 text-accent-gold accent-accent-gold"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-bg-tertiary text-txt-secondary">
                                  {address.label}
                                </span>
                                {address.is_default && (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-accent-gold/20 text-accent-gold">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="font-medium text-txt-primary">{address.name}</p>
                              <p className="text-sm text-txt-secondary">{address.phone}</p>
                              <p className="text-sm text-txt-tertiary mt-1">{formatAddress(address)}</p>
                            </div>
                          </div>
                        </label>
                      ))}

                      {addresses.length === 0 && (
                        <div className="text-center py-8">
                          <MapPin className="w-12 h-12 text-txt-tertiary mx-auto mb-3" />
                          <p className="text-txt-secondary mb-4">No saved addresses</p>
                          <button
                            type="button"
                            onClick={() => setShowAddressForm(true)}
                            className="btn-primary-sm"
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add New Address
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* New Address Form */}
                  {(showAddressForm || addressMode === 'new') && (
                    <div className="mt-4">
                      <AddressForm
                        onSubmit={handleAddressSubmit}
                        onCancel={addresses.length > 0 ? () => {
                          setShowAddressForm(false);
                          setAddressMode('saved');
                        } : undefined}
                        submitLabel={isAuthenticated ? "Save & Use This Address" : "Use This Address"}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Contact Email (for guests) */}
            {!isAuthenticated && (
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-gold text-bg-primary rounded-full flex items-center justify-center font-bold text-sm">2</div>
                  <h2 className="text-xl font-semibold text-txt-primary">Contact Email</h2>
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="input-field"
                  placeholder="your@email.com"
                />
                <p className="text-sm text-txt-tertiary mt-2">We'll send order updates to this email</p>
              </div>
            )}

            {/* Payment Method */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-gold text-bg-primary rounded-full flex items-center justify-center font-bold text-sm">
                  {isAuthenticated ? '2' : '3'}
                </div>
                <h2 className="text-xl font-semibold text-txt-primary">Payment Method</h2>
              </div>

              <div className="space-y-3">
                <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.paymentMethod === 'cod' ? 'border-accent-gold bg-accent-gold/10' : 'border-bdr hover:border-bdr-strong'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={formData.paymentMethod === 'cod'}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-5 h-5 text-accent-gold accent-accent-gold"
                  />
                  <Truck className="w-6 h-6 text-txt-secondary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-txt-primary">Cash on Delivery</p>
                    <p className="text-sm text-txt-tertiary">Pay when you receive your order</p>
                  </div>
                </label>

                <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.paymentMethod === 'gcash' ? 'border-accent-gold bg-accent-gold/10' : 'border-bdr hover:border-bdr-strong'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="gcash"
                    checked={formData.paymentMethod === 'gcash'}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-5 h-5 text-accent-gold accent-accent-gold"
                  />
                  <Wallet className="w-6 h-6 text-blue-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-txt-primary">GCash</p>
                    <p className="text-sm text-txt-tertiary">Pay via GCash e-wallet</p>
                  </div>
                </label>

                <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.paymentMethod === 'card' ? 'border-accent-gold bg-accent-gold/10' : 'border-bdr hover:border-bdr-strong'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={formData.paymentMethod === 'card'}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-5 h-5 text-accent-gold accent-accent-gold"
                  />
                  <CreditCard className="w-6 h-6 text-txt-secondary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-txt-primary">Credit / Debit Card</p>
                    <p className="text-sm text-txt-tertiary">Visa, Mastercard, JCB</p>
                  </div>
                </label>

              </div>

              {isOnlinePayment && (
                <div className="mt-4 flex items-start gap-3 p-3 bg-bg-tertiary rounded-xl">
                  <Shield className="w-5 h-5 text-accent-gold mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-txt-secondary">
                    You'll be redirected to complete your payment securely.
                    Your card details are never stored on our servers.
                  </p>
                </div>
              )}

            </div>

            <button
                type="submit"
                disabled={isProcessing || (addressMode === 'saved' && !selectedAddress) || (addressMode === 'new' && !newAddressData)}
                className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {processingStep || 'Processing...'}
                  </>
                ) : isOnlinePayment ? (
                  <>Pay ₱{total.toFixed(2)}</>
                ) : (
                  <>Place Order — ₱{total.toFixed(2)}</>
                )}
              </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="glass rounded-xl p-6 sticky top-24">
            <h2 className="text-xl font-semibold text-txt-primary mb-4">Order Summary</h2>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
              {items.map((item) => (
                <div key={item.product_id} className="flex gap-3">
                  <img
                    src={item.images || '/assets/images/product-images/01.webp'}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg bg-bg-tertiary"
                    width={64}
                    height={64}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-txt-primary line-clamp-1">{item.name}</p>
                    <p className="text-sm text-txt-tertiary">Qty: {item.quantity}</p>
                    <p className="text-sm font-medium text-accent-gold">₱{((item.sale_price || item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <hr className="my-4 border-bdr" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-txt-secondary">
                <span>Subtotal</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-txt-secondary">
                <span>Shipping</span>
                <span>{shipping === 0 ? <span className="text-green-400">Free</span> : `₱${shipping.toFixed(2)}`}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-400">
                  <span className="flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5" />
                    {appliedCoupon.code}
                    <button type="button" onClick={handleRemoveCoupon} className="ml-1 text-red-400 hover:text-red-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                  <span>-₱{couponDiscount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Coupon Code Input */}
            {!appliedCoupon && (
              <div className="mt-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                    placeholder="Coupon code"
                    className="input-field flex-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2 bg-accent-gold/20 text-accent-gold rounded-lg text-sm font-medium hover:bg-accent-gold/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-xs text-red-400 mt-1">{couponError}</p>}
              </div>
            )}

            <hr className="my-4 border-bdr" />

            <div className="flex justify-between text-lg font-bold">
              <span className="text-txt-primary">Total</span>
              <span className="text-accent-gold">₱{total.toFixed(2)}</span>
            </div>

            {/* Selected Address Preview */}
            {selectedAddress && (
              <div className="mt-4 p-3 bg-bg-tertiary rounded-lg">
                <p className="text-xs text-txt-tertiary mb-1">Delivering to:</p>
                <p className="text-sm font-medium text-txt-primary">{selectedAddress.name}</p>
                <p className="text-xs text-txt-secondary line-clamp-2">{formatAddress(selectedAddress)}</p>
              </div>
            )}
            {!selectedAddress && newAddressData && (
              <div className="mt-4 p-3 bg-bg-tertiary rounded-lg">
                <p className="text-xs text-txt-tertiary mb-1">Delivering to:</p>
                <p className="text-sm font-medium text-txt-primary">{newAddressData.name}</p>
                <p className="text-xs text-txt-secondary line-clamp-2">
                  {[newAddressData.street_address, newAddressData.barangay, newAddressData.municipality, newAddressData.province, newAddressData.region, newAddressData.zip_code].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 text-sm text-txt-tertiary">
              <Shield className="w-4 h-4" />
              <span>Secure checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
