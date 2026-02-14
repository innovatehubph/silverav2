# Silvera V2 API Documentation

**Base URL:** `https://silvera.innoserver.cloud/api`
**Version:** 2.0.3
**Auth:** JWT Bearer token via `Authorization: Bearer <token>` header

## Authentication Levels

| Level | Description |
|-------|-------------|
| Public | No authentication required |
| Auth | Requires valid JWT token |
| Admin | Requires JWT token with `role: "admin"` |

## Rate Limits

| Limiter | Window | Max (prod) | Max (test) | Applies to |
|---------|--------|------------|------------|------------|
| `apiLimiter` | 1 min | 100 | 1000 | All `/api/*` routes |
| `authLimiter` | 15 min | 30 | 500 | Auth routes (login, register, password reset) |
| `analyticsLimiter` | 1 min | 30 | 1000 | Analytics collection endpoints |

---

## Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | Public | Health check. Returns app name, version, uptime. Registered twice (before and after middleware). |

---

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public + authLimiter | Register a new customer account. Sends welcome email. |
| POST | `/api/auth/login` | Public + authLimiter | Log in with email/password. Returns JWT (7-day expiry). |
| POST | `/api/auth/forgot-password` | Public + authLimiter | Request password reset OTP sent to email. Returns `reset_token`. |
| POST | `/api/auth/verify-reset-otp` | Public + authLimiter | Verify 6-digit OTP against reset token. |
| POST | `/api/auth/reset-password` | Public + authLimiter | Reset password using verified reset token. |
| GET | `/api/auth/me` | Auth | Get current user profile (id, email, name, phone, role). |

### Register - `POST /api/auth/register`
**Body:** `{ email, password, name?, phone? }`
**Validation:** Email format, password 6-128 chars
**Returns:** `{ token, user: { id, email, name, role } }`

### Login - `POST /api/auth/login`
**Body:** `{ email, password }`
**Returns:** `{ token, user: { id, email, name, role } }`

### Forgot Password - `POST /api/auth/forgot-password`
**Body:** `{ email }`
**Returns:** `{ success, message, reset_token }` (always succeeds to prevent user enumeration)

### Verify OTP - `POST /api/auth/verify-reset-otp`
**Body:** `{ reset_token, otp }`
**Returns:** `{ success, message, reset_token }`

### Reset Password - `POST /api/auth/reset-password`
**Body:** `{ reset_token, new_password, confirm_password }`
**Returns:** `{ success, message }`

---

## User Profile & PIN

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PUT | `/api/users/profile` | Auth | Update user name and phone. |
| POST | `/api/users/setup-pin` | Auth | Set a 4-6 digit transaction PIN. |
| PUT | `/api/users/change-pin` | Auth | Change existing PIN (requires old PIN). |

---

## PSGC (Philippine Geographic Data)

All public, no auth required.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/psgc/regions` | Public | List all Philippine regions. |
| GET | `/api/psgc/provinces/:regionCode` | Public | List provinces in a region. |
| GET | `/api/psgc/municipalities/:regionCode/:province` | Public | List municipalities in a province. |
| GET | `/api/psgc/barangays/:regionCode/:province/:municipality` | Public | List barangays in a municipality. |
| GET | `/api/psgc/search?q=&limit=` | Public | Search locations by name. Default limit: 20. |

---

## Addresses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/addresses` | Auth | List user's saved addresses (default first). |
| POST | `/api/addresses` | Auth | Create a new address. First address auto-set as default. |
| PUT | `/api/addresses/:id` | Auth | Update an address (ownership verified). |
| DELETE | `/api/addresses/:id` | Auth | Delete an address. Next address promoted to default if needed. |
| PUT | `/api/addresses/:id/default` | Auth | Set an address as the default. |

### Create/Update Address Body
```json
{
  "label": "Home",
  "name": "John Doe",
  "phone": "+639...",
  "region_code": "03",
  "region": "Central Luzon",
  "province": "Pampanga",
  "municipality": "Angeles City",
  "barangay": "Balibago",
  "street_address": "123 Main St",
  "zip_code": "2009",
  "is_default": true
}
```

---

## Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | Auth | List user's notifications (latest 50). |
| PUT | `/api/notifications/:id/read` | Auth | Mark a notification as read (ownership verified). |
| GET | `/api/notifications/unread/count` | Auth | Get count of unread notifications. |

