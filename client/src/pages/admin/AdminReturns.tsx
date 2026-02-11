import { useEffect, useState } from 'react';
import { adminApi } from '../../utils/api';
import { toast } from 'sonner';
import {
  RotateCcw,
  Check,
  X,
  Search,
} from 'lucide-react';

interface ReturnRequest {
  id: number;
  order_id: number;
  user_id: number;
  reason: string;
  status: string;
  admin_notes?: string;
  refund_amount?: number;
  created_at: string;
  resolved_at?: string;
  customer_name?: string;
  customer_email?: string;
  order_total?: number;
  order_status?: string;
  order_payment_status?: string;
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400',
  approved: 'bg-green-900/30 text-green-400',
  rejected: 'bg-red-900/30 text-red-400',
};

const statusTabs = ['all', 'pending', 'approved', 'rejected'];

export default function AdminReturns() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Process dialog
  const [showDialog, setShowDialog] = useState(false);
  const [dialogReturn, setDialogReturn] = useState<ReturnRequest | null>(null);
  const [dialogAction, setDialogAction] = useState<'approved' | 'rejected'>('approved');
  const [dialogNotes, setDialogNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    try {
      const res = await adminApi.getReturns();
      setReturns(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load returns:', error);
      toast.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const openProcessDialog = (ret: ReturnRequest, action: 'approved' | 'rejected') => {
    setDialogReturn(ret);
    setDialogAction(action);
    setDialogNotes('');
    setShowDialog(true);
  };

  const handleProcess = async () => {
    if (!dialogReturn) return;
    setProcessing(true);
    try {
      await adminApi.processReturn(dialogReturn.id, {
        status: dialogAction,
        admin_notes: dialogNotes.trim() || undefined,
      });
      setReturns(returns.map(r =>
        r.id === dialogReturn.id
          ? { ...r, status: dialogAction, admin_notes: dialogNotes.trim(), resolved_at: new Date().toISOString() }
          : r
      ));
      toast.success(`Return #${dialogReturn.id} ${dialogAction}`);
      setShowDialog(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process return');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = returns.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch = !search ||
      r.order_id.toString().includes(search) ||
      r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.customer_email?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount?: number) => amount ? `₱${amount.toLocaleString()}` : '₱0';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-txt-secondary">Loading returns...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <RotateCcw className="text-accent-gold" size={28} />
          <h1 className="text-2xl font-bold">
            <span className="text-gradient-gold">Returns</span>
          </h1>
          <span className="text-sm text-txt-tertiary">({returns.length})</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary" />
          <input
            type="text"
            placeholder="Search by order # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full pl-9 py-2 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === tab
                  ? 'bg-accent-gold/20 text-accent-gold'
                  : 'text-txt-secondary hover:bg-bg-hover'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab !== 'all' && (
                <span className="ml-1 text-xs opacity-70">
                  ({returns.filter(r => r.status === tab).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Returns Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-secondary border-b border-bdr">
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">ID</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Order</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Customer</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Reason</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Amount</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Status</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Date</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ret) => (
                <tr key={ret.id} className="border-b border-bdr-subtle hover:bg-bg-hover transition-colors">
                  <td className="py-2.5 px-4 font-mono text-txt-primary">#{ret.id}</td>
                  <td className="py-2.5 px-4 font-mono text-txt-primary">#{ret.order_id}</td>
                  <td className="py-2.5 px-4">
                    <div className="text-txt-primary text-sm">{ret.customer_name || `User #${ret.user_id}`}</div>
                    {ret.customer_email && (
                      <div className="text-txt-tertiary text-xs">{ret.customer_email}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-txt-secondary text-sm max-w-[200px] truncate">
                    {ret.reason}
                  </td>
                  <td className="py-2.5 px-4 text-right text-txt-primary font-medium">
                    {formatCurrency(ret.refund_amount)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColor[ret.status] || 'bg-zinc-800 text-zinc-400'}`}>
                      {ret.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-txt-secondary text-sm">{formatDate(ret.created_at)}</td>
                  <td className="py-2.5 px-4">
                    {ret.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openProcessDialog(ret, 'approved')}
                          className="p-1.5 rounded hover:bg-green-900/20 text-txt-secondary hover:text-green-400 transition-colors"
                          title="Approve"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          onClick={() => openProcessDialog(ret, 'rejected')}
                          className="p-1.5 rounded hover:bg-red-900/20 text-txt-secondary hover:text-red-400 transition-colors"
                          title="Reject"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-txt-tertiary text-xs">
                        {ret.resolved_at ? formatDate(ret.resolved_at) : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-txt-secondary text-sm py-8 text-center">
              {search || statusFilter !== 'all'
                ? 'No returns match your filters'
                : 'No return requests yet'}
            </p>
          )}
        </div>
      </div>

      {/* Process Confirmation Dialog */}
      {showDialog && dialogReturn && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-txt-primary">
                {dialogAction === 'approved' ? 'Approve Return' : 'Reject Return'}
              </h2>
              <button onClick={() => setShowDialog(false)} className="text-txt-tertiary hover:text-txt-primary">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-bg-secondary rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-txt-tertiary">Return:</span> <span className="text-txt-primary">#{dialogReturn.id}</span></p>
                <p><span className="text-txt-tertiary">Order:</span> <span className="text-txt-primary">#{dialogReturn.order_id}</span></p>
                <p><span className="text-txt-tertiary">Customer:</span> <span className="text-txt-primary">{dialogReturn.customer_name}</span></p>
                <p><span className="text-txt-tertiary">Amount:</span> <span className="text-txt-primary">{formatCurrency(dialogReturn.refund_amount)}</span></p>
                <p><span className="text-txt-tertiary">Reason:</span> <span className="text-txt-primary">{dialogReturn.reason}</span></p>
              </div>

              {dialogAction === 'approved' && (
                <p className="text-sm text-yellow-400 bg-yellow-900/20 rounded-lg p-3">
                  Approving will set the order payment status to "refunded" and cancel the order. Stock will be restored.
                </p>
              )}

              <div>
                <label className="block text-sm text-txt-secondary mb-1">
                  Notes {dialogAction === 'rejected' && '(will be shown to customer)'}
                </label>
                <textarea
                  value={dialogNotes}
                  onChange={(e) => setDialogNotes(e.target.value)}
                  placeholder={dialogAction === 'rejected' ? 'Reason for rejection...' : 'Optional notes...'}
                  className="input-field w-full py-2 min-h-[80px] resize-none text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowDialog(false)} className="btn-ghost px-4 py-2 rounded-lg text-sm">
                Cancel
              </button>
              <button
                onClick={handleProcess}
                disabled={processing}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                  dialogAction === 'approved'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing ? 'Processing...' : dialogAction === 'approved' ? 'Approve & Refund' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
