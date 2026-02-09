# silveraph.shop Domain Reconfiguration Guide
## Migrating from Legacy Silvera to SilveraV2 Admin Panel

**Date**: 2026-02-08
**Author**: Claude Code
**Status**: Ready for Implementation

---

## Executive Summary

This guide documents how to reconfigure the `silveraph.shop` domain infrastructure from the legacy Silvera app (running on port 5004) to SilveraV2 (running on port 3865), including a complete analysis of the admin panel architecture that needs to be replicated.

### Current State
- **Legacy Silvera**: Running on `http://127.0.0.1:5004` (PM2 process #15)
- **SilveraV2**: Running on `http://127.0.0.1:3865` (PM2 process #33)
- **Domain**: `silveraph.shop` → Currently proxies to port 5004
- **API Domain**: `api.silveraph.shop` → Currently proxies to port 5004
- **SSL Certificates**: Already issued and active

---

## PART 1: CURRENT NGINX CONFIGURATION

### Current Domain Routing

#### 1. **silveraph.shop** (Main Domain)
**File**: `/etc/nginx/sites-available/silveraph.shop`
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name silveraph.shop www.silveraph.shop;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name silveraph.shop www.silveraph.shop;

    ssl_certificate /etc/letsencrypt/live/silveraph.shop/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/silveraph.shop/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://127.0.0.1:5004;  # ← CURRENTLY POINTS TO LEGACY SILVERA
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }
}
```

**Status**: ✅ SSL Certificate Valid
**Current Target**: http://127.0.0.1:5004 (Legacy Silvera)

---

#### 2. **api.silveraph.shop** (API Subdomain)
**File**: `/etc/nginx/sites-available/api.silveraph.shop`
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.silveraph.shop;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.silveraph.shop;

    ssl_certificate /etc/letsencrypt/live/api.silveraph.shop/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.silveraph.shop/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://127.0.0.1:5004;  # ← CURRENTLY POINTS TO LEGACY SILVERA
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }
}
```

**Status**: ✅ SSL Certificate Valid
**Current Target**: http://127.0.0.1:5004 (Legacy Silvera)

---

#### 3. **csr.silveraph.shop** (Voice/CSR Service)
**File**: `/etc/nginx/sites-available/csr.silveraph.shop`
```nginx
location / {
    proxy_pass http://127.0.0.1:7890/;  # ← Voice AI Service
}

location /api/ {
    proxy_pass http://127.0.0.1:7890/api/;
}

location /livekit-ws/ {
    proxy_pass http://127.0.0.1:7880/;  # ← LiveKit WebSocket
}
```

**Status**: ✅ Separate service (no change needed)
**Current Target**: http://127.0.0.1:7890 (Voice AI) + http://127.0.0.1:7880 (LiveKit)

---

#### 4. **notification.silveraph.shop** (Notification Service)
**File**: `/etc/nginx/sites-available/notification.silveraph.shop`
```nginx
location / {
    proxy_pass http://127.0.0.1:5100;  # ← Notification Service
}
```

**Status**: ✅ Separate service (no change needed)
**Current Target**: http://127.0.0.1:5100 (Notification Service)

---

## PART 2: ADMIN PANEL ARCHITECTURE (LEGACY SILVERA)

### 2.1 Admin Features Overview

The legacy Silvera application has a comprehensive admin dashboard with the following modules:

#### Dashboard Tab
- **File**: `/srv/apps/silvera/client/src/components/admin/DashboardTab.tsx`
- **Features**:
  - Sales summary and statistics
  - Order status overview
  - Inventory alerts
  - Quick action cards

#### Orders Management Tab
- **Features**:
  - List all orders with filters (status, payment, search)
  - View order details with modal
  - Update order status
  - Track shipments
  - Bulk order status updates

#### Products Management Tab
- **Components**:
  - `InventoryTab.tsx` - Inventory management interface
  - `InventoryManager.tsx` - CRUD operations for inventory
  - `VariantManager.tsx` - Product variant management
  - `LowStockAlerts.tsx` - Alert system for low stock
  - `TopProductsList.tsx` - Top-selling products report
- **Features**:
  - Add/edit/delete products
  - Manage product variants (colors, sizes, etc.)
  - Track inventory levels
  - Set low-stock thresholds
  - Bulk operations

