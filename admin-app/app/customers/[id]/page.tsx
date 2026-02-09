'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi } from '@/lib/api-client';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  LoadingSpinner,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableCell,
  Badge,
} from '@/components/ui';
import { CustomerInfo, Order } from '@/lib/types';

export default function CustomerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load customer
      const users = await adminApi.getUsers();
      const found = (users as any).find((u: any) => u.id === parseInt(customerId));
      if (found) {
        setCustomer(found);
      } else {
        setError('Customer not found');
        return;
      }

      // Load customer orders (would use getUserOrders in Phase 3)
      const allOrders = await adminApi.getOrders();
      const customerOrders = (allOrders as any).filter(
        (o: any) => o.customer_id === parseInt(customerId)
      );
      setOrders(customerOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!customer) {
    return (
      <div>
        <PageHeader title="Customer Not Found" />
        {error && <Alert type="error">{error}</Alert>}
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={customer.name}
        description="Customer profile and order history"
      >
        <Button
          onClick={() => router.back()}
          className="bg-slate-300 hover:bg-slate-400 text-slate-900"
        >
          Back
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Name</p>
                  <p className="font-medium">{customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Email</p>
                  <p className="font-medium text-blue-600">{customer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Phone</p>
                  <p className="font-medium">{customer.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Role</p>
                  <p className="font-medium">{customer.role || 'Customer'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order History */}
          <Card>
            <CardHeader>
              <CardTitle>Order History ({orders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableHeaderCell>Order ID</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Total</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Action</TableHeaderCell>
                    </TableHead>
                    <tbody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>
                            {new Date().toLocaleDateString('en-PH')}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ₱{order.total.toLocaleString('en-PH', {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.status === 'completed'
                                  ? 'success'
                                  : order.status === 'pending'
                                    ? 'warning'
                                    : 'info'
                              }
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() =>
                                router.push(`/orders/${order.id}`)
                              }
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <p className="text-slate-600">No orders yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          {/* Customer Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center p-4 bg-blue-50 rounded">
                <p className="text-3xl font-bold text-blue-900">
                  {customer.total_orders || 0}
                </p>
                <p className="text-sm text-blue-600">Total Orders</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded">
                <p className="text-3xl font-bold text-green-900">
                  ₱{(customer.total_spent || 0).toLocaleString('en-PH')}
                </p>
                <p className="text-sm text-green-600">Total Spent</p>
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          {customer.addresses && customer.addresses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Addresses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {customer.addresses.map((address) => (
                  <div key={address.id} className="p-3 bg-slate-50 rounded border">
                    <p className="font-medium text-sm">{address.street}</p>
                    <p className="text-sm text-slate-600">
                      {address.city}, {address.state}
                    </p>
                    <p className="text-sm text-slate-600">{address.postal_code}</p>
                    {address.is_default && (
                      <Badge variant="success">Default</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Send Message
              </Button>
              <Button className="w-full bg-slate-300 hover:bg-slate-400 text-slate-900">
                View Activities
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
