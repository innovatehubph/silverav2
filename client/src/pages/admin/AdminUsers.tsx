import { useEffect, useState } from 'react';
import { adminApi } from '../../utils/api';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Eye,
  X,
  ChevronDown,
  Shield,
  ShieldOff,
  ShoppingCart,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Download,
  ToggleLeft,
  ToggleRight,
  KeyRound,
  Trash2,
} from 'lucide-react';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  is_active?: number;
  created_at: string;
  orders_count?: number;
}

interface UserOrder {
  id: number;
  status: string;
  total: number;
  payment_status: string;
  payment_method?: string;
  created_at: string;
}

interface UserAddress {
  id: number;
  label?: string;
  name: string;
  phone: string;
  region?: string;
  province?: string;
  municipality?: string;
  barangay?: string;
  street_address?: string;
  zip_code?: string;
  is_default?: number;
}

interface UserDetails extends AdminUser {
  orders: UserOrder[];
  addresses: UserAddress[];
}

const roleBadge: Record<string, string> = {
  admin: 'bg-purple-900/30 text-purple-400',
  customer: 'bg-blue-900/30 text-blue-400',
};

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400',
  processing: 'bg-blue-900/30 text-blue-400',
  shipped: 'bg-purple-900/30 text-purple-400',
  delivered: 'bg-green-900/30 text-green-400',
  cancelled: 'bg-red-900/30 text-red-400',
};

