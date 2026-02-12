import { useEffect, useState } from 'react';
import { adminApi } from '../../utils/api';
import {
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

interface LowStockProduct {
  id: number;
  name: string;
  stock: number;
  low_stock_threshold: number;
}

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  lowStockProducts?: LowStockProduct[];
  lowStockCount?: number;
}

interface Order {
  id: number;
  total: number;
  status: string;
  payment_status?: string;
  created_at: string;
}

interface AnalyticsData {
  today: { views: number; visitors: number };
  period: { days: number; views: number; visitors: number; pagesPerVisitor: number };
  topPages: { path: string; views: number; visitors: number }[];
  hourly: { hour: number; views: number; visitors: number }[];
  topReferrers: { referrer: string; views: number }[];
  topEvents: { name: string; count: number }[];
  devices: { mobile: number; tablet: number; desktop: number; unknown: number };
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

function stockBadge(stock: number, threshold: number) {
  if (stock === 0) return 'bg-red-900/30 text-red-400';
  if (stock <= 5) return 'bg-orange-900/30 text-orange-400';
  if (stock <= threshold) return 'bg-yellow-900/30 text-yellow-400';
  return 'bg-zinc-800 text-zinc-400';
}

function HourlySparkline({ data }: { data: AnalyticsData['hourly'] }) {
  const maxViews = Math.max(...data.map((d) => d.views), 1);
  const barW = 100 / data.length;
  const currentHour = new Date().getHours();
  return (
    <svg viewBox="0 0 100 32" className="w-full h-16" preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = (d.views / maxViews) * 28 + 1;
        const isCurrent = d.hour === currentHour;
        return (
          <rect
            key={i}
            x={i * barW + barW * 0.1}
            y={32 - h}
            width={barW * 0.8}
            height={h}
            rx={0.5}
            fill={isCurrent ? '#D4AF37' : '#52525b'}
            opacity={isCurrent ? 1 : 0.6}
          />
        );
      })}
    </svg>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashRes, ordersRes, analyticsRes] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getOrders(),
        adminApi.getAnalyticsVisitors('week').catch(() => null),
      ]);
      setStats(dashRes.data);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      if (analyticsRes?.data) setAnalytics(analyticsRes.data);
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

  const lowStockProducts = stats?.lowStockProducts || [];

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
              {card.format(stats?.[card.key as keyof DashboardStats] as number || 0)}
            </div>
            <div className="text-sm text-txt-secondary mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Site Analytics Widget */}
      {analytics && (
        <div className="card p-5 mb-8">
          <h2 className="text-lg font-semibold text-txt-primary mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-accent-gold" />
            Site Analytics
            <span className="text-xs text-txt-tertiary font-normal ml-auto">Last 7 days</span>
          </h2>

          {/* Mini stat blocks */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="bg-bg-tertiary/50 rounded-lg p-3">
              <div className="text-xl font-bold text-txt-primary">{analytics.period.views.toLocaleString()}</div>
              <div className="text-xs text-txt-tertiary">Page Views</div>
            </div>
            <div className="bg-bg-tertiary/50 rounded-lg p-3">
              <div className="text-xl font-bold text-txt-primary">{analytics.period.visitors.toLocaleString()}</div>
              <div className="text-xs text-txt-tertiary">Unique Visitors</div>
            </div>
            <div className="bg-bg-tertiary/50 rounded-lg p-3">
              <div className="text-xl font-bold text-txt-primary">{analytics.period.pagesPerVisitor}</div>
              <div className="text-xs text-txt-tertiary">Pages / Visitor</div>
            </div>
            <div className="bg-bg-tertiary/50 rounded-lg p-3">
              <div className="text-xl font-bold text-txt-primary">{analytics.devices.mobile.toLocaleString()}</div>
              <div className="text-xs text-txt-tertiary">Mobile Visitors</div>
            </div>
          </div>

          {/* Hourly sparkline */}
          <div className="mb-5">
            <div className="text-xs text-txt-tertiary mb-1">Hourly page views (24h)</div>
            <HourlySparkline data={analytics.hourly} />
          </div>

          {/* Top 5 pages */}
          {analytics.topPages.length > 0 && (
            <div>
              <div className="text-xs text-txt-tertiary mb-2">Top Pages</div>
              <div className="space-y-1.5">
                {analytics.topPages.slice(0, 5).map((page) => {
                  const maxViews = analytics.topPages[0]?.views || 1;
                  const pct = Math.round((page.views / maxViews) * 100);
                  return (
                    <div key={page.path} className="flex items-center gap-3 text-sm">
                      <span className="text-txt-primary truncate flex-1 min-w-0">{page.path}</span>
                      <span className="text-txt-tertiary text-xs tabular-nums w-12 text-right shrink-0">{page.views}</span>
                      <div className="w-24 h-1.5 bg-bg-tertiary rounded-full overflow-hidden shrink-0">
                        <div className="h-full bg-accent-gold/70 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

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

        {/* Low Stock Alerts */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-txt-primary mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-400" />
            Low Stock Alerts
            {lowStockProducts.length > 0 && (
              <span className="text-xs bg-orange-900/30 text-orange-400 px-2 py-0.5 rounded-full">
                {lowStockProducts.length}
              </span>
            )}
          </h2>
          {lowStockProducts.length > 0 ? (
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary/50"
                >
                  <span className="text-txt-primary truncate flex-1 text-sm">{product.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ml-2 ${stockBadge(product.stock, product.low_stock_threshold || 10)}`}>
                    {product.stock === 0 ? 'Out of stock' : `${product.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-txt-secondary text-sm py-4 text-center">All products are well-stocked</p>
          )}
        </div>
      </div>
    </div>
  );
}
