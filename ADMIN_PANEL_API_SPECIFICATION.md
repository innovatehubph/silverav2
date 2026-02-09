# Admin Panel API Specification
## Complete API Endpoints Reference from Legacy Silvera

**Document Version**: 1.0
**Date**: 2026-02-08
**Source**: Analyzed from `/srv/apps/silvera/server/routes.ts` (132 KB)

---

## Overview

This document provides a complete specification of all admin API endpoints that need to be implemented in SilveraV2 to have feature parity with the legacy Silvera admin panel.

**All endpoints require**:
- Authentication header: `Authorization: Bearer <token>`
- User with `isAdmin: true` flag
- Will return `403 Forbidden` if admin access is not granted

---

## 1. PRODUCT MANAGEMENT ENDPOINTS

### 1.1 List All Products
```http
GET /api/admin/products
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| search | string | Search by product name |
| category | number | Filter by category ID |
| status | string | Filter by status (draft, active, archived) |
| sort | string | Sort field (name, price, stock, createdAt) |
| order | string | Sort order (asc, desc) |

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Premium Leather Bag",
      "slug": "premium-leather-bag",
      "price": "299.99",
      "stock": 45,
      "status": "active",
      "featured": true,
      "categoryId": 5,
      "rating": "4.8",
      "reviewCount": 128,
      "images": ["https://..."],
      "hasVariants": true,
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-02-08T14:22:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

---

### 1.2 Get Product Details
```http
GET /api/admin/products/:id
```

**Response**:
```json
{
  "id": 1,
  "name": "Premium Leather Bag",
  "slug": "premium-leather-bag",
  "description": "Handcrafted leather bag...",
  "price": "299.99",
  "compareAtPrice": "399.99",
  "categoryId": 5,
  "vendorId": 3,
  "stock": 45,
  "sku": "PLB-001",
  "featured": true,
  "active": true,
  "status": "active",
  "lowStockThreshold": 10,
  "rating": "4.8",
  "reviewCount": 128,
  "images": ["https://..."],
  "hasVariants": true,
  "variantAttributes": ["Color", "Size"],
  "variants": [
    {
      "id": 101,
      "sku": "PLB-001-RED-SM",
      "name": "Red / Small",
      "price": "299.99",
      "stock": 15,
      "attributes": {"Color": "Red", "Size": "Small"},
      "active": true
    }
  ],
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-02-08T14:22:00Z"
}
```

---

### 1.3 Create Product
```http
POST /api/admin/products
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "New Product",
  "slug": "new-product",
  "description": "Product description...",
  "price": "99.99",
  "compareAtPrice": "149.99",
  "categoryId": 5,
  "vendorId": 3,
  "stock": 100,
  "sku": "NP-001",
  "featured": false,
  "active": true,
  "status": "active",
  "lowStockThreshold": 10,
  "images": ["https://..."],
  "hasVariants": false,
  "variantAttributes": []
}
```

**Response**: `201 Created`
```json
{
  "id": 2,
  "name": "New Product",
  "slug": "new-product",
  "price": "99.99",
  "createdAt": "2026-02-08T15:45:00Z"
}
```

---

### 1.4 Update Product
```http
PUT /api/admin/products/:id
Content-Type: application/json
```

**Request Body**: (Same fields as Create)

**Response**: `200 OK`
```json
{
  "id": 1,
  "message": "Product updated successfully",
  "updatedFields": {
    "name": "Updated Name",
    "price": "279.99"
  }
}
```

---

### 1.5 Delete Product
```http
DELETE /api/admin/products/:id
```

**Response**: `200 OK`
```json
{
  "message": "Product deleted successfully",
  "deletedId": 1
}
```

---

## 2. PRODUCT VARIANTS ENDPOINTS

### 2.1 Get Product Variants
```http
GET /api/admin/products/:productId/variants
```

**Response**:
```json
{
  "productId": 1,
  "variantAttributes": ["Color", "Size"],
  "variants": [
    {
      "id": 101,
      "productId": 1,
      "sku": "PLB-001-RED-SM",
      "name": "Red / Small",
      "price": "299.99",
      "compareAtPrice": "399.99",
      "stock": 15,
      "attributes": {
        "Color": "Red",
        "Size": "Small"
      },
      "images": ["https://..."],
      "active": true,
      "sortOrder": 0,
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ]
}
```

---

### 2.2 Create Product Variant
```http
POST /api/admin/products/:productId/variants
Content-Type: application/json
```

**Request Body**:
```json
{
  "sku": "PLB-001-BLUE-LG",
  "name": "Blue / Large",
  "price": "319.99",
  "compareAtPrice": "419.99",
  "stock": 20,
  "attributes": {
    "Color": "Blue",
    "Size": "Large"
  },
  "images": ["https://..."],
  "active": true,
  "sortOrder": 1
}
```

**Response**: `201 Created`
```json
{
  "id": 102,
  "productId": 1,
  "sku": "PLB-001-BLUE-LG",
  "message": "Variant created successfully"
}
```

---

### 2.3 Update Product Variant
```http
PUT /api/admin/variants/:id
Content-Type: application/json
```

**Request Body**: (Same fields as Create)

**Response**: `200 OK`

---

### 2.4 Delete Product Variant
```http
DELETE /api/admin/variants/:id
```

**Response**: `200 OK`
```json
{
  "message": "Variant deleted successfully",
  "deletedId": 101
}
```

---

## 3. INVENTORY MANAGEMENT ENDPOINTS

### 3.1 Get Inventory Overview
```http
GET /api/admin/inventory
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| lowStockOnly | boolean | Show only low stock items |

**Response**:
```json
{
  "totalProducts": 156,
  "outOfStock": 8,
  "lowStock": 23,
  "overstock": 12,
  "products": [
    {
      "id": 1,
      "name": "Premium Leather Bag",
      "sku": "PLB-001",
      "stock": 5,
      "lowStockThreshold": 10,
      "status": "low",
      "price": "299.99"
    }
  ]
}
```

---

### 3.2 Get Low Stock Alerts
```http
GET /api/admin/inventory/low-stock
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| threshold | number | Alert threshold (default: 10) |
| limit | number | Items to return (default: 50) |

**Response**:
```json
{
  "lowStockCount": 23,
  "alerts": [
    {
      "productId": 1,
      "name": "Premium Leather Bag",
      "sku": "PLB-001",
      "currentStock": 5,
      "threshold": 10,
      "needsReorder": true
    }
  ]
}
```

---

### 3.3 Update Inventory for Product
```http
PUT /api/admin/inventory/:productId
Content-Type: application/json
```

**Request Body**:
```json
{
  "stock": 150,
  "lowStockThreshold": 15,
  "notes": "Restock from supplier XYZ"
}
```

**Response**: `200 OK`
```json
{
  "productId": 1,
  "previousStock": 45,
  "newStock": 150,
  "message": "Inventory updated successfully"
}
```

---

### 3.4 Update Inventory for Variant
```http
PUT /api/admin/inventory/variant/:variantId
Content-Type: application/json
```

**Request Body**:
```json
{
  "stock": 75
}
```

**Response**: `200 OK`

---

## 4. ORDER MANAGEMENT ENDPOINTS

### 4.1 List All Orders
```http
GET /api/admin/orders
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| status | string | Filter by status (pending, processing, shipped, delivered, cancelled) |
| paymentStatus | string | Filter by payment (pending, paid, failed) |
| search | string | Search by order number or customer email |
| dateFrom | date | Filter from date |
| dateTo | date | Filter to date |
| sort | string | Sort by (createdAt, total, status) |

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "orderNumber": "ORD-2026-0001",
      "userId": "user-123",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "total": "450.00",
      "status": "processing",
      "paymentStatus": "paid",
      "itemCount": 2,
      "createdAt": "2026-02-08T10:00:00Z",
      "updatedAt": "2026-02-08T12:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 345,
    "totalPages": 18
  },
  "summary": {
    "totalOrders": 345,
    "totalRevenue": "125000.00",
    "averageOrderValue": "362.00"
  }
}
```

---

### 4.2 Get Order Details
```http
GET /api/admin/orders/:orderId
```

**Response**:
```json
{
  "id": 1,
  "orderNumber": "ORD-2026-0001",
  "userId": "user-123",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "status": "processing",
  "paymentStatus": "paid",
  "subtotal": "400.00",
  "shipping": "25.00",
  "tax": "25.00",
  "total": "450.00",
  "paymentMethod": "nexuspay",
  "trackingNumber": "SHIP-2026-0001",
  "trackingCarrier": "DHL",
  "notes": "Fragile items, handle with care",
  "items": [
    {
      "id": 1,
      "productId": 1,
      "productName": "Premium Leather Bag",
      "variant": "Red / Small",
      "quantity": 1,
      "price": "299.99",
      "subtotal": "299.99"
    }
  ],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+63912345678",
    "address": "123 Main St",
    "city": "Manila",
    "postalCode": "1000"
  },
  "createdAt": "2026-02-08T10:00:00Z",
  "updatedAt": "2026-02-08T12:30:00Z"
}
```

---

### 4.3 Update Order Status
```http
PUT /api/admin/orders/:orderId/status
Content-Type: application/json
```

**Request Body**:
```json
{
  "status": "shipped",
  "trackingNumber": "SHIP-2026-0001",
  "trackingCarrier": "DHL",
  "notes": "Order dispatched",
  "notifyCustomer": true
}
```

**Response**: `200 OK`
```json
{
  "orderId": 1,
  "previousStatus": "processing",
  "newStatus": "shipped",
  "message": "Order status updated and customer notified"
}
```

---

### 4.4 Bulk Update Order Status
```http
PUT /api/admin/orders/bulk-update
Content-Type: application/json
```

**Request Body**:
```json
{
  "orderIds": [1, 2, 3, 4, 5],
  "status": "shipped",
  "trackingCarrier": "DHL",
  "notifyCustomers": true
}
```

**Response**: `200 OK`
```json
{
  "successCount": 5,
  "failedCount": 0,
  "message": "5 orders updated and customers notified"
}
```

---

## 5. CUSTOMER MANAGEMENT ENDPOINTS

### 5.1 List All Customers
```http
GET /api/admin/customers
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| search | string | Search by name or email |
| sortBy | string | Sort field (name, email, createdAt, orderCount) |
| order | string | Sort order (asc, desc) |

