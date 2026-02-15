# Changelog

All notable changes to the Silvera V2 project are documented in this file.

## [2.1.0] - 2026-02-15

### Performance & Accessibility Optimization

Lighthouse scores improved from Performance 51 → 98, Accessibility 88 → 94. LCP reduced from 5.2s to 1.0s, CLS eliminated (0.495 → 0).

- **GSAP Deferred to Idle** — Wrapped GSAP dynamic imports in `requestIdleCallback` so animation setup doesn't block LCP paint
- **Lazy-Load Non-Critical Routes** — AdminLayout and Login page moved to `React.lazy()` to reduce main bundle on the critical path
- **Font Waterfall Eliminated** — Moved Google Fonts from CSS `@import` (render-blocking waterfall) to `<link>` tags in HTML `<head>` with preconnect, saving ~766ms
- **CLS Fix: pinSpacing** — Added `pinSpacing: false` to all GSAP ScrollTrigger configs; 7 pinned sections were injecting pin-spacer DOM nodes that shifted the footer by 910vh
- **Hero Image Preload** — Added `<link rel="preload">` with `fetchpriority="high"` for the hero WebP image
- **WCAG AA Contrast** — Increased `--text-tertiary` contrast ratio to meet 4.5:1 (dark: `#71717A` → `#8B8B94`, light: `#9CA3AF` → `#6B7280`)
- **Aria Labels** — Added `aria-label` to all icon-only buttons and links (wishlist, add-to-cart, cart link, search, social icons)
- **Image Dimensions** — Added explicit `width`/`height` to logo, cart item images, and mobile hero `<img>` tags to prevent layout shift
- **aspectRatio on Product Cards** — Added `aspectRatio` prop to OptimizedImage in ProductCard grid/list views
- **fetchPriority on Eager Images** — OptimizedImage component now passes `fetchPriority="high"` when `eager` prop is set
- **Hero Entrance Animation** — Removed `opacity: 0` from GSAP entrance so hero content is visible before JS executes, preventing blank LCP

---

## [2.0.0] - 2026-02-14

### Full-Stack E-Commerce Platform

Complete rewrite of Silvera Philippines — a premium luxury e-commerce platform built with React 19, Express, SQLite, and Docker Swarm. 137 commits, 85 E2E tests passing, Lighthouse scores: Performance 98, Accessibility 94, Best Practices 100, SEO 100.

---

### Core Shopping Experience

- **Product Catalog** — Browse products with grid/list views, category filtering, search, and sort by price/date/popularity
- **Product Detail Pages** — Image galleries (up to 10 images), descriptions, pricing, stock status, and related products
- **Product Variants** — Size and color selectors with stock tracking per variant combination
- **Shopping Cart** — Persistent cart (localStorage + Zustand), quantity management, real-time totals, cart badge in nav
- **Wishlist** — Save products for later, one-click add-to-cart from wishlist
- **Customer Reviews & Ratings** — 5-star review system on product pages with verified purchase badges

### Categories & Homepage

- **6 Category Sections** — Apparel, Footwear, Accessories, Dresses, Electronics, Home & Living
- **GSAP-Animated Hero** — Scroll-pinned hero section with parallax image and slide-in text animations
- **Category Hero Sections** — Each category has a dedicated floating-product hero with Add to Cart buttons
- **How It Works Section** — Step-by-step guide for new customers
- **Dynamic Category Descriptions** — Stored in DB, displayed on Shop page when filtering

### Checkout & Payments

- **Multi-Step Checkout** — Address selection, payment method, order review, and confirmation
- **NexusPay/DirectPay Integration** — Online payments via QRPH (GCash, Maya, GrabPay), bank transfers (BDO, BPI, UnionBank)
- **Cash on Delivery** — COD option with email confirmation
- **Payment Validation** — Amount limits (₱100–₱999,999), method-specific rules, sandbox testing
- **Webhook Processing** — Signature-verified payment callbacks with audit logging and duplicate detection
- **Coupon System** — Fixed-amount and percentage discounts, usage limits, expiration dates, admin CRUD

### Address Management

- **PSGC Integration** — Philippine Standard Geographic Code for Region → Province → Municipality → Barangay dropdowns
- **Multiple Saved Addresses** — Home, Office, Other types with default selection
- **Guest Checkout** — New address entry without requiring an account

### Order Management

