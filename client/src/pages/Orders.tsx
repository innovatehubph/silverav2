import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle, Truck, ChevronRight } from 'lucide-react';
import { ordersApi } from '../utils/api';

interface Order {
  id: number;
  status: string;
  total: number;
  created_at: string;
  items: { name: string; quantity: number; price: number }[];
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await ordersApi.getAll();
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-blue-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container-custom py-8">
        <h1 className="section-title mb-6">My Orders</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6">
              <div className="skeleton h-6 w-32 mb-4"></div>
              <div className="skeleton h-4 w-48"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container-custom py-16 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-10 h-10 text-gray-400" />
        </div>
        <h1 className="section-title">No Orders Yet</h1>
        <p className="text-gray-600 mb-6">You haven't placed any orders yet.</p>
        <Link to="/shop" className="btn-primary">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-8 animate-fade-in">
      <h1 className="section-title mb-6">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            to={`/orders/${order.id}`}
            className="card p-6 flex items-center gap-4 hover:shadow-lg transition-shadow"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              {getStatusIcon(order.status)}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-semibold">Order #{order.id}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              
              <p className="text-sm text-gray-500">
                {new Date(order.created_at).toLocaleDateString('en-PH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              
              <p className="text-sm text-gray-600 mt-1">
                {order.items?.length || 0} item(s)
              </p>
            </div>

            <div className="text-right">
              <p className="font-bold text-lg">₱{order.total.toFixed(2)}</p>
              <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
