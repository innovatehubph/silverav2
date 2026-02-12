import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { type ReactNode, useEffect, useState, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { useAuthStore, useThemeStore } from './stores';
import RouteChangeTracker from './components/RouteChangeTracker';
import ErrorBoundary from './components/ErrorBoundary';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';

// Pages - eagerly loaded (critical path)
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// Pages - lazy loaded for bundle splitting
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const PaymentStatus = lazy(() => import('./pages/PaymentStatus'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Contact = lazy(() => import('./pages/Contact'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Shipping = lazy(() => import('./pages/Shipping'));

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
const AdminPerformance = lazy(() => import('./pages/admin/AdminPerformance'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-txt-secondary">Loading...</span>
      </div>
    </div>
  );
}

function AdminLoader() {
  return <PageLoader />;
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

/**
 * Hydration-safe auth guard. Returns null on first render to let Zustand
 * persist finish reading localStorage (async via microtasks). After the
 * first useEffect fires, hydration is guaranteed complete and we can
 * safely check isAuthenticated.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Zustand persist hydration runs via microtasks which complete before
    // this effect fires. The store now has the real persisted values.
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;
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
    <ErrorBoundary>
    <Router>
      <RouteChangeTracker />
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<MainLayout><Home /></MainLayout>} />
        <Route path="/shop" element={<MainLayout><LazyPage><Shop /></LazyPage></MainLayout>} />
        <Route path="/product/:id" element={<MainLayout><LazyPage><ProductDetail /></LazyPage></MainLayout>} />
        <Route path="/cart" element={<MainLayout><LazyPage><Cart /></LazyPage></MainLayout>} />
        <Route path="/checkout" element={<RequireAuth><MainLayout><LazyPage><Checkout /></LazyPage></MainLayout></RequireAuth>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<LazyPage><Register /></LazyPage>} />
        <Route path="/forgot-password" element={<LazyPage><ForgotPassword /></LazyPage>} />
        <Route path="/profile" element={<RequireAuth><MainLayout><LazyPage><Profile /></LazyPage></MainLayout></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><MainLayout><LazyPage><Orders /></LazyPage></MainLayout></RequireAuth>} />
        <Route path="/orders/:id" element={<RequireAuth><MainLayout><LazyPage><OrderDetail /></LazyPage></MainLayout></RequireAuth>} />
        <Route path="/order-success" element={<MainLayout><LazyPage><OrderSuccess /></LazyPage></MainLayout>} />
        <Route path="/payment/:ref" element={<RequireAuth><MainLayout><LazyPage><PaymentStatus /></LazyPage></MainLayout></RequireAuth>} />
        <Route path="/wishlist" element={<RequireAuth><MainLayout><LazyPage><Wishlist /></LazyPage></MainLayout></RequireAuth>} />
        <Route path="/contact" element={<MainLayout><LazyPage><Contact /></LazyPage></MainLayout>} />
        <Route path="/faq" element={<MainLayout><LazyPage><FAQ /></LazyPage></MainLayout>} />
        <Route path="/shipping" element={<MainLayout><LazyPage><Shipping /></LazyPage></MainLayout>} />

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
          <Route path="performance" element={<Suspense fallback={<AdminLoader />}><AdminPerformance /></Suspense>} />
        </Route>

        <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
      </Routes>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
