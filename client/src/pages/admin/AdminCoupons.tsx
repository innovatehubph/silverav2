import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Ticket,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Save,
  Copy,
  Check,
  Percent,
  DollarSign,
  Users,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import api from '../../utils/api';

interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const emptyForm = {
  code: '',
  type: 'percentage' as 'percentage' | 'fixed',
  value: 0,
  min_order_amount: 0,
  max_uses: 0,
  is_active: true,
  starts_at: '',
  expires_at: '',
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      const res = await api.get('/admin/coupons');
      setCoupons(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const filtered = coupons.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'SILVERA';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, code: generateCode() });
    setShowForm(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      min_order_amount: coupon.min_order_amount || 0,
      max_uses: coupon.max_uses || 0,
      is_active: coupon.is_active,
      starts_at: coupon.starts_at ? coupon.starts_at.split('T')[0] : '',
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }
    if (form.value <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }
    if (form.type === 'percentage' && form.value > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase().trim(),
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
      };

      if (editingId) {
        const res = await api.put(`/admin/coupons/${editingId}`, payload);
        setCoupons(coupons.map(c => c.id === editingId ? res.data : c));
        toast.success('Coupon updated');
      } else {
        const res = await api.post('/admin/coupons', payload);
        setCoupons([res.data, ...coupons]);
        toast.success('Coupon created');
      }

      setShowForm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, code: string) => {
    if (!confirm(`Delete coupon "${code}"? This cannot be undone.`)) return;

    setDeleting(id);
    try {
      await api.delete(`/admin/coupons/${id}`);
      toast.success('Coupon deleted');
      setCoupons(coupons.filter((c) => c.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete coupon');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      const res = await api.put(`/admin/coupons/${coupon.id}`, {
        ...coupon,
        is_active: !coupon.is_active,
      });
      setCoupons(coupons.map(c => c.id === coupon.id ? res.data : c));
      toast.success(`Coupon ${res.data.is_active ? 'activated' : 'deactivated'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update coupon');
    }
  };

  const copyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const formatCurrency = (amount: number) => `₱${amount?.toLocaleString() || '0'}`;

  const isExpired = (coupon: Coupon) => {
    if (!coupon.expires_at) return false;
    return new Date(coupon.expires_at) < new Date();
  };

  const isNotStarted = (coupon: Coupon) => {
    if (!coupon.starts_at) return false;
    return new Date(coupon.starts_at) > new Date();
  };

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.is_active) return { label: 'Inactive', color: 'bg-zinc-800 text-zinc-400' };
    if (isExpired(coupon)) return { label: 'Expired', color: 'bg-red-900/30 text-red-400' };
    if (isNotStarted(coupon)) return { label: 'Scheduled', color: 'bg-blue-900/30 text-blue-400' };
    if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
      return { label: 'Exhausted', color: 'bg-orange-900/30 text-orange-400' };
    }
    return { label: 'Active', color: 'bg-green-900/30 text-green-400' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-txt-secondary">Loading coupons...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Ticket className="text-accent-gold" size={28} />
          <h1 className="text-2xl font-bold">
            <span className="text-gradient-gold">Coupons</span>
          </h1>
          <span className="text-sm text-txt-tertiary">({coupons.length})</span>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> Create Coupon
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
          placeholder="Search coupons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-full pl-9 py-2 text-sm"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center">
              <Ticket size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-txt-primary">
                {coupons.filter(c => c.is_active && !isExpired(c)).length}
              </p>
              <p className="text-xs text-txt-tertiary">Active Coupons</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
              <Users size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-txt-primary">
                {coupons.reduce((sum, c) => sum + c.used_count, 0)}
              </p>
              <p className="text-xs text-txt-tertiary">Total Uses</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
              <Percent size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-txt-primary">
                {coupons.filter(c => c.type === 'percentage').length}
              </p>
              <p className="text-xs text-txt-tertiary">Percentage Discounts</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-gold/20 flex items-center justify-center">
              <DollarSign size={20} className="text-accent-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-txt-primary">
                {coupons.filter(c => c.type === 'fixed').length}
              </p>
              <p className="text-xs text-txt-tertiary">Fixed Discounts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coupon Form Modal */}
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
                {editingId ? 'Edit Coupon' : 'New Coupon'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-txt-tertiary hover:text-txt-primary"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Coupon Code */}
              <div>
                <label className="block text-sm text-txt-secondary mb-1">
                  Coupon Code <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    className="input-field flex-1 py-2 text-sm font-mono uppercase"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., SUMMER2024"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, code: generateCode() })}
                    className="btn-secondary px-3 py-2 text-sm"
                    title="Generate code"
                  >
                    Generate
                  </button>
                </div>
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm text-txt-secondary mb-1">
                  Discount Type
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'percentage' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all ${
                      form.type === 'percentage'
                        ? 'bg-accent-gold/10 border-accent-gold text-accent-gold'
                        : 'border-bdr bg-bg-secondary text-txt-secondary hover:border-bdr-subtle'
                    }`}
                  >
                    <Percent size={18} />
                    Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'fixed' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all ${
                      form.type === 'fixed'
                        ? 'bg-accent-gold/10 border-accent-gold text-accent-gold'
                        : 'border-bdr bg-bg-secondary text-txt-secondary hover:border-bdr-subtle'
                    }`}
                  >
                    <DollarSign size={18} />
                    Fixed Amount
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-sm text-txt-secondary mb-1">
                  Discount Value <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary">
                    {form.type === 'percentage' ? '%' : '₱'}
                  </span>
                  <input
                    type="number"
                    className="input-field w-full py-2 text-sm pl-8"
                    value={form.value || ''}
                    onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                    placeholder={form.type === 'percentage' ? 'e.g., 20' : 'e.g., 100'}
                    min="0"
                    max={form.type === 'percentage' ? 100 : undefined}
                  />
                </div>
                <p className="text-xs text-txt-tertiary mt-1">
                  {form.type === 'percentage'
                    ? `${form.value || 0}% off the order total`
                    : `₱${form.value || 0} off the order total`}
                </p>
              </div>

              {/* Minimum Order Amount */}
              <div>
                <label className="block text-sm text-txt-secondary mb-1">
                  Minimum Order Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary">₱</span>
                  <input
                    type="number"
                    className="input-field w-full py-2 text-sm pl-8"
                    value={form.min_order_amount || ''}
                    onChange={(e) => setForm({ ...form, min_order_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0 = No minimum"
                    min="0"
                  />
                </div>
                <p className="text-xs text-txt-tertiary mt-1">
                  {form.min_order_amount > 0
                    ? `Applies to orders over ${formatCurrency(form.min_order_amount)}`
                    : 'No minimum order required'}
                </p>
              </div>

              {/* Max Uses */}
              <div>
                <label className="block text-sm text-txt-secondary mb-1">
                  Maximum Uses
                </label>
                <input
                  type="number"
                  className="input-field w-full py-2 text-sm"
                  value={form.max_uses || ''}
                  onChange={(e) => setForm({ ...form, max_uses: parseInt(e.target.value) || 0 })}
                  placeholder="0 = Unlimited"
                  min="0"
                />
                <p className="text-xs text-txt-tertiary mt-1">
                  {form.max_uses > 0 ? `Can be used ${form.max_uses} time(s)` : 'Unlimited uses'}
                </p>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-txt-secondary mb-1">
                    Starts At
                  </label>
                  <input
                    type="date"
                    className="input-field w-full py-2 text-sm"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-txt-secondary mb-1">
                    Expires At
                  </label>
                  <input
                    type="date"
                    className="input-field w-full py-2 text-sm"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                <div>
                  <p className="text-sm text-txt-primary font-medium">Active</p>
                  <p className="text-xs text-txt-tertiary">Coupon can be used at checkout</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.is_active ? 'bg-accent-gold' : 'bg-bg-tertiary'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
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
                <Save size={16} /> {saving ? 'Saving...' : 'Save Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coupons Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-secondary border-b border-bdr">
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Code</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Discount</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Conditions</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Usage</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Status</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Valid</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((coupon) => {
                const status = getCouponStatus(coupon);
                return (
                  <tr key={coupon.id} className="border-b border-bdr-subtle hover:bg-bg-hover transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-txt-primary bg-bg-tertiary px-2 py-1 rounded">
                          {coupon.code}
                        </code>
                        <button
                          onClick={() => copyCode(coupon.id, coupon.code)}
                          className="p-1 rounded hover:bg-bg-hover text-txt-tertiary hover:text-accent-gold transition-colors"
                          title="Copy code"
                        >
                          {copied === coupon.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1">
                        {coupon.type === 'percentage' ? (
                          <>
                            <Percent size={14} className="text-purple-400" />
                            <span className="text-txt-primary font-medium">{coupon.value}% off</span>
                          </>
                        ) : (
                          <>
                            <DollarSign size={14} className="text-green-400" />
                            <span className="text-txt-primary font-medium">{formatCurrency(coupon.value)} off</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      {coupon.min_order_amount > 0 ? (
                        <span className="text-txt-secondary text-xs">
                          Min. order: {formatCurrency(coupon.min_order_amount)}
                        </span>
                      ) : (
                        <span className="text-txt-tertiary text-xs">No minimum</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="text-txt-primary">{coupon.used_count}</span>
                      <span className="text-txt-tertiary">
                        {coupon.max_uses > 0 ? ` / ${coupon.max_uses}` : ' / ∞'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="text-xs text-txt-secondary">
                        {coupon.starts_at || coupon.expires_at ? (
                          <>
                            {coupon.starts_at && <div>From: {formatDate(coupon.starts_at)}</div>}
                            {coupon.expires_at && <div>Until: {formatDate(coupon.expires_at)}</div>}
                          </>
                        ) : (
                          <span className="text-txt-tertiary">Always valid</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleStatus(coupon)}
                          className={`p-1.5 rounded hover:bg-bg-hover transition-colors ${
                            coupon.is_active ? 'text-green-400' : 'text-txt-tertiary'
                          }`}
                          title={coupon.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {coupon.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => openEdit(coupon)}
                          className="p-1.5 rounded hover:bg-bg-hover text-txt-secondary hover:text-accent-gold transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id, coupon.code)}
                          disabled={deleting === coupon.id}
                          className="p-1.5 rounded hover:bg-red-900/20 text-txt-secondary hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deleting === coupon.id ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Ticket size={48} className="mx-auto text-txt-tertiary mb-4" />
              <p className="text-txt-secondary">
                {search ? 'No coupons match your search' : 'No coupons yet. Create your first coupon!'}
              </p>
              {!search && (
                <button
                  onClick={openCreate}
                  className="btn-primary px-4 py-2 rounded-lg mt-4 text-sm inline-flex items-center gap-2"
                >
                  <Plus size={16} /> Create Coupon
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
