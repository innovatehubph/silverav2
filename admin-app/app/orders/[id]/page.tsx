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
  Badge,
  LoadingSpinner,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableCell,
} from '@/components/ui';
import { OrderDetails } from '@/lib/types';

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      // Would use getOrder in Phase 3
      const orders = await adminApi.getOrders();
      const found = (orders as any).find((o: any) => o.id === parseInt(orderId));
      if (found) {
        setOrder(found);
      } else {
        setError('Order not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) {
    return (
      <div>
        <PageHeader title="Order Not Found" />
        {error && <Alert type="error">{error}</Alert>}
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Order #${order.id}`}
        description="Order details and status"
      >
        <Button
          onClick={() => router.back()}
          className="bg-slate-300 hover:bg-slate-400 text-slate-900"
        >
          Back
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Status</p>
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
                </div>
                <div>
                  <p className="text-sm text-slate-600">Payment Status</p>
                  <Badge
                    variant={
                      order.payment_status === 'paid' ? 'success' : 'warning'
                    }
                  >
                    {order.payment_status || 'Pending'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Order Date</p>
                  <p className="font-medium">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString('en-PH') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Payment Method</p>
                  <p className="font-medium">{order.payment_method || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableHeaderCell>Product</TableHeaderCell>
                      <TableHeaderCell>Quantity</TableHeaderCell>
                      <TableHeaderCell>Price</TableHeaderCell>
                      <TableHeaderCell>Subtotal</TableHeaderCell>
                    </TableHead>
                    <tbody>
                      {order.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            ₱{item.price.toLocaleString('en-PH', {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ₱{item.subtotal.toLocaleString('en-PH', {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <p className="text-slate-600">No items in this order</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer & Total Info */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Name</p>
                <p className="font-medium">{order.customer_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Email</p>
                <p className="font-medium text-blue-600">{order.customer_email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Phone</p>
                <p className="font-medium">{order.customer_phone || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{order.shipping_address || 'No address provided'}</p>
            </CardContent>
          </Card>

          {/* Order Total */}
          <Card>
            <CardHeader>
              <CardTitle>Order Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-slate-900">
                  ₱{order.total.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-slate-600 text-sm mt-2">Total Amount</p>
              </div>
              <div className="pt-4 border-t space-y-2">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => window.print()}
                >
                  Print Order
                </Button>
                <Button className="w-full bg-slate-300 hover:bg-slate-400 text-slate-900">
                  Send Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
