import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle, MapPin, RotateCcw, X } from 'lucide-react';
import { ordersApi } from '../utils/api';
import { toast } from 'sonner';
import { SEO } from '../components/SEO';

interface OrderItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  images?: string;
}

interface ReturnInfo {
  id: number;
  status: string;
  reason: string;
  admin_notes?: string;
  refund_amount?: number;
  created_at: string;
  resolved_at?: string;
}

interface Order {
  id: number;
  status: string;
  total: number;
  shipping_address: string;
  payment_method: string;
  payment_status: string;
  tracking_number?: string;
  carrier?: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
  items: OrderItem[];
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [returnInfo, setReturnInfo] = useState<ReturnInfo | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  useEffect(() => {
    if (!id) return;
    ordersApi.getById(Number(id))
      .then(res => {
        const data = res.data;
        if (data.items && typeof data.items === 'string') {
          try { data.items = JSON.parse(data.items); } catch {}
        }
        setOrder(data);
      })
      .catch(err => console.error('Failed to fetch order:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  // Fetch return status
  useEffect(() => {
    if (!id) return;
    ordersApi.getReturn(Number(id))
      .then(res => setReturnInfo(res.data))
      .catch(() => {}); // 404 = no return, that's fine
  }, [id]);

  const handleRequestReturn = async () => {
    if (!id || !returnReason.trim()) return;
    setSubmittingReturn(true);
    try {
      const res = await ordersApi.requestReturn(Number(id), returnReason.trim());
      setReturnInfo({ ...res.data, reason: returnReason.trim(), created_at: new Date().toISOString() });
      setShowReturnModal(false);
      setReturnReason('');
      toast.success('Return request submitted');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit return request');
    } finally {
      setSubmittingReturn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container-custom py-16 text-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-custom py-16 text-center">
        <h1 className="section-title">Order Not Found</h1>
        <Link to="/orders" className="btn-primary mt-4 inline-block">View All Orders</Link>
      </div>
    );
  }

  const statusSteps = ['pending', 'processing', 'shipped', 'delivered'];
  const currentStep = statusSteps.indexOf(order.status);
  const canRequestReturn = ['delivered', 'shipped', 'processing'].includes(order.status) && !returnInfo;

  const returnStatusColor: Record<string, string> = {
    pending: 'bg-yellow-900/30 text-yellow-400',
    approved: 'bg-green-900/30 text-green-400',
    rejected: 'bg-red-900/30 text-red-400',
  };

  return (
    <>
      <SEO title="Order Details" description="View your order details, tracking information, and delivery status on Silvera PH." />
      <div className="container-custom py-8 animate-fade-in">
      <Link to="/orders" className="inline-flex items-center gap-2 text-gold hover:text-gold-300 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="section-title">Order #{order.id}</h1>
        <div className="flex items-center gap-2">
          {order.payment_status === 'refunded' && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-900/30 text-purple-400">Refunded</span>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            order.status === 'delivered' ? 'bg-green-900/30 text-green-400' :
            order.status === 'shipped' ? 'bg-blue-900/30 text-blue-400' :
            order.status === 'cancelled' ? 'bg-red-900/30 text-red-400' :
            'bg-yellow-900/30 text-yellow-400'
          }`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Status tracker */}
      {order.status !== 'cancelled' && (
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  i <= currentStep ? 'bg-gold text-white' : 'bg-bg-hover text-txt-tertiary'
                }`}>
                  {i === 0 && <Package className="w-5 h-5" />}
                  {i === 1 && <Package className="w-5 h-5" />}
                  {i === 2 && <Truck className="w-5 h-5" />}
                  {i === 3 && <CheckCircle className="w-5 h-5" />}
                </div>
                {i < statusSteps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${i < currentStep ? 'bg-gold' : 'bg-bg-hover'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-txt-tertiary">
            {statusSteps.map(step => (
              <span key={step}>{step.charAt(0).toUpperCase() + step.slice(1)}</span>
            ))}
          </div>
        </div>
      )}

      {/* Tracking Information */}
      {(order.tracking_number || order.shipped_at) && (
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gold" /> Tracking Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {order.carrier && (
              <div>
                <span className="text-txt-tertiary">Carrier</span>
                <p className="font-medium">{order.carrier}</p>
              </div>
            )}
            {order.tracking_number && (
              <div>
                <span className="text-txt-tertiary">Tracking Number</span>
                <p className="font-mono font-medium">{order.tracking_number}</p>
              </div>
            )}
            {order.shipped_at && (
              <div>
                <span className="text-txt-tertiary">Shipped</span>
                <p className="font-medium">{new Date(order.shipped_at).toLocaleString()}</p>
              </div>
            )}
            {order.delivered_at && (
              <div>
                <span className="text-txt-tertiary">Delivered</span>
                <p className="font-medium">{new Date(order.delivered_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Status */}
      {returnInfo && (
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-gold" /> Return Request
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-txt-tertiary">Status:</span>
              <span className={`px-2 py-0.5 rounded text-xs ${returnStatusColor[returnInfo.status] || 'bg-zinc-800 text-zinc-400'}`}>
                {returnInfo.status.charAt(0).toUpperCase() + returnInfo.status.slice(1)}
              </span>
            </div>
            <div>
              <span className="text-txt-tertiary">Reason:</span>
              <p className="text-txt-primary mt-1">{returnInfo.reason}</p>
            </div>
            {returnInfo.admin_notes && (
              <div>
                <span className="text-txt-tertiary">Admin Notes:</span>
                <p className="text-txt-primary mt-1">{returnInfo.admin_notes}</p>
              </div>
            )}
            {returnInfo.refund_amount && returnInfo.status === 'approved' && (
              <div>
                <span className="text-txt-tertiary">Refund Amount:</span>
                <p className="text-green-400 font-medium">₱{Number(returnInfo.refund_amount).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">Items</h2>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.product_id} className="flex gap-4 items-center">
                  <img
                    src={item.images || '/assets/images/product-images/01.webp'}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                    width={64}
                    height={64}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-txt-tertiary">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-txt-tertiary">Date</dt>
                <dd>{new Date(order.created_at).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-txt-tertiary">Payment</dt>
                <dd className="uppercase">{order.payment_method}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-txt-tertiary">Shipping</dt>
                <dd className="text-xs text-right max-w-[60%]">{order.shipping_address}</dd>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <dt>Total</dt>
                <dd>₱{Number(order.total).toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          {/* Request Return Button */}
          {canRequestReturn && (
            <button
              onClick={() => setShowReturnModal(true)}
              className="btn-secondary w-full py-3 rounded-lg flex items-center justify-center gap-2 text-sm"
            >
              <RotateCcw size={16} /> Request Return
            </button>
          )}
        </div>
      </div>

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowReturnModal(false)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-txt-primary flex items-center gap-2">
                <RotateCcw size={20} className="text-accent-gold" /> Request Return
              </h2>
              <button onClick={() => setShowReturnModal(false)} className="text-txt-tertiary hover:text-txt-primary">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-txt-secondary">
                Please describe why you would like to return this order.
              </p>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Reason for return..."
                className="input-field w-full py-2 min-h-[100px] resize-none text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowReturnModal(false)} className="btn-ghost px-4 py-2 rounded-lg text-sm">
                Cancel
              </button>
              <button
                onClick={handleRequestReturn}
                disabled={submittingReturn || !returnReason.trim()}
                className="btn-primary px-4 py-2 rounded-lg text-sm"
              >
                {submittingReturn ? 'Submitting...' : 'Submit Return'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
