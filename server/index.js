/**
 * Silvera V2 - Full-Stack E-commerce Backend
 * Features: Products, Cart, Orders, Users, Admin CMS, DirectPay/NexusPay, Email Service
 * Version: 2.0.2 - Email & Payment Gateway Integration
 */

// Load environment variables
// Preserve NODE_ENV from command line — dotenv v17 auto-injects .env values
// which can override NODE_ENV=test set by the Playwright webServer command.
const _savedNodeEnv = process.env.NODE_ENV;
require('dotenv').config();
if (_savedNodeEnv) process.env.NODE_ENV = _savedNodeEnv;

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
const minioService = require('./services/minio');
const psgcService = require('./services/psgc');
const multer = require('multer');

// Configure multer for memory storage (files go to MinIO)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  }
});

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
  'https://silvera.innoserver.cloud',
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
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    region_code TEXT,
    region TEXT,
    province TEXT,
    municipality TEXT,
    barangay TEXT,
    street_address TEXT,
    zip_code TEXT,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

  CREATE TABLE IF NOT EXISTS order_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    admin_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (admin_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    changed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS inventory_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,
    change_type TEXT DEFAULT 'manual',
    changed_by INTEGER,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
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

  -- Indexes for order notes and status history
  CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON order_notes(order_id);
  CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
`);

console.log('✅ Database indexes created');

// Migration: Add tracking_number column to orders if it doesn't exist
try {
  const orderColumns = db.prepare("PRAGMA table_info(orders)").all();
  if (!orderColumns.find(c => c.name === 'tracking_number')) {
    db.exec("ALTER TABLE orders ADD COLUMN tracking_number TEXT");
    console.log('✅ Added tracking_number column to orders table');
  }
  if (!orderColumns.find(c => c.name === 'shipped_at')) {
    db.exec("ALTER TABLE orders ADD COLUMN shipped_at DATETIME");
    console.log('✅ Added shipped_at column to orders table');
  }
  if (!orderColumns.find(c => c.name === 'delivered_at')) {
    db.exec("ALTER TABLE orders ADD COLUMN delivered_at DATETIME");
    console.log('✅ Added delivered_at column to orders table');
  }
  if (!orderColumns.find(c => c.name === 'carrier')) {
    db.exec("ALTER TABLE orders ADD COLUMN carrier TEXT");
    console.log('✅ Added carrier column to orders table');
  }
} catch (e) {
  console.error('Orders migration error:', e.message);
}

// Migration: Create returns table
db.exec(`
  CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    refund_amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
  CREATE INDEX IF NOT EXISTS idx_returns_user_id ON returns(user_id);
  CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
`);

// Webhook audit log table
db.exec(`
  CREATE TABLE IF NOT EXISTS webhook_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    event_type TEXT,
    payment_ref TEXT,
    transaction_id TEXT,
    status TEXT,
    amount REAL,
    signature_valid INTEGER DEFAULT 0,
    response_code INTEGER DEFAULT 200,
    error_message TEXT,
    raw_payload TEXT,
    processed INTEGER DEFAULT 0,
    duplicate INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_ref ON webhook_logs(payment_ref);
  CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);
`);

// Analytics tables (privacy-friendly, cookie-free)
db.exec(`
  CREATE TABLE IF NOT EXISTS analytics_page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_hash TEXT,
    path TEXT,
    referrer TEXT,
    screen_width INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_hash TEXT,
    name TEXT,
    props TEXT,
    path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS analytics_salt (
    date TEXT PRIMARY KEY,
    salt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_apv_created_at ON analytics_page_views(created_at);
  CREATE INDEX IF NOT EXISTS idx_apv_path ON analytics_page_views(path);
  CREATE INDEX IF NOT EXISTS idx_apv_visitor_hash ON analytics_page_views(visitor_hash);
  CREATE INDEX IF NOT EXISTS idx_ae_created_at ON analytics_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_ae_name ON analytics_events(name);
`);

// Migration: Add low_stock_threshold to products
try {
  const prodColumns = db.prepare("PRAGMA table_info(products)").all();
  if (!prodColumns.find(c => c.name === 'low_stock_threshold')) {
    db.exec("ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 10");
    console.log('✅ Added low_stock_threshold column to products table');
  }
} catch (e) {
  console.error('Products low_stock_threshold migration error:', e.message);
}

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

// Migration: Add variants column to products if it doesn't exist
try {
  const columns = db.prepare("PRAGMA table_info(products)").all();
  if (!columns.find(c => c.name === 'variants')) {
    db.exec("ALTER TABLE products ADD COLUMN variants TEXT");
    console.log('✅ Added variants column to products table');

    // Seed variant data for existing products
    const variantData = {
      'premium-silk-scarf': JSON.stringify({
        sizes: ['One Size'],
        colors: [
          { name: 'Ivory', hex: '#FFFFF0' },
          { name: 'Burgundy', hex: '#800020' },
          { name: 'Navy', hex: '#000080' },
          { name: 'Gold', hex: '#D4AF37' }
        ]
      }),
      'designer-watch': JSON.stringify({
        sizes: ['38mm', '42mm'],
        colors: [
          { name: 'Silver', hex: '#C0C0C0' },
          { name: 'Rose Gold', hex: '#B76E79' },
          { name: 'Black', hex: '#1a1a1a' }
        ]
      }),
      'premium-leather-bag': JSON.stringify({
        sizes: ['Small', 'Medium', 'Large'],
        colors: [
          { name: 'Black', hex: '#1a1a1a' },
          { name: 'Tan', hex: '#D2B48C' },
          { name: 'Burgundy', hex: '#800020' }
        ]
      }),
      'wireless-earbuds-pro': JSON.stringify({
        sizes: ['One Size'],
        colors: [
          { name: 'White', hex: '#F5F5F5' },
          { name: 'Black', hex: '#1a1a1a' },
          { name: 'Navy', hex: '#000080' }
        ]
      }),
      'cashmere-sweater': JSON.stringify({
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: [
          { name: 'Cream', hex: '#FFFDD0' },
          { name: 'Charcoal', hex: '#36454F' },
          { name: 'Blush', hex: '#DE5D83' },
          { name: 'Camel', hex: '#C19A6B' }
        ]
      }),
      'yoga-mat-premium': JSON.stringify({
        sizes: ['Standard', 'XL'],
        colors: [
          { name: 'Sage', hex: '#9CAF88' },
          { name: 'Lavender', hex: '#B57EDC' },
          { name: 'Charcoal', hex: '#36454F' },
          { name: 'Rose', hex: '#FF007F' }
        ]
      })
    };

    const updateStmt = db.prepare('UPDATE products SET variants = ? WHERE slug = ?');
    for (const [slug, variants] of Object.entries(variantData)) {
      updateStmt.run(variants, slug);
    }
    console.log('✅ Variant data seeded for existing products');
  }
} catch (e) {
  console.error('Variants migration error:', e.message);
}

// Migration: Add description column to categories if it doesn't exist
try {
  const catColumns = db.prepare("PRAGMA table_info(categories)").all();
  if (!catColumns.find(c => c.name === 'description')) {
    db.exec("ALTER TABLE categories ADD COLUMN description TEXT");
    console.log('✅ Added description column to categories table');
  }
} catch (e) {
  console.error('Categories description migration error:', e.message);
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
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com"],
      connectSrc: ["'self'", "https://silvera.innoserver.cloud", "https://nexuspay.cloud", "https://sandbox.directpayph.com", "https://www.google-analytics.com"],
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
    // No-origin requests: allowed for server-to-server calls (webhooks, health checks)
    // but blocked in production for browser requests (prevents CSRF via no-origin trick)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: false, // No cookies used — JWT via Authorization header only
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());

// ==================== PERFORMANCE METRICS ====================
const SERVER_START_TIME = Date.now();
const METRICS_WINDOW_MS = 60 * 60 * 1000; // 1 hour rolling window
const metricsStore = {}; // keyed by "METHOD:path" → [{time, status, duration}]

function pruneMetrics() {
  const cutoff = Date.now() - METRICS_WINDOW_MS;
  for (const key of Object.keys(metricsStore)) {
    metricsStore[key] = metricsStore[key].filter(e => e.time > cutoff);
    if (metricsStore[key].length === 0) delete metricsStore[key];
  }
}

// Normalize route paths: collapse IDs/slugs to `:id` for grouping
function normalizePath(url) {
  return url.split('?')[0].replace(/\/\d+/g, '/:id');
}

// Metrics middleware — record request duration
app.use((req, res, next) => {
  // Skip static files & non-API routes
  if (!req.path.startsWith('/api/')) return next();
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const key = `${req.method}:${normalizePath(req.path)}`;
    if (!metricsStore[key]) metricsStore[key] = [];
    metricsStore[key].push({ time: Date.now(), status: res.statusCode, duration });
  });
  next();
});

// Prune old entries every 5 minutes
setInterval(pruneMetrics, 5 * 60 * 1000);

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

// Rate limiters — relaxed in test environment so E2E suites don't get throttled
const isTestEnv = process.env.NODE_ENV === 'test';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 500 : 30, // 30 in prod, 500 in test
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isTestEnv ? 1000 : 100, // 100 in prod, 1000 in test
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false
});

const analyticsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isTestEnv ? 1000 : 30, // 30 in prod, 1000 in test
  message: { error: 'Too many analytics requests' },
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

// ==================== ANALYTICS HELPERS ====================

function getAnalyticsSalt() {
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.prepare('SELECT salt FROM analytics_salt WHERE date = ?').get(today);
  if (existing) return existing.salt;
  const salt = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT OR IGNORE INTO analytics_salt (date, salt) VALUES (?, ?)').run(today, salt);
  return salt;
}

function hashVisitor(ip, ua) {
  const salt = getAnalyticsSalt();
  return crypto.createHash('sha256').update(`${ip}${ua}${salt}`).digest('hex').slice(0, 16);
}

function extractReferrerDomain(referrer, host) {
  if (!referrer || typeof referrer !== 'string') return null;
  try {
    const url = new URL(referrer);
    const domain = url.hostname.replace(/^www\./, '');
    // Ignore same-site referrers
    if (host) {
      const hostClean = host.replace(/^www\./, '').split(':')[0];
      if (domain === hostClean) return null;
    }
    return domain;
  } catch {
    return null;
  }
}

function pruneAnalytics() {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('DELETE FROM analytics_page_views WHERE created_at < ?').run(cutoff);
    db.prepare('DELETE FROM analytics_events WHERE created_at < ?').run(cutoff);
    db.prepare('DELETE FROM analytics_salt WHERE date < ?').run(cutoff.slice(0, 10));
  } catch (e) {
    console.error('Analytics prune error:', e.message);
  }
}

// Prune old analytics on startup + every 24 hours
pruneAnalytics();
setInterval(pruneAnalytics, 24 * 60 * 60 * 1000);

// ==================== LOW STOCK HELPER ====================

function checkAndNotifyLowStock(productId) {
  try {
    const product = db.prepare('SELECT id, name, stock, low_stock_threshold FROM products WHERE id = ?').get(productId);
    if (!product) return;
    const threshold = product.low_stock_threshold || 10;
    if (product.stock > threshold) return;

    // Dedup: check if a low-stock notification was already sent in last 24h
    const recent = db.prepare(`
      SELECT id FROM notifications
      WHERE type = 'low_stock' AND message LIKE ? AND created_at > datetime('now', '-24 hours')
      LIMIT 1
    `).get(`%Product #${product.id}%`);
    if (recent) return;

    // Notify all admins
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
    const insertNotif = db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)');
    for (const admin of admins) {
      insertNotif.run(
        admin.id,
        'low_stock',
        'Low Stock Alert',
        `Product #${product.id} "${product.name}" has ${product.stock} units left (threshold: ${threshold})`
      );
    }
  } catch (e) {
    console.error('Low stock notification error:', e.message);
  }
}

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

    // Fire-and-forget welcome email
    emailService.sendWelcome(email.toLowerCase().trim(), safeName).catch(err =>
      console.error('Welcome email failed:', err.message));
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
    const otp = crypto.randomInt(100000, 1000000).toString();
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

