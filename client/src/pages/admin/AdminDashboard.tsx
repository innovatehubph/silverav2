import { useEffect, useState } from 'react';
import { adminApi } from '../../utils/api';
import {
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  TrendingUp,
} from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
}

interface Order {
  id: number;
  total: number;
  status: string;
  payment_status?: string;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  images?: string[] | string;
}

const statCards = [
  { key: 'totalOrders', label: 'Total Orders', icon: ShoppingCart, format: (v: number) => v.toString() },
  { key: 'totalRevenue', label: 'Revenue', icon: DollarSign, format: (v: number) => `₱${v.toLocaleString()}` },
  { key: 'totalProducts', label: 'Products', icon: Package, format: (v: number) => v.toString() },
  { key: 'totalUsers', label: 'Users', icon: Users, format: (v: number) => v.toString() },
] as const;

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400',
  processing: 'bg-blue-900/30 text-blue-400',
  shipped: 'bg-purple-900/30 text-purple-400',
  delivered: 'bg-green-900/30 text-green-400',
  cancelled: 'bg-red-900/30 text-red-400',
  paid: 'bg-green-900/30 text-green-400',
  failed: 'bg-red-900/30 text-red-400',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashRes, ordersRes, productsRes] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getOrders(),
        adminApi.getProducts(),
      ]);
      setStats(dashRes.data);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-txt-secondary">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="text-accent-gold" size={28} />
        <h1 className="text-2xl font-bold">
          <span className="text-gradient-gold">Dashboard</span>
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.key} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <card.icon size={20} className="text-accent-gold" />
            </div>
            <div className="text-2xl font-bold text-txt-primary">
              {card.format((stats as any)?.[card.key] || 0)}
            </div>
            <div className="text-sm text-txt-secondary mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-txt-primary mb-4">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bdr">
                  <th className="text-left py-2 text-txt-tertiary font-medium">Order</th>
                  <th className="text-right py-2 text-txt-tertiary font-medium">Total</th>
                  <th className="text-right py-2 text-txt-tertiary font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((order) => (
                  <tr key={order.id} className="border-b border-bdr-subtle">
                    <td className="py-2.5 text-txt-primary">#{order.id}</td>
                    <td className="py-2.5 text-right text-txt-primary">₱{order.total?.toLocaleString()}</td>
                    <td className="py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColor[order.status] || 'bg-zinc-800 text-zinc-400'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <p className="text-txt-secondary text-sm py-4 text-center">No orders yet</p>
            )}
          </div>
        </div>

        {/* Recent Products */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-txt-primary mb-4">Products</h2>
          <div className="space-y-2">
            {products.slice(0, 10).map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary/50"
              >
                <span className="text-txt-primary truncate flex-1">{product.name}</span>
                <span className="text-txt-secondary mx-4 text-sm">₱{product.price?.toLocaleString()}</span>
                <span className="text-xs text-txt-tertiary">{product.stock} stock</span>
              </div>
            ))}
            {products.length === 0 && (
              <p className="text-txt-secondary text-sm py-4 text-center">No products yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
