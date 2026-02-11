import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle } from 'lucide-react';
import { ordersApi } from '../utils/api';

interface OrderItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  images?: string;
}

interface Order {
  id: number;
  status: string;
  total: number;
  shipping_address: string;
  payment_method: string;
  created_at: string;
  items: OrderItem[];
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    ordersApi.getById(Number(id))
      .then(res => setOrder(res.data))
      .catch(err => console.error('Failed to fetch order:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

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

  return (
    <div className="container-custom py-8 animate-fade-in">
      <Link to="/orders" className="inline-flex items-center gap-2 text-gold hover:text-gold-300 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="section-title">Order #{order.id}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          order.status === 'delivered' ? 'bg-green-900/30 text-green-400' :
          order.status === 'shipped' ? 'bg-blue-900/30 text-blue-400' :
          'bg-yellow-900/30 text-yellow-400'
        }`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>

      {/* Status tracker */}
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
        <div>
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
        </div>
      </div>
    </div>
  );
}