---

## Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | Public | List active products. Supports query filters. |
| GET | `/api/products/:id` | Public | Get single product by ID (includes category name). |

### List Products Query Parameters
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category slug |
| `featured` | `"true"` or `"1"` | Only featured products |
| `search` | string | Search by product name (LIKE match) |
| `limit` | number | Results limit (1-100, default 50) |

---

## Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products/:id/reviews` | Public | List all reviews for a product. |
| POST | `/api/products/:id/reviews` | Auth | Submit a review (rating 1-5, title, comment required). |

---

## Categories

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/categories` | Public | List all categories ordered by name. |

---

## Company Info

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/company/info` | Public | Returns static company info, contact details, and features. |

---

## Cart (Server-side)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cart` | Auth | Get user's cart items with product details. |
| POST | `/api/cart` | Auth | Add item to cart. Increments quantity if already in cart. Max 99. |
| PUT | `/api/cart/:id` | Auth | Update cart item quantity (1-99). |
| DELETE | `/api/cart/:id` | Auth | Remove item from cart. |

### Add to Cart Body
```json
{ "product_id": 1, "quantity": 2 }
```
Also accepts `productId` (camelCase).

---

## Wishlist

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/wishlist` | Auth | Get user's wishlist with product details. |
| POST | `/api/wishlist` | Auth | Add product to wishlist. Rejects duplicates. |
| DELETE | `/api/wishlist/:id` | Auth | Remove item from wishlist. |

---

## Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/orders` | Auth | List user's orders (newest first). |
| GET | `/api/orders/:id` | Auth | Get single order (ownership verified). |
| POST | `/api/orders` | Auth | Create a new order. Decrements stock. Sends COD email. |

### Create Order - `POST /api/orders`

Accepts flexible field names for cross-frontend compatibility:

**Body:**
```json
{
  "items": [{ "product_id": 1, "quantity": 2, "price": 899, "sale_price": 699 }],
  "shipping_address": { "name": "...", "region": "...", ... },
  "payment_method": "cod"
}
```

| Field aliases | Accepted names |
|--------------|----------------|
| Shipping address | `shipping_address`, `shippingAddress`, `shipping`, `address` |
| Payment method | `payment_method`, `paymentMethod`, `payment`, `method` |

**Behavior:**
- If `items` array is provided in body, uses those directly
- Otherwise falls back to server-side `cart` table
- Both paths decrement product stock in a transaction
- Triggers low-stock admin notifications when applicable
- COD orders fire a confirmation email asynchronously

**Returns:** `{ order_id, total }`

---

## Returns

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/orders/:id/return` | Auth | Request a return. Order must be delivered/shipped/processing. |
| GET | `/api/orders/:id/return` | Auth | Get return status for an order. |

### Request Return Body
```json
{ "reason": "Item arrived damaged" }
```

---

## Payments (DirectPay / NexusPay)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payments/methods` | Public | List supported payment methods (e-wallets, banks, local & international). |
| POST | `/api/payments/validate` | Public | Validate payment amount for a specific method. |
| POST | `/api/payments/qrph/create` | Auth | Create QRPH payment via DirectPay gateway. |
| GET | `/api/payments/:paymentRef/status` | Auth | Check payment status by reference (ownership verified). |
| POST | `/api/payments/callback` | Public | DirectPay callback handler (user return from payment page). |
| POST | `/api/payments/webhook` | Public | DirectPay server-to-server webhook. HMAC-SHA256 signature verified. |
| POST | `/api/payments/create` | Auth | Legacy payment creation (NexusPay placeholder). |

### QRPH Create Body
```json
{ "order_id": 1, "payment_method": "gcash", "payment_type": "ewallet" }
```

### Webhook Behavior
- Validates HMAC-SHA256 signature (via `DIRECTPAY_MERCHANT_KEY`)
- Deduplicates webhooks by `payment_ref + status`
- On success: updates order to `paid`/`processing`, sends confirmation email
- On failure: restores stock, sets order to `failed`/`cancelled`
- Logs all webhooks to `webhook_logs` table
- Sends Telegram alerts for failures and anomalies
- Always returns 200 to prevent gateway retries

---