- **Order Lifecycle** — Status workflow: pending → processing → shipped → delivered (or cancelled)
- **Order Tracking** — Tracking number assignment, status history timeline
- **Order Notes** — Internal admin notes per order
- **Returns & Refunds** — 30-day return policy, customer-initiated requests, admin approval/rejection, automatic refund status updates
- **Email Notifications** — Order confirmation, status updates, cancellation, return approval/rejection via Nodemailer SMTP

### User Management & Authentication

- **JWT Authentication** — Registration, login, 7-day token expiration, bcrypt password hashing
- **Password Recovery** — Email-based OTP verification for password reset
- **User Profiles** — Edit name, email, phone; personal PIN setup for security
- **Role-Based Access** — Customer and admin roles with route guards
- **Hydration-Safe Auth** — Zustand persist rehydration prevents false redirects on page load

---

### Admin Dashboard

- **KPI Overview** — Total orders, revenue, products, and users at a glance
- **Low Stock Alerts** — Warning badges for products below threshold
- **Recent Orders Feed** — Quick view of latest orders

### Admin Product Management

- **Full CRUD** — Create, edit, delete products with rich form fields
- **Multi-Image Upload** — Up to 10 images per product via MinIO S3 with drag-and-drop reordering
- **Bulk Operations** — Bulk delete, bulk stock update
- **Stock Badges** — Visual indicators for in-stock, low-stock, and out-of-stock
- **Category Filter** — Filter product list by category

### Admin Inventory

- **Inventory Audit Log** — Every stock change recorded with timestamp, user, and reason
- **Bulk Stock Updates** — Adjust multiple products at once
- **Low Stock Warnings** — Dashboard alerts for products needing restock
- **Automatic Stock Adjustment** — Decrement on order, restore on cancellation

### Admin Orders

- **Order Management** — View, search, filter, and update order status
- **Tracking Number Assignment** — Add shipping tracking info
- **CSV Export** — Export filtered orders to CSV
- **PDF Invoices** — Generate PDF invoices with jsPDF + AutoTable
- **Date Range Filtering** — Filter orders by custom date ranges

### Admin Analytics

- **Sales Dashboard** — Revenue trends, orders per day, top-selling products
- **Customer Analytics** — New registrations, returning customers, acquisition trends
- **Revenue by Category** — Breakdown of sales across product categories
- **Self-Hosted Analytics** — Privacy-friendly page view and event tracking (salt-based visitor anonymization)
- **GA4 Ready** — Google Analytics 4 integration module (awaiting measurement ID)
- **Recharts Visualizations** — Interactive bar charts, line charts, and pie charts

### Admin Performance Monitoring

- **Real-Time Metrics** — Average, P95, and P99 response times in a 1-hour rolling window
- **Error Rate Tracking** — Live error percentage and uptime counter
- **Per-Endpoint Breakdown** — Response time stats for every API route
- **Time-Series Charts** — Visual performance trends over the monitoring window

### Admin Reports

- **Sales Reports** — Revenue and order volume by date range
- **Top Products** — Best sellers ranked by quantity sold
- **CSV & PDF Export** — Download reports in multiple formats

### Admin Users

- **User Directory** — Search, filter, and paginate all users
- **Role Management** — Assign customer or admin roles
- **Account Actions** — Reset passwords, deactivate accounts

### Admin Settings

- **Payment Gateway Config** — NexusPay API key and merchant settings
- **Email Settings** — SMTP configuration for notifications
- **Payment Method Toggles** — Enable/disable individual payment methods

### Admin Coupons

- **Coupon CRUD** — Create, edit, delete promotional codes
- **Discount Types** — Fixed amount or percentage off
- **Usage Controls** — Limit uses per coupon, set expiration dates

### Admin Returns

- **Return Queue** — View pending return requests from customers
- **Approval Workflow** — Approve or reject with admin notes
- **Refund Processing** — Automatic payment status update on approval

---

### Performance Optimizations

