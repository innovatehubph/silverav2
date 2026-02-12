import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores';
import { authApi } from '../utils/api';
import { SEO } from '../components/SEO';

export default function Register() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await authApi.register({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      });
      login(response.data.user, response.data.token);
      navigate('/');
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error('Registration failed. Please try again.');
    }
  };

  return (
    <>
      <SEO title="Create Account" description="Join Silvera PH for exclusive access to premium branded products. Create your account for fast checkout and order tracking." url="https://silvera.innoserver.cloud/register" />
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
          left: '20%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="glass-strong rounded-2xl p-8 w-full max-w-md relative">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold">
            <span className="text-gradient-gold">Create Account</span>
          </h1>
          <p className="text-txt-secondary mt-2">Join Silvera today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-txt-secondary mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-txt-tertiary" />
              <input
                type="text"
                name="name"
                required
                className="input-field pl-10"
                placeholder="Enter your full name"
              />
            </div>
          </div>

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
                minLength={6}
                className="input-field pl-10"
                placeholder="Create a password"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">
            Create Account
          </button>
        </form>

        <p className="text-center mt-6 text-txt-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-gold hover:text-gold-300 transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
    </>
  );
}
