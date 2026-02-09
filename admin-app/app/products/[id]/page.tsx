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
  Input,
  Textarea,
  Select,
  Alert,
  LoadingSpinner,
} from '@/components/ui';
import { Product } from '@/lib/types';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const isNew = productId === 'new';

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    sale_price: undefined,
    stock: 0,
    status: 'draft',
    featured: false,
  });

  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isNew && productId) {
      loadProduct();
    }
  }, [productId, isNew]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const product = await adminApi.getProducts(); // Would need getProductById in Phase 3
      // For now, find product in list
      const found = (product as any[]).find((p: any) => p.id === parseInt(productId));
      if (found) {
        setFormData(found);
      } else {
        setError('Product not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
            ? parseFloat(value) || 0
            : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!formData.name || !formData.price) {
        setError('Please fill in all required fields');
        return;
      }

      // Validation
      if (formData.price <= 0) {
        setError('Price must be greater than 0');
        return;
      }

      if (formData.stock < 0) {
        setError('Stock cannot be negative');
        return;
      }

      if (isNew) {
        await adminApi.createProduct(formData);
      } else {
        await adminApi.updateProduct(productId, formData);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/products');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={isNew ? 'Add Product' : 'Edit Product'}
        description={isNew ? 'Create a new product' : 'Update product details'}
      />

      {error && <Alert type="error">{error}</Alert>}
      {success && (
        <Alert type="success">
          {isNew ? 'Product created successfully!' : 'Product updated successfully!'}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isNew ? 'New Product' : 'Edit Product'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Product Name *"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  placeholder="Enter product name"
                  required
                />
                <Textarea
                  label="Description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  placeholder="Enter product description"
                  rows={4}
                />
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Pricing & Inventory</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Price *"
                  name="price"
                  type="number"
                  value={formData.price || ''}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  required
                />
                <Input
                  label="Sale Price"
                  name="sale_price"
                  type="number"
                  value={formData.sale_price || ''}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                />
                <Input
                  label="Stock Quantity"
                  name="stock"
                  type="number"
                  value={formData.stock || ''}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Status & Settings */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Status & Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Status"
                  name="status"
                  value={formData.status || 'draft'}
                  onChange={handleChange}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="featured"
                      checked={formData.featured || false}
                      onChange={handleChange}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Featured Product</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-6 border-t">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? 'Saving...' : isNew ? 'Create Product' : 'Update Product'}
              </Button>
              <Button
                type="button"
                onClick={() => router.back()}
                className="bg-slate-300 hover:bg-slate-400 text-slate-900"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