#### Categories Management Tab
- **Features**:
  - Create/edit/delete categories
  - Category hierarchy management
  - SEO settings per category

#### Customers Tab
- **Component**: `CustomersTab.tsx`
- **Features**:
  - View all customers
  - Customer profiles
  - Purchase history per customer
  - Customer filtering and search

#### Analytics Tab
- **Components**:
  - `AnalyticsTab.tsx` - Main analytics interface
  - `AnalyticsDashboard.tsx` - Analytics visualizations
  - `SalesTrendChart.tsx` - Sales trends over time
  - `CategoryRevenueChart.tsx` - Revenue by category
  - `OrderStatusChart.tsx` - Order status distribution
- **Features**:
  - Sales analytics and trends
  - Revenue breakdown by category
  - Customer acquisition metrics
  - Order status distribution
  - Custom date ranges

#### AI Dashboard Tab
- **Component**: `AdminAIDashboard.tsx`
- **File**: `/srv/apps/silvera/client/src/pages/AdminAIDashboard.tsx`
- **Features**:
  - AI product suggestions
  - Automated product generation
  - AI-powered analytics
  - ML-based recommendations

#### Image Processor Tab
- **Component**: `ImageProcessorTab.tsx`
- **Features**:
  - Batch image processing
  - Image optimization
  - Format conversion

#### Settings Tab
- **Features**:
  - Store settings
  - Email configuration
  - Payment gateway settings
  - Shipping settings
  - Admin user management
  - SEO optimization (`SEOEditor.tsx`)

---

### 2.2 Admin Component Structure

**Location**: `/srv/apps/silvera/client/src/components/admin/`

```
components/admin/
├── AnalyticsDashboard.tsx      # Charts and data visualization
├── AnalyticsTab.tsx             # Analytics main interface
├── AbandonedCartsTab.tsx         # Abandoned cart tracking
├── CategoryRevenueChart.tsx      # Revenue by category visualization
├── CustomersTab.tsx             # Customer management
├── DashboardTab.tsx             # Main dashboard overview
├── InventoryManager.tsx         # Inventory CRUD operations
├── InventoryTab.tsx             # Inventory management interface
├── LowStockAlerts.tsx           # Low stock alert system
├── OrderDetailModal.tsx         # Order details modal component
├── OrderStatusChart.tsx         # Order status visualization
├── RecentOrdersList.tsx         # Recent orders display
├── SalesTrendChart.tsx          # Sales trend visualization
├── SEOEditor.tsx                # SEO settings editor
├── StatCard.tsx                 # Stat card component
├── TopProductsList.tsx          # Top products report
├── VariantManager.tsx           # Product variant management
└── index.ts                     # Export all components
```

---

### 2.3 Admin Routes Structure

**File**: `/srv/apps/silvera/client/src/App.tsx`

```typescript
<Route path="/admin" component={Admin} />
<Route path="/admin/reports" component={AdminReports} />
<Route path="/admin/ai" component={AdminAIDashboard} />
<Route path="/vendor/dashboard" component={VendorDashboard} />
<Route path="/vendor/apply" component={VendorApplication} />
```

**Admin Access Control**:
- Users with `isAdmin: true` are redirected to `/admin` when accessing `/`
- Admin-only endpoints check `user?.isAdmin` before allowing access

---

### 2.4 Admin API Endpoints

**File**: `/srv/apps/silvera/server/routes.ts` (132 KB)

#### Product Management Endpoints
```
GET    /api/products              # List all products
GET    /api/products/:id          # Get product details
POST   /api/products              # Create product (admin only)
PUT    /api/products/:id          # Update product (admin only)
DELETE /api/products/:id          # Delete product (admin only)

GET    /api/products/:id/variants # Get product variants
POST   /api/products/:id/variants # Add variant (admin only)
PUT    /api/variants/:id          # Update variant (admin only)
DELETE /api/variants/:id          # Delete variant (admin only)
```

#### Category Management Endpoints
```
GET    /api/categories            # List categories
POST   /api/categories            # Create category (admin only)
PUT    /api/categories/:id        # Update category (admin only)
DELETE /api/categories/:id        # Delete category (admin only)
```

