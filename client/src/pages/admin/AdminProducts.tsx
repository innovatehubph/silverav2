import { useEffect, useState, useRef } from 'react';
import { adminApi } from '../../utils/api';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Save,
  ImageIcon,
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  sale_price?: number;
  category_id: number;
  stock: number;
  featured: boolean;
  status: 'active' | 'inactive' | 'draft';
  images: string[] | string;
  low_stock_threshold?: number;
  created_at: string;
}

const statusBadge: Record<string, string> = {
  active: 'bg-green-900/30 text-green-400',
  inactive: 'bg-red-900/30 text-red-400',
  draft: 'bg-yellow-900/30 text-yellow-400',
};

const emptyForm = {
  name: '',
  description: '',
  price: '',
  sale_price: '',
  stock: '',
  category_id: '',
  status: 'active' as 'active' | 'inactive' | 'draft',
  featured: false,
  low_stock_threshold: '10',
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await adminApi.getProducts();
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImages([]);
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      sale_price: product.sale_price?.toString() || '',
      stock: product.stock.toString(),
      category_id: product.category_id?.toString() || '',
      status: product.status,
      featured: product.featured,
      low_stock_threshold: product.low_stock_threshold?.toString() || '10',
    });
    setImages([]);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast.error('Name and price are required');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('price', form.price);
      if (form.sale_price) fd.append('sale_price', form.sale_price);
      fd.append('stock', form.stock || '0');
      if (form.category_id) fd.append('category_id', form.category_id);
      fd.append('status', form.status);
      fd.append('featured', form.featured.toString());
      fd.append('low_stock_threshold', form.low_stock_threshold || '10');
      images.forEach((img) => fd.append('images', img));

      if (editingId) {
        await adminApi.updateProduct(editingId, fd);
        toast.success('Product updated');
      } else {
        await adminApi.createProduct(fd);
        toast.success('Product created');
      }
      setShowForm(false);
      loadProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return;
    try {
      await adminApi.deleteProduct(id);
      toast.success('Product deleted');
      setProducts(products.filter((p) => p.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete');
    }
  };

  const getImageUrl = (product: Product) => {
    const imgs = typeof product.images === 'string'
      ? (() => { try { return JSON.parse(product.images); } catch { return [product.images]; } })()
      : product.images;
    return Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-txt-secondary">Loading products...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="text-accent-gold" size={28} />
          <h1 className="text-2xl font-bold">
            <span className="text-gradient-gold">Products</span>
          </h1>
          <span className="text-sm text-txt-tertiary">({products.length})</span>
        </div>
        <button onClick={openCreate} className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-full pl-9 py-2 text-sm"
        />
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-txt-primary">
                {editingId ? 'Edit Product' : 'New Product'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-txt-tertiary hover:text-txt-primary">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-txt-secondary mb-1">Name *</label>
                <input
                  className="input-field w-full py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-txt-secondary mb-1">Description</label>
                <textarea
                  className="input-field w-full py-2 text-sm min-h-[80px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-txt-secondary mb-1">Price *</label>
                  <input
                    type="number"
                    className="input-field w-full py-2 text-sm"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-txt-secondary mb-1">Sale Price</label>
                  <input
                    type="number"
                    className="input-field w-full py-2 text-sm"
                    value={form.sale_price}
                    onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-txt-secondary mb-1">Stock</label>
                  <input
                    type="number"
                    className="input-field w-full py-2 text-sm"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-txt-secondary mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    className="input-field w-full py-2 text-sm"
                    value={form.low_stock_threshold}
                    onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm text-txt-secondary mb-1">Category ID</label>
                  <input
                    type="number"
                    className="input-field w-full py-2 text-sm"
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-txt-secondary mb-1">Status</label>
                  <select
                    className="input-field w-full py-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-txt-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                      className="rounded border-bdr accent-accent-gold"
                    />
                    Featured
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm text-txt-secondary mb-1">Images</label>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImages(Array.from(e.target.files || []))}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                  <ImageIcon size={16} /> Choose Files
                </button>
                {images.length > 0 && (
                  <p className="text-xs text-txt-tertiary mt-1">{images.length} file(s) selected</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-ghost px-4 py-2 rounded-lg text-sm">
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

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-secondary border-b border-bdr">
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Image</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Name</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Price</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Stock</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Status</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const imgUrl = getImageUrl(product);
                return (
                  <tr key={product.id} className="border-b border-bdr-subtle hover:bg-bg-hover transition-colors">
                    <td className="py-2.5 px-4">
                      {imgUrl ? (
                        <img src={imgUrl} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center">
                          <ImageIcon size={16} className="text-txt-tertiary" />
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-txt-primary max-w-[200px] truncate">{product.name}</td>
                    <td className="py-2.5 px-4 text-right text-txt-primary">
                      ₱{product.price?.toLocaleString()}
                      {product.sale_price && (
                        <span className="text-green-400 text-xs ml-1">₱{product.sale_price.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-txt-secondary">{product.stock}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusBadge[product.status] || 'bg-zinc-800 text-zinc-400'}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(product)}
                          className="p-1.5 rounded hover:bg-bg-hover text-txt-secondary hover:text-accent-gold transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1.5 rounded hover:bg-red-900/20 text-txt-secondary hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-txt-secondary text-sm py-8 text-center">
              {search ? 'No products match your search' : 'No products yet'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
