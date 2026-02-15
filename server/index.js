/**
 * Silvera V2 - Full-Stack E-commerce Backend
 * Features: Products, Cart, Orders, Users, Admin CMS, DirectPay/NexusPay, Email Service
 * Version: 2.0.3 - Modular Route Architecture
 */

// Load environment variables
// Preserve NODE_ENV from command line — dotenv v17 auto-injects .env values
// which can override NODE_ENV=test set by the Playwright webServer command.
const _savedNodeEnv = process.env.NODE_ENV;
require('dotenv').config();
if (_savedNodeEnv) process.env.NODE_ENV = _savedNodeEnv;

// Sentry error monitoring (no-op when SENTRY_DSN is not set)
let Sentry = null;
if (process.env.SENTRY_DSN) {
  Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request && event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });
}

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');

// Initialize database (runs migrations + seeds on require)
require('./db');

// Import middleware
const { metricsMiddleware } = require('./middleware/metrics');
const { apiLimiter } = require('./middleware/rate-limiters');

// Import route modules
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const addressRoutes = require('./routes/addresses');
const notificationRoutes = require('./routes/notifications');
const settingsRoutes = require('./routes/settings');
const analyticsRoutes = require('./routes/analytics');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const adminProductRoutes = require('./routes/admin/products');
const adminOrderRoutes = require('./routes/admin/orders');
const adminUserRoutes = require('./routes/admin/users');
const adminCategoryRoutes = require('./routes/admin/categories');
const adminSettingsRoutes = require('./routes/admin/settings');
const adminReportRoutes = require('./routes/admin/reports');
const adminCouponRoutes = require('./routes/admin/coupons');
const adminAnalyticsRoutes = require('./routes/admin/analytics');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (for rate limiter behind reverse proxy)
const PORT = process.env.PORT || 3865;

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

// Health check endpoint BEFORE any middleware (for Docker health checks over HTTP)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Silvera V2', version: '2.0.3', uptime: process.uptime(), timestamp: new Date().toISOString() });
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
      connectSrc: ["'self'", "https://silvera.innoserver.cloud", "https://nexuspay.cloud", "https://sandbox.directpayph.com", "https://www.google-analytics.com", "https://*.ingest.sentry.io"],
      workerSrc: ["'self'", "blob:"],
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

// Performance metrics middleware
app.use(metricsMiddleware);

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

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Static files - serve production build from client/dist
app.use(express.static(path.join(__dirname, '../client/dist')));
app.use(express.static(path.join(__dirname, '../public')));
// Admin panel
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// ==================== ROUTE MOUNTING ====================

app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', cartRoutes);
app.use('/api', wishlistRoutes);
app.use('/api', orderRoutes);
app.use('/api', paymentRoutes);
app.use('/api', addressRoutes);
app.use('/api', notificationRoutes);
app.use('/api', settingsRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', adminDashboardRoutes);
app.use('/api', adminProductRoutes);
app.use('/api', adminOrderRoutes);
app.use('/api', adminUserRoutes);
app.use('/api', adminCategoryRoutes);
app.use('/api', adminSettingsRoutes);
app.use('/api', adminReportRoutes);
app.use('/api', adminCouponRoutes);
app.use('/api', adminAnalyticsRoutes);

// ==================== ERROR HANDLERS ====================

// Sentry error handler (must be before custom error handler)
if (Sentry) {
  Sentry.setupExpressErrorHandler(app);
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (Sentry) Sentry.captureException(err);
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
