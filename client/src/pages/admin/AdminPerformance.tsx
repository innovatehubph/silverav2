import { useEffect, useState, useRef } from 'react';
import { adminApi } from '../../utils/api';
import {
  Activity,
  Clock,
  Hash,
  AlertTriangle,
  Server,
  RefreshCw,
} from 'lucide-react';

// Types
interface OverallStats {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  totalRequests: number;
  errorRate: number;
  uptimeHours: number;
}

interface EndpointStat {
  method: string;
  path: string;
  avgTime: number;
  p95Time: number;
  calls: number;
  errorRate: number;
}

interface TimeSeriesEntry {
  time: string;
  avgResponseTime: number;
  requests: number;
  errors: number;
}

// Chart colors (matching AdminReports)
const CHART_COLORS = {
  gold: '#D4AF37',
  goldLight: 'rgba(212, 175, 55, 0.2)',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
};

// Method badge colors
const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-900/30 text-blue-400',
  POST: 'bg-green-900/30 text-green-400',
  PUT: 'bg-yellow-900/30 text-yellow-400',
  DELETE: 'bg-red-900/30 text-red-400',
};

// Stat Card (matching AdminReports pattern)
function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <Icon size={20} className={color || 'text-accent-gold'} />
      </div>
      <div className="text-2xl font-bold text-txt-primary">{value}</div>
      <div className="text-sm text-txt-secondary mt-1">{title}</div>
      {subValue && <div className="text-xs text-txt-tertiary mt-1">{subValue}</div>}
    </div>
  );
}

// Response Time Line Chart (CSS SVG, matching AdminReports)
function ResponseTimeChart({ data, height = 220 }: { data: TimeSeriesEntry[]; height?: number }) {
  if (data.length === 0) return <div className="text-txt-secondary text-center py-8">No data</div>;

  const maxTime = Math.max(...data.map(d => d.avgResponseTime), 1);
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1 || 1)) * 100,
    y: 100 - (d.avgResponseTime / maxTime) * 100,
  }));

  const pathD = points.length > 1
    ? `M ${points[0].x} ${points[0].y} ${points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`
    : '';

  // Format time labels
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-14 flex flex-col justify-between text-xs text-txt-tertiary py-2">
        <span>{maxTime}ms</span>
        <span>{Math.round(maxTime / 2)}ms</span>
        <span>0ms</span>
      </div>

      {/* Chart area */}
      <div className="ml-14 h-full relative">
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
          {data.length > 0 && <span>{formatTime(data[0].time)}</span>}
          {data.length > 2 && <span>{formatTime(data[Math.floor(data.length / 2)].time)}</span>}
          {data.length > 1 && <span>{formatTime(data[data.length - 1].time)}</span>}
        </div>
      </div>
    </div>
  );
}

