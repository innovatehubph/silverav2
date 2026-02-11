/**
 * Silvera V2 - Full-Stack E-commerce Backend
 * Features: Products, Cart, Orders, Users, Admin CMS, DirectPay/NexusPay, Email Service
 * Version: 2.0.2 - Email & Payment Gateway Integration
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// Import services
const emailService = require('./services/email-service');
const paymentGateway = require('./services/payment-gateway');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (for rate limiter behind reverse proxy)
const PORT = process.env.PORT || 3865;

// Generate secure JWT secret if not provided
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
  console.log('⚠️  No JWT_SECRET set, using random secret (tokens will invalidate on restart)');
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:3865',
  'http://127.0.0.1:3865',
  'http://37.44.244.226:3865',
  'https://silvera.ph',
  'https://www.silvera.ph',
  'https://silveraph.shop',
  'https://www.silveraph.shop'
];

// Initialize SQLite Database
const DB_PATH = process.env.DATABASE_PATH || '/data/silvera.db';
const db = new Database(DB_PATH);
console.log(`📦 Database connected: ${DB_PATH}`);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'customer',
    reset_token TEXT,
    reset_token_expires DATETIME,
    reset_otp TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    image TEXT,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    price REAL NOT NULL,
    sale_price REAL,
    category_id INTEGER,
    images TEXT,
    stock INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    status TEXT DEFAULT 'pending',
    total REAL NOT NULL,
    shipping_address TEXT,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    payment_ref TEXT,
    items TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_id INTEGER,
    quantity INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    verified_purchase BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    label TEXT DEFAULT 'Home',
    name TEXT,
    phone TEXT,
    address_line TEXT,
    city TEXT,
    province TEXT,
    zip_code TEXT,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT DEFAULT 'info',
    title TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ==================== DATABASE INDEXES FOR PERFORMANCE ====================
// Create indexes on foreign keys and frequently queried columns
console.log('🔧 Creating database indexes...');

db.exec(`
  -- Indexes on foreign keys for JOIN performance
  CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_payment_ref ON orders(payment_ref);
  CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
  CREATE INDEX IF NOT EXISTS idx_cart_product_id ON cart(product_id);
  CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
  CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist(product_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
  CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

  -- Indexes for filtering and searching
  CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
  CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

  -- Composite indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_cart_user_product ON cart(user_id, product_id);
  CREATE INDEX IF NOT EXISTS idx_wishlist_user_product ON wishlist(user_id, product_id);
  CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
`);

console.log('✅ Database indexes created');

// Seed admin user if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const adminEmail = process.env.ADMIN_EMAIL || 'boss@silveraph.shop';
  const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(
    adminEmail, hashedPassword, 'Admin', 'admin'
  );
  console.log(`✅ Admin user created: ${adminEmail}`);
  console.log(`⚠️  IMPORTANT: Save this password securely: ${adminPassword}`);
  console.log('💾 Password is also stored in .env as ADMIN_PASSWORD');
}

// Seed sample categories
const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
if (catCount.count === 0) {
  const categories = ['Fashion', 'Electronics', 'Home & Living', 'Beauty', 'Sports'];
  categories.forEach((cat) => {
    db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(cat, cat.toLowerCase().replace(/ /g, '-'));
  });
  console.log('Sample categories created');
}

// Seed sample products from QA report
const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (prodCount.count === 0) {
  const sampleProducts = [
    { name: 'Premium Silk Scarf', slug: 'premium-silk-scarf', desc: 'Luxurious 100% mulberry silk scarf - Perfect gift for modern Filipina', price: 899, salePrice: 699, catId: 1 },
    { name: 'Designer Watch', slug: 'designer-watch', desc: 'Elegant timepiece with Swiss movement and sapphire crystal', price: 15999, salePrice: 15999, catId: 2 },
    { name: 'Premium Leather Bag', slug: 'premium-leather-bag', desc: 'Handcrafted Italian leather shoulder bag with gold hardware', price: 4999, salePrice: 3999, catId: 1 },
    { name: 'Wireless Earbuds Pro', slug: 'wireless-earbuds-pro', desc: 'Active noise cancellation with 30-hour battery life', price: 5999, salePrice: 4999, catId: 2 },
    { name: 'Cashmere Sweater', slug: 'cashmere-sweater', desc: '100% pure cashmere knit from Scotland', price: 6999, salePrice: 5499, catId: 1 },
    { name: 'Smart Home Hub', slug: 'smart-home-hub', desc: 'Control all your smart devices from one center', price: 3999, salePrice: 3999, catId: 2 },
    { name: 'Luxury Face Cream', slug: 'luxury-face-cream', desc: 'Anti-aging moisturizer with gold particles and hyaluronic acid', price: 2499, salePrice: 2499, catId: 4 },
    { name: 'Aromatherapy Set', slug: 'aromatherapy-set', desc: 'Essential oil diffuser with 12 pure essential oils', price: 1899, salePrice: 1599, catId: 3 },
    { name: 'Yoga Mat Premium', slug: 'yoga-mat-premium', desc: 'Non-slip eco-friendly yoga mat with carrying strap', price: 1999, salePrice: 1499, catId: 5 },
    { name: 'Crystal Vase Set', slug: 'crystal-vase-set', desc: 'Hand-cut Bohemian crystal vase collection of 3 pieces', price: 3499, salePrice: 2999, catId: 3 }
  ];

  sampleProducts.forEach((prod) => {
    db.prepare('INSERT INTO products (name, slug, description, price, sale_price, category_id, images, stock, featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      prod.name,
      prod.slug,
      prod.desc,
      prod.price,
      prod.salePrice,
      prod.catId,
      JSON.stringify(['assets/images/product-images/01.webp', 'assets/images/product-images/02.webp', 'assets/images/product-images/03.webp']),
      50,
      1,
      'active'
    );
  });
  console.log('✅ Sample products created (10 products)');
}

// Health check endpoint BEFORE any middleware (for Docker health checks over HTTP)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Silvera V2', version: '2.0.2', uptime: process.uptime() });
});

// ==================== MIDDLEWARE ====================

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for React
      connectSrc: ["'self'", "https://silvera.innoserver.cloud", "https://sandbox.directpayph.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow external images
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny' // Prevent clickjacking
  },
  noSniff: true, // Prevent MIME type sniffing
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());

// HTTPS enforcement (redirect HTTP to HTTPS in production)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && !req.secure) {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// JSON body parser with error handling
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Handle JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next(err);
});

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Static files - serve production build from client/dist
app.use(express.static(path.join(__dirname, '../client/dist')));
app.use(express.static(path.join(__dirname, '../public')));
// Admin panel
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// ==================== VALIDATION HELPERS ====================

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const validatePassword = (password) => {
  return password && typeof password === 'string' && password.length >= 6 && password.length <= 128;
};

const validateString = (str, maxLength = 255) => {
  return str && typeof str === 'string' && str.trim().length > 0 && str.length <= maxLength;
};

const validatePositiveNumber = (num) => {
  return typeof num === 'number' && num > 0 && isFinite(num);
};

const validatePositiveInteger = (num) => {
  return Number.isInteger(num) && num > 0;
};

const sanitizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().slice(0, 1000);
};

// ==================== AUTH MIDDLEWARE ====================

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', authLimiter, (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // Validate input
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be 6-128 characters' });
    }

    const safeName = sanitizeString(name);
    const safePhone = sanitizeString(phone);

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (email, password, name, phone) VALUES (?, ?, ?, ?)').run(
      email.toLowerCase().trim(), hashedPassword, safeName, safePhone
    );
    const token = jwt.sign({ id: result.lastInsertRowid, email: email.toLowerCase(), role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result.lastInsertRowid, email: email.toLowerCase(), name: safeName, role: 'customer' } });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Email already registered' });
    }
    console.error('Register error:', e.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Forgot Password - Send OTP to email
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email.toLowerCase().trim());

    // Security: Don't reveal if email exists (prevents user enumeration)
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with this email exists, a verification code has been sent.'
      });
    }

    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token and OTP in database
    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ?, reset_otp = ? WHERE id = ?')
      .run(resetToken, expiresAt.toISOString(), otp, user.id);

    // Send OTP via email service
    const emailResult = await emailService.sendOTP(user.email, {
      recipientName: user.name || 'Valued Customer',
      otp: otp,
      purpose: 'password_reset',
      expiryMinutes: 15
    });

    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      // Still return success to avoid revealing email issues to users
    }

    res.json({
      success: true,
      message: 'If an account with this email exists, a verification code has been sent.',
      reset_token: resetToken
    });
  } catch (e) {
    console.error('Forgot password error:', e.message);
    res.status(500).json({ error: 'Request failed' });
  }
});

// Verify Reset OTP
app.post('/api/auth/verify-reset-otp', authLimiter, (req, res) => {
  try {
    const { reset_token, otp } = req.body;

    if (!reset_token || !otp) {
      return res.status(400).json({ error: 'Reset token and OTP required' });
    }

    const user = db.prepare('SELECT id, email, reset_token, reset_token_expires, reset_otp FROM users WHERE reset_token = ?').get(reset_token);

    if (!user) {
      return res.status(404).json({ error: 'Invalid reset token' });
    }

    const expiresAt = new Date(user.reset_token_expires);
    if (expiresAt < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Validate OTP format
    if (otp.length !== 6 || isNaN(otp)) {
      return res.status(400).json({ error: 'Invalid OTP format' });
    }

    // Verify OTP matches stored OTP
    if (otp !== user.reset_otp) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    res.json({
      success: true,
      message: 'OTP verified. You can now reset your password.',
      reset_token: reset_token
    });
  } catch (e) {
    console.error('Verify OTP error:', e.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Reset Password
app.post('/api/auth/reset-password', authLimiter, (req, res) => {
  try {
    const { reset_token, new_password, confirm_password } = req.body;

    if (!reset_token || !new_password || !confirm_password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (!validatePassword(new_password)) {
      return res.status(400).json({ error: 'Password must be 6-128 characters' });
    }

    const user = db.prepare('SELECT id, email, reset_token, reset_token_expires FROM users WHERE reset_token = ?').get(reset_token);

    if (!user) {
      return res.status(404).json({ error: 'Invalid reset token' });
    }

    const expiresAt = new Date(user.reset_token_expires);
    if (expiresAt < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Update password and clear reset token
    const hashedPassword = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
      .run(hashedPassword, user.id);

    console.log(`[Password Reset] User: ${user.email}`);

    res.json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
      redirect: '/authentication-log-in.html'
    });
  } catch (e) {
    console.error('Reset password error:', e.message);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Setup PIN (during registration or in profile)
app.post('/api/users/setup-pin', auth, (req, res) => {
  try {
    const { pin, confirm_pin } = req.body;

    if (!pin || !confirm_pin) {
      return res.status(400).json({ error: 'PIN and confirmation required' });
    }

    if (pin !== confirm_pin) {
      return res.status(400).json({ error: 'PINs do not match' });
    }

    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }

    // Hash PIN using bcrypt
    const hashedPin = bcrypt.hashSync(pin, 10);
    const createdAt = new Date().toISOString();

    db.prepare('UPDATE users SET pin = ?, pin_created_at = ? WHERE id = ?')
      .run(hashedPin, createdAt, req.user.id);

    console.log(`[PIN Setup] User: ${req.user.id}`);

    res.json({
      success: true,
      message: 'PIN setup successfully. Use this for secure transactions.'
    });
  } catch (e) {
    console.error('PIN setup error:', e.message);
    res.status(500).json({ error: 'PIN setup failed' });
  }
});

// Change PIN (when logged in)
app.put('/api/users/change-pin', auth, (req, res) => {
  try {
    const { old_pin, new_pin, confirm_pin } = req.body;

    if (!old_pin || !new_pin || !confirm_pin) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const user = db.prepare('SELECT pin FROM users WHERE id = ?').get(req.user.id);

    if (!user || !user.pin) {
      return res.status(400).json({ error: 'No PIN set up. Please setup PIN first.' });
    }

    if (!bcrypt.compareSync(old_pin, user.pin)) {
      return res.status(401).json({ error: 'Incorrect current PIN' });
    }

    if (new_pin !== confirm_pin) {
      return res.status(400).json({ error: 'New PINs do not match' });
    }

    if (!/^\d{4,6}$/.test(new_pin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }

    const hashedPin = bcrypt.hashSync(new_pin, 10);
    const updatedAt = new Date().toISOString();

    db.prepare('UPDATE users SET pin = ?, pin_created_at = ? WHERE id = ?')
      .run(hashedPin, updatedAt, req.user.id);

    console.log(`[PIN Changed] User: ${req.user.id}`);

    res.json({
      success: true,
      message: 'PIN changed successfully.'
    });
  } catch (e) {
    console.error('Change PIN error:', e.message);
    res.status(500).json({ error: 'PIN change failed' });
  }
});

app.get('/api/auth/me', auth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, name, phone, role FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.put('/api/users/profile', auth, (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?')
      .run(name.trim(), (phone || '').trim(), req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = db.prepare('SELECT id, email, name, phone, role FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: updatedUser });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ==================== ADDRESS ROUTES ====================

app.get('/api/addresses', auth, (req, res) => {
  try {
    const addresses = db.prepare(`
      SELECT id, name, phone, address, locality, city, state, pin_code, is_default
      FROM addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(req.user.id);
    res.json(addresses);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

app.post('/api/addresses', auth, (req, res) => {
  try {
    const { name, phone, address, locality, city, state, pin_code } = req.body;

    if (!name || !phone || !address || !city) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const result = db.prepare(`
      INSERT INTO addresses (user_id, name, phone, address, locality, city, state, pin_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, name.trim(), phone.trim(), address.trim(), locality ? locality.trim() : null, city.trim(), state ? state.trim() : null, pin_code ? pin_code.trim() : null);

    const newAddress = db.prepare(`
      SELECT id, name, phone, address, locality, city, state, pin_code, is_default
      FROM addresses WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newAddress);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create address' });
  }
});

app.put('/api/addresses/:id', auth, (req, res) => {
  try {
    const { name, phone, address, locality, city, state, pin_code } = req.body;
    const addressId = parseInt(req.params.id);

    // Verify ownership
    const existingAddress = db.prepare('SELECT user_id FROM addresses WHERE id = ?').get(addressId);
    if (!existingAddress || existingAddress.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!name || !phone || !address || !city) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    db.prepare(`
      UPDATE addresses
      SET name = ?, phone = ?, address = ?, locality = ?, city = ?, state = ?, pin_code = ?
      WHERE id = ?
    `).run(name.trim(), phone.trim(), address.trim(), locality ? locality.trim() : null, city.trim(), state ? state.trim() : null, pin_code ? pin_code.trim() : null, addressId);

    const updatedAddress = db.prepare(`
      SELECT id, name, phone, address, locality, city, state, pin_code, is_default
      FROM addresses WHERE id = ?
    `).get(addressId);

    res.json(updatedAddress);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update address' });
  }
});

app.delete('/api/addresses/:id', auth, (req, res) => {
  try {
    const addressId = parseInt(req.params.id);

    // Verify ownership
    const existingAddress = db.prepare('SELECT user_id FROM addresses WHERE id = ?').get(addressId);
    if (!existingAddress || existingAddress.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    db.prepare('DELETE FROM addresses WHERE id = ?').run(addressId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

app.put('/api/addresses/:id/default', auth, (req, res) => {
  try {
    const addressId = parseInt(req.params.id);

    // Verify ownership
    const existingAddress = db.prepare('SELECT user_id FROM addresses WHERE id = ?').get(addressId);
    if (!existingAddress || existingAddress.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Set all addresses to not default
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);

    // Set this address as default
    db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(addressId);

    const updatedAddress = db.prepare(`
      SELECT id, name, phone, address, locality, city, state, pin_code, is_default
      FROM addresses WHERE id = ?
    `).get(addressId);

    res.json(updatedAddress);
  } catch (e) {
    res.status(500).json({ error: 'Failed to set default address' });
  }
});

// ==================== NOTIFICATION ROUTES ====================

app.get('/api/notifications', auth, (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT id, type, title, message, is_read, datetime(created_at) as created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.user.id);
    res.json(notifications);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.put('/api/notifications/:id/read', auth, (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);

    // Verify ownership
    const notification = db.prepare('SELECT user_id FROM notifications WHERE id = ?').get(notificationId);
    if (!notification || notification.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

app.get('/api/notifications/unread/count', auth, (req, res) => {
  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
    res.json({ unread_count: result.count });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// ==================== PRODUCT ROUTES ====================

app.get('/api/products', (req, res) => {
  try {
    const { category, featured, search } = req.query;
    let limit = parseInt(req.query.limit) || 50;
    limit = Math.min(Math.max(limit, 1), 100); // Clamp between 1-100

    let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = ?';
    const params = ['active'];

    if (category && typeof category === 'string') {
      query += ' AND c.slug = ?';
      params.push(category.toLowerCase().trim());
    }
    if (featured === 'true' || featured === '1') {
      query += ' AND p.featured = 1';
    }
    if (search && typeof search === 'string' && search.trim()) {
      query += ' AND p.name LIKE ?';
      params.push(`%${search.trim().slice(0, 100)}%`);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ?';
    params.push(limit);

    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (e) {
    console.error('Products fetch error:', e.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    const product = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(id);
    product ? res.json(product) : res.status(404).json({ error: 'Product not found' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ==================== REVIEWS ROUTES ====================

app.get('/api/products/:id/reviews', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    const reviews = db.prepare(`
      SELECT r.*, u.name as user_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `).all(productId);
    res.json(reviews);
  } catch (e) {
    console.error('Reviews fetch error:', e.message);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.post('/api/products/:id/reviews', auth, (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { rating, title, comment } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const result = db.prepare(`
      INSERT INTO reviews (product_id, user_id, rating, title, comment, verified_purchase)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(productId, req.user.id, rating, title.trim(), comment.trim());

    res.status(201).json({ id: result.lastInsertRowid, message: 'Review posted successfully' });
  } catch (e) {
    console.error('Review creation error:', e.message);
    res.status(500).json({ error: 'Failed to post review' });
  }
});

// ==================== CATEGORY ROUTES ====================

app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get Company Information
app.get('/api/company/info', (req, res) => {
  try {
    const companyInfo = {
      name: 'Silvera',
      company_legal_name: 'NJ RG Shopziee LLC',
      tagline: 'Premium Online Shopping - Worldwide',
      founded: 2021,
      description: 'NJ RG Shopziee LLC, founded in 2021, emerged with a vision to revolutionize e-commerce by bringing premium products to customers worldwide. Based in Clifton, New Jersey, we have grown from a passionate team into a trusted digital marketplace serving customers globally.',
      mission: 'To provide a seamless, secure, and reliable online shopping experience for customers worldwide with access to premium products at competitive prices.',
      vision: 'To be the most trusted and convenient e-commerce platform globally, connecting millions of customers with quality products and trusted sellers.',
      values: [
        'Customer-First Service',
        'Quality Assurance',
        'Secure Payment Solutions',
        'Innovation',
        'Integrity'
      ],
      stats: {
        customers: 100000,
        products: 15000,
        categories: 5,
        years_operating: 3
      },
      contact: {
        company_name: 'NJ RG Shopziee LLC',
        email: 'micap2737@gmail.com',
        phone: '+1 (973) 767-4967',
        address: 'Clifton, NJ',
        facebook: 'facebook.com/njrgshopzieellc'
      },
      features: [
        {
          title: 'Fast & Secure Delivery',
          description: 'We partner with trusted logistics providers worldwide to ensure your orders arrive safely and on time. Track your package in real-time from warehouse to your doorstep.',
          icon: 'delivery.webp'
        },
        {
          title: '30-Day Money Back',
          description: 'Not satisfied with your purchase? Return it within 30 days for a full refund. No questions asked. We stand behind the quality of every product we sell.',
          icon: 'money-bag.webp'
        },
        {
          title: '24/7 Customer Support',
          description: 'Our dedicated support team is available round-the-clock to assist you. Chat, email, or call us anytime. Your satisfaction is our top priority.',
          icon: 'support.webp'
        }
      ]
    };

    res.json(companyInfo);
  } catch (e) {
    console.error('Company info error:', e.message);
    res.status(500).json({ error: 'Failed to fetch company information' });
  }
});

// ==================== CART ROUTES ====================

app.get('/api/cart', auth, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT c.*, p.name, p.price, p.sale_price, p.images
      FROM cart c JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `).all(req.user.id);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

app.post('/api/cart', auth, (req, res) => {
  try {
    const product_id = parseInt(req.body.product_id);
    let quantity = parseInt(req.body.quantity) || 1;

    if (!Number.isInteger(product_id) || product_id < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    quantity = Math.min(Math.max(quantity, 1), 99); // Clamp 1-99

    // Verify product exists
    const product = db.prepare('SELECT id FROM products WHERE id = ? AND status = ?').get(product_id, 'active');
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existing = db.prepare('SELECT * FROM cart WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, 99);
      db.prepare('UPDATE cart SET quantity = ? WHERE id = ?').run(newQty, existing.id);
    } else {
      db.prepare('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, product_id, quantity);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

app.put('/api/cart/:id', auth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let quantity = parseInt(req.body.quantity);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid cart item ID' });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }
    quantity = Math.min(quantity, 99);

    db.prepare('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?').run(quantity, id, req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

app.delete('/api/cart/:id', auth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid cart item ID' });
    }
    db.prepare('DELETE FROM cart WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

// ==================== WISHLIST ROUTES ====================

app.get('/api/wishlist', auth, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT w.id, w.product_id, w.created_at, p.name, p.price, p.sale_price, p.images, p.status
      FROM wishlist w JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `).all(req.user.id);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

app.post('/api/wishlist', auth, (req, res) => {
  try {
    const product_id = parseInt(req.body.product_id);

    if (!Number.isInteger(product_id) || product_id < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Verify product exists
    const product = db.prepare('SELECT id FROM products WHERE id = ? AND status = ?').get(product_id, 'active');
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already in wishlist
    const existing = db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
    if (existing) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }

    db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, product_id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

app.delete('/api/wishlist/:id', auth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid wishlist item ID' });
    }
    db.prepare('DELETE FROM wishlist WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// ==================== ORDER ROUTES ====================

app.get('/api/orders', auth, (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/orders/:id', auth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(id, req.user.id);
    order ? res.json(order) : res.status(404).json({ error: 'Order not found' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.post('/api/orders', auth, (req, res) => {
  try {
    const { shipping_address, payment_method } = req.body;

    if (!shipping_address || typeof shipping_address !== 'object') {
      return res.status(400).json({ error: 'Shipping address required' });
    }
    if (!payment_method || typeof payment_method !== 'string') {
      return res.status(400).json({ error: 'Payment method required' });
    }

    const cartItems = db.prepare('SELECT c.*, p.price, p.sale_price, p.name FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?').all(req.user.id);

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const total = cartItems.reduce((sum, item) => sum + (item.sale_price || item.price) * item.quantity, 0);
    const result = db.prepare('INSERT INTO orders (user_id, total, shipping_address, payment_method, items) VALUES (?, ?, ?, ?, ?)').run(
      req.user.id, total, JSON.stringify(shipping_address), sanitizeString(payment_method), JSON.stringify(cartItems)
    );

    // Clear cart
    db.prepare('DELETE FROM cart WHERE user_id = ?').run(req.user.id);

    res.json({ order_id: result.lastInsertRowid, total });
  } catch (e) {
    console.error('Order error:', e.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ==================== PAYMENT (DirectPay/NexusPay) ====================

/**
 * Verify NexusPay/DirectPay webhook signature
 * Uses HMAC-SHA256 with DIRECTPAY_MERCHANT_KEY as secret
 */
