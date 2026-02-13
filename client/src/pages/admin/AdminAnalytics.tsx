import { useEffect, useState } from 'react';
import { adminApi } from '../../utils/api';
import { toast } from 'sonner';
import { BarChart3 } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = ['#D4AF37', '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#06b6d4', '#ef4444', '#ec4899'];

const formatCurrency = (value: number) => `₱${value.toLocaleString()}`;

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  id: number;
  name: string;
  sold: number;
  revenue: number;
}

interface CategoryRevenue {
  id: number;
  name: string;
  revenue: number;
  orders: number;
}

interface CustomerGrowth {
  date: string;
  newCustomers: number;
  totalCustomers: number;
}

function PeriodSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];
  return (
    <div className="flex items-center gap-1 bg-bg-tertiary rounded-lg p-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm rounded-md transition-all ${
            value === opt.value
              ? 'bg-accent-gold text-bg-primary font-medium'
              : 'text-txt-secondary hover:text-txt-primary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const axisStyle = { fontSize: 12, fill: '#9ca3af' };
const gridStroke = 'rgba(255,255,255,0.06)';

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categoryRevenue, setCategoryRevenue] = useState<CategoryRevenue[]>([]);
  const [customerGrowth, setCustomerGrowth] = useState<CustomerGrowth[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [revenueRes, productsRes, categoryRes, customersRes] = await Promise.all([
        adminApi.getReportsRevenue(period),
        adminApi.getReportsTopProducts(10),
        adminApi.getRevenueByCategory(),
        adminApi.getReportsCustomers(period),
      ]);

      setRevenueData(revenueRes.data.revenue || []);
      setTopProducts(productsRes.data.products || []);
      setCategoryRevenue(categoryRes.data.categories || []);
      setCustomerGrowth(customersRes.data.growth || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-txt-secondary">Loading analytics...</span>
        </div>
      </div>
    );
  }

  // Prepare horizontal bar data (top 10 sorted ascending so largest is at top visually)
  const barData = [...topProducts].reverse();

  // Pie data with percentage
  const totalCategoryRevenue = categoryRevenue.reduce((s, c) => s + c.revenue, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-accent-gold" size={28} />
          <h1 className="text-2xl font-bold">
            <span className="text-gradient-gold">Analytics</span>
          </h1>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Row 1: Sales + Top Products */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Area Chart */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-txt-primary mb-4">Sales Overview</h2>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2} fill="url(#goldGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-txt-secondary text-center py-16">No sales data for this period</div>
          )}
        </div>

        {/* Top Selling Products Bar Chart */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-txt-primary mb-4">Top Selling Products</h2>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <YAxis type="category" dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-txt-secondary text-center py-16">No product data yet</div>
          )}
        </div>
      </div>

      {/* Row 2: Orders Trend */}
      <div className="mb-6">
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-txt-primary mb-4">Orders per Day</h2>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData}>
                <defs>
                  <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value) => [Number(value ?? 0), 'Orders']}
                />
                <Bar dataKey="orders" fill="url(#ordersGrad)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-txt-secondary text-center py-16">No order data for this period</div>
          )}
        </div>
      </div>

      {/* Row 3: Category Revenue + Customer Growth */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue by Category Donut */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-txt-primary mb-4">Revenue by Category</h2>
          {categoryRevenue.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryRevenue}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="revenue"
                    nameKey="name"
                    paddingAngle={2}
                  >
                    {categoryRevenue.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8 }}
                    formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name)]}
                  />
                  <Legend
                    formatter={(value) => <span style={{ color: '#d1d5db', fontSize: 13 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-sm text-txt-secondary mt-2">
                Total: <span className="text-txt-primary font-medium">{formatCurrency(totalCategoryRevenue)}</span>
              </div>
            </div>
          ) : (
            <div className="text-txt-secondary text-center py-16">No category data yet</div>
          )}
        </div>

        {/* Customer Registrations Line Chart */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-txt-primary mb-4">Customer Registrations</h2>
          {customerGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Line type="monotone" dataKey="newCustomers" stroke="#D4AF37" strokeWidth={2} dot={{ fill: '#D4AF37', r: 3 }} name="New Customers" />
                <Line type="monotone" dataKey="totalCustomers" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Total Customers" />
                <Legend
                  formatter={(value) => <span style={{ color: '#d1d5db', fontSize: 13 }}>{value}</span>}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-txt-secondary text-center py-16">No customer data for this period</div>
          )}
        </div>
      </div>
    </div>
  );
}