#### Order Management Endpoints
```
GET    /api/orders                # List orders (admins see all, users see own)
GET    /api/orders/:id            # Get order details
PUT    /api/orders/:id            # Update order status (admin only)
PUT    /api/orders/bulk/status    # Bulk update order status (admin only)
```

#### Customer Management Endpoints
```
GET    /api/users                 # List all users (admin only)
GET    /api/users/:id             # Get user details (admin only)
PUT    /api/users/:id/role        # Update user role to admin (admin only)
PUT    /api/users/search          # Search users (admin only)
```

#### Analytics Endpoints
```
GET    /api/analytics/sales       # Sales analytics
GET    /api/analytics/revenue     # Revenue by category
GET    /api/analytics/orders      # Order status distribution
GET    /api/analytics/trends      # Sales trends
GET    /api/analytics/customers   # Customer metrics
GET    /api/analytics/abandoned   # Abandoned carts
```

#### Admin Reports Endpoints
```
GET    /api/reports/inventory     # Inventory report
GET    /api/reports/sales         # Sales report
GET    /api/reports/customers     # Customer report
GET    /api/reports/orders        # Order report
```

#### Image Processing Endpoints
```
POST   /api/images/process        # Process images (admin only)
POST   /api/images/batch          # Batch process (admin only)
```

---

### 2.5 Database Schema for Admin Features

**File**: `/srv/apps/silvera/shared/schema.ts`

#### Users Table (Admin Field)
```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),  // ← Admin flag
  phone: varchar("phone"),
  address: text("address"),
  barangay: varchar("barangay"),
  city: varchar("city"),
  province: varchar("province"),
  postalCode: varchar("postal_code"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  defaultShippingAddress: jsonb("default_shipping_address"),
  savedAddresses: jsonb("saved_addresses").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### Products Table
```typescript
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
  categoryId: integer("category_id").references(() => categories.id),
  vendorId: integer("vendor_id"),
  images: jsonb("images").$type<string[]>().default([]),
  stock: integer("stock").default(0),
  sku: varchar("sku"),
  featured: boolean("featured").default(false),
  active: boolean("active").default(true),
  status: varchar("status").default("active"),  // draft | active | archived
  lowStockThreshold: integer("low_stock_threshold").default(5),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  hasVariants: boolean("has_variants").default(false),
  variantAttributes: jsonb("variant_attributes").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### Orders Table (Status Tracking)
