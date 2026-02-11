'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
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
} from '@/components/ui';
import { Product } from '@/lib/types';

export default function ProductsPage() {
  const router = useRouter();
  const { products, loading, error } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Filter products based on search and filters
  const filteredProducts = Array.isArray(products) ? products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || product.category?.id === parseInt(categoryFilter);
    const matchesStatus = !statusFilter || product.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  }) : [];

  const handleDelete = async (id: number | string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      // Delete logic will be implemented in Phase 3
      console.log('Delete product:', id);
    }
  };

  const handleEdit = (id: number | string) => {
    router.push(`/products/${id}`);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
      >
        <Button
          onClick={() => router.push('/products/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Add Product
        </Button>
      </PageHeader>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Search Products"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              label="Category"
              options={[
                { value: '', label: 'All Categories' },
                { value: '1', label: 'Electronics' },
                { value: '2', label: 'Clothing' },
                { value: '3', label: 'Books' },
              ]}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
            <Select
              label="Status"
              options={[
                { value: '', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'draft', label: 'Draft' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Products ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Price</TableHeaderCell>
                  <TableHeaderCell>Stock</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableHead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <TableRow
                      key={product.id}
                      onClick={() => handleEdit(product.id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category?.name || 'Uncategorized'}</TableCell>
                      <TableCell>₱{product.price.toLocaleString('en-PH')}</TableCell>
                      <TableCell>
                        <span className={product.stock < 10 ? 'text-red-600 font-medium' : ''}>
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.status === 'active'
                              ? 'success'
                              : product.status === 'draft'
                                ? 'warning'
                                : 'danger'
                          }
                        >
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleEdit(product.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => handleDelete(product.id)}
                          >
                            Delete
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
              title="No products found"
              description={searchTerm || categoryFilter || statusFilter ? 'Try adjusting your filters' : 'Start by adding your first product'}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
