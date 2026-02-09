'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  LoadingSpinner,
} from '@/components/ui';

export default function AnalyticsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState('30');
  const [loading] = useState(false);

  // Mock data for metrics
  const metrics = [
    {
      title: 'Total Revenue',
      value: '₱125,450.00',
      change: '+12.5%',
      changeType: 'increase',
      icon: '📈',
    },
    {
      title: 'Total Orders',
      value: '1,234',
      change: '+8.2%',
      changeType: 'increase',
      icon: '📦',
    },
    {
      title: 'Average Order Value',
      value: '₱101.68',
      change: '+4.1%',
      changeType: 'increase',
      icon: '💰',
    },
    {
      title: 'Conversion Rate',
      value: '3.24%',
      change: '+0.5%',
      changeType: 'increase',
      icon: '🎯',
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Analytics & Reports"
        description="Overview of your business performance"
      >
        <Select
          options={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' },
            { value: '365', label: 'Last year' },
          ]}
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        />
      </PageHeader>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-600 text-sm font-medium">
                    {metric.title}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {metric.value}
                  </p>
                  <p
                    className={`text-sm mt-2 ${
                      metric.changeType === 'increase'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {metric.change} from previous period
                  </p>
                </div>
                <span className="text-3xl">{metric.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-slate-50 rounded flex items-center justify-center text-slate-500">
              <div className="text-center">
                <p>Chart will be rendered here</p>
                <p className="text-sm mt-2">Line chart showing daily sales</p>
              </div>
            </div>
            <Button
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => router.push('/analytics/sales')}
            >
              View Detailed Sales Report
            </Button>
          </CardContent>
        </Card>

        {/* Revenue Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-slate-50 rounded flex items-center justify-center text-slate-500">
              <div className="text-center">
                <p>Chart will be rendered here</p>
                <p className="text-sm mt-2">Pie chart showing revenue breakdown</p>
              </div>
            </div>
            <Button
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => router.push('/analytics/revenue')}
            >
              View Detailed Revenue Report
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-slate-50 rounded flex items-center justify-center text-slate-500">
            <div className="text-center">
              <p>Chart will be rendered here</p>
              <p className="text-sm mt-2">Pie chart showing order statuses</p>
            </div>
          </div>
          <Button
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => router.push('/analytics/orders')}
          >
            View Detailed Order Analytics
          </Button>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top Performing Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Product 1', sales: 450, revenue: '₱45,000' },
              { name: 'Product 2', sales: 320, revenue: '₱32,000' },
              { name: 'Product 3', sales: 280, revenue: '₱28,000' },
              { name: 'Product 4', sales: 210, revenue: '₱21,000' },
              { name: 'Product 5', sales: 180, revenue: '₱18,000' },
            ].map((product, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-slate-600">{product.sales} sales</p>
                </div>
                <p className="font-semibold">{product.revenue}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