```typescript
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  orderNumber: varchar("order_number").unique().notNull(),
  status: varchar("status").default("pending"),  // pending | processing | shipped | delivered | cancelled
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shipping: decimal("shipping", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method").notNull(),
  paymentStatus: varchar("payment_status").default("pending"),  // pending | paid | failed
  trackingNumber: varchar("tracking_number"),
  trackingCarrier: varchar("tracking_carrier"),
  notes: text("notes"),
  shippingAddress: jsonb("shipping_address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### Categories Table
```typescript
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  description: text("description"),
  icon: varchar("icon"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

#### Product Variants Table
```typescript
export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  sku: varchar("sku"),
  name: varchar("name").notNull(),  // e.g., "Red / Large"
  price: decimal("price", { precision: 10, scale: 2 }),
  stock: integer("stock").default(0),
  attributes: jsonb("attributes").$type<Record<string, string>>().notNull(),  // {color: "Red", size: "Large"}
  images: jsonb("images").$type<string[]>().default([]),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

---

### 2.6 Admin Authentication

**File**: `/srv/apps/silvera/server/localAuth.ts`

**Admin Credentials** (from ecosystem.config.cjs):
```
ADMIN_EMAIL: admin@silvera.local
ADMIN_PASSWORD_HASH: $2b$10$FYEu.oDos1crGeZ6GqbO3.oy6QBPueLKAhmkcLeg0RICT0T9lBq6K
```

**Authentication Flow**:
1. User logs in with email/password
2. Password validated with bcrypt hash
3. Session created if valid
4. `isAdmin` flag checked on all admin routes
5. Admin users redirected from `/` to `/admin` automatically

---

## PART 3: RECONFIGURATION STEPS FOR SILVERAV2

### Step 1: Update SilveraV2 Environment & Database

#### 1.1 Check SilveraV2 Current Setup

```bash
# Check current port and database
pm2 show silverav2

# Check .env file
cat /root/silverav2/.env
```

**Current Status**:
- ✅ SilveraV2 running on port 3865
- ✅ Using SQLite database at `/root/silverav2/server/data/silverav2.db`
- ⚠️ **Issue**: Using SQLite instead of PostgreSQL (legacy uses PostgreSQL)

#### 1.2 Migrate SilveraV2 to PostgreSQL (Recommended)

**Option A: Create new PostgreSQL database for SilveraV2**

```bash
# Create new database and user
sudo -u postgres psql << 'EOF'
CREATE USER silverav2 WITH PASSWORD 'silverav2123';
CREATE DATABASE silverav2 OWNER silverav2;
\c silverav2
GRANT ALL PRIVILEGES ON DATABASE silverav2 TO silverav2;
EOF

# Verify
psql postgresql://silverav2:silverav2123@localhost:5432/silverav2 -c "SELECT 1;"
```

**Option B: Keep SQLite (simpler, faster to deploy)**

If keeping SQLite, no changes needed. SQLite works fine for the admin panel.

---

### Step 2: Add Admin Panel Components to SilveraV2

**Location**: `/root/silverav2/public/admin/` (or similar)

Since SilveraV2 uses a different architecture (static HTML pages vs React SPA), the admin panel needs to be created from scratch or migrated. Options:

#### Option 1: Create Admin Panel as HTML/JS Pages (Recommended for SilveraV2)
Create admin pages similar to existing pages:
- `/root/silverav2/public/admin-dashboard.html`
- `/root/silverav2/public/admin-products.html`
- `/root/silverav2/public/admin-orders.html`
- `/root/silverav2/public/admin-customers.html`
- `/root/silverav2/public/admin-analytics.html`
- `/root/silverav2/public/admin-settings.html`

#### Option 2: Use React Admin Panel from Legacy
Copy React components from legacy and integrate into SilveraV2 frontend.

---

### Step 3: Implement Admin API Endpoints in SilveraV2

**File**: `/root/silverav2/server/index.js`

Add the following admin endpoints:

```javascript
// ==================== ADMIN ENDPOINTS ====================

// Middleware to check admin access
app.use((req, res, next) => {
  if (req.path.startsWith('/api/admin')) {
    const user = req.user || req.session?.user;
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
  }
  next();
});

// ==== ADMIN: Products ====
app.get('/api/admin/products', (req, res) => {
  // Return all products with inventory
});

app.post('/api/admin/products', (req, res) => {
  // Create new product
});

app.put('/api/admin/products/:id', (req, res) => {
  // Update product
});

app.delete('/api/admin/products/:id', (req, res) => {
  // Delete product
});

// ==== ADMIN: Inventory ====
app.get('/api/admin/inventory', (req, res) => {
  // Return inventory status and low stock alerts
});

app.get('/api/admin/inventory/low-stock', (req, res) => {
  // Return products below threshold
});

app.put('/api/admin/inventory/:productId', (req, res) => {
  // Update inventory levels
});

// ==== ADMIN: Orders ====
app.get('/api/admin/orders', (req, res) => {
  // List all orders with filtering
});

app.put('/api/admin/orders/:orderId/status', (req, res) => {
  // Update order status
});

app.put('/api/admin/orders/bulk-update', (req, res) => {
  // Bulk update order statuses
});

// ==== ADMIN: Customers ====
app.get('/api/admin/customers', (req, res) => {
  // List all customers
});

app.get('/api/admin/customers/:userId', (req, res) => {
  // Get customer details
});

app.get('/api/admin/customers/:userId/orders', (req, res) => {
  // Get customer order history
});

// ==== ADMIN: Analytics ====
app.get('/api/admin/analytics/dashboard', (req, res) => {
  // Dashboard stats
});

app.get('/api/admin/analytics/sales', (req, res) => {
  // Sales analytics
});

app.get('/api/admin/analytics/revenue', (req, res) => {
  // Revenue by category
});

app.get('/api/admin/analytics/orders', (req, res) => {
  // Order status distribution
});

// ==== ADMIN: Users & Roles ====
app.get('/api/admin/users', (req, res) => {
  // List all users
});

app.put('/api/admin/users/:userId/role', (req, res) => {
  // Change user admin status
});

// ==== ADMIN: Categories ====
app.get('/api/admin/categories', (req, res) => {
  // List categories
});

app.post('/api/admin/categories', (req, res) => {
  // Create category
});

app.put('/api/admin/categories/:id', (req, res) => {
  // Update category
});

app.delete('/api/admin/categories/:id', (req, res) => {
  // Delete category
});

// ==== ADMIN: Settings ====
app.get('/api/admin/settings', (req, res) => {
  // Get store settings
});

app.put('/api/admin/settings', (req, res) => {
  // Update store settings
});
```

---

### Step 4: Add Admin User to SilveraV2 Database

Create an admin account:

```bash
# Insert admin user into SQLite database
sqlite3 /root/silverav2/server/data/silverav2.db << 'EOF'
INSERT INTO users (id, email, password_hash, first_name, last_name, is_admin, created_at, updated_at)
VALUES (
  'admin-' || random(),
  'admin@silveraph.shop',
  '$2b$10$FYEu.oDos1crGeZ6GqbO3.oy6QBPueLKAhmkcLeg0RICT0T9lBq6K',
  'Admin',
  'User',
  1,
  datetime('now'),
  datetime('now')
);
EOF
```

**Admin Account**:
- Email: `admin@silveraph.shop`
- Password: `admin` (hashed)

---

### Step 5: Update Nginx Configuration for SilveraV2

#### 5.1 Update `/etc/nginx/sites-available/silveraph.shop`

**BEFORE**:
```nginx
location / {
    proxy_pass http://127.0.0.1:5004;  # Legacy Silvera
}
```

**AFTER**:
```nginx
location / {
    proxy_pass http://127.0.0.1:3865;  # SilveraV2
}
```

#### 5.2 Update `/etc/nginx/sites-available/api.silveraph.shop`

**BEFORE**:
```nginx
location / {
    proxy_pass http://127.0.0.1:5004;  # Legacy Silvera
}
```

**AFTER**:
```nginx
location / {
    proxy_pass http://127.0.0.1:3865;  # SilveraV2
}
```

#### 5.3 Test Nginx Configuration

```bash
# Validate syntax
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Verify
curl -k https://silveraph.shop
```

---

### Step 6: Verify Reconfiguration

#### 6.1 Test Main Domain
```bash
# Test main domain
curl -k https://silveraph.shop
# Expected: SilveraV2 interface

# Test API domain
curl -k https://api.silveraph.shop/api/health
# Expected: Health check response

# Test admin access
curl -k https://silveraph.shop/admin
# Expected: Admin dashboard or redirect to login
```

#### 6.2 Test Admin Functions
1. Login to admin account: `admin@silveraph.shop`
2. Access admin dashboard: `https://silveraph.shop/admin`
3. Test product management
4. Test order management
5. Test customer view
6. Test analytics

---

## PART 4: BACKUP & ROLLBACK PLAN

### Backup Before Migration

```bash
# Backup legacy silvera
sudo tar -czf /srv/backups/silvera-legacy-$(date +%Y%m%d).tar.gz /srv/apps/silvera

# Backup nginx configs
sudo tar -czf /srv/backups/nginx-configs-$(date +%Y%m%d).tar.gz /etc/nginx/sites-available/

# Backup databases (PostgreSQL)
sudo -u postgres pg_dump -Fc silvera > /srv/backups/silvera-db-$(date +%Y%m%d).dump
```

### Quick Rollback (if needed)

```bash
# Restore nginx config
sudo tar -xzf /srv/backups/nginx-configs-$(date +%Y%m%d).tar.gz -C /

# Reload nginx (will revert to legacy)
sudo systemctl reload nginx

# Verify rollback
curl -k https://silveraph.shop
```

---

## PART 5: CONFIGURATION SUMMARY TABLE

| Component | Legacy (Port 5004) | SilveraV2 (Port 3865) | Action |
|-----------|-------------------|----------------------|--------|
| silveraph.shop | ✅ Proxied | ⏳ Will proxy | Update nginx |
| api.silveraph.shop | ✅ Proxied | ⏳ Will proxy | Update nginx |
| csr.silveraph.shop | ✅ Port 7890 | ✅ Port 7890 | No change |
| notification.silveraph.shop | ✅ Port 5100 | ✅ Port 5100 | No change |
| Admin Email | admin@silvera.local | admin@silveraph.shop | Create new |
| Database | PostgreSQL (silvera) | SQLite (silverav2.db) | Keep separate OR migrate |
| Admin Panel | React SPA | HTML/JS pages | Create new |
| SSL Certs | ✅ Valid | ✅ Valid | Already in place |

---

## PART 6: ADMIN PANEL FEATURES CHECKLIST

### Core Features to Implement
- [ ] Dashboard with KPIs and charts
- [ ] Product management (CRUD)
- [ ] Product variants management
- [ ] Inventory tracking and low-stock alerts
- [ ] Category management
- [ ] Order management with status updates
- [ ] Customer management and search
- [ ] Analytics and reporting
- [ ] User role management (promote to admin)
- [ ] Settings and configuration
- [ ] Email notification settings

### Advanced Features (Optional)
- [ ] AI product suggestions (AdminAIDashboard)
- [ ] Batch image processing
- [ ] SEO editor
- [ ] Abandoned cart tracking
- [ ] Vendor dashboard support
- [ ] Custom reports generation

---

## PART 7: ENVIRONMENT & CREDENTIALS

### SilveraV2 Current Configuration

**Port**: 3865
**Database**: SQLite at `/root/silverav2/server/data/silverav2.db`
**Env File**: `/root/silverav2/.env`

### Payment Gateway Credentials (Shared)
```
NEXUSPAY_BASE_URL: https://nexuspay.cloud/api
NEXUSPAY_USERNAME: bossmarc
NEXUSPAY_PASSWORD: ***REMOVED***
NEXUSPAY_MERCHANT_ID: u89aHfkyPCvMtV5Y
NEXUSPAY_KEY: ***REMOVED***
```

### Email Configuration (Shared)
```
SMTP_HOST: smtp.hostinger.com
SMTP_PORT: 465
SMTP_USER: admin@innovatehub.ph
SMTP_PASSWORD: ***REMOVED***
SMTP_FROM: admin@innovatehub.ph
```

---

## PART 8: IMPLEMENTATION TIMELINE

| Phase | Task | Estimated Time | Status |
|-------|------|-----------------|--------|
| 1 | Add admin API endpoints to SilveraV2 | 2-3 hours | ⏳ Pending |
| 2 | Create admin panel UI (HTML/JS) | 4-5 hours | ⏳ Pending |
| 3 | Implement admin database schema | 1-2 hours | ⏳ Pending |
| 4 | Create admin user account | 15 minutes | ⏳ Pending |
| 5 | Update nginx configurations | 15 minutes | ⏳ Pending |
| 6 | Test all admin functions | 1-2 hours | ⏳ Pending |
| 7 | Backup legacy silvera | 30 minutes | ⏳ Pending |
| 8 | Go live | 5 minutes | ⏳ Pending |

---

## PART 9: SUCCESS CRITERIA

✅ **Migration is successful when**:
1. ✅ SilveraV2 is accessible at `https://silveraph.shop`
2. ✅ Admin dashboard accessible at `https://silveraph.shop/admin`
3. ✅ Admin can login with credentials
4. ✅ All admin functions working (products, orders, customers, analytics)
5. ✅ Payment gateway (NexusPay) working
6. ✅ Email notifications working
7. ✅ SSL/TLS working (green lock in browser)
8. ✅ Legacy silvera accessible at `http://localhost:5004` (for reference/rollback)

---

## Next Steps

1. **Review this document** with your team
2. **Create admin panel components** in SilveraV2
3. **Implement admin API endpoints** in backend
4. **Set up admin database schema** with isAdmin field
5. **Update nginx configuration** (test in staging first)
6. **Test all admin functions** thoroughly
7. **Create backup** of legacy system
8. **Go live** with new domain routing

---

**Document Version**: 1.0
**Last Updated**: 2026-02-08
**Next Review**: After SilveraV2 admin panel implementation

