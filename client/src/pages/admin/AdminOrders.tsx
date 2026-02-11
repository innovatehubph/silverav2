import { useEffect, useState } from 'react';
import { adminApi } from '../../utils/api';
import { toast } from 'sonner';
import { ShoppingCart, Filter } from 'lucide-react';

interface Order {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  total: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  shipping_address?: string;
  created_at: string;
}

const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400',
  processing: 'bg-blue-900/30 text-blue-400',
  shipped: 'bg-purple-900/30 text-purple-400',
  delivered: 'bg-green-900/30 text-green-400',
  cancelled: 'bg-red-900/30 text-red-400',
};

const paymentColor: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400',
  paid: 'bg-green-900/30 text-green-400',
  failed: 'bg-red-900/30 text-red-400',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await adminApi.getOrders();
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await adminApi.updateOrder(orderId, { status: newStatus });
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      toast.success(`Order #${orderId} updated to ${newStatus}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update order');
    }
  };

  const filtered = statusFilter === 'all'
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-txt-secondary">Loading orders...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="text-accent-gold" size={28} />
          <h1 className="text-2xl font-bold">
            <span className="text-gradient-gold">Orders</span>
          </h1>
          <span className="text-sm text-txt-tertiary">({orders.length})</span>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <Filter size={16} className="text-txt-tertiary" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field py-2 text-sm pr-8"
        >
          <option value="all">All Statuses</option>
          {orderStatuses.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-secondary border-b border-bdr">
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">ID</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Customer</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Total</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Status</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Payment</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Date</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b border-bdr-subtle hover:bg-bg-hover transition-colors">
                  <td className="py-2.5 px-4 text-txt-primary font-mono">#{order.id}</td>
                  <td className="py-2.5 px-4">
                    <div className="text-txt-primary text-sm">{order.user_name || `User #${order.user_id}`}</div>
                    {order.user_email && (
                      <div className="text-txt-tertiary text-xs">{order.user_email}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right text-txt-primary font-medium">
                    ₱{order.total?.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColor[order.status] || 'bg-zinc-800 text-zinc-400'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${paymentColor[order.payment_status] || 'bg-zinc-800 text-zinc-400'}`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-txt-secondary text-sm">{formatDate(order.created_at)}</td>
                  <td className="py-2.5 px-4 text-center">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="input-field py-1 px-2 text-xs"
                    >
                      {orderStatuses.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-txt-secondary text-sm py-8 text-center">
              {statusFilter !== 'all' ? `No ${statusFilter} orders` : 'No orders yet'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
