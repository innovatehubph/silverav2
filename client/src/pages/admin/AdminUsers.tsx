import { useEffect, useState } from 'react';
import { adminApi } from '../../utils/api';
import { Users, Search } from 'lucide-react';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  created_at: string;
  orders_count?: number;
}

const roleBadge: Record<string, string> = {
  admin: 'bg-purple-900/30 text-purple-400',
  customer: 'bg-blue-900/30 text-blue-400',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await adminApi.getUsers();
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-txt-secondary">Loading users...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Users className="text-accent-gold" size={28} />
        <h1 className="text-2xl font-bold">
          <span className="text-gradient-gold">Users</span>
        </h1>
        <span className="text-sm text-txt-tertiary">({users.length})</span>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-full pl-9 py-2 text-sm"
        />
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-secondary border-b border-bdr">
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Name</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Email</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Role</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Joined</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Orders</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-bdr-subtle hover:bg-bg-hover transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold text-xs font-bold shrink-0">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-txt-primary">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-txt-secondary">{user.email}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${roleBadge[user.role] || 'bg-zinc-800 text-zinc-400'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-txt-secondary text-sm">{formatDate(user.created_at)}</td>
                  <td className="py-2.5 px-4 text-right text-txt-secondary">{user.orders_count ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-txt-secondary text-sm py-8 text-center">
              {search ? 'No users match your search' : 'No users yet'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