**Response**:
```json
{
  "data": [
    {
      "id": "user-123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+63912345678",
      "totalOrders": 5,
      "totalSpent": "2500.00",
      "lastOrderDate": "2026-02-08T10:00:00Z",
      "createdAt": "2026-01-15T08:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 456,
    "totalPages": 23
  },
  "summary": {
    "totalCustomers": 456,
    "activeCustomers": 234,
    "totalRevenue": "125000.00"
  }
}
```

---

### 5.2 Get Customer Details
```http
GET /api/admin/customers/:customerId
```

**Response**:
```json
{
  "id": "user-123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+63912345678",
  "profileImageUrl": "https://...",
  "address": "123 Main St",
  "city": "Manila",
  "province": "NCR",
  "postalCode": "1000",
  "totalOrders": 5,
  "totalSpent": "2500.00",
  "averageOrderValue": "500.00",
  "lastOrderDate": "2026-02-08T10:00:00Z",
  "createdAt": "2026-01-15T08:30:00Z",
  "savedAddresses": [
    {
      "id": 1,
      "type": "shipping",
      "address": "123 Main St",
      "city": "Manila"
    }
  ]
}
```

---

### 5.3 Get Customer Orders
```http
GET /api/admin/customers/:customerId/orders
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |

**Response**:
```json
{
  "customerId": "user-123",
  "orders": [
    {
      "id": 1,
      "orderNumber": "ORD-2026-0001",
      "total": "450.00",
      "status": "delivered",
      "paymentStatus": "paid",
      "itemCount": 2,
      "createdAt": "2026-02-08T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

## 6. CATEGORY MANAGEMENT ENDPOINTS

### 6.1 List Categories
```http
GET /api/admin/categories
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Bags",
      "slug": "bags",
      "description": "All types of bags...",
      "icon": "bag",
      "productCount": 45,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### 6.2 Create Category
```http
POST /api/admin/categories
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "New Category",
  "slug": "new-category",
  "description": "Description...",
  "icon": "icon-name"
}
```

**Response**: `201 Created`

---

### 6.3 Update Category
```http
PUT /api/admin/categories/:id
Content-Type: application/json
```

**Response**: `200 OK`

---

### 6.4 Delete Category
```http
DELETE /api/admin/categories/:id
```

**Response**: `200 OK`
```json
{
  "message": "Category deleted successfully"
}
```

---

## 7. ANALYTICS ENDPOINTS

### 7.1 Dashboard Analytics
```http
GET /api/admin/analytics/dashboard
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| dateRange | string | 7d, 30d, 90d, 1y, custom |
| dateFrom | date | Start date for custom range |
| dateTo | date | End date for custom range |

**Response**:
```json
{
  "period": "Last 30 days",
  "dateFrom": "2026-01-09",
  "dateTo": "2026-02-08",
  "summary": {
    "totalRevenue": "45000.00",
    "totalOrders": 125,
    "averageOrderValue": "360.00",
    "totalCustomers": 89,
    "newCustomers": 23,
    "revenueGrowth": "12.5%",
    "orderGrowth": "8.2%"
  },
  "topProducts": [
    {
      "id": 1,
      "name": "Premium Leather Bag",
      "sales": 45,
      "revenue": "13495.55"
    }
  ],
  "topCategories": [
    {
      "id": 1,
      "name": "Bags",
      "sales": 78,
      "revenue": "28000.00"
    }
  ]
}
```

---

### 7.2 Sales Analytics
```http
GET /api/admin/analytics/sales
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| dateRange | string | 7d, 30d, 90d, 1y, custom |
| groupBy | string | daily, weekly, monthly |

**Response**:
```json
{
  "data": [
    {
      "date": "2026-02-08",
      "revenue": "2500.00",
      "orders": 8,
      "items": 15,
      "averageOrderValue": "312.50"
    }
  ],
  "summary": {
    "totalRevenue": "45000.00",
    "totalOrders": 125,
    "totalItems": 267
  }
}
```

---

### 7.3 Revenue by Category
```http
GET /api/admin/analytics/revenue
```

**Response**:
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Bags",
      "revenue": "28000.00",
      "percentage": "62.2%",
      "orders": 78
    }
  ],
  "total": "45000.00"
}
```

---

### 7.4 Order Status Distribution
```http
GET /api/admin/analytics/orders
```

**Response**:
```json
{
  "statuses": [
    {
      "status": "pending",
      "count": 12,
      "percentage": "9.6%"
    },
    {
      "status": "processing",
      "count": 23,
      "percentage": "18.4%"
    },
    {
      "status": "shipped",
      "count": 67,
      "percentage": "53.6%"
    },
    {
      "status": "delivered",
      "count": 23,
      "percentage": "18.4%"
    }
  ],
  "total": 125
}
```

---

## 8. USER MANAGEMENT ENDPOINTS

### 8.1 List All Users
```http
GET /api/admin/users
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| search | string | Search by email or name |
| role | string | Filter by role (admin, user) |

**Response**:
```json
{
  "data": [
    {
      "id": "user-123",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isAdmin": false,
      "createdAt": "2026-01-15T08:30:00Z"
    }
  ]
}
```

---

### 8.2 Promote User to Admin
```http
PUT /api/admin/users/:userId/role
Content-Type: application/json
```

**Request Body**:
```json
{
  "isAdmin": true,
  "reason": "Promoted to admin"
}
```

**Response**: `200 OK`
```json
{
  "userId": "user-123",
  "isAdmin": true,
  "message": "User promoted to admin"
}
```

---

### 8.3 Demote Admin to User
```http
PUT /api/admin/users/:userId/role
Content-Type: application/json
```

**Request Body**:
```json
{
  "isAdmin": false,
  "reason": "Demoted from admin"
}
```

**Response**: `200 OK`

---

## 9. SETTINGS ENDPOINTS

### 9.1 Get Store Settings
```http
GET /api/admin/settings
```

**Response**:
```json
{
  "storeName": "Silvera Shop",
  "storeDescription": "Premium luxury goods...",
  "storeEmail": "admin@silveraph.shop",
  "storePhone": "+63912345678",
  "storeAddress": "123 Business St, Manila",
  "storeCity": "Manila",
  "storeProvince": "NCR",
  "storePostalCode": "1000",
  "currency": "PHP",
  "timezone": "Asia/Manila",
  "paymentGateways": {
    "nexuspay": {
      "enabled": true,
      "username": "bossmarc",
      "merchantId": "u89aHfkyPCvMtV5Y"
    }
  },
  "emailSettings": {
    "smtpHost": "smtp.hostinger.com",
    "smtpPort": 465,
    "smtpFrom": "admin@innovatehub.ph"
  },
  "shippingSettings": {
    "defaultCarrier": "DHL",
    "flatRate": "25.00",
    "freeShippingThreshold": "500.00"
  }
}
```

---

### 9.2 Update Store Settings
```http
PUT /api/admin/settings
Content-Type: application/json
```

**Request Body**:
```json
{
  "storeName": "Updated Store Name",
  "storeDescription": "Updated description...",
  "storeEmail": "newemail@example.com",
  "shippingSettings": {
    "flatRate": "30.00"
  }
}
```

**Response**: `200 OK`

---

## 10. ERROR RESPONSES

### 403 Forbidden (Not Admin)
```json
{
  "error": "Admin access required",
  "code": "ADMIN_REQUIRED",
  "statusCode": 403
}
```

### 401 Unauthorized (Not Authenticated)
```json
{
  "error": "Authentication required",
  "code": "UNAUTHENTICATED",
  "statusCode": 401
}
```

### 404 Not Found
```json
{
  "error": "Product not found",
  "code": "NOT_FOUND",
  "statusCode": 404
}
```

### 400 Bad Request
```json
{
  "error": "Invalid request body",
  "code": "INVALID_REQUEST",
  "statusCode": 400,
  "details": [
    "Field 'price' must be a number greater than 0"
  ]
}
```

---

## 11. AUTHENTICATION

All admin endpoints require an authenticated session with `isAdmin: true` flag.

### Login Flow
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@silveraph.shop",
  "password": "adminpassword"
}
```

**Response**: `200 OK`
```json
{
  "user": {
    "id": "admin-user-123",
    "email": "admin@silveraph.shop",
    "firstName": "Admin",
    "isAdmin": true
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 12. RATE LIMITING

**Recommended Rate Limits for Admin Endpoints**:
- 100 requests per minute per user
- Bulk operations limited to 500 items per request
- Batch processing limited to 1000 items

---

## 13. VALIDATION RULES

### Product Creation
- `name`: Required, max 255 chars
- `slug`: Required, unique, lowercase with hyphens
- `price`: Required, positive number, max 2 decimals
- `stock`: Non-negative integer
- `categoryId`: Must exist in categories table

### Order Status Update
- Valid statuses: `pending`, `processing`, `shipped`, `delivered`, `cancelled`
- Cannot revert from `delivered` to earlier status
- Cannot cancel paid orders without refund

### Inventory Update
- `stock`: Non-negative integer
- `lowStockThreshold`: Positive integer less than stock level

---

## 14. PAGINATION

All list endpoints support pagination with standard parameters:

```
page: 1-based index
limit: 1-100 (default 20)
```

Response includes:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

---

## 15. SORTING

Supported sort fields vary by endpoint. Include `sort` and `order` parameters:

```
GET /api/admin/products?sort=price&order=desc
```

Valid `order` values: `asc`, `desc`

---

**Document Version**: 1.0
**Last Updated**: 2026-02-08
**Completeness**: 100% - All legacy endpoints documented

