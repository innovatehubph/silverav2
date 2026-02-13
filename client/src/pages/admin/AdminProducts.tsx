import { useEffect, useState, useRef, useCallback } from 'react';
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
  CheckSquare,
  Square,
  Filter,
  GripVertical,
  AlertTriangle,
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

interface Category {
  id: number;
  name: string;
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

function StockBadge({ stock, threshold }: { stock: number; threshold?: number }) {
  const t = threshold ?? 10;
  let cls: string;
  let label: string;
  if (stock === 0) {
    cls = 'bg-red-900/30 text-red-400';
    label = 'Out of stock';
  } else if (stock <= t) {
    cls = 'bg-yellow-900/30 text-yellow-400';
    label = `Low: ${stock}`;
  } else {
    cls = 'bg-green-900/30 text-green-400';
    label = `${stock}`;
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
}

// Drag-and-drop image list for the edit modal
function DraggableImageList({
  existingImages,
  onReorder,
  onRemove,
}: {
  existingImages: string[];
  onReorder: (images: string[]) => void;
  onRemove: (index: number) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...existingImages];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    onReorder(reordered);
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  if (existingImages.length === 0) return null;

  return (
    <div className="space-y-1">
      <label className="block text-sm text-txt-secondary mb-1">Current Images (drag to reorder)</label>
      <div className="flex flex-wrap gap-2">
        {existingImages.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className={`relative group w-20 h-20 rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
              dragIdx === idx ? 'border-accent-gold opacity-60' : 'border-bdr-subtle'
            }`}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <GripVertical size={14} className="text-white/80" />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="p-0.5 rounded bg-red-600/80 hover:bg-red-600 text-white"
              >
                <X size={12} />
              </button>
            </div>
            {idx === 0 && (
              <span className="absolute top-0.5 left-0.5 bg-accent-gold/90 text-[10px] text-bg-primary font-bold px-1 rounded">
                Main
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Bulk selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showBulkStock, setShowBulkStock] = useState(false);
  const [bulkStockValue, setBulkStockValue] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        adminApi.getProducts(),
        adminApi.getCategories(),
      ]);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseImages = useCallback((product: Product): string[] => {
    const imgs = typeof product.images === 'string'
      ? (() => { try { return JSON.parse(product.images); } catch { return product.images ? [product.images] : []; } })()
      : product.images;
    return Array.isArray(imgs) ? imgs : [];
  }, []);

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !filterCategory || p.category_id?.toString() === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || '—';
  };

  // Selection helpers
  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  };

  const clearSelection = () => setSelected(new Set());

  // CRUD
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImages([]);
    setExistingImages([]);
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
    setExistingImages(parseImages(product));
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

      // If editing, send the reordered existing images so server preserves order
      if (editingId && existingImages.length > 0) {
        fd.append('images', JSON.stringify(existingImages));
      }

      images.forEach((img) => fd.append('images', img));

      if (editingId) {
        await adminApi.updateProduct(editingId, fd);
        toast.success('Product updated');
      } else {
        await adminApi.createProduct(fd);
        toast.success('Product created');
      }
      setShowForm(false);
      loadData();
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
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete');
    }
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} product(s)?`)) return;
    try {
      await adminApi.bulkDeleteProducts(ids);
      toast.success(`${ids.length} product(s) deleted`);
      setSelected(new Set());
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Bulk delete failed');
    }
  };

  const handleBulkStock = async () => {
    const ids = Array.from(selected);
    const stock = parseInt(bulkStockValue);
    if (ids.length === 0 || isNaN(stock) || stock < 0) {
      toast.error('Enter a valid stock value');
      return;
    }
    if (!confirm(`Set stock to ${stock} for ${ids.length} product(s)?`)) return;
    try {
      await adminApi.bulkUpdateStock(ids, stock);
      toast.success(`Stock updated for ${ids.length} product(s)`);
      setShowBulkStock(false);
      setBulkStockValue('');
      setSelected(new Set());
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Bulk stock update failed');
    }
  };

  const handleRemoveExistingImage = (idx: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== idx));
  };

  const getImageUrl = (product: Product) => {
    const imgs = parseImages(product);
    return imgs.length > 0 ? imgs[0] : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-txt-secondary">Loading products...</span>
        </div>
      </div>
    );
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0;

  return (
    <div>
      {/* Header */}
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

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full pl-9 py-2 text-sm"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field pl-9 pr-8 py-2 text-sm appearance-none min-w-[180px]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id.toString()}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {someSelected && (
        <div className="mb-4 flex flex-wrap items-center gap-3 p-3 rounded-lg bg-accent-gold/10 border border-accent-gold/20">
          <span className="text-sm text-txt-primary font-medium">{selected.size} selected</span>
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1.5 rounded-lg text-sm bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={14} /> Delete
          </button>
          {!showBulkStock ? (
            <button
              onClick={() => setShowBulkStock(true)}
              className="px-3 py-1.5 rounded-lg text-sm bg-bg-tertiary text-txt-secondary hover:text-txt-primary hover:bg-bg-hover transition-colors flex items-center gap-1.5"
            >
              <Package size={14} /> Set Stock
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder="Stock qty"
                value={bulkStockValue}
                onChange={(e) => setBulkStockValue(e.target.value)}
                className="input-field w-24 py-1.5 text-sm"
                autoFocus
              />
              <button onClick={handleBulkStock} className="btn-primary px-3 py-1.5 rounded-lg text-sm">Apply</button>
              <button onClick={() => { setShowBulkStock(false); setBulkStockValue(''); }} className="text-txt-tertiary hover:text-txt-primary">
                <X size={16} />
              </button>
            </div>
          )}
          <button onClick={clearSelection} className="ml-auto text-sm text-txt-tertiary hover:text-txt-primary transition-colors">
            Clear selection
          </button>
        </div>
      )}

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
                  <label className="block text-sm text-txt-secondary mb-1">Category</label>
                  <select
                    className="input-field w-full py-2 text-sm"
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id.toString()}>{c.name}</option>
                    ))}
                  </select>
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

              {/* Drag-and-drop existing images */}
              {editingId && (
                <DraggableImageList
                  existingImages={existingImages}
                  onReorder={setExistingImages}
                  onRemove={handleRemoveExistingImage}
                />
              )}

              {/* New image upload */}
              <div>
                <label className="block text-sm text-txt-secondary mb-1">
                  {editingId ? 'Add New Images' : 'Images'}
                </label>
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

      {/* Bulk Stock Modal */}
      {/* (inline in bulk actions bar above) */}

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-secondary border-b border-bdr">
                <th className="py-3 px-3 w-10">
                  <button onClick={toggleSelectAll} className="text-txt-tertiary hover:text-accent-gold transition-colors">
                    {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Image</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Name</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium hidden md:table-cell">Category</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Price</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Stock</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Status</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const imgUrl = getImageUrl(product);
                const isSelected = selected.has(product.id);
                const isLowStock = product.stock <= (product.low_stock_threshold ?? 10) && product.stock > 0;
                return (
                  <tr
                    key={product.id}
                    className={`border-b border-bdr-subtle hover:bg-bg-hover transition-colors ${isSelected ? 'bg-accent-gold/5' : ''}`}
                  >
                    <td className="py-2.5 px-3">
                      <button onClick={() => toggleSelect(product.id)} className="text-txt-tertiary hover:text-accent-gold transition-colors">
                        {isSelected ? <CheckSquare size={18} className="text-accent-gold" /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="py-2.5 px-4">
                      {imgUrl ? (
                        <img src={imgUrl} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center">
                          <ImageIcon size={16} className="text-txt-tertiary" />
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="text-txt-primary max-w-[200px] truncate">{product.name}</div>
                      {isLowStock && (
                        <div className="flex items-center gap-1 mt-0.5 text-yellow-400 text-xs">
                          <AlertTriangle size={11} /> Low stock
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-txt-secondary hidden md:table-cell">
                      {getCategoryName(product.category_id)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-txt-primary">
                      <div>₱{product.price?.toLocaleString()}</div>
                      {product.sale_price != null && product.sale_price > 0 && (
                        <div className="text-green-400 text-xs">₱{product.sale_price.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <StockBadge stock={product.stock} threshold={product.low_stock_threshold} />
                    </td>
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
              {search || filterCategory ? 'No products match your filters' : 'No products yet'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
