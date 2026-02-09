'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { LoadingSpinner, Alert, PageHeader, Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHead, TableHeaderCell, TableRow, TableCell, EmptyState } from '@/components/ui';

export default function DashboardPage() {
  const { stats, loading, error } = useDashboard();

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome to your admin dashboard. Here's an overview of your business."
      />

      {error && <Alert type="error">{error}</Alert>}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600 text-sm font-medium">Total Orders</p>
            <p className="text-4xl font-bold text-slate-900 mt-2">{stats?.totalOrders ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600 text-sm font-medium">Total Revenue</p>
            <p className="text-4xl font-bold text-slate-900 mt-2">
              ₱{(stats?.totalRevenue ?? 0).toLocaleString('en-PH', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600 text-sm font-medium">Total Products</p>
            <p className="text-4xl font-bold text-slate-900 mt-2">{stats?.totalProducts ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600 text-sm font-medium">Total Customers</p>
            <p className="text-4xl font-bold text-slate-900 mt-2">{stats?.totalUsers ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <Table>
              <TableHead>
                <TableHeaderCell>Order ID</TableHeaderCell>
                <TableHeaderCell>Customer</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Total</TableHeaderCell>
              </TableHead>
              <tbody>
                {stats.recentOrders.slice(0, 5).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>{order.customer_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        order.status === 'completed' ? 'success' :
                        order.status === 'pending' ? 'warning' :
                        'default'
                      }>
                        {order.status || 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₱{(order.total ?? 0).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState title="No orders yet" description="Orders will appear here once you receive them." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
