import { useEffect, useState, useRef } from 'react';
import { adminApi } from '../../utils/api';
import { toast } from 'sonner';
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Save,
  ImageIcon,
  Package,
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string;
  created_at: string;
  product_count?: number;
}

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  image: '',
};

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await adminApi.getCategories();
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const openEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug || '',
      description: category.description || '',
      image: category.image || '',
    });
    setImageFile(null);
    setImagePreview(category.image || null);
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return form.image || null;

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const res = await adminApi.uploadCategoryImage(formData);
      return res.data.image?.url || null;
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setSaving(true);
    try {
      // Upload image first if there's a new one
      let imageUrl = form.image;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const slug = form.slug || generateSlug(form.name);
      const categoryData = {
        name: form.name.trim(),
        slug,
        description: form.description.trim(),
        image: imageUrl,
      };

      if (editingId) {
        await adminApi.updateCategory(editingId, categoryData);
        toast.success('Category updated');
      } else {
        await adminApi.createCategory(categoryData);
        toast.success('Category created');
      }

      setShowForm(false);
      loadCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return;

    setDeleting(id);
    try {
      await adminApi.deleteCategory(id);
      toast.success('Category deleted');
      setCategories(categories.filter((c) => c.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete category');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-txt-secondary">Loading categories...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderTree className="text-accent-gold" size={28} />
          <h1 className="text-2xl font-bold">
            <span className="text-gradient-gold">Categories</span>
          </h1>
          <span className="text-sm text-txt-tertiary">({categories.length})</span>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary"
        />
        <input
          type="text"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-full pl-9 py-2 text-sm"
        />
      </div>

      {/* Category Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-txt-primary">
                {editingId ? 'Edit Category' : 'New Category'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-txt-tertiary hover:text-txt-primary"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm text-txt-secondary mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  className="input-field w-full py-2 text-sm"
                  value={form.name}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      name: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                  placeholder="e.g., Electronics"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm text-txt-secondary mb-1">
                  Slug
                </label>
                <input
                  className="input-field w-full py-2 text-sm"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto-generated-from-name"
                />
                <p className="text-xs text-txt-tertiary mt-1">
                  URL-friendly identifier (auto-generated if left empty)
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-txt-secondary mb-1">
                  Description
                </label>
                <textarea
                  className="input-field w-full py-2 text-sm min-h-[80px] resize-none"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Brief description of this category..."
                />
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm text-txt-secondary mb-1">
                  Image
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />

                {imagePreview ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-bdr">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      width={128}
                      height={128}
                    />
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setForm({ ...form, image: '' });
                      }}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                    >
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                  >
                    <ImageIcon size={16} /> Choose Image
                  </button>
                )}

                {imageFile && (
                  <p className="text-xs text-txt-tertiary mt-1">
                    Selected: {imageFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="btn-ghost px-4 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((category) => (
          <div
            key={category.id}
            className="card p-4 hover:border-accent-gold/30 transition-all group"
          >
            {/* Image */}
            <div className="aspect-video rounded-lg overflow-hidden bg-bg-tertiary mb-3">
              {category.image ? (
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  width={400}
                  height={225}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FolderTree size={32} className="text-txt-tertiary" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-1">
              <h3 className="font-semibold text-txt-primary truncate">
                {category.name}
              </h3>
              <p className="text-xs text-txt-tertiary truncate">
                /{category.slug}
              </p>
              {category.description && (
                <p className="text-sm text-txt-secondary line-clamp-2">
                  {category.description}
                </p>
              )}
            </div>

            {/* Product count */}
            <div className="flex items-center gap-1 mt-2 text-xs text-txt-tertiary">
              <Package size={12} />
              <span>{category.product_count || 0} products</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-bdr-subtle">
              <button
                onClick={() => openEdit(category)}
                className="p-1.5 rounded hover:bg-bg-hover text-txt-secondary hover:text-accent-gold transition-colors"
                title="Edit"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => handleDelete(category.id, category.name)}
                disabled={deleting === category.id}
                className="p-1.5 rounded hover:bg-red-900/20 text-txt-secondary hover:text-red-400 transition-colors disabled:opacity-50"
                title="Delete"
              >
                {deleting === category.id ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card p-8 text-center">
          <FolderTree size={48} className="mx-auto text-txt-tertiary mb-4" />
          <p className="text-txt-secondary">
            {search
              ? 'No categories match your search'
              : 'No categories yet. Create your first category!'}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              className="btn-primary px-4 py-2 rounded-lg mt-4 text-sm inline-flex items-center gap-2"
            >
              <Plus size={16} /> Add Category
            </button>
          )}
        </div>
      )}
    </div>
  );
}
