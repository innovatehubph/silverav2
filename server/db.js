const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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

// Coupons table
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

module.exports = db;