function verifyPaymentSignature(payload, receivedSignature) {
  try {
    const DIRECTPAY_MERCHANT_KEY = process.env.DIRECTPAY_MERCHANT_KEY;

    if (!DIRECTPAY_MERCHANT_KEY) {
      console.warn('⚠️  DIRECTPAY_MERCHANT_KEY not configured, skipping signature verification');
      return true; // Allow in development if key not set
    }

    if (!receivedSignature) {
      // For sandbox/testing, allow webhooks without signature
      const isSandbox = process.env.DIRECTPAY_BASE_URL?.includes('sandbox');
      if (isSandbox) {
        console.warn('⚠️  No signature provided, but sandbox mode - allowing');
        return true;
      }
      console.error('❌ No signature provided in webhook');
      return false;
    }

    // Create signature from payload
    const signatureData = `${payload.payment_ref}:${payload.status}:${payload.amount}:${payload.timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', DIRECTPAY_MERCHANT_KEY)
      .update(signatureData)
      .digest('hex');

    const isValid = expectedSignature === receivedSignature;

    if (!isValid) {
      console.error('❌ Signature mismatch:', { expected: expectedSignature, received: receivedSignature });
    }

    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error.message);
    return false;
  }
}

/**
 * Send order confirmation email after successful payment
 */
async function sendOrderConfirmationEmail(orderId) {
  try {
    // Fetch order details with items
    const order = db.prepare(`
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `).get(orderId);

    if (!order) {
      console.error('❌ Order not found for confirmation email:', orderId);
      return;
    }

    // Parse order items
    const items = JSON.parse(order.items || '[]');

    // Parse shipping address
    const shippingAddress = JSON.parse(order.shipping_address || '{}');

    // Send confirmation email
    await emailService.sendOrderConfirmation(order.customer_email, {
      customerName: order.customer_name,
      orderNumber: order.id,
      orderDate: new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      total: order.total,
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      shippingAddress: shippingAddress,
      paymentMethod: 'NexusPay'
    });

    console.log(`✅ Order confirmation email sent for order #${orderId}`);
  } catch (error) {
    console.error(`❌ Failed to send order confirmation email for order #${orderId}:`, error.message);
  }
}

