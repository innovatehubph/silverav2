'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api-client';
import { useCategories } from '@/hooks/useCategories';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableCell,
  LoadingSpinner,
  Alert,
  EmptyState,
  Modal,
} from '@/components/ui';
import { Category } from '@/lib/types';

export default function CategoriesPage() {
  const { categories, loading, error } = useCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', image: '' });
  const [editingId, setEditingId] = useState<number | string | null>(null);

  // Filter categories
  const filteredCategories = Array.isArray(categories)
    ? categories.filter((cat) => cat.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setFormData({ name: category.name, image: category.image || '' });
      setEditingId(category.id);
    } else {
      setFormData({ name: '', image: '' });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Category name is required');
      return;
    }

    try {
      if (editingId) {
        await adminApi.updateCategory(editingId.toString(), formData.name);
      } else {
        await adminApi.createCategory(formData.name, formData.image);
      }
      setShowModal(false);
      // Refresh would happen via hook in Phase 3
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save category');
    }
  };

  const handleDelete = async (id: number | string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        await adminApi.deleteCategory(id.toString());
        // Refresh would happen via hook in Phase 3
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete category');
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Manage product categories"
      >
        <Button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Add Category
        </Button>
      </PageHeader>

      {error && <Alert type="error">{error}</Alert>}

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Input
            label="Search Categories"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Categories ({filteredCategories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCategories.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Products</TableHeaderCell>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableHead>
                <tbody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell>{category.product_count || 0}</TableCell>
                      <TableCell>
                        {category.created_at
                          ? new Date(category.created_at).toLocaleDateString('en-PH')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleOpenModal(category)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => handleDelete(category.id)}
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
              title="No categories found"
              description="Create your first category to get started"
            />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name *"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="Enter category name"
            required
          />
          <Input
            label="Image URL"
            value={formData.image}
            onChange={(e) =>
              setFormData({ ...formData, image: e.target.value })
            }
            placeholder="https://example.com/image.jpg"
          />
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingId ? 'Update Category' : 'Add Category'}
            </Button>
            <Button
              type="button"
              onClick={() => setShowModal(false)}
              className="bg-slate-300 hover:bg-slate-400 text-slate-900"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