const paymentColor: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400',
  paid: 'bg-green-900/30 text-green-400',
  failed: 'bg-red-900/30 text-red-400',
  refunded: 'bg-purple-900/30 text-purple-400',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Confirm modal
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    danger?: boolean;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await adminApi.getUsers();
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active !== 0) ||
      (statusFilter === 'disabled' && u.is_active === 0);
    return matchesSearch && matchesRole && matchesStatus;
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

  const formatDateTime = (dateStr: string) => {
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

  const formatCurrency = (amount: number) => `₱${amount?.toLocaleString() || '0'}`;

  const handleViewDetails = async (userId: number) => {
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const res = await adminApi.getUser(userId);
      setSelectedUser(res.data);
    } catch (error) {
      console.error('Failed to load user details:', error);
      toast.error('Failed to load user details');
      setShowDetail(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await adminApi.changeUserRole(userId, newRole as 'customer' | 'admin');
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: res.data.role } : u)));
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, role: res.data.role });
      }
      toast.success(`Role updated to ${newRole}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change role');
    }
  };

  const handleToggleStatus = (user: AdminUser) => {
    const isActive = user.is_active !== 0;
    setConfirmAction({
      title: isActive ? 'Disable Account' : 'Enable Account',
      message: isActive
        ? `Disable ${user.name || user.email}'s account? They will not be able to log in.`
        : `Re-enable ${user.name || user.email}'s account?`,
      danger: isActive,
      onConfirm: async () => {
        const res = await adminApi.changeUserStatus(user.id, !isActive);
        setUsers(users.map((u) => (u.id === user.id ? { ...u, is_active: res.data.is_active } : u)));
        if (selectedUser?.id === user.id) {
          setSelectedUser({ ...selectedUser, is_active: res.data.is_active });
        }
        toast.success(isActive ? 'Account disabled' : 'Account enabled');
      },
    });
  };

  const handleResetPassword = (user: AdminUser) => {
    setConfirmAction({
      title: 'Reset Password',
      message: `Reset password for ${user.name || user.email}? A temporary password will be sent to their email.`,
      onConfirm: async () => {
        await adminApi.resetUserPassword(user.id);
        toast.success('Password reset. Temporary password sent via email.');
      },
    });
  };

  const handleDeleteUser = (user: AdminUser) => {
    setConfirmAction({
      title: 'Delete User',
      message: `Permanently delete ${user.name || user.email}? This will remove their data but preserve order history.`,
      danger: true,
      onConfirm: async () => {
        await adminApi.deleteUser(user.id, true);
        setUsers(users.filter((u) => u.id !== user.id));
        if (selectedUser?.id === user.id) {
          setShowDetail(false);
          setSelectedUser(null);
        }
        toast.success('User deleted');
      },
    });
  };

  const executeConfirm = async () => {
    if (!confirmAction) return;
    setConfirming(true);
    try {
      await confirmAction.onConfirm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Action failed');
    } finally {
      setConfirming(false);
      setConfirmAction(null);
    }
  };

  const exportToCSV = () => {
    if (filtered.length === 0) {
      toast.error('No users to export');
      return;
    }

    const headers = ['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Orders', 'Joined'];
    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows = filtered.map((u) =>
      [
        u.id.toString(),
        u.name || '',
        u.email,
        u.phone || '',
        u.role,
        u.is_active !== 0 ? 'active' : 'disabled',
        (u.orders_count ?? 0).toString(),
        u.created_at,
      ].map((v) => escapeCSV(v))
    );

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `silvera-users-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} users to CSV`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-txt-secondary">Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="text-accent-gold" size={28} />
          <h1 className="text-2xl font-bold">
            <span className="text-gradient-gold">Users</span>
          </h1>
          <span className="text-sm text-txt-tertiary">({users.length})</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full pl-9 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field py-2 pl-3 pr-8 text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="customer">Customer</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-txt-tertiary pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field py-2 pl-3 pr-8 text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-txt-tertiary pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-txt-tertiary">
          Showing {filtered.length} user{filtered.length !== 1 ? 's' : ''}
          {(roleFilter !== 'all' || statusFilter !== 'all' || search) && ' (filtered)'}
        </span>
        <button
          onClick={exportToCSV}
          className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-secondary border-b border-bdr">
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">User</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Email</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Role</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Status</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Joined</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Orders</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className={`border-b border-bdr-subtle hover:bg-bg-hover transition-colors ${user.is_active === 0 ? 'opacity-50' : ''}`}
                >
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold text-xs font-bold shrink-0">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-txt-primary">{user.name || '—'}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-txt-secondary">{user.email}</td>
                  <td className="py-2.5 px-4 text-center">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={`px-2 py-0.5 rounded text-xs border-0 cursor-pointer ${roleBadge[user.role] || 'bg-zinc-800 text-zinc-400'}`}
                    >
                      <option value="customer">customer</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        user.is_active !== 0
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}
                    >
                      {user.is_active !== 0 ? 'active' : 'disabled'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-txt-secondary text-sm">{formatDate(user.created_at)}</td>
                  <td className="py-2.5 px-4 text-right text-txt-secondary">{user.orders_count ?? 0}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleViewDetails(user.id)}
                        className="p-1.5 rounded hover:bg-bg-hover text-txt-secondary hover:text-accent-gold transition-colors"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`p-1.5 rounded hover:bg-bg-hover transition-colors ${
                          user.is_active !== 0
                            ? 'text-txt-secondary hover:text-red-400'
                            : 'text-txt-secondary hover:text-green-400'
                        }`}
                        title={user.is_active !== 0 ? 'Disable Account' : 'Enable Account'}
                      >
                        {user.is_active !== 0 ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="p-1.5 rounded hover:bg-bg-hover text-txt-secondary hover:text-yellow-400 transition-colors"
                        title="Reset Password"
                      >
                        <KeyRound size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-1.5 rounded hover:bg-bg-hover text-txt-secondary hover:text-red-400 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-txt-secondary text-sm py-8 text-center">
              {search || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'No users match your filters'
                : 'No users yet'}
            </p>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="card p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-txt-primary">User Details</h2>
              <button onClick={() => setShowDetail(false)} className="text-txt-tertiary hover:text-txt-primary">
                <X size={20} />
              </button>
            </div>

            {loadingDetail ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <span className="text-txt-secondary">Loading user details...</span>
              </div>
            ) : selectedUser ? (
              <div className="space-y-6">
                {/* User header */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold text-xl font-bold shrink-0">
                    {(selectedUser.name || selectedUser.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-txt-primary">
                        {selectedUser.name || 'No name'}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${roleBadge[selectedUser.role] || 'bg-zinc-800 text-zinc-400'}`}>
                        {selectedUser.role}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          selectedUser.is_active !== 0
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}
                      >
                        {selectedUser.is_active !== 0 ? 'active' : 'disabled'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-txt-secondary">
                      <span className="flex items-center gap-1"><Mail size={14} /> {selectedUser.email}</span>
                      {selectedUser.phone && (
                        <span className="flex items-center gap-1"><Phone size={14} /> {selectedUser.phone}</span>
                      )}
                      <span className="flex items-center gap-1"><Calendar size={14} /> Joined {formatDate(selectedUser.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleToggleStatus(selectedUser)}
                    className={`btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm ${
                      selectedUser.is_active !== 0 ? 'hover:text-red-400' : 'hover:text-green-400'
                    }`}
                  >
                    {selectedUser.is_active !== 0 ? (
                      <><ShieldOff size={14} /> Disable Account</>
                    ) : (
                      <><Shield size={14} /> Enable Account</>
                    )}
                  </button>
                  <button
                    onClick={() => handleResetPassword(selectedUser)}
                    className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm"
                  >
                    <KeyRound size={14} /> Reset Password
                  </button>
                  <button
                    onClick={() => handleDeleteUser(selectedUser)}
                    className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm hover:text-red-400"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-bg-secondary rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-txt-primary">{selectedUser.orders?.length || 0}</div>
                    <div className="text-xs text-txt-tertiary">Total Orders</div>
                  </div>
                  <div className="bg-bg-secondary rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-accent-gold">
                      {formatCurrency(selectedUser.orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0)}
                    </div>
                    <div className="text-xs text-txt-tertiary">Total Spent</div>
                  </div>
                  <div className="bg-bg-secondary rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-400">
                      {selectedUser.orders?.filter((o) => o.status === 'delivered').length || 0}
                    </div>
                    <div className="text-xs text-txt-tertiary">Delivered</div>
                  </div>
                  <div className="bg-bg-secondary rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-txt-primary">{selectedUser.addresses?.length || 0}</div>
                    <div className="text-xs text-txt-tertiary">Addresses</div>
                  </div>
                </div>

                {/* Order History */}
                <div>
                  <h3 className="text-sm font-medium text-txt-primary flex items-center gap-2 mb-3">
                    <ShoppingCart size={16} className="text-accent-gold" /> Order History
                  </h3>
                  {selectedUser.orders && selectedUser.orders.length > 0 ? (
                    <div className="bg-bg-secondary rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-bdr">
                            <th className="text-left py-2 px-3 text-txt-tertiary font-medium">Order</th>
                            <th className="text-right py-2 px-3 text-txt-tertiary font-medium">Total</th>
                            <th className="text-center py-2 px-3 text-txt-tertiary font-medium">Status</th>
                            <th className="text-center py-2 px-3 text-txt-tertiary font-medium">Payment</th>
                            <th className="text-left py-2 px-3 text-txt-tertiary font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedUser.orders.map((order) => (
                            <tr key={order.id} className="border-b border-bdr-subtle">
                              <td className="py-2 px-3 font-mono text-txt-primary">#{order.id}</td>
                              <td className="py-2 px-3 text-right text-txt-primary font-medium">
                                {formatCurrency(order.total)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-xs ${statusColor[order.status] || 'bg-zinc-800 text-zinc-400'}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-xs ${paymentColor[order.payment_status] || 'bg-zinc-800 text-zinc-400'}`}>
                                  {order.payment_status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-txt-secondary">{formatDateTime(order.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-txt-tertiary text-sm py-4 text-center bg-bg-secondary rounded-lg">
                      No orders yet
                    </p>
                  )}
                </div>

                {/* Addresses */}
                {selectedUser.addresses && selectedUser.addresses.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-txt-primary flex items-center gap-2 mb-3">
                      <MapPin size={16} className="text-accent-gold" /> Saved Addresses
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {selectedUser.addresses.map((addr) => (
                        <div key={addr.id} className="bg-bg-secondary rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-txt-primary text-sm font-medium">{addr.name}</span>
                            {addr.is_default === 1 && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-accent-gold/20 text-accent-gold">Default</span>
                            )}
                            {addr.label && (
                              <span className="text-xs text-txt-tertiary">({addr.label})</span>
                            )}
                          </div>
                          <p className="text-xs text-txt-secondary flex items-center gap-1">
                            <Phone size={10} /> {addr.phone}
                          </p>
                          <p className="text-xs text-txt-tertiary mt-1">
                            {[addr.street_address, addr.barangay, addr.municipality, addr.province, addr.region]
                              .filter(Boolean)
                              .join(', ')}
                            {addr.zip_code && ` ${addr.zip_code}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => !confirming && setConfirmAction(null)}>
          <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-lg font-semibold mb-2 ${confirmAction.danger ? 'text-red-400' : 'text-txt-primary'}`}>
              {confirmAction.title}
            </h2>
            <p className="text-sm text-txt-secondary mb-6">{confirmAction.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={confirming}
                className="btn-ghost px-4 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirm}
                disabled={confirming}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  confirmAction.danger
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'btn-primary'
                }`}
              >
                {confirming ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