// ==================== PSGC (Philippine Geographic) ROUTES ====================

// Get all regions
app.get('/api/psgc/regions', (req, res) => {
  try {
    const regions = psgcService.getRegions();
    res.json(regions);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

// Get provinces by region
app.get('/api/psgc/provinces/:regionCode', (req, res) => {
  try {
    const provinces = psgcService.getProvinces(req.params.regionCode);
    res.json(provinces);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch provinces' });
  }
});

// Get municipalities by region and province
app.get('/api/psgc/municipalities/:regionCode/:province', (req, res) => {
  try {
    const municipalities = psgcService.getMunicipalities(
      req.params.regionCode,
      decodeURIComponent(req.params.province)
    );
    res.json(municipalities);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch municipalities' });
  }
});

// Get barangays by region, province, and municipality
app.get('/api/psgc/barangays/:regionCode/:province/:municipality', (req, res) => {
  try {
    const barangays = psgcService.getBarangays(
      req.params.regionCode,
      decodeURIComponent(req.params.province),
      decodeURIComponent(req.params.municipality)
    );
    res.json(barangays);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch barangays' });
  }
});

// Search locations
app.get('/api/psgc/search', (req, res) => {
  try {
    const { q, limit } = req.query;
    const results = psgcService.search(q, parseInt(limit) || 20);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ==================== ADDRESS ROUTES ====================

// Get user addresses
app.get('/api/addresses', auth, (req, res) => {
  try {
    const addresses = db.prepare(`
      SELECT id, label, name, phone, region_code, region, province, municipality, 
             barangay, street_address, zip_code, is_default, created_at
      FROM addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(req.user.id);
    res.json(addresses);
  } catch (e) {
    console.error('Fetch addresses error:', e.message);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// Create new address
app.post('/api/addresses', auth, (req, res) => {
  try {
    const { 
      label, name, phone, region_code, region, province, 
      municipality, barangay, street_address, zip_code, is_default 
    } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    if (!region || !province || !municipality) {
      return res.status(400).json({ error: 'Region, province, and municipality are required' });
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    }

    // Check if this is the first address (auto-set as default)
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM addresses WHERE user_id = ?').get(req.user.id);
    const setDefault = is_default || existingCount.count === 0 ? 1 : 0;

    const result = db.prepare(`
      INSERT INTO addresses (user_id, label, name, phone, region_code, region, province, 
                            municipality, barangay, street_address, zip_code, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      (label || 'Home').trim(),
      name.trim(),
      phone.trim(),
      region_code || null,
      region.trim(),
      province.trim(),
      municipality.trim(),
      barangay ? barangay.trim() : null,
      street_address ? street_address.trim() : null,
      zip_code || null,
      setDefault
    );

    const newAddress = db.prepare(`
      SELECT id, label, name, phone, region_code, region, province, municipality, 
             barangay, street_address, zip_code, is_default, created_at
      FROM addresses WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newAddress);
  } catch (e) {
    console.error('Create address error:', e.message);
    res.status(500).json({ error: 'Failed to create address' });
  }
});

// Update address
app.put('/api/addresses/:id', auth, (req, res) => {
  try {
    const addressId = parseInt(req.params.id);
    if (!Number.isInteger(addressId) || addressId < 1) {
      return res.status(400).json({ error: 'Invalid address ID' });
    }

    // Verify ownership
    const existingAddress = db.prepare('SELECT user_id FROM addresses WHERE id = ?').get(addressId);
    if (!existingAddress || existingAddress.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { 
      label, name, phone, region_code, region, province, 
      municipality, barangay, street_address, zip_code 
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    db.prepare(`
      UPDATE addresses
      SET label = ?, name = ?, phone = ?, region_code = ?, region = ?, province = ?, 
          municipality = ?, barangay = ?, street_address = ?, zip_code = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      (label || 'Home').trim(),
      name.trim(),
      phone.trim(),
      region_code || null,
      region ? region.trim() : null,
      province ? province.trim() : null,
      municipality ? municipality.trim() : null,
      barangay ? barangay.trim() : null,
      street_address ? street_address.trim() : null,
      zip_code || null,
      addressId
    );

    const updatedAddress = db.prepare(`
      SELECT id, label, name, phone, region_code, region, province, municipality, 
             barangay, street_address, zip_code, is_default, created_at
      FROM addresses WHERE id = ?
    `).get(addressId);

    res.json(updatedAddress);
  } catch (e) {
    console.error('Update address error:', e.message);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// Delete address
app.delete('/api/addresses/:id', auth, (req, res) => {
  try {
    const addressId = parseInt(req.params.id);
    if (!Number.isInteger(addressId) || addressId < 1) {
      return res.status(400).json({ error: 'Invalid address ID' });
    }

    // Verify ownership
    const existingAddress = db.prepare('SELECT user_id, is_default FROM addresses WHERE id = ?').get(addressId);
    if (!existingAddress || existingAddress.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    db.prepare('DELETE FROM addresses WHERE id = ?').run(addressId);

    // If deleted address was default, set another as default
    if (existingAddress.is_default) {
      const nextAddress = db.prepare('SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.user.id);
      if (nextAddress) {
        db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(nextAddress.id);
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Delete address error:', e.message);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

app.put('/api/addresses/:id/default', auth, (req, res) => {
  try {
    const addressId = parseInt(req.params.id);
    if (!Number.isInteger(addressId) || addressId < 1) {
      return res.status(400).json({ error: 'Invalid address ID' });
    }

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
      SELECT id, label, name, phone, region_code, region, province, municipality, 
             barangay, street_address, zip_code, is_default, created_at
      FROM addresses WHERE id = ?
    `).get(addressId);

    res.json(updatedAddress);
  } catch (e) {
    console.error('Set default address error:', e.message);
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

    // Wrap order creation, stock decrement, and cart clear in a transaction
    const createOrder = db.transaction(() => {
      const result = db.prepare('INSERT INTO orders (user_id, total, shipping_address, payment_method, items) VALUES (?, ?, ?, ?, ?)').run(
        req.user.id, total, JSON.stringify(shipping_address), sanitizeString(payment_method), JSON.stringify(cartItems)
      );

      // Decrement stock for each item
      const decrementStmt = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
      for (const item of cartItems) {
        decrementStmt.run(item.quantity, item.product_id);
      }

      // Clear cart
      db.prepare('DELETE FROM cart WHERE user_id = ?').run(req.user.id);

      return result;
    });

    const result = createOrder();

    // Check low stock notifications outside the transaction
    for (const item of cartItems) {
      checkAndNotifyLowStock(item.product_id);
    }

    res.json({ order_id: result.lastInsertRowid, total });

    // Fire-and-forget order confirmation email for COD orders
    // (Online payment orders get their confirmation email via the payment webhook)
    if (payment_method.toLowerCase() === 'cod') {
      sendOrderConfirmationEmail(result.lastInsertRowid).catch(err =>
        console.error('COD order confirmation email failed:', err.message));
    }
  } catch (e) {
    console.error('Order error:', e.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ==================== RETURN REQUESTS ====================

// Customer: Request a return
app.post('/api/orders/:id/return', auth, (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (!Number.isInteger(orderId) || orderId < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'Return reason is required' });
    }

    // Verify order ownership
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.user.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check eligibility (delivered, shipped, or processing)
    if (!['delivered', 'shipped', 'processing'].includes(order.status)) {
      return res.status(400).json({ error: 'This order is not eligible for return' });
    }

    // Check for existing pending return
    const existingReturn = db.prepare('SELECT id FROM returns WHERE order_id = ? AND status = ?').get(orderId, 'pending');
    if (existingReturn) {
      return res.status(400).json({ error: 'A return request already exists for this order' });
    }

    const result = db.prepare('INSERT INTO returns (order_id, user_id, reason, refund_amount) VALUES (?, ?, ?, ?)')
      .run(orderId, req.user.id, reason.trim(), order.total);

    // Notify admins
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
    const insertNotif = db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)');
    for (const admin of admins) {
      insertNotif.run(admin.id, 'return_request', 'New Return Request', `Return requested for order #${orderId}`);
    }

    res.json({ id: result.lastInsertRowid, status: 'pending' });
  } catch (e) {
    console.error('Return request error:', e.message);
    res.status(500).json({ error: 'Failed to submit return request' });
  }
});

// Customer: Get return status for an order
app.get('/api/orders/:id/return', auth, (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (!Number.isInteger(orderId) || orderId < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const returnReq = db.prepare('SELECT * FROM returns WHERE order_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(orderId, req.user.id);

    if (!returnReq) {
      return res.status(404).json({ error: 'No return request found' });
    }

    res.json(returnReq);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch return status' });
  }
});

// ==================== PAYMENT (DirectPay/NexusPay) ====================

/**
 * Webhook audit logging and alerting
 */
const TELEGRAM_CHAT_ID = '1104423387';
let _telegramBotToken = null;

function getTelegramBotToken() {
  if (_telegramBotToken) return _telegramBotToken;
  try {
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('/root/.openclaw/openclaw.json', 'utf8'));
    _telegramBotToken = config.channels.telegram.botToken;
    return _telegramBotToken;
  } catch {
    return null;
  }
}

async function sendTelegramAlert(message) {
  const token = getTelegramBotToken();
  if (!token) return;
  try {
    const https = require('https');
    const data = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' });
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => { res.on('data', () => {}); res.on('end', resolve); });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  } catch (err) {
    console.error('Telegram alert failed:', err.message);
  }
}

function logWebhook({ source, event_type, payment_ref, transaction_id, status, amount, signature_valid, response_code, error_message, raw_payload, processed, duplicate }) {
  try {
    db.prepare(`INSERT INTO webhook_logs (source, event_type, payment_ref, transaction_id, status, amount, signature_valid, response_code, error_message, raw_payload, processed, duplicate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      source || 'unknown', event_type || null, payment_ref || null, transaction_id || null,
      status || null, amount || null, signature_valid ? 1 : 0, response_code || 200,
      error_message || null, raw_payload ? JSON.stringify(raw_payload).slice(0, 4000) : null,
      processed ? 1 : 0, duplicate ? 1 : 0
    );
  } catch (err) {
    console.error('Webhook log insert error:', err.message);
  }
}

function isDuplicateWebhook(payment_ref, status) {
  if (!payment_ref || !status) return false;
  const existing = db.prepare(
    'SELECT id FROM webhook_logs WHERE payment_ref = ? AND status = ? AND processed = 1 AND duplicate = 0 LIMIT 1'
  ).get(payment_ref, status);
  return !!existing;
}

/**
 * Verify NexusPay/DirectPay webhook signature
 * Uses HMAC-SHA256 with DIRECTPAY_MERCHANT_KEY as secret
 */
function verifyPaymentSignature(payload, receivedSignature) {
  try {
    const DIRECTPAY_MERCHANT_KEY = process.env.DIRECTPAY_MERCHANT_KEY;

    if (!DIRECTPAY_MERCHANT_KEY) {
      // In production, reject unsigned webhooks; in dev/test, allow
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ DIRECTPAY_MERCHANT_KEY not configured in production');
        return false;
      }
      console.warn('⚠️  DIRECTPAY_MERCHANT_KEY not configured, skipping signature verification (non-production)');
      return true;
    }

    if (!receivedSignature) {
      console.error('❌ No signature provided in webhook');
      return false;
    }

    // Create signature from payload
    const signatureData = `${payload.payment_ref}:${payload.status}:${payload.amount}:${payload.timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', DIRECTPAY_MERCHANT_KEY)
      .update(signatureData)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const receivedBuf = Buffer.from(receivedSignature, 'hex');
    const isValid = expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf);

    if (!isValid) {
      console.error('❌ Signature mismatch');
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
      paymentMethod: order.payment_method === 'cod' ? 'Cash on Delivery' : (order.payment_method || 'NexusPay')
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
    const baseUrl = process.env.APP_BASE_URL || 'https://silvera.innoserver.cloud';
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
  const logData = { source: 'callback', raw_payload: req.body };
  try {
    const { ref, status, amount, signature, timestamp } = req.body;

    if (!ref || !status) {
      logWebhook({ ...logData, event_type: 'invalid', response_code: 400, error_message: 'Missing ref or status' });
      return res.status(400).json({ error: 'Invalid callback data' });
    }

    logData.payment_ref = ref;
    logData.status = status;
    logData.amount = amount;

    // Verify signature for callback
    const callbackTimestamp = timestamp || Date.now();
    const sigValid = verifyPaymentSignature({ payment_ref: ref, status, amount, timestamp: callbackTimestamp }, signature);
    logData.signature_valid = sigValid;

    if (!sigValid) {
      logWebhook({ ...logData, event_type: 'signature_fail', response_code: 401, error_message: 'Invalid signature' });
      sendTelegramAlert(`⚠️ *Silvera Webhook Alert*\nInvalid callback signature\nRef: \`${ref}\`\nStatus: ${status}`).catch(() => {});
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check for duplicate
    if (isDuplicateWebhook(ref, status)) {
      logWebhook({ ...logData, event_type: 'callback', duplicate: true, processed: false, response_code: 200 });
      return res.json({ success: true, message: 'Duplicate callback ignored', payment_ref: ref, status });
    }

    // Update order based on payment status
    if (status === 'success' || status === 'completed' || status === 'paid') {
      const result = db.prepare('UPDATE orders SET payment_status = ?, status = ? WHERE payment_ref = ?')
        .run('paid', 'processing', ref);

      if (result.changes > 0) {
        const order = db.prepare('SELECT id FROM orders WHERE payment_ref = ?').get(ref);
        if (order) {
          sendOrderConfirmationEmail(order.id).catch(err =>
            console.error('Error sending confirmation email:', err)
          );
        }

        logWebhook({ ...logData, event_type: 'payment_success', processed: true, response_code: 200 });
        res.json({ success: true, message: 'Payment confirmed', payment_ref: ref, status: 'paid' });
      } else {
        logWebhook({ ...logData, event_type: 'order_not_found', processed: false, response_code: 404, error_message: 'Order not found' });
        sendTelegramAlert(`⚠️ *Silvera Webhook Alert*\nCallback for unknown order\nRef: \`${ref}\`\nStatus: ${status}`).catch(() => {});
        res.status(404).json({ error: 'Order not found' });
      }
    } else if (status === 'failed' || status === 'cancelled') {
      db.prepare('UPDATE orders SET payment_status = ? WHERE payment_ref = ?')
        .run('failed', ref);

      logWebhook({ ...logData, event_type: 'payment_failed', processed: true, response_code: 200 });
      sendTelegramAlert(`❌ *Silvera Payment Failed*\nRef: \`${ref}\`\nStatus: ${status}\nAmount: ${amount || 'N/A'}`).catch(() => {});

      res.json({ success: false, message: 'Payment failed or cancelled', payment_ref: ref, status: 'failed' });
    } else if (status === 'pending') {
      logWebhook({ ...logData, event_type: 'payment_pending', processed: true, response_code: 200 });
      res.json({ success: true, message: 'Payment pending', payment_ref: ref, status: 'pending' });
    }
  } catch (e) {
    logWebhook({ ...logData, event_type: 'error', response_code: 500, error_message: e.message, processed: false });
    sendTelegramAlert(`🔴 *Silvera Webhook Error*\nCallback processing failed\nError: ${e.message}`).catch(() => {});
    res.status(500).json({ error: 'Callback processing failed' });
  }
});

// DirectPay Webhook Handler (server-to-server notification)
app.post('/api/payments/webhook', async (req, res) => {
  const logData = { source: 'webhook', raw_payload: req.body };
  try {
    // Support both DirectPay format and legacy format
    const {
      reference_number,
      transaction_status,
      total_amount,
      merchantpaymentreferences,
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

    logData.payment_ref = payment_ref;
    logData.transaction_id = transactionId;
    logData.status = status;
    logData.amount = amount;

    if (!payment_ref && !transactionId) {
      logWebhook({ ...logData, event_type: 'invalid', response_code: 400, error_message: 'Missing payment reference' });
      return res.status(400).json({ error: 'Invalid webhook data' });
    }

    // Verify webhook signature
    const sigValid = verifyPaymentSignature({ payment_ref, status, amount, timestamp }, signature);
    logData.signature_valid = sigValid;

    if (!sigValid) {
      logWebhook({ ...logData, event_type: 'signature_fail', response_code: 401, error_message: 'Invalid webhook signature' });
      sendTelegramAlert(`⚠️ *Silvera Webhook Alert*\nInvalid webhook signature\nRef: \`${payment_ref}\`\nTxID: \`${transactionId || 'N/A'}\``).catch(() => {});
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Check for duplicate
    if (isDuplicateWebhook(payment_ref, status)) {
      logWebhook({ ...logData, event_type: 'webhook', duplicate: true, processed: false, response_code: 200 });
      return res.json({ received: true, payment_ref, status: 'duplicate_ignored' });
    }

    // Update order based on payment status
    const successStatuses = ['success', 'completed', 'paid'];
    const failedStatuses = ['failed', 'cancelled', 'expired'];

    if (successStatuses.includes(status)) {
      const result = db.prepare(`
        UPDATE orders SET payment_status = ?, status = ? WHERE payment_ref = ?
      `).run('paid', 'processing', payment_ref);

      if (result.changes > 0) {
        const order = db.prepare('SELECT id FROM orders WHERE payment_ref = ?').get(payment_ref);
        if (order) {
          sendOrderConfirmationEmail(order.id).catch(err =>
            console.error('Error sending confirmation email:', err)
          );
        }
        logWebhook({ ...logData, event_type: 'payment_success', processed: true, response_code: 200 });
      } else {
        logWebhook({ ...logData, event_type: 'order_not_found', processed: false, response_code: 200, error_message: 'No order found for payment_ref' });
        sendTelegramAlert(`⚠️ *Silvera Webhook Alert*\nWebhook for unknown order\nRef: \`${payment_ref}\`\nTxID: \`${transactionId || 'N/A'}\``).catch(() => {});
      }
    } else if (failedStatuses.includes(status)) {
      // Restore stock for failed payment
      const failedOrder = db.prepare('SELECT id, items FROM orders WHERE payment_ref = ?').get(payment_ref);
      if (failedOrder) {
        try {
          const failedItems = JSON.parse(failedOrder.items || '[]');
          const restoreStmt = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
          for (const item of failedItems) {
            restoreStmt.run(item.quantity, item.product_id);
          }
        } catch (restoreErr) {
          console.error('Stock restore error:', restoreErr.message);
        }
      }

      db.prepare(`
        UPDATE orders SET payment_status = ?, status = ? WHERE payment_ref = ?
      `).run('failed', 'cancelled', payment_ref);

      logWebhook({ ...logData, event_type: 'payment_failed', processed: true, response_code: 200 });
      sendTelegramAlert(`❌ *Silvera Payment Failed*\nRef: \`${payment_ref}\`\nTxID: \`${transactionId || 'N/A'}\`\nStatus: ${status}\nAmount: ${amount || 'N/A'}`).catch(() => {});
    } else {
      logWebhook({ ...logData, event_type: `status_${status}`, processed: true, response_code: 200 });
    }

    // Always respond with 200 to acknowledge receipt
    res.json({ received: true, payment_ref, status: 'processed' });
  } catch (e) {
    logWebhook({ ...logData, event_type: 'error', response_code: 200, error_message: e.message, processed: false });
    sendTelegramAlert(`🔴 *Silvera Webhook Error*\nWebhook processing failed\nError: ${e.message}`).catch(() => {});
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
    const lowStockProducts = db.prepare(`
      SELECT id, name, stock, low_stock_threshold
      FROM products
      WHERE stock <= COALESCE(low_stock_threshold, 10) AND status = 'active'
      ORDER BY stock ASC
      LIMIT 10
    `).all();

    const stats = {
      totalOrders: db.prepare('SELECT COUNT(*) as count FROM orders').get().count,
      totalRevenue: db.prepare('SELECT COALESCE(SUM(total), 0) as sum FROM orders WHERE payment_status = ?').get('paid').sum,
      totalProducts: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
      totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      recentOrders: db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all(),
      pendingOrders: db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = ?').get('pending').count,
      lowStockProducts,
      lowStockCount: lowStockProducts.length
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

app.post('/api/admin/products', auth, adminOnly, upload.array('images', 10), async (req, res) => {
  try {
    const { name, description, price, sale_price, category_id, stock, featured, variants, low_stock_threshold } = req.body;
    let { images } = req.body;

    // Handle image uploads if files provided
    if (req.files && req.files.length > 0) {
      const uploadResults = await minioService.uploadImages(req.files, 'products');
      images = uploadResults.filter(r => r.success).map(r => r.url);
    } else if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch { images = images ? [images] : []; }
    }

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
    const safeVariants = variants ? JSON.stringify(variants) : null;
    const safeThreshold = parseInt(low_stock_threshold) >= 0 ? parseInt(low_stock_threshold) : 10;

    const result = db.prepare('INSERT INTO products (name, slug, description, price, sale_price, category_id, images, stock, featured, variants, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      sanitizeString(name), slug, sanitizeString(description), price, safeSalePrice, safeCategoryId, JSON.stringify(images || []), safeStock, featured ? 1 : 0, safeVariants, safeThreshold
    );
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Product with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', auth, adminOnly, upload.array('images', 10), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const { name, description, price, sale_price, category_id, stock, featured, status, variants, low_stock_threshold } = req.body;
    let { images } = req.body;

    if (!validateString(name)) {
      return res.status(400).json({ error: 'Product name required' });
    }
    if (!validatePositiveNumber(price)) {
      return res.status(400).json({ error: 'Valid price required' });
    }

    // Handle image uploads if new files provided
    if (req.files && req.files.length > 0) {
      const uploadResults = await minioService.uploadImages(req.files, 'products');
      const newImageUrls = uploadResults.filter(r => r.success).map(r => r.url);
      
      // Get existing images and merge
      const existingProduct = db.prepare('SELECT images FROM products WHERE id = ?').get(id);
      let existingImages = [];
      if (existingProduct && existingProduct.images) {
        try { existingImages = JSON.parse(existingProduct.images); } catch {}
      }
      images = [...existingImages, ...newImageUrls];
    } else if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch { images = images ? [images] : []; }
    }

    const safeStock = Math.max(0, parseInt(stock) || 0);
    const safeCategoryId = parseInt(category_id) || null;
    const safeSalePrice = validatePositiveNumber(sale_price) ? sale_price : null;
    const safeStatus = ['active', 'inactive', 'draft'].includes(status) ? status : 'active';
    const safeVariants = variants ? JSON.stringify(variants) : null;
    const safeThreshold = parseInt(low_stock_threshold) >= 0 ? parseInt(low_stock_threshold) : 10;

    db.prepare('UPDATE products SET name=?, description=?, price=?, sale_price=?, category_id=?, images=?, stock=?, featured=?, status=?, variants=?, low_stock_threshold=? WHERE id=?').run(
      sanitizeString(name), sanitizeString(description), price, safeSalePrice, safeCategoryId, JSON.stringify(images || []), safeStock, featured ? 1 : 0, safeStatus, safeVariants, safeThreshold, id
    );
    res.json({ success: true });
  } catch (e) {
    console.error('Product update error:', e);
    res.status(500).json({ error: 'Failed to update product' });
  }
});
// Bulk delete products
app.post('/api/admin/products/bulk-delete', auth, adminOnly, (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Product IDs required' });
    }
    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`DELETE FROM products WHERE id IN (${placeholders})`).run(...ids);
    res.json({ deleted: result.changes });
  } catch (e) {
    console.error('Bulk delete error:', e.message);
    res.status(500).json({ error: 'Failed to bulk delete products' });
  }
});

// Bulk update stock
app.post('/api/admin/products/bulk-stock', auth, adminOnly, (req, res) => {
  try {
    const { ids, stock } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Product IDs required' });
    }
    const safeStock = Math.max(0, parseInt(stock) || 0);
    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`UPDATE products SET stock = ? WHERE id IN (${placeholders})`).run(safeStock, ...ids);
    res.json({ updated: result.changes });
  } catch (e) {
    console.error('Bulk stock update error:', e.message);
    res.status(500).json({ error: 'Failed to bulk update stock' });
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

// ==================== INVENTORY MANAGEMENT ROUTES ====================

// Get all products with category names for inventory view
app.get('/api/admin/inventory', auth, adminOnly, (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.stock, p.low_stock_threshold,
             p.status, p.images, p.category_id, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.stock ASC, p.name ASC
    `).all();
    res.json(products);
  } catch (e) {
    console.error('Get inventory error:', e.message);
    res.status(500).json({ error: 'Failed to load inventory' });
  }
});

// Update single product stock with logging
app.put('/api/admin/inventory/:id/stock', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    const { stock, note } = req.body;
    const newStock = Math.max(0, parseInt(stock) || 0);

    const product = db.prepare('SELECT id, stock FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const previousStock = product.stock;
    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, id);

    // Log the change
    db.prepare(`
      INSERT INTO inventory_log (product_id, previous_stock, new_stock, change_amount, change_type, changed_by, note)
      VALUES (?, ?, ?, ?, 'manual', ?, ?)
    `).run(id, previousStock, newStock, newStock - previousStock, req.user.id, note || null);

    res.json({ previous_stock: previousStock, new_stock: newStock });
  } catch (e) {
    console.error('Update stock error:', e.message);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Bulk update stock with logging
app.post('/api/admin/inventory/bulk-stock', auth, adminOnly, (req, res) => {
  try {
    const { ids, stock, note } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Product IDs required' });
    }
    const newStock = Math.max(0, parseInt(stock) || 0);

    const updateStmt = db.prepare('UPDATE products SET stock = ? WHERE id = ?');
    const logStmt = db.prepare(`
      INSERT INTO inventory_log (product_id, previous_stock, new_stock, change_amount, change_type, changed_by, note)
      VALUES (?, ?, ?, ?, 'bulk', ?, ?)
    `);
    const getStmt = db.prepare('SELECT id, stock FROM products WHERE id = ?');

    const transaction = db.transaction(() => {
      let updated = 0;
      for (const id of ids) {
        const product = getStmt.get(id);
        if (product) {
          const previousStock = product.stock;
          updateStmt.run(newStock, id);
          logStmt.run(id, previousStock, newStock, newStock - previousStock, req.user.id, note || null);
          updated++;
        }
      }
      return updated;
    });

    const updated = transaction();
    res.json({ updated });
  } catch (e) {
    console.error('Bulk stock update error:', e.message);
    res.status(500).json({ error: 'Failed to bulk update stock' });
  }
});

// Get inventory audit log
app.get('/api/admin/inventory/log', auth, adminOnly, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const productId = req.query.product_id ? parseInt(req.query.product_id) : null;

    let whereClause = '';
    const params = [];
    if (productId) {
      whereClause = 'WHERE il.product_id = ?';
      params.push(productId);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM inventory_log il ${whereClause}
    `).get(...params).count;

    const logs = db.prepare(`
      SELECT il.*, p.name as product_name, u.name as changed_by_name
      FROM inventory_log il
      LEFT JOIN products p ON il.product_id = p.id
      LEFT JOIN users u ON il.changed_by = u.id
      ${whereClause}
      ORDER BY il.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({ logs, total });
  } catch (e) {
    console.error('Get inventory log error:', e.message);
    res.status(500).json({ error: 'Failed to load inventory log' });
  }
});

// ==================== IMAGE UPLOAD ROUTES ====================

/**
 * Upload product images to MinIO S3
 * POST /api/admin/upload/product-images
 */
app.post('/api/admin/upload/product-images', auth, adminOnly, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const results = await minioService.uploadImages(req.files, 'products');
    const successfulUploads = results.filter(r => r.success);
    const failedUploads = results.filter(r => !r.success);

    if (successfulUploads.length === 0) {
      return res.status(500).json({ error: 'All uploads failed', details: failedUploads });
    }

    res.json({
      success: true,
      uploaded: successfulUploads.length,
      failed: failedUploads.length,
      images: successfulUploads.map(r => ({
        url: r.url,
        key: r.key
      }))
    });
  } catch (e) {
    console.error('Image upload error:', e.message);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

/**
 * Upload category image to MinIO S3
 * POST /api/admin/upload/category-image
 */
app.post('/api/admin/upload/category-image', auth, adminOnly, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const result = await minioService.uploadImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'categories'
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      image: {
        url: result.url,
        key: result.key
      }
    });
  } catch (e) {
    console.error('Category image upload error:', e.message);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

/**
 * Delete image from MinIO S3
 * DELETE /api/admin/upload/image
 */
app.delete('/api/admin/upload/image', auth, adminOnly, async (req, res) => {
  try {
    const { key, url } = req.body;
    const imageKey = key || minioService.extractKeyFromUrl(url);

    if (!imageKey) {
      return res.status(400).json({ error: 'Image key or URL required' });
    }

    const result = await minioService.deleteImage(imageKey);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Image delete error:', e.message);
    res.status(500).json({ error: 'Image delete failed' });
  }
});

// ==================== END IMAGE UPLOAD ROUTES ====================

app.get('/api/admin/orders', auth, adminOnly, (req, res) => {
  try {
    const { status, payment_status, search, start_date, end_date } = req.query;
    
    let query = `
      SELECT o.*, u.email, u.name as customer_name, u.phone as customer_phone
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];
    
    // Filter by status
    if (status && status !== 'all') {
      query += ' AND o.status = ?';
      params.push(status);
    }
    
    // Filter by payment status
    if (payment_status && payment_status !== 'all') {
      query += ' AND o.payment_status = ?';
      params.push(payment_status);
    }
    
    // Search by order ID or customer name/email
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query += ' AND (CAST(o.id AS TEXT) LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Filter by date range
    if (start_date) {
      query += ' AND DATE(o.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND DATE(o.created_at) <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY o.created_at DESC';
    
    const orders = db.prepare(query).all(...params);
    res.json(orders);
  } catch (e) {
    console.error('Admin orders fetch error:', e.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order with full details
app.get('/api/admin/orders/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    // Get order with customer info
    const order = db.prepare(`
      SELECT o.*, u.email, u.name as customer_name, u.phone as customer_phone
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      WHERE o.id = ?
    `).get(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order notes
    const notes = db.prepare(`
      SELECT n.*, u.name as admin_name 
      FROM order_notes n 
      LEFT JOIN users u ON n.admin_id = u.id 
      WHERE n.order_id = ? 
      ORDER BY n.created_at DESC
    `).all(id);

    // Get status history
    const statusHistory = db.prepare(`
      SELECT h.*, u.name as changed_by_name 
      FROM order_status_history h 
      LEFT JOIN users u ON h.changed_by = u.id 
      WHERE h.order_id = ? 
      ORDER BY h.created_at ASC
    `).all(id);

    // Parse items JSON and enrich with product data
    let items = [];
    try {
      const rawItems = JSON.parse(order.items || '[]');
      items = rawItems.map(item => {
        const product = db.prepare('SELECT name, images, price, sale_price FROM products WHERE id = ?').get(item.product_id);
        return {
          ...item,
          name: product?.name || item.name || 'Unknown Product',
          images: product?.images || item.images || '[]',
          unit_price: item.sale_price || item.price || product?.sale_price || product?.price || 0
        };
      });
    } catch (e) {
      console.error('Failed to parse order items:', e.message);
    }

    res.json({
      ...order,
      items,
      notes,
      status_history: statusHistory
    });
  } catch (e) {
    console.error('Admin order fetch error:', e.message);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.put('/api/admin/orders/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const { status, payment_status, tracking_number, carrier } = req.body;
    const safeStatus = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status) ? status : undefined;
    const safePaymentStatus = ['pending', 'paid', 'refunded', 'failed'].includes(payment_status) ? payment_status : undefined;

    // Get current order for history and notifications
    const currentOrder = db.prepare('SELECT status, user_id FROM orders WHERE id = ?').get(id);

    if (safeStatus && currentOrder && currentOrder.status !== safeStatus) {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(safeStatus, id);

      // Record status change in history
      db.prepare('INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, ?, ?)')
        .run(id, safeStatus, req.user.id);

      // Update timestamp fields + tracking info + notifications
      if (safeStatus === 'shipped') {
        const safeTracking = tracking_number ? tracking_number.trim() : null;
        const safeCarrier = carrier ? carrier.trim() : null;
        db.prepare('UPDATE orders SET shipped_at = CURRENT_TIMESTAMP, tracking_number = COALESCE(?, tracking_number), carrier = COALESCE(?, carrier) WHERE id = ?')
          .run(safeTracking, safeCarrier, id);
        // Notify customer
        const trackingMsg = safeTracking ? ` Tracking: ${safeCarrier ? safeCarrier + ' ' : ''}${safeTracking}` : '';
        db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)')
          .run(currentOrder.user_id, 'order_update', 'Order Shipped', `Your order #${id} has been shipped!${trackingMsg}`);
        // Fire-and-forget shipping email
        const shippedUser = db.prepare('SELECT email, name FROM users WHERE id = ?').get(currentOrder.user_id);
        if (shippedUser) {
          emailService.sendShippingUpdate(shippedUser.email, {
            customerName: shippedUser.name,
            orderNumber: id,
            trackingNumber: safeTracking,
            carrier: safeCarrier
          }).catch(err => console.error('Shipping email failed:', err.message));
        }
      } else if (safeStatus === 'delivered') {
        db.prepare('UPDATE orders SET delivered_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        // Notify customer
        db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)')
          .run(currentOrder.user_id, 'order_update', 'Order Delivered', `Your order #${id} has been delivered. Thank you for shopping with Silvera!`);
        // Fire-and-forget delivery email
        const deliveredUser = db.prepare('SELECT email, name FROM users WHERE id = ?').get(currentOrder.user_id);
        if (deliveredUser) {
          emailService.sendDeliveryConfirmation(deliveredUser.email, {
            customerName: deliveredUser.name,
            orderNumber: id
          }).catch(err => console.error('Delivery email failed:', err.message));
        }
      }
    }
    // Save tracking/carrier even without status change
    if (tracking_number && (!safeStatus || safeStatus !== 'shipped')) {
      db.prepare('UPDATE orders SET tracking_number = ? WHERE id = ?').run(tracking_number.trim(), id);
    }
    if (carrier && (!safeStatus || safeStatus !== 'shipped')) {
      db.prepare('UPDATE orders SET carrier = ? WHERE id = ?').run(carrier.trim(), id);
    }
    if (safePaymentStatus) {
      db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(safePaymentStatus, id);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Update tracking number
app.put('/api/admin/orders/:id/tracking', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const { tracking_number, carrier } = req.body;
    if (!tracking_number || typeof tracking_number !== 'string') {
      return res.status(400).json({ error: 'Tracking number required' });
    }

    const safeCarrier = carrier ? carrier.trim() : null;
    db.prepare('UPDATE orders SET tracking_number = ?, carrier = COALESCE(?, carrier) WHERE id = ?')
      .run(tracking_number.trim(), safeCarrier, id);

    // Add note about tracking number update
    const carrierNote = safeCarrier ? ` (${safeCarrier})` : '';
    db.prepare('INSERT INTO order_notes (order_id, admin_id, note) VALUES (?, ?, ?)')
      .run(id, req.user.id, `Tracking number added: ${tracking_number.trim()}${carrierNote}`);

    res.json({ success: true, tracking_number: tracking_number.trim(), carrier: safeCarrier });
  } catch (e) {
    console.error('Update tracking error:', e.message);
    res.status(500).json({ error: 'Failed to update tracking number' });
  }
});

// Add order note
app.post('/api/admin/orders/:id/notes', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const { note } = req.body;
    if (!note || typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({ error: 'Note content required' });
    }

    const result = db.prepare('INSERT INTO order_notes (order_id, admin_id, note) VALUES (?, ?, ?)')
      .run(id, req.user.id, note.trim());

    const newNote = db.prepare(`
      SELECT n.*, u.name as admin_name 
      FROM order_notes n 
      LEFT JOIN users u ON n.admin_id = u.id 
      WHERE n.id = ?
    `).get(result.lastInsertRowid);

    res.json(newNote);
  } catch (e) {
    console.error('Add note error:', e.message);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// ==================== ADMIN RETURNS ====================

// List all returns
app.get('/api/admin/returns', auth, adminOnly, (req, res) => {
  try {
    const returns = db.prepare(`
      SELECT r.*, o.total as order_total, o.status as order_status, o.payment_status as order_payment_status,
             u.name as customer_name, u.email as customer_email
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(returns);
  } catch (e) {
    console.error('Admin returns fetch error:', e.message);
    res.status(500).json({ error: 'Failed to fetch returns' });
  }
});

// Process a return (approve/reject)
app.put('/api/admin/returns/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid return ID' });
    }

    const { status, admin_notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const returnReq = db.prepare('SELECT * FROM returns WHERE id = ?').get(id);
    if (!returnReq) {
      return res.status(404).json({ error: 'Return request not found' });
    }
    if (returnReq.status !== 'pending') {
      return res.status(400).json({ error: 'Return has already been processed' });
    }

    const newStatus = status === 'approved' ? 'approved' : 'rejected';
    db.prepare('UPDATE returns SET status = ?, admin_notes = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newStatus, admin_notes || null, id);

    if (status === 'approved') {
      // Update order: set payment_status to refunded and status to cancelled
      db.prepare('UPDATE orders SET payment_status = ?, status = ? WHERE id = ?')
        .run('refunded', 'cancelled', returnReq.order_id);
      db.prepare('INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, ?, ?)')
        .run(returnReq.order_id, 'cancelled', req.user.id);

      // Restore stock
      try {
        const order = db.prepare('SELECT items FROM orders WHERE id = ?').get(returnReq.order_id);
        if (order) {
          const items = JSON.parse(order.items || '[]');
          const restoreStmt = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
          for (const item of items) {
            restoreStmt.run(item.quantity, item.product_id);
          }
        }
      } catch (restoreErr) {
        console.error('Stock restore on return error:', restoreErr.message);
      }

      // Notify customer of approval
      db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)')
        .run(returnReq.user_id, 'return_update', 'Return Approved', `Your return for order #${returnReq.order_id} has been approved. Refund of ₱${returnReq.refund_amount?.toLocaleString() || '0'} will be processed.`);
    } else {
      // Notify customer of rejection
      const noteMsg = admin_notes ? ` Reason: ${admin_notes}` : '';
      db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)')
        .run(returnReq.user_id, 'return_update', 'Return Rejected', `Your return for order #${returnReq.order_id} has been rejected.${noteMsg}`);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Process return error:', e.message);
    res.status(500).json({ error: 'Failed to process return' });
  }
});

// Migration: Add is_active column to users if not exists
try {
  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  if (!userColumns.find(c => c.name === 'is_active')) {
    db.exec("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
    console.log('✅ Added is_active column to users table');
  }
} catch (e) {
  console.error('Users is_active migration error:', e.message);
}

// Get all users (admin)
app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.email, u.name, u.phone, u.role, u.is_active, u.created_at,
             (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as orders_count
      FROM users u 
      ORDER BY u.created_at DESC
    `).all();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user with orders and addresses (admin)
app.get('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = db.prepare(`
      SELECT id, email, name, phone, role, is_active, created_at
      FROM users WHERE id = ?
    `).get(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's orders
    const orders = db.prepare(`
      SELECT id, status, total, payment_status, payment_method, created_at
      FROM orders WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(id);

    // Get user's addresses
    const addresses = db.prepare(`
      SELECT id, label, name, phone, region, province, municipality, barangay, 
             street_address, zip_code, is_default
      FROM addresses WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(id);

    res.json({ ...user, orders, addresses });
  } catch (e) {
    console.error('Get user error:', e.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user details (admin)
app.put('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { name, email, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Check if email already exists for another user
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.toLowerCase().trim(), id);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use by another user' });
    }

    db.prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?')
      .run(name.trim(), email.toLowerCase().trim(), (phone || '').trim(), id);

    const updatedUser = db.prepare('SELECT id, email, name, phone, role, is_active, created_at FROM users WHERE id = ?').get(id);
    res.json(updatedUser);
  } catch (e) {
    console.error('Update user error:', e.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Change user role (admin)
app.put('/api/admin/users/:id/role', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { role } = req.body;
    if (!['customer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "customer" or "admin"' });
    }

    // Prevent changing own role (safety)
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);

    const updatedUser = db.prepare('SELECT id, email, name, phone, role, is_active, created_at FROM users WHERE id = ?').get(id);
    res.json(updatedUser);
  } catch (e) {
    console.error('Change role error:', e.message);
    res.status(500).json({ error: 'Failed to change user role' });
  }
});

// Enable/Disable user account (admin)
app.put('/api/admin/users/:id/status', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { is_active } = req.body;
    if (typeof is_active !== 'boolean' && ![0, 1].includes(is_active)) {
      return res.status(400).json({ error: 'is_active must be boolean' });
    }

    // Prevent disabling own account
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot disable your own account' });
    }

    const activeValue = is_active ? 1 : 0;
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(activeValue, id);

    const updatedUser = db.prepare('SELECT id, email, name, phone, role, is_active, created_at FROM users WHERE id = ?').get(id);
    res.json(updatedUser);
  } catch (e) {
    console.error('Update status error:', e.message);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Reset user password (admin) - generates temporary password
app.post('/api/admin/users/:id/reset-password', auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex'); // 16 char password
    const hashedPassword = bcrypt.hashSync(tempPassword, 10);

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);

    // Optionally send email with new password
    try {
      await emailService.sendOTP(user.email, {
        recipientName: user.name || 'User',
        otp: tempPassword,
        purpose: 'password_reset_admin',
        expiryMinutes: 60
      });
      console.log(`✅ Password reset email sent to ${user.email}`);
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr.message);
    }

    res.json({
      success: true,
      message: 'Password has been reset. The new temporary password was sent to the user\'s email.',
    });
  } catch (e) {
    console.error('Reset password error:', e.message);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Delete user (admin) - soft delete by deactivating, or hard delete
app.delete('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Prevent deleting own account
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for hard_delete query param
    const hardDelete = req.query.hard === 'true';

    if (hardDelete) {
      // Hard delete - remove user and related data
      db.prepare('DELETE FROM cart WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM wishlist WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM addresses WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM notifications WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM reviews WHERE user_id = ?').run(id);
      // Keep orders for audit trail but unlink user
      db.prepare('UPDATE orders SET user_id = NULL WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      
      res.json({ success: true, message: 'User permanently deleted' });
    } else {
      // Soft delete - just deactivate
      db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
      res.json({ success: true, message: 'User account deactivated' });
    }
  } catch (e) {
    console.error('Delete user error:', e.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.get('/api/admin/categories', auth, adminOnly, (req, res) => {
  try {
    // Get categories with product count
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.name
    `).all();
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/admin/categories', auth, adminOnly, (req, res) => {
  try {
    const { name, slug, description, image } = req.body;
    if (!validateString(name)) {
      return res.status(400).json({ error: 'Category name required' });
    }
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100);
    const result = db.prepare('INSERT INTO categories (name, slug, description, image) VALUES (?, ?, ?, ?)').run(
      sanitizeString(name), finalSlug, sanitizeString(description || ''), sanitizeString(image || '')
    );
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Category already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/admin/categories/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const { name, slug, description, image } = req.body;
    if (!validateString(name)) {
      return res.status(400).json({ error: 'Category name required' });
    }

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100);
    
    const result = db.prepare('UPDATE categories SET name = ?, slug = ?, description = ?, image = ? WHERE id = ?').run(
      sanitizeString(name), finalSlug, sanitizeString(description || ''), sanitizeString(image || ''), id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Category with this slug already exists' });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/admin/categories/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    // Check if category has products
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id);
    if (productCount && productCount.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category with ${productCount.count} product(s). Reassign or delete products first.` 
      });
    }

    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ==================== ADMIN SETTINGS ROUTES ====================

// Migrate settings table to have updated_at column
try {
  const settingsCols = db.prepare("PRAGMA table_info(settings)").all();
  if (!settingsCols.find(c => c.name === 'updated_at')) {
    db.exec("ALTER TABLE settings ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP");
    console.log('✅ Added updated_at column to settings table');
  }
} catch (e) {
  console.error('Settings migration error:', e.message);
}

// Get all settings
app.get('/api/admin/settings', auth, adminOnly, (req, res) => {
  try {
    const settings = db.prepare('SELECT key, value, updated_at FROM settings').all();
    res.json(settings);
  } catch (e) {
    console.error('Get settings error:', e.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings (batch update)
app.put('/api/admin/settings', auth, adminOnly, (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object required' });
    }

    const allowedKeys = [
      'store_name', 'store_logo', 'contact_email', 'contact_phone', 'store_address', 'currency',
      'social_facebook', 'social_instagram', 'social_twitter',
      'free_shipping_threshold', 'default_shipping_fee',
      'payment_cod_enabled', 'payment_gcash_enabled', 'payment_card_enabled',
      'payment_nexuspay_enabled',
      'email_sender_name', 'email_sender_email',
      'email_order_confirmation', 'email_shipping_updates', 'email_order_delivered',
      'email_order_cancelled', 'email_password_reset', 'email_promotional'
    ];

    const upsertStmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    const updateMany = db.transaction((settingsObj) => {
      for (const [key, value] of Object.entries(settingsObj)) {
        if (allowedKeys.includes(key)) {
          upsertStmt.run(key, String(value || ''));
        }
      }
    });

    updateMany(settings);

    console.log(`✅ Settings updated by admin user ${req.user.id}`);
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (e) {
    console.error('Update settings error:', e.message);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get single setting (public, for frontend use)
app.get('/api/settings/:key', (req, res) => {
  try {
    const { key } = req.params;
    const publicKeys = ['store_name', 'store_logo', 'currency', 'social_facebook', 'social_instagram', 'social_twitter',
                        'free_shipping_threshold', 'default_shipping_fee',
                        'payment_cod_enabled', 'payment_gcash_enabled', 'payment_card_enabled',
                        'payment_nexuspay_enabled'];

    if (!publicKeys.includes(key)) {
      return res.status(403).json({ error: 'Setting not accessible' });
    }

    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    res.json({ key, value: setting?.value || null });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Get all public settings (for frontend)
app.get('/api/settings', (req, res) => {
  try {
    const publicKeys = ['store_name', 'store_logo', 'currency', 'social_facebook', 'social_instagram', 'social_twitter',
                        'free_shipping_threshold', 'default_shipping_fee',
                        'payment_cod_enabled', 'payment_gcash_enabled', 'payment_card_enabled',
                        'payment_nexuspay_enabled'];

    const settings = db.prepare(`SELECT key, value FROM settings WHERE key IN (${publicKeys.map(() => '?').join(',')})`).all(...publicKeys);
    
    // Convert to object for easier frontend use
    const settingsObj = {};
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });
    
    res.json(settingsObj);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ==================== ADMIN REPORTS & ANALYTICS ====================

// Sales overview report
app.get('/api/admin/reports/sales', auth, adminOnly, (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Revenue calculations (only paid orders)
    const todayRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as sum 
      FROM orders 
      WHERE payment_status = 'paid' AND created_at >= ?
    `).get(todayStart).sum;

    const weekRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as sum 
      FROM orders 
      WHERE payment_status = 'paid' AND created_at >= ?
    `).get(weekStart).sum;

    const monthRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as sum 
      FROM orders 
      WHERE payment_status = 'paid' AND created_at >= ?
    `).get(monthStart).sum;

    const allTimeRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as sum 
      FROM orders 
      WHERE payment_status = 'paid'
    `).get().sum;

    // Order counts
    const ordersToday = db.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ?').get(todayStart).count;
    const ordersThisWeek = db.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ?').get(weekStart).count;
    const ordersThisMonth = db.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ?').get(monthStart).count;
    const ordersAllTime = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;

    res.json({
      today: todayRevenue,
      thisWeek: weekRevenue,
      thisMonth: monthRevenue,
      allTime: allTimeRevenue,
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      ordersAllTime,
    });
  } catch (e) {
    console.error('Sales report error:', e.message);
    res.status(500).json({ error: 'Failed to fetch sales report' });
  }
});

// Revenue trend data
app.get('/api/admin/reports/revenue', auth, adminOnly, (req, res) => {
  try {
    const { period = 'month' } = req.query;
    let days = 30;
    let groupBy = 'day';
    
    switch (period) {
      case 'day': days = 1; groupBy = 'hour'; break;
      case 'week': days = 7; groupBy = 'day'; break;
      case 'month': days = 30; groupBy = 'day'; break;
      case 'year': days = 365; groupBy = 'month'; break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let dateFormat;
    if (groupBy === 'hour') {
      dateFormat = '%Y-%m-%d %H:00';
    } else if (groupBy === 'month') {
      dateFormat = '%Y-%m';
    } else {
      dateFormat = '%Y-%m-%d';
    }

    const revenueData = db.prepare(`
      SELECT 
        strftime('${dateFormat}', created_at) as date,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE created_at >= ?
      GROUP BY strftime('${dateFormat}', created_at)
      ORDER BY date ASC
    `).all(startDate.toISOString());

    res.json({ revenue: revenueData, period });
  } catch (e) {
    console.error('Revenue report error:', e.message);
    res.status(500).json({ error: 'Failed to fetch revenue report' });
  }
});

// Top selling products
app.get('/api/admin/reports/top-products', auth, adminOnly, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    // Get all orders with items and aggregate
    const orders = db.prepare(`
      SELECT items, total, payment_status
      FROM orders
      WHERE payment_status = 'paid'
    `).all();

    const productSales = {};

    orders.forEach(order => {
      try {
        const items = JSON.parse(order.items || '[]');
        items.forEach(item => {
          const productId = item.product_id || item.id;
          const name = item.name || `Product #${productId}`;
          const quantity = item.quantity || 1;
          const price = item.sale_price || item.price || 0;

          if (!productSales[productId]) {
            productSales[productId] = { id: productId, name, sold: 0, revenue: 0 };
          }
          productSales[productId].sold += quantity;
          productSales[productId].revenue += price * quantity;
        });
      } catch (e) {
        // Skip invalid items
      }
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    res.json({ products: topProducts });
  } catch (e) {
    console.error('Top products report error:', e.message);
    res.status(500).json({ error: 'Failed to fetch top products report' });
  }
});

// Orders by status
app.get('/api/admin/reports/orders-by-status', auth, adminOnly, (req, res) => {
  try {
    const statusData = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      GROUP BY status
    `).all();

    const totalOrders = statusData.reduce((sum, s) => sum + s.count, 0);
    const statuses = statusData.map(s => ({
      status: s.status,
      count: s.count,
      percentage: totalOrders > 0 ? (s.count / totalOrders) * 100 : 0,
    }));

    // Payment methods breakdown
    const paymentData = db.prepare(`
      SELECT 
        COALESCE(payment_method, 'Unknown') as method,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) as total
      FROM orders
      GROUP BY payment_method
      ORDER BY count DESC
    `).all();

    const totalPayments = paymentData.reduce((sum, p) => sum + p.count, 0);
    const paymentMethods = paymentData.map(p => ({
      method: p.method || 'Unknown',
      count: p.count,
      total: p.total,
      percentage: totalPayments > 0 ? (p.count / totalPayments) * 100 : 0,
    }));

    res.json({ statuses, paymentMethods });
  } catch (e) {
    console.error('Orders by status report error:', e.message);
    res.status(500).json({ error: 'Failed to fetch orders by status report' });
  }
});

// Customer growth data
app.get('/api/admin/reports/customers', auth, adminOnly, (req, res) => {
  try {
    const { period = 'month' } = req.query;
    let days = 30;
    
    switch (period) {
      case 'day': days = 1; break;
      case 'week': days = 7; break;
      case 'month': days = 30; break;
      case 'year': days = 365; break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Daily new customer registrations
    const growthData = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as newCustomers
      FROM users
      WHERE role = 'customer' AND created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(startDate.toISOString());

    // Calculate cumulative totals
    const totalBefore = db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'customer' AND created_at < ?
    `).get(startDate.toISOString()).count;

    let cumulative = totalBefore;
    const growth = growthData.map(d => {
      cumulative += d.newCustomers;
      return {
        date: d.date,
        newCustomers: d.newCustomers,
        totalCustomers: cumulative,
      };
    });

    // Total customers
    const totalCustomers = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE role = 'customer'
    `).get().count;

    res.json({ growth, totalCustomers, period });
  } catch (e) {
    console.error('Customer report error:', e.message);
    res.status(500).json({ error: 'Failed to fetch customer report' });
  }
});

// Revenue by category
app.get('/api/admin/reports/revenue-by-category', auth, adminOnly, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT items, total FROM orders WHERE payment_status = 'paid'
    `).all();

    const categoryMap = {};

    orders.forEach(order => {
      try {
        const items = JSON.parse(order.items || '[]');
        items.forEach(item => {
          const productId = item.product_id || item.id;
          const quantity = item.quantity || 1;
          const price = item.sale_price || item.price || 0;

          // Look up product to get category_id
          const product = db.prepare('SELECT category_id FROM products WHERE id = ?').get(productId);
          const categoryId = product?.category_id || null;

          if (!categoryMap[categoryId]) {
            // Look up category name
            const category = categoryId
              ? db.prepare('SELECT id, name FROM categories WHERE id = ?').get(categoryId)
              : null;
            categoryMap[categoryId] = {
              id: categoryId || 0,
              name: category?.name || 'Uncategorized',
              revenue: 0,
              orders: 0,
            };
          }
          categoryMap[categoryId].revenue += price * quantity;
        });
      } catch (e) {
        // Skip invalid items
      }
    });

    // Count distinct orders per category (increment once per order that has items in that category)
    orders.forEach(order => {
      try {
        const items = JSON.parse(order.items || '[]');
        const seenCategories = new Set();
        items.forEach(item => {
          const productId = item.product_id || item.id;
          const product = db.prepare('SELECT category_id FROM products WHERE id = ?').get(productId);
          const categoryId = product?.category_id || null;
          if (!seenCategories.has(categoryId) && categoryMap[categoryId]) {
            categoryMap[categoryId].orders += 1;
            seenCategories.add(categoryId);
          }
        });
      } catch (e) {
        // Skip invalid items
      }
    });

    const categories = Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);

    res.json({ categories });
  } catch (e) {
    console.error('Revenue by category error:', e.message);
    res.status(500).json({ error: 'Failed to fetch revenue by category' });
  }
});

// ==================== COUPONS SYSTEM ====================

// Create coupons table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('percentage', 'fixed')),
    value REAL NOT NULL,
    min_order_amount REAL DEFAULT 0,
    max_uses INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    starts_at DATETIME,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
  CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);
`);

// Get all coupons
app.get('/api/admin/coupons', auth, adminOnly, (req, res) => {
  try {
    const coupons = db.prepare(`
      SELECT id, code, type, value, min_order_amount, max_uses, used_count, 
             is_active, starts_at, expires_at, created_at
      FROM coupons
      ORDER BY created_at DESC
    `).all();
    res.json(coupons);
  } catch (e) {
    console.error('Get coupons error:', e.message);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Create coupon
app.post('/api/admin/coupons', auth, adminOnly, (req, res) => {
  try {
    const { code, type, value, min_order_amount, max_uses, is_active, starts_at, expires_at } = req.body;

    if (!code || !type || !value) {
      return res.status(400).json({ error: 'Code, type, and value are required' });
    }

    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ error: 'Type must be percentage or fixed' });
    }

    if (type === 'percentage' && (value < 0 || value > 100)) {
      return res.status(400).json({ error: 'Percentage value must be between 0 and 100' });
    }

    const result = db.prepare(`
      INSERT INTO coupons (code, type, value, min_order_amount, max_uses, is_active, starts_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code.toUpperCase().trim(),
      type,
      value,
      min_order_amount || 0,
      max_uses || 0,
      is_active !== false ? 1 : 0,
      starts_at || null,
      expires_at || null
    );

    const newCoupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(result.lastInsertRowid);
    console.log(`✅ Coupon created: ${code} by admin ${req.user.id}`);
    res.status(201).json(newCoupon);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    console.error('Create coupon error:', e.message);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// Update coupon
app.put('/api/admin/coupons/:id', auth, adminOnly, (req, res) => {
  try {
    const couponId = parseInt(req.params.id);
    if (!Number.isInteger(couponId) || couponId < 1) {
      return res.status(400).json({ error: 'Invalid coupon ID' });
    }

    const existing = db.prepare('SELECT id FROM coupons WHERE id = ?').get(couponId);
    if (!existing) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const { code, type, value, min_order_amount, max_uses, is_active, starts_at, expires_at } = req.body;

    if (type && !['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ error: 'Type must be percentage or fixed' });
    }

    if (type === 'percentage' && value !== undefined && (value < 0 || value > 100)) {
      return res.status(400).json({ error: 'Percentage value must be between 0 and 100' });
    }

    db.prepare(`
      UPDATE coupons 
      SET code = COALESCE(?, code),
          type = COALESCE(?, type),
          value = COALESCE(?, value),
          min_order_amount = COALESCE(?, min_order_amount),
          max_uses = COALESCE(?, max_uses),
          is_active = COALESCE(?, is_active),
          starts_at = ?,
          expires_at = ?
      WHERE id = ?
    `).run(
      code ? code.toUpperCase().trim() : null,
      type || null,
      value !== undefined ? value : null,
      min_order_amount !== undefined ? min_order_amount : null,
      max_uses !== undefined ? max_uses : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      starts_at !== undefined ? starts_at : null,
      expires_at !== undefined ? expires_at : null,
      couponId
    );

    const updatedCoupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(couponId);
    console.log(`✅ Coupon updated: ${updatedCoupon.code} by admin ${req.user.id}`);
    res.json(updatedCoupon);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    console.error('Update coupon error:', e.message);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// Delete coupon
app.delete('/api/admin/coupons/:id', auth, adminOnly, (req, res) => {
  try {
    const couponId = parseInt(req.params.id);
    if (!Number.isInteger(couponId) || couponId < 1) {
      return res.status(400).json({ error: 'Invalid coupon ID' });
    }

    const existing = db.prepare('SELECT code FROM coupons WHERE id = ?').get(couponId);
    if (!existing) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    db.prepare('DELETE FROM coupons WHERE id = ?').run(couponId);
    console.log(`✅ Coupon deleted: ${existing.code} by admin ${req.user.id}`);
    res.json({ success: true });
  } catch (e) {
    console.error('Delete coupon error:', e.message);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// Validate coupon (public endpoint for checkout)
app.post('/api/coupons/validate', auth, (req, res) => {
  try {
    const { code, order_total } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(code.toUpperCase().trim());

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or inactive coupon code' });
    }

    const now = new Date();
    
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return res.status(400).json({ error: 'Coupon is not yet active' });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    if (coupon.min_order_amount > 0 && order_total < coupon.min_order_amount) {
      return res.status(400).json({ 
        error: `Minimum order amount is ₱${coupon.min_order_amount.toLocaleString()}` 
      });
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (order_total * coupon.value) / 100;
    } else {
      discount = Math.min(coupon.value, order_total);
    }

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      discount: Math.round(discount * 100) / 100,
      new_total: Math.round((order_total - discount) * 100) / 100,
    });
  } catch (e) {
    console.error('Validate coupon error:', e.message);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

// ==================== PERFORMANCE METRICS API ====================

app.get('/api/admin/performance/metrics', auth, adminOnly, (req, res) => {
  try {
    pruneMetrics();
    const now = Date.now();
    const cutoff = now - METRICS_WINDOW_MS;

    // Flatten all entries
    const allEntries = [];
    for (const entries of Object.values(metricsStore)) {
      for (const e of entries) allEntries.push(e);
    }

    // Overall stats
    const totalRequests = allEntries.length;
    const durations = allEntries.map(e => e.duration).sort((a, b) => a - b);
    const errorCount = allEntries.filter(e => e.status >= 400).length;
    const avgResponseTime = totalRequests > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / totalRequests)
      : 0;
    const p95ResponseTime = totalRequests > 0
      ? durations[Math.floor(totalRequests * 0.95)] || durations[durations.length - 1]
      : 0;
    const p99ResponseTime = totalRequests > 0
      ? durations[Math.floor(totalRequests * 0.99)] || durations[durations.length - 1]
      : 0;
    const errorRate = totalRequests > 0
      ? Math.round((errorCount / totalRequests) * 10000) / 100
      : 0;
    const uptimeMs = now - SERVER_START_TIME;
    const uptimeHours = Math.round(uptimeMs / 3600000 * 10) / 10;

    // Per-endpoint breakdown
    const endpoints = Object.entries(metricsStore).map(([key, entries]) => {
      const [method, ...pathParts] = key.split(':');
      const ePath = pathParts.join(':');
      const eDurations = entries.map(e => e.duration).sort((a, b) => a - b);
      const eErrors = entries.filter(e => e.status >= 400).length;
      const eAvg = Math.round(eDurations.reduce((a, b) => a + b, 0) / eDurations.length);
      const eP95 = eDurations[Math.floor(eDurations.length * 0.95)] || eDurations[eDurations.length - 1];
      return {
        method,
        path: ePath,
        avgTime: eAvg,
        p95Time: eP95,
        calls: entries.length,
        errorRate: Math.round((eErrors / entries.length) * 10000) / 100,
      };
    });

    // Sort by avg time descending, take top 20
    endpoints.sort((a, b) => b.avgTime - a.avgTime);
    const topEndpoints = endpoints.slice(0, 20);

    // Time-series: per-minute averages for last 60 minutes
    const timeSeries = [];
    for (let m = 59; m >= 0; m--) {
      const minuteStart = now - (m + 1) * 60000;
      const minuteEnd = now - m * 60000;
      const minuteEntries = allEntries.filter(e => e.time >= minuteStart && e.time < minuteEnd);
      const minuteAvg = minuteEntries.length > 0
        ? Math.round(minuteEntries.reduce((sum, e) => sum + e.duration, 0) / minuteEntries.length)
        : 0;
      const minuteErrors = minuteEntries.filter(e => e.status >= 400).length;
      timeSeries.push({
        time: new Date(minuteEnd).toISOString(),
        avgResponseTime: minuteAvg,
        requests: minuteEntries.length,
        errors: minuteErrors,
      });
    }

    res.json({
      overall: {
        avgResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        totalRequests,
        errorRate,
        uptimeHours,
      },
      endpoints: topEndpoints,
      timeSeries,
    });
  } catch (e) {
    console.error('Performance metrics error:', e.message);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// ==================== WEBHOOK HEALTH CHECK ====================

app.get('/api/admin/webhooks/health', auth, adminOnly, (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Summary stats for last 24 hours
    const stats24h = db.prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END), 0) as processed,
        COALESCE(SUM(CASE WHEN signature_valid = 0 THEN 1 ELSE 0 END), 0) as invalid_signatures,
        COALESCE(SUM(CASE WHEN duplicate = 1 THEN 1 ELSE 0 END), 0) as duplicates,
        COALESCE(SUM(CASE WHEN error_message IS NOT NULL AND error_message != '' THEN 1 ELSE 0 END), 0) as errors,
        COALESCE(SUM(CASE WHEN event_type = 'payment_success' THEN 1 ELSE 0 END), 0) as successful_payments,
        COALESCE(SUM(CASE WHEN event_type = 'payment_failed' THEN 1 ELSE 0 END), 0) as failed_payments
      FROM webhook_logs WHERE created_at >= ?
    `).get(last24h);

    // Summary stats for last 7 days
    const stats7d = db.prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END), 0) as processed,
        COALESCE(SUM(CASE WHEN error_message IS NOT NULL AND error_message != '' THEN 1 ELSE 0 END), 0) as errors
      FROM webhook_logs WHERE created_at >= ?
    `).get(last7d);

    // Recent webhook logs (last 20)
    const recentLogs = db.prepare(`
      SELECT id, source, event_type, payment_ref, transaction_id, status, amount,
             signature_valid, response_code, error_message, processed, duplicate, created_at
      FROM webhook_logs ORDER BY created_at DESC LIMIT 20
    `).all();

    // Last successful webhook
    const lastSuccess = db.prepare(`
      SELECT created_at FROM webhook_logs
      WHERE event_type = 'payment_success' AND processed = 1
      ORDER BY created_at DESC LIMIT 1
    `).get();

    // Error rate
    const errorRate = stats24h.total > 0
      ? ((stats24h.errors / stats24h.total) * 100).toFixed(1)
      : '0.0';

    // Health status
    let healthStatus = 'healthy';
    if (stats24h.errors > 5 || parseFloat(errorRate) > 50) healthStatus = 'degraded';
    if (stats24h.invalid_signatures > 3) healthStatus = 'warning';

    res.json({
      status: healthStatus,
      last_24h: {
        total_webhooks: stats24h.total,
        processed: stats24h.processed,
        successful_payments: stats24h.successful_payments,
        failed_payments: stats24h.failed_payments,
        invalid_signatures: stats24h.invalid_signatures,
        duplicates: stats24h.duplicates,
        errors: stats24h.errors,
        error_rate: `${errorRate}%`
      },
      last_7d: {
        total_webhooks: stats7d.total,
        processed: stats7d.processed,
        errors: stats7d.errors
      },
      last_successful_webhook: lastSuccess ? lastSuccess.created_at : null,
      recent_logs: recentLogs
    });
  } catch (e) {
    console.error('Webhook health check error:', e.message);
    res.status(500).json({ error: 'Failed to fetch webhook health data' });
  }
});

// ==================== SELF-HOSTED ANALYTICS ====================

// Public: collect page view (no auth, rate-limited)
app.post('/api/analytics/collect', analyticsLimiter, (req, res) => {
  try {
    const { path: pagePath, referrer, screenWidth } = req.body;
    if (!pagePath || typeof pagePath !== 'string') {
      return res.status(400).json({ error: 'path required' });
    }
    const ip = req.ip || req.connection.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    const visitorHash = hashVisitor(ip, ua);
    const cleanPath = pagePath.slice(0, 500);
    const cleanReferrer = extractReferrerDomain(referrer, req.headers.host);
    const sw = typeof screenWidth === 'number' && screenWidth > 0 ? Math.round(screenWidth) : null;
    db.prepare('INSERT INTO analytics_page_views (visitor_hash, path, referrer, screen_width) VALUES (?, ?, ?, ?)').run(
      visitorHash, cleanPath, cleanReferrer, sw
    );
    res.status(202).json({ ok: true });
  } catch (e) {
    console.error('Analytics collect error:', e.message);
    res.status(500).json({ error: 'Failed to record page view' });
  }
});

// Public: collect custom event (no auth, rate-limited)
app.post('/api/analytics/event', analyticsLimiter, (req, res) => {
  try {
    const { name, props, path: pagePath } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name required' });
    }
    const ip = req.ip || req.connection.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    const visitorHash = hashVisitor(ip, ua);
    const cleanName = name.slice(0, 200);
    const cleanPath = (pagePath && typeof pagePath === 'string') ? pagePath.slice(0, 500) : null;
    const cleanProps = props ? JSON.stringify(props).slice(0, 1000) : null;
    db.prepare('INSERT INTO analytics_events (visitor_hash, name, props, path) VALUES (?, ?, ?, ?)').run(
      visitorHash, cleanName, cleanProps, cleanPath
    );
    res.status(202).json({ ok: true });
  } catch (e) {
    console.error('Analytics event error:', e.message);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

// Admin: query analytics visitors
app.get('/api/admin/analytics/visitors', auth, adminOnly, (req, res) => {
  try {
    const period = req.query.period || 'week';
    let days;
    switch (period) {
      case 'day': days = 1; break;
      case 'month': days = 30; break;
      default: days = 7; break;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const periodStart = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

    // Today stats
    const todayStats = db.prepare(`
      SELECT COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
      FROM analytics_page_views WHERE created_at >= ?
    `).get(todayStart);

    // Period stats
    const periodStats = db.prepare(`
      SELECT COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
      FROM analytics_page_views WHERE created_at >= ?
    `).get(periodStart);

    // Top pages
    const topPages = db.prepare(`
      SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
      FROM analytics_page_views WHERE created_at >= ?
      GROUP BY path ORDER BY views DESC LIMIT 10
    `).all(periodStart);

    // Top referrers
    const topReferrers = db.prepare(`
      SELECT referrer, COUNT(*) as views
      FROM analytics_page_views WHERE created_at >= ? AND referrer IS NOT NULL
      GROUP BY referrer ORDER BY views DESC LIMIT 5
    `).all(periodStart);

    // Hourly breakdown (last 24 hours)
    const hourly = [];
    for (let h = 23; h >= 0; h--) {
      const hourStart = new Date(now - (h + 1) * 60 * 60 * 1000).toISOString();
      const hourEnd = new Date(now - h * 60 * 60 * 1000).toISOString();
      const row = db.prepare(`
        SELECT COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
        FROM analytics_page_views WHERE created_at >= ? AND created_at < ?
      `).get(hourStart, hourEnd);
      hourly.push({
        hour: new Date(now - h * 60 * 60 * 1000).getHours(),
        views: row.views,
        visitors: row.visitors,
      });
    }

    // Top events
    const topEvents = db.prepare(`
      SELECT name, COUNT(*) as count
      FROM analytics_events WHERE created_at >= ?
      GROUP BY name ORDER BY count DESC LIMIT 10
    `).all(periodStart);

    // Device breakdown (mobile < 768, tablet 768-1024, desktop > 1024)
    const devices = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN screen_width IS NOT NULL AND screen_width < 768 THEN 1 ELSE 0 END), 0) as mobile,
        COALESCE(SUM(CASE WHEN screen_width >= 768 AND screen_width <= 1024 THEN 1 ELSE 0 END), 0) as tablet,
        COALESCE(SUM(CASE WHEN screen_width > 1024 THEN 1 ELSE 0 END), 0) as desktop,
        COALESCE(SUM(CASE WHEN screen_width IS NULL THEN 1 ELSE 0 END), 0) as unknown
      FROM analytics_page_views WHERE created_at >= ?
    `).get(periodStart);

    // Pages per visitor
    const pagesPerVisitor = periodStats.visitors > 0
      ? Math.round((periodStats.views / periodStats.visitors) * 10) / 10
      : 0;

    res.json({
      today: { views: todayStats.views, visitors: todayStats.visitors },
      period: { days, views: periodStats.views, visitors: periodStats.visitors, pagesPerVisitor },
      topPages,
      topReferrers,
      hourly,
      topEvents,
      devices,
    });
  } catch (e) {
    console.error('Analytics visitors error:', e.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ==================== HEALTH & STATIC ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Silvera V2', version: '2.0.3', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// SPA fallback - serve React client for all routes including /admin
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Silvera V2 running on http://0.0.0.0:${PORT}`);
  console.log(`Shop: http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  console.log(`API: http://localhost:${PORT}/api`);
});