- **Bundle Splitting** — Vendor chunks (React, GSAP, Recharts, jsPDF) separated from app code
- **Lazy Loading** — All pages lazy-loaded with React.lazy/Suspense; AdminLayout and Login deferred from main bundle
- **GSAP Deferred** — Animation library loaded via `requestIdleCallback` to avoid blocking LCP paint
- **Hero Image WebP** — Converted hero from JPG (85KB) to WebP (68KB) with `fetchpriority="high"` preload
- **CLS Eliminated** — 0.495 → 0 via `pinSpacing: false` on all ScrollTrigger configs and 230vh wrapper divs
- **LCP Optimized** — 5.2s → 1.0s through font waterfall fix, `requestIdleCallback` deferral, lazy-loaded routes, hero preload, and removing opacity:0 from GSAP entrance
- **Image Optimization** — OptimizedImage component with lazy loading, blur placeholders, `fetchPriority="high"` on eager images, explicit dimensions on all `<img>` tags
- **jsPDF Lazy-Loaded** — 93% smaller AdminOrders chunk by deferring PDF library
- **Font Loading** — Google Fonts moved from CSS `@import` to HTML `<link>` with preconnect for fonts.googleapis.com and fonts.gstatic.com

### SEO

- **Page-Specific Meta Tags** — Title, description, and keywords on all 18 routes
- **Dynamic Sitemap** — Auto-generated sitemap.xml with product URLs and lastmod dates
- **Structured Data** — JSON-LD Organization schema and product schema markup
- **Open Graph & Twitter Cards** — Social sharing meta tags with preview images
- **Canonical URLs** — Prevent duplicate content indexing
- **robots.txt** — Auto-generated alongside sitemap

### Security

- **Content Security Policy** — Strict CSP headers via Helmet.js (no `unsafe-eval`)
- **Rate Limiting** — 10 login attempts per 15 minutes, analytics rate limits
- **SQL Injection Prevention** — Parameterized queries throughout
- **Webhook Signature Verification** — HMAC validation on payment callbacks
- **No Hardcoded Secrets** — Environment variables for all credentials
- **Secret Scanning** — CI pipeline checks for accidentally committed secrets

### UI/UX

- **Dark Mode & Light Mode** — Full theme system with Zustand persistence and CSS custom properties
- **Light Mode Lavender Theme** — Purple/violet accent colors for light mode
- **Responsive Design** — Mobile-first with breakpoints for tablet and desktop
- **Mobile Bottom Tab Bar** — Quick access to Home, Shop, Cart, Wishlist, Profile
- **Animated Drawer Navigation** — Swipe-gesture mobile menu
- **Toast Notifications** — Rich notifications via Sonner
- **Error Boundaries** — Graceful error handling with retry capability
- **Loading Skeletons** — Shimmer placeholders while content loads

### Integrations

- **MinIO S3** — Object storage for product and category images at s3.innoserver.cloud
- **Telegram Bot** — Deploy notifications and webhook failure alerts via @masipag_na_bot
- **Nodemailer SMTP** — Transactional emails for order lifecycle events
- **PSGC API** — Philippine geographic code data for address selection
- **Google Analytics 4** — Module ready, awaiting measurement ID activation

### Testing

- **85 E2E Tests** — Comprehensive Playwright test suite covering auth, navigation, shopping, checkout, payments, admin, and responsive layouts
- **Sandbox Payment Tests** — DirectPay sandbox environment for payment flow testing
- **CI Pipeline** — GitHub Actions runs E2E tests on every push with server warm-up
- **Rate Limit Handling** — Test suite manages production rate limits gracefully

### Infrastructure

- **Docker Swarm** — Production deployment with rolling updates
- **GitHub Actions CI/CD** — Automated build, test, and deploy on push to main
- **Traefik Reverse Proxy** — File-based dynamic routing configuration
- **SQLite Database** — 18 tables with indexes and foreign keys
- **Volume Persistence** — Database stored on Docker volume for durability

---

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 7.3, Tailwind CSS 3.4 |
| State | Zustand 5.0 with persist middleware |
| Animations | GSAP 3.14 with ScrollTrigger |
| Charts | Recharts 3.7 |
| Backend | Node.js, Express 4.18 |
| Database | SQLite via better-sqlite3 9.4 |
| Auth | JWT 9.0, bcryptjs 2.4 |
| Storage | MinIO S3 (AWS SDK) |
| Email | Nodemailer 8.0 |
| Testing | Playwright 1.58 |
| CI/CD | GitHub Actions |
| Deploy | Docker Swarm + Traefik |

---

[2.1.0]: https://github.com/innovatehubph/silverav2/releases/tag/v2.1.0
[2.0.0]: https://github.com/innovatehubph/silverav2/releases/tag/v2.0.0
