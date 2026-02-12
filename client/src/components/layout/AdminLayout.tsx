import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Ticket,
  RotateCcw,
  Menu,
  X,
  LogOut,
  Store,
  ChevronLeft,
  ChevronDown,
  Activity,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    title: 'Store',
    items: [
      { to: '/admin/products', icon: Package, label: 'Products' },
      { to: '/admin/categories', icon: FolderTree, label: 'Categories' },
    ],
  },
  {
    title: 'Orders',
    items: [
      { to: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
      { to: '/admin/returns', icon: RotateCcw, label: 'Returns' },
    ],
  },
  {
    title: 'Customers',
    items: [
      { to: '/admin/users', icon: Users, label: 'Users' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/admin/coupons', icon: Ticket, label: 'Coupons' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/admin/performance', icon: Activity, label: 'Performance' },
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(navSections.map(s => s.title));
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSection = (title: string) => {
    if (collapsed) return;
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(s => s !== title)
        : [...prev, title]
    );
  };

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 glass-strong border-r border-bdr-subtle flex flex-col transition-all duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${collapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-bdr-subtle">
          {!collapsed && (
            <span className="text-xl font-bold text-gradient-gold">Silvera Admin</span>
          )}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setSidebarOpen(false);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-txt-secondary transition-colors"
          >
            {sidebarOpen && window.innerWidth < 1024 ? (
              <X size={20} />
            ) : (
              <ChevronLeft size={20} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-2 px-2 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title}>
              {/* Section Header */}
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-txt-tertiary uppercase tracking-wider hover:text-txt-secondary transition-colors"
                >
                  <span>{section.title}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${expandedSections.includes(section.title) ? '' : '-rotate-90'}`}
                  />
                </button>
              )}

              {/* Section Items */}
              {(collapsed || expandedSections.includes(section.title)) && (
                <div className={collapsed ? 'space-y-1' : 'space-y-0.5 mb-2'}>
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium
                        ${isActive
                          ? 'bg-gold/10 text-accent-gold border-l-2 border-accent-gold'
                          : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
                        }
                        ${collapsed ? 'justify-center px-2' : ''}
                        `
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon size={20} />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  ))}
                </div>
              )}

              {/* Divider */}
              {!collapsed && section.title !== navSections[navSections.length - 1].title && (
                <div className="border-t border-bdr-subtle my-2" />
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-bdr-subtle space-y-2">
          <NavLink
            to="/"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-txt-secondary hover:text-txt-primary hover:bg-bg-hover transition-colors ${collapsed ? 'justify-center px-2' : ''}`}
            title={collapsed ? 'Back to Shop' : undefined}
          >
            <Store size={18} />
            {!collapsed && <span>Back to Shop</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/20 transition-colors w-full ${collapsed ? 'justify-center px-2' : ''}`}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Top bar */}
        <header className="h-16 glass-subtle border-b border-bdr-subtle flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-bg-hover text-txt-secondary"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <span className="text-sm text-txt-secondary hidden sm:block">
              {user?.name || user?.email}
            </span>
            <div className="w-8 h-8 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold text-sm font-bold">
              {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
