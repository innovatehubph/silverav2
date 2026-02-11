'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUsers } from '@/hooks/useUsers';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableCell,
  Button,
  LoadingSpinner,
  Alert,
  EmptyState,
} from '@/components/ui';
import { CustomerInfo } from '@/lib/types';

export default function CustomersPage() {
  const router = useRouter();
  const { users, loading, error } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter customers based on search
  const filteredCustomers = Array.isArray(users) ? users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) : [];

  const handleViewProfile = (userId: number | string) => {
    router.push(`/customers/${userId}`);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage customer information and accounts"
      />

      {error && <Alert type="error">{error}</Alert>}

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Input
            label="Search Customers"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Customers ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Phone</TableHeaderCell>
                  <TableHeaderCell>Orders</TableHeaderCell>
                  <TableHeaderCell>Total Spent</TableHeaderCell>
                  <TableHeaderCell>Joined</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableHead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      onClick={() => handleViewProfile(customer.id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone || 'N/A'}</TableCell>
                      <TableCell>{customer.total_orders || 0}</TableCell>
                      <TableCell className="font-semibold">
                        ₱{(customer.total_spent || 0).toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        {customer.registration_date
                          ? new Date(customer.registration_date).toLocaleDateString('en-PH')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleViewProfile(customer.id)}
                          >
                            View
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
              title="No customers found"
              description={searchTerm ? 'Try a different search term' : 'No customers yet'}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
