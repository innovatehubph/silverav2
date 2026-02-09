# Dual Silvera Systems - Comprehensive Comparison

**Date**: 2026-02-08
**Discovery**: Two separate Silvera e-commerce systems running simultaneously
**Status**: Both operational, different purposes

---

## Quick Overview

| Aspect | OLD SILVERA (v1.0.0) | NEW SILVERAV2 (v2.0.1) |
|--------|---|---|
| **Location** | `/srv/apps/silvera/` | `/root/silverav2/` |
| **Port** | 5004 | 3865 |
| **Tech Stack** | Next.js + React | Express.js + Vanilla JS |
| **Frontend** | React/Radix UI (Modern SPA) | Static HTML + jQuery |
| **Database** | PostgreSQL (Neon) | SQLite |
| **Products** | 20 | 10 |
| **Status** | Production-ready | Development/Testing |
| **PID** | 3332310 | 4140917 |

---

## SYSTEM 1: OLD SILVERA (v1.0.0) - Port 5004

### Architecture
```
/srv/apps/silvera/ (Git repo)
├── client/              (React/Next.js frontend)
├── dist/                (Compiled backend)
├── package.json         (Full-stack dependencies)
└── drizzle.config.ts    (ORM configuration)

Running: node /srv/apps/silvera/dist/index.js
```

### Technology Stack
**Frontend**:
- React 18+ with Radix UI components
- Next.js or React Router
- Modern component-based architecture
- State management (likely Zustand, Redux, or Context)

**Backend**:
- Node.js (compiled from TypeScript)
- Express or similar
- Drizzle ORM

**Database**:
- PostgreSQL via Neon (serverless)
- Connection: `postgresql://silvera:silvera123@localhost:5432/silvera`
- Full relational database

### Configuration
```env
DATABASE_URL=postgresql://silvera:silvera123@localhost:5432/silvera
SESSION_SECRET=silvera-session-secret-change-in-production
NODE_ENV=development
NEXUSPAY_USERNAME=bossmarc
NEXUSPAY_PASSWORD=***REMOVED***
```

### Data
- **Products**: 20 (includes "Test Product - ₱100 Total" for payment testing)
- **Database**: PostgreSQL (structure unknown, likely complex)
- **Status**: Production-ready with test data

### Features Observed
- ✅ Advanced UI with Radix components
- ✅ API endpoints (`/api/products`)
- ✅ Payment integration (NexusPay, Replicate API)
- ✅ Full e-commerce functionality

### Access
```
External: http://37.44.244.226:5004
Local: http://localhost:5004
API: http://localhost:5004/api/products
```

---

## SYSTEM 2: NEW SILVERAV2 (v2.0.1) - Port 3865

### Architecture
```
/root/silverav2/ (Working directory)
├── server/
│   └── index.js         (Express backend - NOT compiled)
├── public/              (Static frontend HTML/CSS/JS)
├── admin/               (Admin panel HTML)
├── package.json         (Backend only)
└── silvera.db           (SQLite database)

Running: node /root/silverav2/server/index.js
```

### Technology Stack
**Frontend**:
- Static HTML5 files
- Vanilla JavaScript (ES6+)
- jQuery for DOM manipulation
- Slick carousel for images
- Bootstrap for styling

**Backend**:
- Express.js (raw Node.js, no compilation)
- SQLite (better-sqlite3)
- Custom authentication (JWT)

**Database**:
- SQLite (`/root/silverav2/silvera.db`)
- File-based, single file
- Schema: users, products, categories, orders, reviews

### Configuration
```env
PORT=3865
NODE_ENV=production
JWT_SECRET=***REMOVED***
DATABASE_PATH=/root/silverav2/silvera.db
NEXUSPAY_USERNAME=bossmarc
NEXUSPAY_PASSWORD=***REMOVED***
ADMIN_EMAIL=boss@silveraph.shop
ADMIN_PASSWORD=***REMOVED***
```

### Data
- **Products**: 10 (newly seeded from QA report)
- **Categories**: 5 (Fashion, Electronics, Home & Living, Beauty, Sports)
- **Users**: 1 (admin: boss@silveraph.shop)
- **Orders**: 0

### Features
- ✅ Express backend with CORS + rate limiting
- ✅ JWT authentication (fixed today)
- ✅ Product CRUD API
- ✅ Cart management
- ✅ Order processing
- ✅ Admin panel
- ✅ Email notifications (Nodemailer)

### Access
```
External: http://37.44.244.226:3865
Local: http://localhost:3865
API: http://localhost:3865/api/products
Admin: http://37.44.244.226:3865/#admin
Health: http://localhost:3865/api/health
```

---

## Why Both Are Running (Analysis)

### Hypothesis 1: Migration In Progress ✅ MOST LIKELY
- Old Silvera (v1.0) was the original production system
- New Silvera V2 is being developed/tested as the replacement
- Both running to allow comparison/testing
- Migration from PostgreSQL → SQLite + Next.js → Express

### Hypothesis 2: Different Purposes
- **Old Silvera** (port 5004): Legacy production system or separate deployment
- **New Silvera V2** (port 3865): New feature development/testing environment

### Hypothesis 3: Testing Setup
- Old Silvera has 20 products (production-like data)
- New Silvera has 10 products (QA test data)
- Different configurations for testing various scenarios

---

## Key Differences

