'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  Warehouse,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Categories', href: '/categories', icon: Tag },
  { name: 'Inventory', href: '/inventory', icon: Warehouse },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ userName }: { userName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/login');
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">SilveraV2</h1>
        <p className="text-sm text-slate-600 mt-1">Admin Dashboard</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-slate-200 p-4 space-y-2">
        {userName && (
          <div className="px-4 py-2 text-sm">
            <p className="text-slate-600">Logged in as</p>
            <p className="font-medium text-slate-900 truncate">{userName}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition font-medium"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:bg-white md:border-r md:border-slate-200 md:h-screen md:sticky md:top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-slate-900">SilveraV2</h1>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <aside className="md:hidden fixed inset-0 top-14 bg-white border-r border-slate-200 w-64 z-40 overflow-y-auto">
          {sidebarContent}
        </aside>
      )}
    </>
  );
}