// Get supported payment methods (e-wallets and banks)
app.get('/api/payments/methods', (req, res) => {
  try {
    const methods = {
      ewallets_local: [
        { id: 'gcash', name: 'GCash', icon: 'assets/images/payment/gcash.webp', type: 'local', min: 100, max: 100000 },
        { id: 'paymaya', name: 'PayMaya', icon: 'assets/images/payment/paymaya.webp', type: 'local', min: 100, max: 50000 },
        { id: 'paypal_local', name: 'PayPal Philippines', icon: 'assets/images/payment/paypal.webp', type: 'local', min: 100, max: 100000 }
      ],
      ewallets_international: [
        { id: 'paypal', name: 'PayPal', icon: 'assets/images/payment/paypal.webp', type: 'international', min: 100, max: 100000 },
        { id: 'apple_pay', name: 'Apple Pay', icon: 'assets/images/payment/apple-pay.webp', type: 'international', min: 100, max: 100000 },
        { id: 'google_pay', name: 'Google Pay', icon: 'assets/images/payment/google-pay.webp', type: 'international', min: 100, max: 100000 }
      ],
      banks_local: [
        { id: 'bdo', name: 'BDO', icon: 'assets/images/payment/bdo.webp', type: 'local', min: 100, max: 999999 },
        { id: 'bpi', name: 'BPI', icon: 'assets/images/payment/bpi.webp', type: 'local', min: 100, max: 999999 },
        { id: 'metrobank', name: 'Metrobank', icon: 'assets/images/payment/metrobank.webp', type: 'local', min: 100, max: 999999 },
        { id: 'unionbank', name: 'UnionBank', icon: 'assets/images/payment/unionbank.webp', type: 'local', min: 100, max: 999999 },
        { id: 'security_bank', name: 'Security Bank', icon: 'assets/images/payment/securitybank.webp', type: 'local', min: 100, max: 999999 }
      ],
      banks_international: [
        { id: 'visa', name: 'Visa', icon: 'assets/images/payment/visa-2.webp', type: 'international', min: 100, max: 999999 },
        { id: 'mastercard', name: 'Mastercard', icon: 'assets/images/payment/mastercard.webp', type: 'international', min: 100, max: 999999 },
        { id: 'amex', name: 'American Express', icon: 'assets/images/payment/amex.webp', type: 'international', min: 100, max: 999999 }
      ]
    };
    res.json(methods);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Validate payment amount for selected method
app.post('/api/payments/validate', (req, res) => {
  try {
    const { amount, payment_method } = req.body;

    if (!amount || !payment_method) {
      return res.status(400).json({ error: 'Amount and payment method required' });
    }

    const validation = paymentGateway.validatePaymentAmount(
      parseFloat(amount),
      payment_method
    );

    if (validation.valid) {
      res.json({
        valid: true,
        amount: parseFloat(amount),
        formatted: paymentGateway.formatAmount(amount),
        payment_method: payment_method
      });
    } else {
      res.status(400).json({
        valid: false,
        error: validation.error
      });
    }
  } catch (e) {
    console.error('Payment validation error:', e.message);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Create QRPH payment via DirectPay
app.post('/api/payments/qrph/create', auth, (req, res) => {
  try {
    const { order_id, payment_method, payment_type } = req.body;

    if (!order_id || !payment_method || !payment_type) {
      return res.status(400).json({ error: 'Missing required fields: order_id, payment_method, payment_type' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, req.user.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Validate payment amount for selected method
    const validation = paymentGateway.validatePaymentAmount(order.total, payment_method);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Create payment via payment gateway
    const baseUrl = process.env.APP_BASE_URL || 'http://37.44.244.226:3865';
    const paymentResult = paymentGateway.createQRPHPayment({
      orderId: order_id,
      amount: order.total,
      currency: 'PHP',
      paymentMethod: payment_method,
      customerEmail: req.user.email,
      customerName: req.user.name || 'Valued Customer',
      redirectUrl: `${baseUrl}/payment-completed.html`,
      webhookUrl: `${baseUrl}/api/payments/webhook`
    });

    if (!paymentResult.success) {
      return res.status(400).json({ error: paymentResult.error });
    }

    // Update order with payment details
    db.prepare(`
      UPDATE orders
      SET payment_ref = ?, payment_method = ?, payment_status = ?
      WHERE id = ?
    `).run(paymentResult.paymentRef, payment_method, 'pending', order_id);

    console.log(`✅ QRPH Payment created for order #${order_id} - Ref: ${paymentResult.paymentRef}`);

    res.json({
      success: true,
      payment_ref: paymentResult.paymentRef,
      amount: order.total,
      formatted_amount: paymentGateway.formatAmount(order.total),
      payment_method: payment_method,
      payment_type: payment_type,
      checkout_url: paymentResult.paymentUrl,
      qr_code: `${paymentGateway.directPayBaseUrl}/qr/${paymentResult.paymentRef}`,
      redirect_url: `${baseUrl}/payment-completed.html?ref=${paymentResult.paymentRef}`,
      status: 'pending',
      expires_at: paymentResult.expiresAt.toISOString()
    });
  } catch (e) {
    console.error('QRPH Payment creation error:', e.message);
    res.status(500).json({ error: 'Failed to create QRPH payment' });
  }
});

// Check payment status
app.get('/api/payments/:paymentRef/status', auth, (req, res) => {
  try {
    const paymentRef = req.params.paymentRef;
    const order = db.prepare('SELECT id, payment_status, total FROM orders WHERE payment_ref = ? AND user_id = ?').get(paymentRef, req.user.id);

    if (!order) return res.status(404).json({ error: 'Payment not found' });

    res.json({
      payment_ref: paymentRef,
      status: order.payment_status,
      amount: order.total
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// DirectPay Callback Handler (called when user returns from payment)
app.post('/api/payments/callback', async (req, res) => {
  try {
    const { ref, status, amount, signature, timestamp } = req.body;

    if (!ref || !status) {
      console.error('Invalid callback: missing ref or status');
      return res.status(400).json({ error: 'Invalid callback data' });
    }

    console.log(`[DirectPay Callback] Ref: ${ref}, Status: ${status}, Amount: ${amount}`);

    // Verify signature for callback
    const callbackTimestamp = timestamp || Date.now();
    if (!verifyPaymentSignature({ payment_ref: ref, status, amount, timestamp: callbackTimestamp }, signature)) {
      console.error('❌ Invalid callback signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Callback signature verified');

    // Update order based on payment status
    if (status === 'success' || status === 'completed' || status === 'paid') {
      const result = db.prepare('UPDATE orders SET payment_status = ?, status = ? WHERE payment_ref = ?')
        .run('paid', 'processing', ref);

      if (result.changes > 0) {
        console.log(`✅ [Payment Confirmed] Order updated: ${ref}`);

        // Get order ID and send confirmation email
        const order = db.prepare('SELECT id FROM orders WHERE payment_ref = ?').get(ref);
        if (order) {
          // Send confirmation email asynchronously
          sendOrderConfirmationEmail(order.id).catch(err =>
            console.error('Error sending confirmation email:', err)
          );
        }

        res.json({
          success: true,
          message: 'Payment confirmed',
          payment_ref: ref,
          status: 'paid'
        });
      } else {
        console.error(`❌ [Payment Error] Order not found: ${ref}`);
        res.status(404).json({ error: 'Order not found' });
      }
    } else if (status === 'failed' || status === 'cancelled') {
      db.prepare('UPDATE orders SET payment_status = ? WHERE payment_ref = ?')
        .run('failed', ref);

      res.json({
        success: false,
        message: 'Payment failed or cancelled',
        payment_ref: ref,
        status: 'failed'
      });
    } else if (status === 'pending') {
      res.json({
        success: true,
        message: 'Payment pending',
        payment_ref: ref,
        status: 'pending'
      });
    }
  } catch (e) {
    console.error('[Callback Error]', e.message);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

// DirectPay Webhook Handler (server-to-server notification)
app.post('/api/payments/webhook', async (req, res) => {
  try {
    // Support both DirectPay format and legacy format
    const {
      // DirectPay format
      reference_number,
      transaction_status,
      total_amount,
      merchantpaymentreferences,
      // Legacy format
      payment_ref: legacyPaymentRef,
      status: legacyStatus,
      amount: legacyAmount,
      timestamp,
      signature
    } = req.body;

    // Normalize to common format
    const payment_ref = merchantpaymentreferences || legacyPaymentRef;
    const status = (transaction_status || legacyStatus || '').toLowerCase();
    const amount = total_amount || legacyAmount;
    const transactionId = reference_number;

    if (!payment_ref && !transactionId) {
      console.error('Invalid webhook: missing payment reference');
      return res.status(400).json({ error: 'Invalid webhook data' });
    }

    console.log(`[DirectPay Webhook] TxID: ${transactionId}, Ref: ${payment_ref}, Status: ${status}, Amount: ${amount}`);

    // Verify webhook signature
    if (!verifyPaymentSignature({ payment_ref, status, amount, timestamp }, signature)) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    console.log('✅ Webhook signature verified');

    // Update order based on payment status (handle both DirectPay and legacy formats)
    const successStatuses = ['success', 'completed', 'paid'];
    const failedStatuses = ['failed', 'cancelled', 'expired'];
    
    if (successStatuses.includes(status)) {
      // Update order by payment_ref
      const result = db.prepare(`
        UPDATE orders
        SET payment_status = ?, status = ?
        WHERE payment_ref = ?
      `).run('paid', 'processing', payment_ref);

      if (result.changes > 0) {
        console.log(`✅ [Webhook Confirmed] Payment: ${payment_ref}`);

        // Get order ID and send confirmation email
        const order = db.prepare('SELECT id FROM orders WHERE payment_ref = ?').get(payment_ref);
        if (order) {
          // Send confirmation email asynchronously
          sendOrderConfirmationEmail(order.id).catch(err =>
            console.error('Error sending confirmation email:', err)
          );
        }
      } else {
        console.warn(`⚠️  No order found for payment_ref: ${payment_ref}`);
      }
    } else if (failedStatuses.includes(status)) {
      db.prepare(`
        UPDATE orders
        SET payment_status = ?, status = ?
        WHERE payment_ref = ?
      `).run('failed', 'cancelled', payment_ref);

      console.log(`⚠️  [Webhook Failed] Payment: ${payment_ref}`);
    }

    // Always respond with 200 to acknowledge receipt
    res.json({ received: true, payment_ref: payment_ref, status: 'processed' });
  } catch (e) {
    console.error('[Webhook Error]', e.message);
    res.status(200).json({ received: true, error: e.message }); // Return 200 to prevent retries
  }
});

// Legacy payment create endpoint
app.post('/api/payments/create', auth, (req, res) => {
  try {
    const order_id = parseInt(req.body.order_id);
    if (!Number.isInteger(order_id) || order_id < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // NexusPay integration placeholder
    const paymentRef = `PAY-${Date.now()}-${order_id}`;
    db.prepare('UPDATE orders SET payment_ref = ? WHERE id = ?').run(paymentRef, order_id);

    res.json({
      payment_ref: paymentRef,
      amount: order.total,
      checkout_url: `https://directpay.innovatehub.ph/checkout/${paymentRef}`,
      status: 'pending'
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// ==================== ADMIN ROUTES ====================

app.get('/api/admin/dashboard', auth, adminOnly, (req, res) => {
  try {
    const stats = {
      totalOrders: db.prepare('SELECT COUNT(*) as count FROM orders').get().count,
      totalRevenue: db.prepare('SELECT COALESCE(SUM(total), 0) as sum FROM orders WHERE payment_status = ?').get('paid').sum,
      totalProducts: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
      totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      recentOrders: db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all(),
      pendingOrders: db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = ?').get('pending').count
    };
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

app.get('/api/admin/products', auth, adminOnly, (req, res) => {
  try {
    const products = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC').all();
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/admin/products', auth, adminOnly, (req, res) => {
  try {
    const { name, description, price, sale_price, category_id, images, stock, featured } = req.body;

    if (!validateString(name)) {
      return res.status(400).json({ error: 'Product name required' });
    }
    if (!validatePositiveNumber(price)) {
      return res.status(400).json({ error: 'Valid price required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100);
    const safeStock = Math.max(0, parseInt(stock) || 0);
    const safeCategoryId = parseInt(category_id) || null;
    const safeSalePrice = validatePositiveNumber(sale_price) ? sale_price : null;

    const result = db.prepare('INSERT INTO products (name, slug, description, price, sale_price, category_id, images, stock, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      sanitizeString(name), slug, sanitizeString(description), price, safeSalePrice, safeCategoryId, JSON.stringify(images || []), safeStock, featured ? 1 : 0
    );
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Product with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const { name, description, price, sale_price, category_id, images, stock, featured, status } = req.body;

    if (!validateString(name)) {
      return res.status(400).json({ error: 'Product name required' });
    }
    if (!validatePositiveNumber(price)) {
      return res.status(400).json({ error: 'Valid price required' });
    }

    const safeStock = Math.max(0, parseInt(stock) || 0);
    const safeCategoryId = parseInt(category_id) || null;
    const safeSalePrice = validatePositiveNumber(sale_price) ? sale_price : null;
    const safeStatus = ['active', 'inactive', 'draft'].includes(status) ? status : 'active';

    db.prepare('UPDATE products SET name=?, description=?, price=?, sale_price=?, category_id=?, images=?, stock=?, featured=?, status=? WHERE id=?').run(
      sanitizeString(name), sanitizeString(description), price, safeSalePrice, safeCategoryId, JSON.stringify(images || []), safeStock, featured ? 1 : 0, safeStatus, id
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/admin/products/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.get('/api/admin/orders', auth, adminOnly, (req, res) => {
  try {
    const orders = db.prepare('SELECT o.*, u.email, u.name as customer_name FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC').all();
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.put('/api/admin/orders/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const { status, payment_status } = req.body;
    const safeStatus = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status) ? status : undefined;
    const safePaymentStatus = ['pending', 'paid', 'refunded', 'failed'].includes(payment_status) ? payment_status : undefined;

    if (safeStatus) {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(safeStatus, id);
    }
    if (safePaymentStatus) {
      db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(safePaymentStatus, id);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  try {
    const users = db.prepare('SELECT id, email, name, phone, role, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/admin/categories', auth, adminOnly, (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/admin/categories', auth, adminOnly, (req, res) => {
  try {
    const { name, image } = req.body;
    if (!validateString(name)) {
      return res.status(400).json({ error: 'Category name required' });
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100);
    const result = db.prepare('INSERT INTO categories (name, slug, image) VALUES (?, ?, ?)').run(
      sanitizeString(name), slug, sanitizeString(image)
    );
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Category already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// ==================== HEALTH & STATIC ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Silvera V2', version: '2.0.1', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/admin')) {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
  } else {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Silvera V2 running on http://0.0.0.0:${PORT}`);
  console.log(`Shop: http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  console.log(`API: http://localhost:${PORT}/api`);
});
