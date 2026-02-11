import { useEffect, useState } from 'react';
import { adminApi } from '../../utils/api';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Calendar,
  Download,
  CreditCard,
  Wallet,
} from 'lucide-react';

// Types
interface SalesOverview {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  ordersAllTime: number;
}

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

interface OrderStatus {
  status: string;
  count: number;
  percentage: number;
}

interface PaymentMethod {
  method: string;
  count: number;
  total: number;
  percentage: number;
}

interface CustomerGrowth {
  date: string;
  newCustomers: number;
  totalCustomers: number;
}

// Chart colors
const CHART_COLORS = {
  gold: '#D4AF37',
  goldLight: 'rgba(212, 175, 55, 0.2)',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  red: '#ef4444',
  orange: '#f97316',
  cyan: '#06b6d4',
};

const STATUS_COLORS: Record<string, string> = {
  pending: CHART_COLORS.orange,
  processing: CHART_COLORS.blue,
  shipped: CHART_COLORS.purple,
  delivered: CHART_COLORS.green,
  cancelled: CHART_COLORS.red,
};

// Helper: format currency
const formatCurrency = (value: number) => `₱${value.toLocaleString()}`;

// Simple CSS Bar Chart Component
function BarChart({ data, maxValue }: { data: { label: string; value: number; color?: string }[]; maxValue: number }) {
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-txt-secondary truncate max-w-[60%]">{item.label}</span>
            <span className="text-txt-primary font-medium">{formatCurrency(item.value)}</span>
          </div>
          <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max((item.value / maxValue) * 100, 2)}%`,
                backgroundColor: item.color || CHART_COLORS.gold,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Simple CSS Line Chart Component
function LineChart({ data, height = 200 }: { data: RevenueData[]; height?: number }) {
  if (data.length === 0) return <div className="text-txt-secondary text-center py-8">No data</div>;

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1 || 1)) * 100,
    y: 100 - (d.revenue / maxRevenue) * 100,
  }));

  const pathD = points.length > 1
    ? `M ${points[0].x} ${points[0].y} ${points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`
    : '';

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-txt-tertiary py-2">
        <span>{formatCurrency(maxRevenue)}</span>
        <span>{formatCurrency(maxRevenue / 2)}</span>
        <span>₱0</span>
      </div>
      
      {/* Chart area */}
      <div className="ml-16 h-full relative">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {/* Grid lines */}
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          
          {/* Fill area */}
          {points.length > 1 && (
            <path
              d={`${pathD} L 100 100 L 0 100 Z`}
              fill={CHART_COLORS.goldLight}
            />
          )}
          
          {/* Line */}
          {points.length > 1 && (
            <path
              d={pathD}
              fill="none"
              stroke={CHART_COLORS.gold}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
          
          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="1.5"
              fill={CHART_COLORS.gold}
            />
          ))}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between text-xs text-txt-tertiary mt-1">
          {data.length > 0 && <span>{data[0].date}</span>}
          {data.length > 2 && <span>{data[Math.floor(data.length / 2)].date}</span>}
          {data.length > 1 && <span>{data[data.length - 1].date}</span>}
        </div>
      </div>
    </div>
  );
}

// Pie/Donut Chart Component
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <div className="text-txt-secondary text-center py-8">No data</div>;

  let cumulativePercent = 0;
  const segments = data.map(item => {
    const percent = (item.value / total) * 100;
    const segment = {
      ...item,
      percent,
      offset: cumulativePercent,
    };
    cumulativePercent += percent;
    return segment;
  });

  return (
    <div className="flex items-center gap-6">
      {/* Donut */}
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke={seg.color}
              strokeWidth="4"
              strokeDasharray={`${seg.percent} ${100 - seg.percent}`}
              strokeDashoffset={-seg.offset}
              className="transition-all duration-500"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-txt-primary">{total}</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="space-y-2 flex-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-txt-secondary capitalize flex-1">{seg.label}</span>
            <span className="text-txt-primary font-medium">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <Icon size={20} className="text-accent-gold" />
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${trend.positive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-txt-primary">{value}</div>
      <div className="text-sm text-txt-secondary mt-1">{title}</div>
      {subValue && <div className="text-xs text-txt-tertiary mt-1">{subValue}</div>}
    </div>
  );
}

// Date Range Selector
function DateRangeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const options = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];

  return (
    <div className="flex items-center gap-2 bg-bg-tertiary rounded-lg p-1">
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

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [salesOverview, setSalesOverview] = useState<SalesOverview | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<OrderStatus[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [customerGrowth, setCustomerGrowth] = useState<CustomerGrowth[]>([]);

  useEffect(() => {
    loadReports();
  }, [period]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [salesRes, revenueRes, productsRes, statusRes, customersRes] = await Promise.all([
        adminApi.getReportsSales(period),
        adminApi.getReportsRevenue(period),
        adminApi.getReportsTopProducts(10),
        adminApi.getReportsOrdersByStatus(),
        adminApi.getReportsCustomers(period),
      ]);

      setSalesOverview(salesRes.data);
      setRevenueData(revenueRes.data.revenue || []);
      setTopProducts(productsRes.data.products || []);
      setOrdersByStatus(statusRes.data.statuses || []);
      setPaymentMethods(statusRes.data.paymentMethods || []);
      setCustomerGrowth(customersRes.data.growth || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    // Compile all data into CSV format
    const rows = [
      ['Silvera Admin Reports'],
      ['Generated:', new Date().toISOString()],
      ['Period:', period],
      [],
      ['Sales Overview'],
      ['Metric', 'Value'],
      ['Today Revenue', salesOverview?.today || 0],
      ['This Week Revenue', salesOverview?.thisWeek || 0],
      ['This Month Revenue', salesOverview?.thisMonth || 0],
      ['All Time Revenue', salesOverview?.allTime || 0],
      ['Orders Today', salesOverview?.ordersToday || 0],
      ['Orders This Week', salesOverview?.ordersThisWeek || 0],
      ['Orders This Month', salesOverview?.ordersThisMonth || 0],
      ['Orders All Time', salesOverview?.ordersAllTime || 0],
      [],
      ['Top Products'],
      ['Product Name', 'Units Sold', 'Revenue'],
      ...topProducts.map(p => [p.name, p.sold, p.revenue]),
      [],
      ['Orders by Status'],
      ['Status', 'Count', 'Percentage'],
      ...ordersByStatus.map(s => [s.status, s.count, `${s.percentage.toFixed(1)}%`]),
      [],
      ['Payment Methods'],
      ['Method', 'Count', 'Total', 'Percentage'],
      ...paymentMethods.map(m => [m.method, m.count, m.total, `${m.percentage.toFixed(1)}%`]),
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `silvera-reports-${period}-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-txt-secondary">Loading reports...</span>
        </div>
      </div>
    );
  }

  const maxProductRevenue = Math.max(...topProducts.map(p => p.revenue), 1);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-accent-gold" size={28} />
          <h1 className="text-2xl font-bold">
            <span className="text-gradient-gold">Reports & Analytics</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DateRangeSelector value={period} onChange={setPeriod} />
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center gap-2 px-4 py-2"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Sales Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(salesOverview?.today || 0)}
          subValue={`${salesOverview?.ordersToday || 0} orders`}
          icon={DollarSign}
        />
        <StatCard
          title="This Week"
          value={formatCurrency(salesOverview?.thisWeek || 0)}
          subValue={`${salesOverview?.ordersThisWeek || 0} orders`}
          icon={TrendingUp}
        />
        <StatCard
          title="This Month"
          value={formatCurrency(salesOverview?.thisMonth || 0)}
          subValue={`${salesOverview?.ordersThisMonth || 0} orders`}
          icon={Calendar}
        />
        <StatCard
          title="All Time"
          value={formatCurrency(salesOverview?.allTime || 0)}
          subValue={`${salesOverview?.ordersAllTime || 0} orders`}
          icon={ShoppingCart}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-txt-primary flex items-center gap-2">
              <TrendingUp size={18} className="text-accent-gold" />
              Revenue Trend
            </h2>
          </div>
          <LineChart data={revenueData} height={220} />
        </div>

        {/* Top Products */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-txt-primary flex items-center gap-2">
              <Package size={18} className="text-accent-gold" />
              Top Selling Products
            </h2>
          </div>
          {topProducts.length > 0 ? (
            <BarChart
              data={topProducts.slice(0, 5).map((p, i) => ({
                label: p.name,
                value: p.revenue,
                color: [CHART_COLORS.gold, CHART_COLORS.green, CHART_COLORS.blue, CHART_COLORS.purple, CHART_COLORS.cyan][i],
              }))}
              maxValue={maxProductRevenue}
            />
          ) : (
            <div className="text-txt-secondary text-center py-8">No sales data yet</div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Orders by Status */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-txt-primary flex items-center gap-2">
              <ShoppingCart size={18} className="text-accent-gold" />
              Orders by Status
            </h2>
          </div>
          {ordersByStatus.length > 0 ? (
            <DonutChart
              data={ordersByStatus.map(s => ({
                label: s.status,
                value: s.count,
                color: STATUS_COLORS[s.status] || CHART_COLORS.gold,
              }))}
            />
          ) : (
            <div className="text-txt-secondary text-center py-8">No orders yet</div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-txt-primary flex items-center gap-2">
              <CreditCard size={18} className="text-accent-gold" />
              Payment Methods
            </h2>
          </div>
          {paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {paymentMethods.map((method, i) => (
                <div key={method.method} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center">
                    {method.method.toLowerCase().includes('gcash') || method.method.toLowerCase().includes('ewallet') ? (
                      <Wallet size={16} className="text-accent-gold" />
                    ) : (
                      <CreditCard size={16} className="text-accent-gold" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-txt-primary capitalize">{method.method}</span>
                      <span className="text-txt-secondary">{method.count} orders</span>
                    </div>
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${method.percentage}%`,
                          backgroundColor: [CHART_COLORS.gold, CHART_COLORS.green, CHART_COLORS.blue, CHART_COLORS.purple][i % 4],
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-txt-primary font-medium text-sm w-20 text-right">
                    {formatCurrency(method.total)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-txt-secondary text-center py-8">No payment data yet</div>
          )}
        </div>
      </div>

      {/* Customer Growth */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-txt-primary flex items-center gap-2">
            <Users size={18} className="text-accent-gold" />
            Customer Growth
          </h2>
          {customerGrowth.length > 0 && (
            <div className="text-sm text-txt-secondary">
              Total: <span className="text-txt-primary font-medium">{customerGrowth[customerGrowth.length - 1]?.totalCustomers || 0}</span> customers
            </div>
          )}
        </div>
        {customerGrowth.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {customerGrowth.slice(-7).map((data, i) => (
              <div key={i} className="text-center p-3 bg-bg-tertiary rounded-lg">
                <div className="text-xs text-txt-tertiary mb-1">{data.date}</div>
                <div className="text-lg font-bold text-accent-gold">+{data.newCustomers}</div>
                <div className="text-xs text-txt-secondary">new</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-txt-secondary text-center py-8">No customer data yet</div>
        )}
      </div>
    </div>
  );
}
