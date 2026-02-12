import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { useAuthStore, useThemeStore } from './stores';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';

// Pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import OrderSuccess from './pages/OrderSuccess';
import PaymentStatus from './pages/PaymentStatus';
import Wishlist from './pages/Wishlist';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Shipping from './pages/Shipping';
import NotFound from './pages/NotFound';

// Admin Pages - lazy loaded for bundle splitting
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminReturns = lazy(() => import('./pages/admin/AdminReturns'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));

function AdminLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-txt-secondary">Loading...</span>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  if (!hasHydrated) return null; // wait for Zustand persist to rehydrate
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, hasHydrated } = useAuthStore();
  if (!hasHydrated) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  const { login } = useAuthStore();
  const { theme } = useThemeStore();

  // Initialize theme on app load
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    // Check for existing auth on app load
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        login(user, token);
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  }, [login]);

  return (
    <Router>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<MainLayout><Home /></MainLayout>} />
        <Route path="/shop" element={<MainLayout><Shop /></MainLayout>} />
        <Route path="/product/:id" element={<MainLayout><ProductDetail /></MainLayout>} />
        <Route path="/cart" element={<MainLayout><Cart /></MainLayout>} />
        <Route path="/checkout" element={<RequireAuth><MainLayout><Checkout /></MainLayout></RequireAuth>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/profile" element={<RequireAuth><MainLayout><Profile /></MainLayout></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><MainLayout><Orders /></MainLayout></RequireAuth>} />
        <Route path="/orders/:id" element={<RequireAuth><MainLayout><OrderDetail /></MainLayout></RequireAuth>} />
        <Route path="/order-success" element={<MainLayout><OrderSuccess /></MainLayout>} />
        <Route path="/payment/:ref" element={<RequireAuth><MainLayout><PaymentStatus /></MainLayout></RequireAuth>} />
        <Route path="/wishlist" element={<RequireAuth><MainLayout><Wishlist /></MainLayout></RequireAuth>} />
        <Route path="/contact" element={<MainLayout><Contact /></MainLayout>} />
        <Route path="/faq" element={<MainLayout><FAQ /></MainLayout>} />
        <Route path="/shipping" element={<MainLayout><Shipping /></MainLayout>} />

        {/* Admin Routes - lazy loaded */}
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<Suspense fallback={<AdminLoader />}><AdminDashboard /></Suspense>} />
          <Route path="products" element={<Suspense fallback={<AdminLoader />}><AdminProducts /></Suspense>} />
          <Route path="categories" element={<Suspense fallback={<AdminLoader />}><AdminCategories /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<AdminLoader />}><AdminOrders /></Suspense>} />
          <Route path="returns" element={<Suspense fallback={<AdminLoader />}><AdminReturns /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<AdminLoader />}><AdminUsers /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<AdminLoader />}><AdminReports /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<AdminLoader />}><AdminSettings /></Suspense>} />
          <Route path="coupons" element={<Suspense fallback={<AdminLoader />}><AdminCoupons /></Suspense>} />
        </Route>

        <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
      </Routes>
    </Router>
  );
}

export default App;
