# Silvera PH

Premium e-commerce platform for luxury branded goods in the Philippines. Built with React, Express, and SQLite.

**Live:** https://silvera.innoserver.cloud

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 3 |
| State | Zustand (persisted to localStorage) |
| Animations | GSAP + ScrollTrigger |
| Backend | Express 4, Node.js 20 |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Payments | DirectPay (GCash, Maya, GrabPay, BDO, BPI, UnionBank, COD) |
| Storage | MinIO S3-compatible (product images) |
| Email | Nodemailer (SMTP) |
| Admin | Next.js 16 (separate app on port 3000) |
| Testing | Playwright (9 E2E spec files, 5 browsers) |
| Deploy | Docker multi-stage build, Dokploy |

## Features

### Customer
- Product catalog with search, filters, and pagination
- Shopping cart (guest + authenticated)
- Multi-step checkout with Philippine address support (PSGC)
- Payment via GCash, Maya, GrabPay, bank transfer, or COD
- Order tracking and return requests
- Wishlist and product reviews
- OTP-based password reset
- Dark/light theme

### Admin (12 pages)
- Dashboard with sales overview and low-stock alerts
- Product CRUD with multi-image upload (MinIO S3)
- Inventory management with audit log
- Order management with status updates, tracking, and notes
- Return request processing
- User management and role assignment
- Category management
- Coupon/discount code system
- Sales reports, revenue trends, and customer analytics
- Self-hosted visitor analytics (cookie-free)
- Server performance monitoring

## Project Structure

```
├── client/                 React frontend (Vite)
│   ├── src/
│   │   ├── pages/          20+ customer pages + 12 admin pages
│   │   ├── components/     Reusable UI (layout, product, etc.)
│   │   ├── sections/       Homepage sections (Hero, Category, Footer)
│   │   ├── stores/         Zustand stores (auth, cart, theme)
│   │   ├── types/          TypeScript definitions
│   │   └── hooks/          Custom React hooks
│   └── public/
├── server/
│   ├── index.js            Express API (~100 endpoints)
│   └── services/
│       ├── email-service.js
│       ├── payment-gateway.js
│       ├── minio.js
│       └── psgc.js         Philippine geographic data
├── admin-app/              Next.js admin dashboard
├── tests/e2e/              Playwright E2E tests
├── Dockerfile              Multi-stage production build
├── docker-compose.yml      Production orchestration
└── playwright.config.ts
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Local Development

```bash
# Clone the repo
git clone https://github.com/innovatehubph/silverav2.git
cd silverav2

# Copy environment config
cp .env.example .env
# Edit .env with your credentials

# Install server dependencies
npm install

# Install and build the client
cd client && npm install && npm run build && cd ..

# Start the server (serves client from client/dist)
npm start
# API + client available at http://localhost:3865
```

For client hot-reload during development:

```bash
# Terminal 1: API server
npm start

# Terminal 2: Vite dev server (proxies API requests)
cd client && npm run dev
```

### Docker

```bash
# Build and run with Docker Compose
docker compose up -d

# The app is available at http://localhost:3865
# SQLite database persists in the silverav2-data volume
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Server
PORT=3865
NODE_ENV=production

# JWT (generate: openssl rand -hex 64)
JWT_SECRET=your-strong-jwt-secret

# Database
DATABASE_PATH=/data/silvera.db

# Email (Nodemailer SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@example.com

# Payment Gateway (DirectPay / NexusPay)
NEXUSPAY_BASE_URL=https://nexuspay.cloud/api
NEXUSPAY_USERNAME=
NEXUSPAY_PASSWORD=
NEXUSPAY_MERCHANT_ID=
NEXUSPAY_KEY=

# Admin seed credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=hashed-password
```

## API Endpoints

~100 endpoints grouped by resource. See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for the full reference.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register with email/password |
| POST | `/api/auth/login` | JWT login (7-day expiry) |
| POST | `/api/auth/forgot-password` | Send OTP via email |
| POST | `/api/auth/verify-reset-otp` | Verify 6-digit OTP |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/me` | Current user profile |

