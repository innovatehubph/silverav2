import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, X, Search, LogOut, Home, ShoppingCart, Package, UserPlus, Heart, Phone, HelpCircle, Truck } from 'lucide-react';
import { useCartStore, useAuthStore, useThemeStore, useWishlistStore } from '../../stores';
import { useScrollDirection } from '../../hooks/useScrollDirection';
// wishlistApi loaded dynamically to keep axios off the critical render path
import ThemeToggle, { ThemeToggleCompact } from '../ThemeToggle';

// Logo component that switches based on theme
function SilveraLogo({ className = "h-10" }: { className?: string }) {
  const { theme } = useThemeStore();
  return (
    <img
      src={theme === 'dark' ? '/images/branding/silvera-logo-dark.webp' : '/images/branding/silvera-logo-light.webp'}
      alt="Silvera Luxury Brands"
      className={`${className} w-auto object-contain`}
      width={160}
      height={40}
    />
  );
}

interface MainLayoutProps {
  children: React.ReactNode;
}

/** Minimum swipe distance (px) to trigger close */
const SWIPE_THRESHOLD = 80;

export default function MainLayout({ children }: MainLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { getTotalItems } = useCartStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const scrollDirection = useScrollDirection();
  const { count: wishlistCount, setCount: setWishlistCount } = useWishlistStore();

  // Fetch wishlist count on mount when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      import('../../utils/api').then(({ wishlistApi }) =>
        wishlistApi.get()
          .then(res => setWishlistCount((res.data || []).length))
          .catch(() => {})
      );
    }
  }, [isAuthenticated, setWishlistCount]);

  // Touch handling refs
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // Touch handlers for swipe-to-close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    isDragging.current = true;

    const drawer = drawerRef.current;
    if (drawer) {
      drawer.style.transition = 'none';
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;

    touchCurrentX.current = e.touches[0].clientX;
    const deltaX = touchCurrentX.current - touchStartX.current;

    // Only allow swiping right (to close)
    if (deltaX > 0) {
      const drawer = drawerRef.current;
      if (drawer) {
        drawer.style.transform = `translateX(${deltaX}px)`;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const deltaX = touchCurrentX.current - touchStartX.current;
    const drawer = drawerRef.current;

    if (drawer) {
      drawer.style.transition = '';
      drawer.style.transform = '';
    }

    if (deltaX > SWIPE_THRESHOLD) {
      setIsMenuOpen(false);
    }
  }, []);

  const navLinks = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/shop', label: 'Shop', icon: ShoppingCart },
    { path: '/orders', label: 'Orders', auth: true, icon: Package },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsSearchOpen(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* Header - Glassmorphism Navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'glass-strong shadow-lg py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="container-custom">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <SilveraLogo className="h-10" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) =>
                (!link.auth || isAuthenticated) ? (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative py-1 text-sm font-medium transition-colors duration-200 ${
                      isActive(link.path)
                        ? 'text-gold'
                        : 'text-txt-secondary hover:text-txt-primary'
                    }`}
                  >
                    {link.label}
                    {isActive(link.path) && (
                      <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold rounded-full" />
                    )}
                  </Link>
                ) : null
              )}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Theme Toggle - Desktop */}
              <div className="hidden md:block">
                <ThemeToggle />
              </div>

              {/* Search */}
              <form onSubmit={handleSearch} className="relative hidden md:block">
                <div className={`flex items-center transition-all duration-300 ${
                  isSearchOpen ? 'w-48 md:w-64' : 'w-10'
                }`}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    onBlur={() => !searchQuery && setIsSearchOpen(false)}
                    placeholder="Search products..."
                    className={`absolute right-10 w-full bg-bg-tertiary border border-bdr rounded-lg px-3 py-2 text-sm text-txt-primary placeholder:text-txt-tertiary focus:border-gold/50 focus:ring-1 focus:ring-gold/20 outline-none transition-all duration-300 ${
                      isSearchOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                    }`}
                  />
                  <button
                    type="submit"
                    className="p-2 hover:bg-bg-hover rounded-lg transition-colors relative z-10"
                    onClick={() => !isSearchOpen && setIsSearchOpen(true)}
                  >
                    <Search className="w-5 h-5 text-txt-secondary" />
                  </button>
                </div>
              </form>

              {/* Cart */}
              <Link
                to="/cart"
                className="p-2 hover:bg-bg-hover rounded-lg transition-colors relative group"
                aria-label="Shopping cart"
              >
                <ShoppingBag className="w-5 h-5 text-txt-secondary group-hover:text-txt-primary transition-colors" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gold text-bg-primary text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                    {getTotalItems()}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              {isAuthenticated ? (
                <div className="relative group hidden md:block">
                  <button className="flex items-center gap-2 p-2 hover:bg-bg-hover rounded-lg transition-colors">
                    <div className="w-8 h-8 bg-gold/20 border border-gold/30 rounded-full flex items-center justify-center">
                      <span className="text-gold text-sm font-semibold">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  </button>

                  <div className="absolute right-0 top-full mt-2 w-48 glass-strong rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-3 text-txt-secondary hover:text-txt-primary hover:bg-bg-hover transition-colors text-sm"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-bg-hover transition-colors text-sm"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden md:flex items-center gap-2 bg-gold hover:bg-gold-300 text-bg-primary text-sm font-semibold py-2 px-5 rounded-lg transition-all duration-300 hover:shadow-glow-gold"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile Menu Button - Animated hamburger */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-bg-hover transition-colors"
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuOpen}
              >
                <div className="w-5 h-4 relative flex flex-col justify-between">
                  <span
                    className={`block h-0.5 w-5 bg-txt-primary rounded-full transition-all duration-300 origin-center ${
                      isMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-5 bg-txt-primary rounded-full transition-all duration-300 ${
                      isMenuOpen ? 'opacity-0 scale-x-0' : ''
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-5 bg-txt-primary rounded-full transition-all duration-300 origin-center ${
                      isMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 bottom-0 z-[70] w-[min(80vw,320px)] bg-bg-secondary border-l border-bdr-subtle shadow-xl md:hidden
          transition-transform duration-300 ease-out will-change-transform
          ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-bdr-subtle">
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-2"
          >
            <SilveraLogo className="h-8" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggleCompact />
            <button
              onClick={() => setIsMenuOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-bg-hover transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-txt-secondary" />
            </button>
          </div>
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="flex flex-col h-[calc(100%-72px)] overflow-y-auto overscroll-contain">
          {/* Mobile Search */}
          <div className="px-5 py-4">
            <form onSubmit={handleSearch}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 bg-bg-tertiary border border-bdr rounded-xl px-4 py-3 text-sm text-txt-primary placeholder:text-txt-tertiary focus:border-gold/50 outline-none transition-colors"
                />
                <button type="submit" className="bg-gold hover:bg-gold-300 text-bg-primary rounded-xl px-4 transition-colors" aria-label="Search">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 flex-1">
            <div className="space-y-1">
              {navLinks.map((link, index) => {
                if (link.auth && !isAuthenticated) return null;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive(link.path)
                        ? 'bg-gold/10 text-gold border border-gold/20'
                        : 'text-txt-secondary hover:bg-bg-hover hover:text-txt-primary active:bg-bg-hover'
                    }`}
                    style={{
                      transitionDelay: isMenuOpen ? `${(index + 1) * 50}ms` : '0ms',
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                    {link.path === '/cart' && getTotalItems() > 0 && (
                      <span className="ml-auto bg-gold text-bg-primary text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                        {getTotalItems()}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Authenticated user section */}
            {isAuthenticated && (
              <>
                <hr className="my-3 border-bdr-subtle mx-4" />
                <div className="space-y-1">
                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-medium text-txt-secondary hover:bg-bg-hover hover:text-txt-primary active:bg-bg-hover transition-all duration-200"
                  >
                    <User className="w-5 h-5" />
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 active:bg-red-500/10 transition-all duration-200"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              </>
            )}

            {/* More section */}
            <hr className="my-3 border-bdr-subtle mx-4" />
            <p className="px-4 pt-1 pb-2 text-xs font-semibold uppercase tracking-wider text-txt-tertiary">More</p>
            <div className="space-y-1">
              <Link
                to="/wishlist"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive('/wishlist')
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'text-txt-secondary hover:bg-bg-hover hover:text-txt-primary active:bg-bg-hover'
                }`}
              >
                <Heart className="w-5 h-5" />
                Wishlist
                {wishlistCount > 0 && (
                  <span className="ml-auto bg-gold text-bg-primary text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                to="/contact"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive('/contact')
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'text-txt-secondary hover:bg-bg-hover hover:text-txt-primary active:bg-bg-hover'
                }`}
              >
                <Phone className="w-5 h-5" />
                Contact
              </Link>
              <Link
                to="/faq"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive('/faq')
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'text-txt-secondary hover:bg-bg-hover hover:text-txt-primary active:bg-bg-hover'
                }`}
              >
                <HelpCircle className="w-5 h-5" />
                FAQ
              </Link>
              <Link
                to="/shipping"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive('/shipping')
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'text-txt-secondary hover:bg-bg-hover hover:text-txt-primary active:bg-bg-hover'
                }`}
              >
                <Truck className="w-5 h-5" />
                Shipping
              </Link>
            </div>
          </nav>

          {/* Bottom section - Auth buttons for non-authenticated users */}
          {!isAuthenticated && (
            <div className="px-5 py-5 border-t border-bdr-subtle mt-auto space-y-3">
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-gold hover:bg-gold-300 text-bg-primary text-sm font-semibold py-3.5 rounded-xl transition-all duration-300 active:scale-[0.98]"
              >
                <User className="w-4 h-4" />
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full border border-bdr-strong text-txt-primary text-sm font-medium py-3.5 rounded-xl hover:bg-bg-hover transition-all duration-300 active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4" />
                Create Account
              </Link>
            </div>
          )}
        </div>

        {/* Swipe indicator */}
        <div className="absolute top-1/2 -translate-y-1/2 left-1.5 w-1 h-8 bg-bdr-strong rounded-full opacity-40" />
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 glass-strong shadow-lg md:hidden transition-transform duration-300 ${
          scrollDirection === 'down' ? 'translate-y-full' : 'translate-y-0'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              isActive('/') ? 'text-gold' : 'text-txt-tertiary'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link
            to="/shop"
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              isActive('/shop') ? 'text-gold' : 'text-txt-tertiary'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-[10px] font-medium">Shop</span>
          </Link>
          <Link
            to="/cart"
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative ${
              isActive('/cart') ? 'text-gold' : 'text-txt-tertiary'
            }`}
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-gold text-bg-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
                  {getTotalItems()}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Cart</span>
          </Link>
          <Link
            to="/wishlist"
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative ${
              isActive('/wishlist') ? 'text-gold' : 'text-txt-tertiary'
            }`}
          >
            <div className="relative">
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-gold text-bg-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Wishlist</span>
          </Link>
          <Link
            to={isAuthenticated ? '/profile' : '/login'}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              isActive('/profile') || isActive('/login') ? 'text-gold' : 'text-txt-tertiary'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Account</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow min-h-screen pt-20 pb-20 md:pb-0">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-bg-secondary border-t border-bdr-subtle py-12">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <SilveraLogo className="h-16 mb-4" />
              <p className="text-txt-tertiary text-sm leading-relaxed">
                Premium luxury shopping experience. Authentic branded products, exceptional service.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-txt-secondary text-sm uppercase tracking-wider mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-txt-tertiary hover:text-gold transition-colors text-sm">Home</Link></li>
                <li><Link to="/shop" className="text-txt-tertiary hover:text-gold transition-colors text-sm">Shop</Link></li>
                <li><Link to="/orders" className="text-txt-tertiary hover:text-gold transition-colors text-sm">Orders</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-txt-secondary text-sm uppercase tracking-wider mb-4">Customer Service</h4>
              <ul className="space-y-2">
                <li><Link to="/contact" className="text-txt-tertiary hover:text-gold transition-colors text-sm">Contact Us</Link></li>
                <li><Link to="/faq" className="text-txt-tertiary hover:text-gold transition-colors text-sm">FAQ</Link></li>
                <li><Link to="/shipping" className="text-txt-tertiary hover:text-gold transition-colors text-sm">Shipping Info</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-txt-secondary text-sm uppercase tracking-wider mb-4">Contact</h4>
              <p className="text-txt-tertiary text-sm">Email: support@silvera.ph</p>
              <p className="text-txt-tertiary text-sm mt-2">Phone: +63 912 345 6789</p>
            </div>
          </div>

          <div className="border-t border-bdr-subtle mt-8 pt-8 text-center">
            <p className="text-txt-tertiary text-sm">&copy; 2026 Silvera Philippines. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
