import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';

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
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/login');
      return;
    }
    loadDashboard();
  }, [isAuthenticated, user, navigate]);

  const loadDashboard = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [dashRes, ordersRes, productsRes] = await Promise.all([
        fetch('/api/admin/dashboard', { headers }),
        fetch('/api/admin/orders', { headers }),
        fetch('/api/admin/products', { headers })
      ]);

      setStats(await dashRes.json());
      setOrders(await ordersRes.json());
      setProducts(await productsRes.json());
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-txt-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-txt-primary p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-gradient-gold">Admin Dashboard</span>
          </h1>
          <button 
            onClick={() => navigate('/')}
            className="btn-secondary px-4 py-2 rounded-lg"
          >
            Back to Shop
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass p-6 rounded-xl">
            <div className="text-3xl font-bold text-accent-gold">{stats?.totalOrders || 0}</div>
            <div className="text-txt-secondary">Total Orders</div>
          </div>
          <div className="glass p-6 rounded-xl">
            <div className="text-3xl font-bold text-accent-gold">₱{(stats?.totalRevenue || 0).toLocaleString()}</div>
            <div className="text-txt-secondary">Revenue</div>
          </div>
          <div className="glass p-6 rounded-xl">
            <div className="text-3xl font-bold text-accent-gold">{stats?.totalProducts || 0}</div>
            <div className="text-txt-secondary">Products</div>
          </div>
          <div className="glass p-6 rounded-xl">
            <div className="text-3xl font-bold text-accent-gold">{stats?.totalUsers || 0}</div>
            <div className="text-txt-secondary">Users</div>
          </div>
        </div>

        {/* Orders & Products */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
            <div className="space-y-3">
              {orders.slice(0, 10).map(order => (
                <div key={order.id} className="flex justify-between items-center p-3 bg-bg-secondary rounded-lg">
                  <span>Order #{order.id}</span>
                  <span>₱{order.total?.toLocaleString()}</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    order.status === 'paid' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
              {orders.length === 0 && <p className="text-txt-secondary">No orders yet</p>}
            </div>
          </div>

          <div className="glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Products</h2>
            <div className="space-y-3">
              {products.slice(0, 10).map(product => (
                <div key={product.id} className="flex justify-between items-center p-3 bg-bg-secondary rounded-lg">
                  <span className="truncate flex-1">{product.name}</span>
                  <span className="mx-4">₱{product.price?.toLocaleString()}</span>
                  <span className="text-txt-secondary">{product.stock} in stock</span>
                </div>
              ))}
              {products.length === 0 && <p className="text-txt-secondary">No products yet</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