## Coupons

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/coupons/validate` | Auth | Validate a coupon code at checkout. Checks expiry, usage limits, min order. |

### Validate Coupon Body
```json
{ "code": "SAVE20", "order_total": 5000 }
```
**Returns:** `{ valid, coupon, discount, new_total }`

---

## Settings (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/settings` | Public | Get all public settings as key-value object. |
| GET | `/api/settings/:key` | Public | Get a single public setting. |

**Public keys:** `store_name`, `store_logo`, `currency`, `social_facebook`, `social_instagram`, `social_twitter`, `free_shipping_threshold`, `default_shipping_fee`, `payment_cod_enabled`, `payment_gcash_enabled`, `payment_card_enabled`, `payment_nexuspay_enabled`

---

## Analytics (Self-hosted, Cookie-free)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/analytics/collect` | Public + analyticsLimiter | Record a page view. Privacy-friendly (hashed visitor ID rotates daily). |
| POST | `/api/analytics/event` | Public + analyticsLimiter | Record a custom event with optional properties. |

### Collect Page View Body
```json
{ "path": "/shop", "referrer": "https://google.com", "screenWidth": 1920 }
```

### Collect Event Body
```json
{ "name": "add_to_cart", "props": { "product_id": 1 }, "path": "/shop" }
```

---

## Admin Endpoints

All admin endpoints require `Auth + Admin` (JWT with `role: "admin"`).

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Overview: total orders, revenue, products, users, recent orders, pending count, low stock alerts. |

### Products (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/products` | List all products (including inactive/draft) with category names. |
| POST | `/api/admin/products` | Create product. Supports multipart file upload (up to 10 images to MinIO). |
| PUT | `/api/admin/products/:id` | Update product. New uploads merge with existing images. |
| DELETE | `/api/admin/products/:id` | Delete a product. |
| POST | `/api/admin/products/bulk-delete` | Bulk delete products by IDs. Body: `{ ids: [1,2,3] }` |
| POST | `/api/admin/products/bulk-stock` | Bulk set stock level. Body: `{ ids: [1,2,3], stock: 50 }` |

### Inventory Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/inventory` | List all products sorted by stock ASC (low stock first). |
| PUT | `/api/admin/inventory/:id/stock` | Update single product stock with audit log. Body: `{ stock, note? }` |
| POST | `/api/admin/inventory/bulk-stock` | Bulk update stock with audit log. Body: `{ ids, stock, note? }` |
| GET | `/api/admin/inventory/log` | Get inventory audit log. Query: `?limit=&offset=&product_id=` |

### Image Uploads (MinIO S3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/upload/product-images` | Upload up to 10 product images (multipart `images` field). |
| POST | `/api/admin/upload/category-image` | Upload single category image (multipart `image` field). |
| DELETE | `/api/admin/upload/image` | Delete image from MinIO. Body: `{ key }` or `{ url }` |

### Orders (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/orders` | List orders with filters. Query: `?status=&payment_status=&search=&start_date=&end_date=` |
| GET | `/api/admin/orders/:id` | Get order detail with enriched items, notes, and status history. |
| PUT | `/api/admin/orders/:id` | Update order status/payment status. Sends shipping/delivery emails and notifications. |
| PUT | `/api/admin/orders/:id/tracking` | Update tracking number and carrier. Adds auto-note. |
| POST | `/api/admin/orders/:id/notes` | Add an admin note to an order. |

**Order statuses:** `pending`, `processing`, `shipped`, `delivered`, `cancelled`
**Payment statuses:** `pending`, `paid`, `refunded`, `failed`

### Returns (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/returns` | List all return requests with order and customer info. |
| PUT | `/api/admin/returns/:id` | Approve or reject a return. Approved: refunds, restores stock, cancels order. |

### Users (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users with order count. |
| GET | `/api/admin/users/:id` | Get user detail with recent orders and addresses. |
| PUT | `/api/admin/users/:id` | Update user name, email, phone. |
| PUT | `/api/admin/users/:id/role` | Change user role (`customer`/`admin`). Cannot change own role. |
| PUT | `/api/admin/users/:id/status` | Enable/disable user account. Cannot disable self. |
| POST | `/api/admin/users/:id/reset-password` | Generate temp password and email it to the user. |
| DELETE | `/api/admin/users/:id` | Soft delete (deactivate) or hard delete (`?hard=true`). Cannot delete self. |