### Products & Categories
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List with search, filters, pagination |
| GET | `/api/products/:id` | Product detail |
| GET | `/api/products/:id/reviews` | Product reviews |
| POST | `/api/products/:id/reviews` | Submit review |
| GET | `/api/categories` | All categories |

### Cart & Wishlist
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cart` | Get cart |
| POST | `/api/cart` | Add item |
| PUT | `/api/cart/:id` | Update quantity |
| DELETE | `/api/cart/:id` | Remove item |
| GET | `/api/wishlist` | Get wishlist |
| POST | `/api/wishlist` | Add to wishlist |
| DELETE | `/api/wishlist/:id` | Remove from wishlist |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders` | List user orders |
| GET | `/api/orders/:id` | Order detail |
| POST | `/api/orders` | Create order |
| POST | `/api/orders/:id/return` | Request return |

### Payments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/payments/methods` | Available payment methods |
| POST | `/api/payments/qrph/create` | Create QRPH payment |
| GET | `/api/payments/:ref/status` | Check payment status |
| POST | `/api/payments/webhook` | DirectPay webhook (HMAC verified) |

### Addresses
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/addresses` | List addresses |
| POST | `/api/addresses` | Create address |
| PUT | `/api/addresses/:id` | Update address |
| DELETE | `/api/addresses/:id` | Delete address |
| PUT | `/api/addresses/:id/default` | Set default |

### Admin (all require admin role)
- **Products**: CRUD + bulk delete/stock + image upload
- **Inventory**: Stock management + audit log
- **Orders**: Status updates, tracking, notes
- **Returns**: Approve/reject
- **Users**: CRUD + role/status management
- **Categories**: CRUD with product counts
- **Coupons**: CRUD
- **Settings**: Batch update store config
- **Reports**: Sales, revenue, top products, customers
- **Analytics**: Visitor metrics
- **Performance**: Server health metrics
- **Dashboard**: Overview stats

## Testing

E2E tests run with Playwright across Chromium, Firefox, WebKit, Mobile Chrome, and Mobile Safari.

```bash
# Install Playwright browsers
npx playwright install

# Run all tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# View HTML report
npm run test:e2e:report
```

### Test Suites
1. **Authentication** - Login, register, logout
2. **Navigation** - Routing and page loads
3. **Shopping Workflow** - Browse, add to cart, checkout
4. **Payment Flow** - Payment method selection and validation
5. **User Account** - Profile, addresses
6. **Error Handling** - 404, error states
7. **Responsive Design** - Mobile, tablet, desktop
8. **Admin Performance** - Admin panel load times
9. **Sandbox Payments** - DirectPay sandbox integration

## Deployment

### Docker (production)

The Dockerfile uses a 3-stage build:

1. **client-build** - Builds the React app with Vite
2. **admin-build** - Builds the Next.js admin panel
3. **production** - Node.js 20 Alpine with server, compiled client, and admin

```bash
# Build
docker build -t silvera .

# Run
docker run -d \
  --name silvera \
  -p 3865:3865 \
  -v silvera-data:/data \
  --env-file .env \
  silvera
```

The SQLite database is stored at `/data/silvera.db` inside the container. Mount a volume to `/data` for persistence.

### Dokploy

The project auto-deploys from `main` via Dokploy (Docker Swarm). Push to `origin/main` triggers a build and deploy (~90s propagation).

### Health Check

```
GET /api/health
```

Returns `200 OK` when the server is ready. Used by Docker's `HEALTHCHECK` directive.

## Lighthouse Scores

| Category | Score |
|----------|-------|
| Performance | 94 |
| Accessibility | 94 |
| Best Practices | 100 |
| SEO | 100 |

| Metric | Value |
|--------|-------|
| LCP | 1.2s |
| FCP | 0.7s |
| CLS | 0 |
| TBT | 130ms |
| Speed Index | 1.2s |

## License

Proprietary. All rights reserved.