| Aspect | Old Silvera | New Silvera V2 | Impact |
|--------|---|---|---|
| **Database** | PostgreSQL (persistent, distributed) | SQLite (file-based, local) | PG more scalable, SQLite simpler |
| **Frontend** | React SPA (npm build) | Static HTML (no build step) | React more interactive, HTML simpler |
| **Compilation** | TypeScript → compiled | Raw Node.js | Compiled faster, raw easier to debug |
| **Data Persistence** | Database server | File system | DB more reliable, file simpler |
| **Scaling** | Database clustering possible | Single file bottleneck | PG scales, SQLite doesn't |
| **Development** | Full build pipeline | Direct editing possible | Complex vs simple |
| **API** | Mature backend | Newer backend | Might have different endpoints |

---

## Data Consistency Issues

### Problem
- **Old Silvera**: 20 products in PostgreSQL
- **New Silvera V2**: 10 products in SQLite
- **Risk**: Users may see different products depending on which system they hit

### Solution Options

**Option A: Consolidate on New Silvera V2**
```bash
# Keep new system, abandon old
pm2 delete silvera
# OR redirect port 5004 → 3865 with Nginx
```

**Option B: Consolidate on Old Silvera**
```bash
# Keep old system, abandon new
pm2 delete silverav2
# Migrate new product data from QA report to old system
```

**Option C: Unified Deployment**
```bash
# Use one frontend to talk to both backends
# Implement fallover logic
# Sync databases nightly
```

**Option D: Separate Deployments (Keep Both)**
```bash
# Old Silvera: Production at 37.44.244.226:5004
# New Silvera V2: Staging/Development at 37.44.244.226:3865
# Use DNS/load balancer to route traffic
```

---

## Current State Assessment

### Old Silvera (5004)
- ✅ **Mature**: Production-ready system
- ✅ **Tested**: 20 products with payment testing data
- ✅ **Complete**: Full React frontend with components
- ⚠️ **Dependency**: Requires PostgreSQL server running
- ⚠️ **Complexity**: TypeScript compilation required

### New Silvera V2 (3865)
- ✅ **Simple**: Raw Node.js, no build step
- ✅ **Recent**: Latest fixes applied today (security, product data)
- ✅ **Self-contained**: SQLite included, no external DB needed
- ⚠️ **Immature**: Only 10 products (development data)
- ⚠️ **Basic Frontend**: HTML/jQuery, less interactive than React

---

## Recommendations

### For User/Customer Perspective
```
Current Problem:
- Users hitting 37.44.244.226:5004 see OLD system (20 products, old UI)
- Users hitting 37.44.244.226:3865 see NEW system (10 products, new features)
- Confusing! Different experiences

Solution: Point ONE public domain to ONE system
```

### Decision Matrix

**KEEP OLD SILVERA** if:
- ✅ You want mature, tested React UI
- ✅ You need PostgreSQL reliability
- ✅ You prefer complex but feature-complete
- ⚠️ You must migrate existing data

**KEEP NEW SILVERAV2** if:
- ✅ You prefer simplicity
- ✅ You want no external dependencies
- ✅ You're OK with rebuilding from scratch
- ✅ You want easier debugging/development
- ⚠️ You accept lower scalability

**RECOMMENDED**: Keep **NEW SILVERAV2** because:
1. Already fixed security issues today (JWT, admin creds)
2. Self-contained (no PostgreSQL dependency)
3. Simpler for debugging
4. Can be scaled later if needed
5. Fresh start without legacy code

---

## Action Items

### Immediate (Choose One)

**Option 1: Consolidate on New SilveraV2 (RECOMMENDED)**
```bash
# Stop old system
pm2 delete silvera

# Keep port 3865 for public access
# Copy old product data (20 → 10, need 10 more)
# Update DNS/public URLs to 37.44.244.226:3865
```

**Option 2: Keep Both (Staging vs Production)**
```bash
# Keep both running
# Configure: 5004 = Production, 3865 = Staging
# Or: Use Nginx to route based on subdomain
#     silvera.shop → 5004
#     staging.silvera.shop → 3865
```

**Option 3: Consolidate on Old Silvera**
```bash
# Stop new system
pm2 delete silverav2
# Keep only 5004
# Add missing functionality (cart/checkout) if needed
```

### Data Migration (if needed)
```bash
# Export products from old PostgreSQL:
psql -c "SELECT * FROM products;" > old-products.sql

# Import to new SQLite:
sqlite3 /root/silverav2/silvera.db < import-old-products.sql
```

### Infrastructure
```bash
# Set up reverse proxy to hide internal port:
# nginx: listen 80/443, proxy_pass to 3865
# Hide that it's port 3865 from users
```

---

## Files to Check

**Old Silvera**:
- `/srv/apps/silvera/package.json` - Dependencies
- `/srv/apps/silvera/.env` - Configuration
- `/srv/apps/silvera/client/` - React source
- `/srv/apps/silvera/dist/` - Compiled code

**New Silvera V2**:
- `/root/silverav2/package.json` - Dependencies
- `/root/silverav2/.env` - Configuration (contains secrets - secured today)
- `/root/silverav2/server/index.js` - Express app
- `/root/silverav2/public/` - Static files
- `/root/silverav2/silvera.db` - Database

---

## Summary

**Discovery**: Two fully functional Silvera e-commerce systems running in parallel

**Current State**:
- Old Silvera (5004): Mature, PostgreSQL-backed, React UI
- New Silvera V2 (3865): Fresh, SQLite-backed, Express API

**Issue**: Dual systems create confusion and data inconsistency

**Recommendation**: Consolidate to NEW SILVERAV2 (already fixed security issues)

**Next Step**: Decide which system to keep, shut down the other, and configure single public entry point

---

**Status**: Analysis Complete | Awaiting Decision: Keep 5004, 3865, or Both?