// Throughput bar chart (requests per minute)
function ThroughputChart({ data, height = 120 }: { data: TimeSeriesEntry[]; height?: number }) {
  if (data.length === 0) return <div className="text-txt-secondary text-center py-8">No data</div>;

  const maxReqs = Math.max(...data.map(d => d.requests), 1);

  return (
    <div className="relative" style={{ height }}>
      <div className="absolute left-0 top-0 bottom-0 w-14 flex flex-col justify-between text-xs text-txt-tertiary py-2">
        <span>{maxReqs}</span>
        <span>0</span>
      </div>
      <div className="ml-14 h-full flex items-end gap-px">
        {data.map((d, i) => {
          const pct = (d.requests / maxReqs) * 100;
          const hasErrors = d.errors > 0;
          return (
            <div
              key={i}
              className="flex-1 rounded-t transition-all duration-300"
              style={{
                height: `${Math.max(pct, 1)}%`,
                backgroundColor: hasErrors ? CHART_COLORS.red : CHART_COLORS.gold,
                opacity: hasErrors ? 0.8 : 0.6,
              }}
              title={`${d.requests} req${d.errors ? `, ${d.errors} errors` : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function AdminPerformance() {
  const [loading, setLoading] = useState(true);
  const [overall, setOverall] = useState<OverallStats | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointStat[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMetrics = async () => {
    try {
      const res = await adminApi.getPerformanceMetrics();
      setOverall(res.data.overall);
      setEndpoints(res.data.endpoints);
      setTimeSeries(res.data.timeSeries);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadMetrics, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-txt-secondary">Loading performance metrics...</span>
        </div>
      </div>
    );
  }

  const formatUptime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours}h`;
    return `${Math.round(hours / 24 * 10) / 10}d`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Activity className="text-accent-gold" size={28} />
          <h1 className="text-2xl font-bold">
            <span className="text-gradient-gold">Performance</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-txt-tertiary">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
              autoRefresh
                ? 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold'
                : 'border-bdr-subtle text-txt-secondary hover:text-txt-primary'
            }`}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={loadMetrics}
            className="btn-secondary flex items-center gap-2 px-4 py-2"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Avg Response Time"
          value={`${overall?.avgResponseTime || 0}ms`}
          subValue={`P95: ${overall?.p95ResponseTime || 0}ms / P99: ${overall?.p99ResponseTime || 0}ms`}
          icon={Clock}
        />
        <StatCard
          title="Requests (1hr)"
          value={(overall?.totalRequests || 0).toLocaleString()}
          subValue={`~${Math.round((overall?.totalRequests || 0) / 60)}/min`}
          icon={Hash}
        />
        <StatCard
          title="Error Rate"
          value={`${overall?.errorRate || 0}%`}
          subValue={`${overall?.totalRequests ? Math.round(overall.totalRequests * (overall.errorRate / 100)) : 0} errors`}
          icon={AlertTriangle}
          color={
            (overall?.errorRate || 0) > 5
              ? 'text-red-400'
              : (overall?.errorRate || 0) > 1
              ? 'text-yellow-400'
              : 'text-green-400'
          }
        />
        <StatCard
          title="Uptime"
          value={formatUptime(overall?.uptimeHours || 0)}
          subValue={`Since ${new Date(Date.now() - (overall?.uptimeHours || 0) * 3600000).toLocaleDateString()}`}
          icon={Server}
          color="text-green-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Response Time Trend */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-txt-primary flex items-center gap-2">
              <Clock size={18} className="text-accent-gold" />
              Response Time (last 60 min)
            </h2>
          </div>
          <ResponseTimeChart data={timeSeries} />
        </div>

        {/* Throughput */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-txt-primary flex items-center gap-2">
              <Activity size={18} className="text-accent-gold" />
              Throughput (req/min)
            </h2>
            <span className="text-xs text-txt-tertiary">
              Red bars indicate errors
            </span>
          </div>
          <ThroughputChart data={timeSeries} />
        </div>
      </div>

      {/* Endpoint Performance Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-txt-primary flex items-center gap-2">
            <Server size={18} className="text-accent-gold" />
            Endpoint Performance
          </h2>
          <span className="text-xs text-txt-tertiary">
            Top 20 by avg response time
          </span>
        </div>

        {endpoints.length === 0 ? (
          <div className="text-txt-secondary text-center py-8">
            No API traffic recorded yet. Metrics will appear as requests come in.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bdr-subtle">
                  <th className="text-left py-3 px-2 text-txt-tertiary font-medium">Method</th>
                  <th className="text-left py-3 px-2 text-txt-tertiary font-medium">Path</th>
                  <th className="text-right py-3 px-2 text-txt-tertiary font-medium">Avg</th>
                  <th className="text-right py-3 px-2 text-txt-tertiary font-medium">P95</th>
                  <th className="text-right py-3 px-2 text-txt-tertiary font-medium">Calls</th>
                  <th className="text-right py-3 px-2 text-txt-tertiary font-medium">Error %</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep, i) => (
                  <tr key={i} className="border-b border-bdr-subtle/50 hover:bg-bg-hover transition-colors">
                    <td className="py-2.5 px-2">
                      <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${METHOD_COLORS[ep.method] || 'bg-bg-tertiary text-txt-secondary'}`}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-txt-primary text-xs">{ep.path}</td>
                    <td className="py-2.5 px-2 text-right text-txt-primary">
                      <span className={ep.avgTime > 500 ? 'text-red-400' : ep.avgTime > 200 ? 'text-yellow-400' : 'text-green-400'}>
                        {ep.avgTime}ms
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-txt-secondary">{ep.p95Time}ms</td>
                    <td className="py-2.5 px-2 text-right text-txt-secondary">{ep.calls.toLocaleString()}</td>
                    <td className="py-2.5 px-2 text-right">
                      <span className={ep.errorRate > 5 ? 'text-red-400' : ep.errorRate > 0 ? 'text-yellow-400' : 'text-green-400'}>
                        {ep.errorRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
