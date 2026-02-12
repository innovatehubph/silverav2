import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores';
import { authApi } from '../utils/api';
import { SEO } from '../components/SEO';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  const { user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await authApi.login(
        formData.get('email') as string,
        formData.get('password') as string
      );
      login(response.data.user, response.data.token);

      // Redirect based on role
      if (response.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed. Please check your credentials.');
    }
  };

  return (
    <>
    <SEO title="Login" description="Sign in to your Silvera PH account. Access your orders, wishlist, and exclusive member benefits." url="https://silvera.innoserver.cloud/login" />
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 z-10 flex items-center gap-2 text-txt-secondary hover:text-txt-primary transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm">Back</span>
      </button>

      {/* Ambient glow */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          top: '10%',
          right: '20%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="glass-strong rounded-2xl p-8 w-full max-w-md relative">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold">
            <span className="text-gradient-gold">Silvera</span>
          </h1>
          <p className="text-txt-secondary mt-2">Welcome back!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-txt-secondary mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-txt-tertiary" />
              <input
                type="email"
                name="email"
                required
                className="input-field pl-10"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-txt-secondary mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-txt-tertiary" />
              <input
                type="password"
                name="password"
                required
                className="input-field pl-10"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">
            Sign In
          </button>
        </form>

        <p className="text-center mt-4">
          <Link to="/forgot-password" className="text-sm text-gold hover:text-gold-300 transition-colors">Forgot password?</Link>
        </p>

        <p className="text-center mt-4 text-txt-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="text-gold hover:text-gold-300 transition-colors">Sign up</Link>
        </p>
      </div>
    </div>
    </>
  );
}
