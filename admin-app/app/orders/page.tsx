'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks/useOrders';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableCell,
  Badge,
  LoadingSpinner,
  Alert,
  EmptyState,
  Modal,
} from '@/components/ui';
import { Order } from '@/lib/types';

export default function OrdersPage() {
  const router = useRouter();
  const { orders, loading, error } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  // Filter orders based on search and status
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.id.toString().includes(searchTerm) ||
                         (order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setShowStatusModal(true);
  };

  const submitStatusUpdate = async () => {
    if (selectedOrder) {
      // Update logic will be implemented in Phase 3
      console.log(`Update order ${selectedOrder.id} status to ${newStatus}`);
      setShowStatusModal(false);
    }
  };

  const handleViewDetails = (orderId: number | string) => {
    router.push(`/orders/${orderId}`);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Manage all customer orders"
      />

      {error && <Alert type="error">{error}</Alert>}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Search Orders"
              placeholder="Search by order ID or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              label="Order Status"
              options={[
                { value: '', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'processing', label: 'Processing' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Orders ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableHeaderCell>Order ID</TableHeaderCell>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Total</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableHead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      onClick={() => handleViewDetails(order.id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>{order.customer_name || 'N/A'}</TableCell>
                      <TableCell>
                        {new Date().toLocaleDateString('en-PH')}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₱{order.total.toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === 'completed'
                              ? 'success'
                              : order.status === 'pending'
                                ? 'warning'
                                : order.status === 'processing'
                                  ? 'info'
                                  : 'danger'
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleViewDetails(order.id)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => handleStatusUpdate(order)}
                          >
                            Update
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No orders found"
              description={searchTerm || statusFilter ? 'Try adjusting your filters' : 'No orders yet'}
            />
          )}
        </CardContent>
      </Card>

      {/* Status Update Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={`Update Order #${selectedOrder?.id} Status`}
      >
        <div className="space-y-4">
          <Select
            label="New Status"
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'processing', label: 'Processing' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          />
          <div className="flex gap-2 pt-4">
            <Button
              onClick={submitStatusUpdate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update Status
            </Button>
            <Button
              onClick={() => setShowStatusModal(false)}
              className="bg-slate-300 hover:bg-slate-400 text-slate-900"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
