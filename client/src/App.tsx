import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores';

// Layouts
import MainLayout from './components/layout/MainLayout';

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
import Wishlist from './pages/Wishlist';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Shipping from './pages/Shipping';
import NotFound from './pages/NotFound';
import Admin from './pages/Admin';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const { login } = useAuthStore();

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
        <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/profile" element={<RequireAuth><MainLayout><Profile /></MainLayout></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><MainLayout><Orders /></MainLayout></RequireAuth>} />
        <Route path="/orders/:id" element={<RequireAuth><MainLayout><OrderDetail /></MainLayout></RequireAuth>} />
        <Route path="/order-success" element={<MainLayout><OrderSuccess /></MainLayout>} />
        <Route path="/wishlist" element={<RequireAuth><MainLayout><Wishlist /></MainLayout></RequireAuth>} />
        <Route path="/contact" element={<MainLayout><Contact /></MainLayout>} />
        <Route path="/faq" element={<MainLayout><FAQ /></MainLayout>} />
        <Route path="/shipping" element={<MainLayout><Shipping /></MainLayout>} />
        <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
      </Routes>
    </Router>
  );
}

export default App;