### Categories (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/categories` | List categories with product count. |
| POST | `/api/admin/categories` | Create category. Body: `{ name, slug?, description?, image? }` |
| PUT | `/api/admin/categories/:id` | Update category. |
| DELETE | `/api/admin/categories/:id` | Delete category (fails if it has products). |

### Settings (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/settings` | Get all settings (key, value, updated_at). |
| PUT | `/api/admin/settings` | Batch update settings. Body: `{ settings: { key: value, ... } }` |

**Allowed setting keys:** `store_name`, `store_logo`, `contact_email`, `contact_phone`, `store_address`, `currency`, `social_facebook`, `social_instagram`, `social_twitter`, `free_shipping_threshold`, `default_shipping_fee`, `payment_cod_enabled`, `payment_gcash_enabled`, `payment_card_enabled`, `payment_nexuspay_enabled`, `email_sender_name`, `email_sender_email`, `email_order_confirmation`, `email_shipping_updates`, `email_order_delivered`, `email_order_cancelled`, `email_password_reset`, `email_promotional`

### Coupons (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/coupons` | List all coupons. |
| POST | `/api/admin/coupons` | Create coupon. Body: `{ code, type, value, min_order_amount?, max_uses?, is_active?, starts_at?, expires_at? }` |
| PUT | `/api/admin/coupons/:id` | Update coupon fields (partial update supported). |
| DELETE | `/api/admin/coupons/:id` | Delete a coupon. |

**Coupon types:** `percentage` (0-100), `fixed` (absolute PHP amount)

### Reports & Analytics (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/reports/sales` | Sales overview: today, week, month, all-time revenue and order counts. |
| GET | `/api/admin/reports/revenue?period=` | Revenue trend data grouped by hour/day/month. Periods: `day`, `week`, `month`, `year`. |
| GET | `/api/admin/reports/top-products?limit=` | Top selling products by revenue (paid orders only). Default limit: 10, max: 50. |
| GET | `/api/admin/reports/orders-by-status` | Order count by status + payment method breakdown. |
| GET | `/api/admin/reports/customers?period=` | Customer growth: daily registrations and cumulative totals. |
| GET | `/api/admin/reports/revenue-by-category` | Revenue breakdown by product category. |
| GET | `/api/admin/analytics/visitors?period=` | Self-hosted analytics: visitors, page views, top pages, referrers, devices, events. |

### Performance Monitoring (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/performance/metrics` | Server performance: avg/P95/P99 response times, error rate, uptime, per-endpoint breakdown, 60-min time series. |

### Webhook Health (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/webhooks/health` | Webhook health dashboard: 24h/7d stats, error rates, recent logs, last successful payment. |

---

## Error Responses

All errors follow the format:
```json
{ "error": "Human-readable error message" }
```

Common HTTP status codes:
| Code | Meaning |
|------|---------|
| 400 | Bad request / validation error |
| 401 | Unauthorized / invalid token |
| 403 | Forbidden / insufficient permissions |
| 404 | Resource not found |
| 500 | Internal server error |

---

## Endpoint Count Summary

| Category | Count |
|----------|-------|
| Health | 2 |
| Authentication | 6 |
| User Profile/PIN | 3 |
| PSGC Geographic | 5 |
| Addresses | 5 |
| Notifications | 3 |
| Products (public) | 2 |
| Reviews | 2 |
| Categories (public) | 1 |
| Company Info | 1 |
| Cart | 4 |
| Wishlist | 3 |
| Orders | 3 |
| Returns (customer) | 2 |
| Payments | 7 |
| Coupons (customer) | 1 |
| Settings (public) | 2 |
| Analytics (public) | 2 |
| Admin Dashboard | 1 |
| Admin Products | 6 |
| Admin Inventory | 4 |
| Admin Image Uploads | 3 |
| Admin Orders | 5 |
| Admin Returns | 2 |
| Admin Users | 7 |
| Admin Categories | 4 |
| Admin Settings | 2 |
| Admin Coupons | 4 |
| Admin Reports | 7 |
| Admin Performance | 1 |
| Admin Webhooks | 1 |
| **Total** | ****100**** |
