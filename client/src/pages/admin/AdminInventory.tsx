import { useEffect, useState } from 'react';
import { adminApi } from '../../utils/api';
import { toast } from 'sonner';
import {
  Warehouse,
  Search,
  AlertTriangle,
  Download,
  ChevronDown,
  Package,
  Save,
  History,
  ArrowUpDown,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';

interface InventoryProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  sale_price?: number;
  stock: number;
  low_stock_threshold: number;
  status: string;
  images?: string;
  category_id?: number;
  category_name?: string;
}

interface LogEntry {
  id: number;
  product_id: number;
  product_name: string;
  previous_stock: number;
  new_stock: number;
  change_amount: number;
  change_type: string;
  changed_by_name: string;
  note?: string;
  created_at: string;
}

type Tab = 'overview' | 'bulk' | 'log';

export default function AdminInventory() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Inline edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStock, setEditStock] = useState('');
  const [editNote, setEditNote] = useState('');
  const [savingStock, setSavingStock] = useState(false);

  // Bulk update
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStock, setBulkStock] = useState('');
  const [bulkNote, setBulkNote] = useState('');
  const [savingBulk, setSavingBulk] = useState(false);

  // Audit log
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const res = await adminApi.getInventory();
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLogLoading(true);
    try {
      const res = await adminApi.getInventoryLog({ limit: 200 });
      setLogs(res.data.logs || []);
      setLogTotal(res.data.total || 0);
    } catch (error) {
      console.error('Failed to load inventory log:', error);
      toast.error('Failed to load audit log');
    } finally {
      setLogLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'log' && logs.length === 0) {
      loadLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toString().includes(search);
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && p.stock <= (p.low_stock_threshold || 10) && p.stock > 0) ||
      (stockFilter === 'out' && p.stock === 0) ||
      (stockFilter === 'ok' && p.stock > (p.low_stock_threshold || 10));
    return matchesSearch && matchesStock;
  });

  const lowStockCount = products.filter(
    (p) => p.stock <= (p.low_stock_threshold || 10) && p.stock > 0
  ).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getFirstImage = (images?: string) => {
    if (!images) return null;
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed[0]?.url || parsed[0] : null;
    } catch {
      return null;
    }
  };

  const handleStartEdit = (product: InventoryProduct) => {
    setEditingId(product.id);
    setEditStock(product.stock.toString());
    setEditNote('');
  };

  const handleSaveStock = async (productId: number) => {
    setSavingStock(true);
    try {
      const res = await adminApi.updateStock(productId, parseInt(editStock) || 0, editNote || undefined);
      setProducts(products.map((p) =>
        p.id === productId ? { ...p, stock: res.data.new_stock } : p
      ));
      setEditingId(null);
      toast.success(`Stock updated: ${res.data.previous_stock} → ${res.data.new_stock}`);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update stock');
    } finally {
      setSavingStock(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one product');
      return;
    }
    if (bulkStock === '') {
      toast.error('Enter a stock quantity');
      return;
    }
    setSavingBulk(true);
    try {
      const ids = Array.from(selectedIds);
      const newStock = parseInt(bulkStock) || 0;
      const res = await adminApi.bulkUpdateInventory(ids, newStock, bulkNote || undefined);
      setProducts(products.map((p) =>
        selectedIds.has(p.id) ? { ...p, stock: newStock } : p
      ));
      setSelectedIds(new Set());
      setBulkStock('');
      setBulkNote('');
      toast.success(`Updated stock for ${res.data.updated} products`);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to bulk update stock');
    } finally {
      setSavingBulk(false);
    }
  };

  const exportToCSV = () => {
    if (filtered.length === 0) {
      toast.error('No products to export');
      return;
    }

    const headers = ['ID', 'Name', 'Category', 'Price', 'Sale Price', 'Stock', 'Low Stock Threshold', 'Status'];
    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows = filtered.map((p) =>
      [
        p.id.toString(),
        p.name,
        p.category_name || '',
        p.price.toString(),
        p.sale_price?.toString() || '',
        p.stock.toString(),
        (p.low_stock_threshold || 10).toString(),
        p.status,
      ].map((v) => escapeCSV(v))
    );

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `silvera-inventory-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} products to CSV`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-txt-secondary">Loading inventory...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Warehouse className="text-accent-gold" size={28} />
          <h1 className="text-2xl font-bold">
            <span className="text-gradient-gold">Inventory</span>
          </h1>
          <span className="text-sm text-txt-tertiary">({products.length} products)</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <div className="text-2xl font-bold text-txt-primary">{products.length}</div>
          <div className="text-xs text-txt-tertiary">Total Products</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-accent-gold">{totalStock.toLocaleString()}</div>
          <div className="text-xs text-txt-tertiary">Total Stock Units</div>
        </div>
        <button onClick={() => setStockFilter('low')} className="card p-4 text-left hover:ring-1 hover:ring-yellow-500/30 transition-all">
          <div className="text-2xl font-bold text-yellow-400">{lowStockCount}</div>
          <div className="text-xs text-txt-tertiary flex items-center gap-1">
            <AlertTriangle size={10} /> Low Stock
          </div>
        </button>
        <button onClick={() => setStockFilter('out')} className="card p-4 text-left hover:ring-1 hover:ring-red-500/30 transition-all">
          <div className="text-2xl font-bold text-red-400">{outOfStockCount}</div>
          <div className="text-xs text-txt-tertiary">Out of Stock</div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-bdr-subtle pb-2">
        {([
          { id: 'overview' as const, label: 'Stock Overview', icon: Package },
          { id: 'bulk' as const, label: 'Bulk Update', icon: ArrowUpDown },
          { id: 'log' as const, label: 'Audit Log', icon: History },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-gold/10 text-accent-gold border border-accent-gold/30'
                : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
              }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stock Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary" />
              <input
                type="text"
                placeholder="Search by product name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field w-full pl-9 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="input-field py-2 pl-3 pr-8 text-sm appearance-none cursor-pointer"
                >
                  <option value="all">All Stock</option>
                  <option value="low">Low Stock</option>
                  <option value="out">Out of Stock</option>
                  <option value="ok">In Stock</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-txt-tertiary pointer-events-none" />
              </div>
              <button
                onClick={exportToCSV}
                className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm"
              >
                <Download size={15} /> Export CSV
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-txt-tertiary">
              Showing {filtered.length} product{filtered.length !== 1 ? 's' : ''}
              {stockFilter !== 'all' && ' (filtered)'}
            </span>
            {stockFilter !== 'all' && (
              <button
                onClick={() => setStockFilter('all')}
                className="text-xs text-txt-tertiary hover:text-txt-primary transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Inventory Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-secondary border-b border-bdr">
                    <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Product</th>
                    <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Category</th>
                    <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Price</th>
                    <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Stock</th>
                    <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Threshold</th>
                    <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const isLow = product.stock <= (product.low_stock_threshold || 10) && product.stock > 0;
                    const isOut = product.stock === 0;
                    const img = getFirstImage(product.images);

                    return (
                      <tr
                        key={product.id}
                        className={`border-b border-bdr-subtle hover:bg-bg-hover transition-colors ${isOut ? 'opacity-60' : ''}`}
                      >
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            {img ? (
                              <img src={img} alt={product.name} className="w-8 h-8 rounded object-cover shrink-0" width={32} height={32} />
                            ) : (
                              <div className="w-8 h-8 rounded bg-bg-secondary flex items-center justify-center shrink-0">
                                <Package size={14} className="text-txt-tertiary" />
                              </div>
                            )}
                            <div>
                              <span className="text-txt-primary text-sm">{product.name}</span>
                              <span className="text-txt-tertiary text-xs block">#{product.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-txt-secondary text-sm">
                          {product.category_name || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-txt-primary">
                          {product.sale_price ? (
                            <div>
                              <span className="text-accent-gold">₱{product.sale_price.toLocaleString()}</span>
                              <span className="text-txt-tertiary text-xs line-through ml-1">₱{product.price.toLocaleString()}</span>
                            </div>
                          ) : (
                            <span>₱{product.price.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {editingId === product.id ? (
                            <div className="flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                value={editStock}
                                onChange={(e) => setEditStock(e.target.value)}
                                className="input-field w-20 py-1 px-2 text-sm text-center"
                                min="0"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <span
                              className={`font-mono font-medium ${
                                isOut ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-txt-primary'
                              }`}
                            >
                              {product.stock}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center text-txt-tertiary">
                          {product.low_stock_threshold || 10}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-900/30 text-red-400">Out</span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-yellow-900/30 text-yellow-400">Low</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs bg-green-900/30 text-green-400">OK</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {editingId === product.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="text"
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                placeholder="Note (optional)"
                                className="input-field w-28 py-1 px-2 text-xs"
                              />
                              <button
                                onClick={() => handleSaveStock(product.id)}
                                disabled={savingStock}
                                className="p-1.5 rounded bg-accent-gold/20 text-accent-gold hover:bg-accent-gold/30 transition-colors"
                                title="Save"
                              >
                                <Save size={14} />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 rounded hover:bg-bg-hover text-txt-tertiary hover:text-txt-primary transition-colors"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(product)}
                              className="text-xs text-txt-secondary hover:text-accent-gold transition-colors px-2 py-1 rounded hover:bg-bg-hover"
                            >
                              Edit Stock
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-txt-secondary text-sm py-8 text-center">
                  {search || stockFilter !== 'all' ? 'No products match your filters' : 'No products yet'}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bulk Update Tab */}
      {activeTab === 'bulk' && (
        <>
          <div className="card p-6 mb-4">
            <h2 className="text-lg font-semibold text-txt-primary mb-2">Bulk Stock Update</h2>
            <p className="text-sm text-txt-tertiary mb-4">
              Select products below, then set a stock quantity to apply to all selected.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div>
                <label className="block text-xs text-txt-secondary mb-1">New Stock Quantity</label>
                <input
                  type="number"
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value)}
                  className="input-field py-2 px-3 w-40 text-sm"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-txt-secondary mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={bulkNote}
                  onChange={(e) => setBulkNote(e.target.value)}
                  className="input-field py-2 px-3 w-full text-sm"
                  placeholder="e.g., Restocked from supplier"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleBulkUpdate}
                  disabled={savingBulk || selectedIds.size === 0}
                  className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <Save size={16} />
                  {savingBulk ? 'Updating...' : `Update ${selectedIds.size} Selected`}
                </button>
              </div>
            </div>
          </div>

          {/* Search for bulk selection */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary" />
            <input
              type="text"
              placeholder="Search products to select..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field w-full pl-9 py-2 text-sm"
            />
          </div>

          {/* Selection table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-secondary border-b border-bdr">
                    <th className="py-3 px-4 w-10">
                      <button onClick={toggleSelectAll} className="text-txt-tertiary hover:text-accent-gold transition-colors">
                        {selectedIds.size === filtered.length && filtered.length > 0 ? (
                          <CheckSquare size={16} />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Product</th>
                    <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Current Stock</th>
                    <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const isLow = product.stock <= (product.low_stock_threshold || 10) && product.stock > 0;
                    const isOut = product.stock === 0;
                    const selected = selectedIds.has(product.id);

                    return (
                      <tr
                        key={product.id}
                        onClick={() => toggleSelect(product.id)}
                        className={`border-b border-bdr-subtle cursor-pointer transition-colors ${
                          selected ? 'bg-accent-gold/5' : 'hover:bg-bg-hover'
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          {selected ? (
                            <CheckSquare size={16} className="text-accent-gold" />
                          ) : (
                            <Square size={16} className="text-txt-tertiary" />
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-txt-primary">{product.name}</span>
                          <span className="text-txt-tertiary text-xs ml-2">#{product.id}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`font-mono font-medium ${
                              isOut ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-txt-primary'
                            }`}
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-900/30 text-red-400">Out</span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-yellow-900/30 text-yellow-400">Low</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs bg-green-900/30 text-green-400">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'log' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-txt-tertiary">{logTotal} log entries</span>
            <button
              onClick={loadLogs}
              disabled={logLoading}
              className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm"
            >
              <History size={15} /> {logLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {logLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-bg-secondary border-b border-bdr">
                      <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Product</th>
                      <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Change</th>
                      <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Changed By</th>
                      <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-bdr-subtle hover:bg-bg-hover transition-colors">
                        <td className="py-2.5 px-4 text-txt-secondary text-xs whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-txt-primary text-sm">{log.product_name}</span>
                          <span className="text-txt-tertiary text-xs ml-1">#{log.product_id}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="text-txt-tertiary">{log.previous_stock}</span>
                          <span className="text-txt-tertiary mx-1">→</span>
                          <span className="text-txt-primary font-medium">{log.new_stock}</span>
                          <span
                            className={`text-xs ml-1 ${
                              log.change_amount > 0 ? 'text-green-400' : log.change_amount < 0 ? 'text-red-400' : 'text-txt-tertiary'
                            }`}
                          >
                            ({log.change_amount > 0 ? '+' : ''}{log.change_amount})
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              log.change_type === 'manual'
                                ? 'bg-blue-900/30 text-blue-400'
                                : log.change_type === 'bulk'
                                ? 'bg-purple-900/30 text-purple-400'
                                : log.change_type === 'order'
                                ? 'bg-yellow-900/30 text-yellow-400'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {log.change_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-txt-secondary text-sm">{log.changed_by_name || '—'}</td>
                        <td className="py-2.5 px-4 text-txt-tertiary text-xs">{log.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length === 0 && (
                  <p className="text-txt-secondary text-sm py-8 text-center">No inventory changes logged yet</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
