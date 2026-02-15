# Silvera V2 - Security Posture

**Last Updated**: February 15, 2026

---

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it privately via email to **admin@innovatehub.ph**. Do not open a public GitHub issue for security vulnerabilities.

---

## Authentication & Authorization

| Control | Implementation | Status |
|---------|---------------|--------|
| **Auth mechanism** | JWT via `Authorization: Bearer` header | Active |
| **Token expiry** | 7 days | Active |
| **Token signing** | HMAC-SHA256 with 48-byte random secret (`JWT_SECRET`) | Active |
| **Password hashing** | bcryptjs with 10 salt rounds | Active |
| **Admin check** | Role-based (`admin` role required for `/api/admin/*`) | Active |
| **OTP generation** | `crypto.randomInt()` (cryptographically secure) | Active |

### CSRF Protection

**CSRF tokens are not needed** for this application. JWT authentication uses the `Authorization: Bearer` header exclusively — no cookies are used for auth. Since browsers do not automatically attach `Authorization` headers to cross-origin requests, CSRF attacks are structurally impossible against this API.

The CORS configuration sets `credentials: false` as an additional safeguard.

---

## Transport Security

| Control | Implementation |
|---------|---------------|
| **HTTPS enforcement** | 301 redirect from HTTP to HTTPS in production |
| **HSTS** | `max-age=31536000; includeSubDomains; preload` |
| **TLS** | Managed by Traefik reverse proxy with Let's Encrypt auto-renewal |

---

## Security Headers (Helmet.js)

| Header | Value |
|--------|-------|
| **Content-Security-Policy** | `default-src 'self'`; script, style, font, image, connect sources explicitly allowlisted |
| **X-Frame-Options** | `DENY` (clickjacking prevention) |
| **X-Content-Type-Options** | `nosniff` (MIME type sniffing prevention) |
| **X-DNS-Prefetch-Control** | `off` |
| **X-Download-Options** | `noopen` |
| **X-Permitted-Cross-Domain-Policies** | `none` |
| **Referrer-Policy** | `strict-origin-when-cross-origin` |

---

## CORS Policy

- **Allowed origins**: Explicit allowlist (`silvera.innoserver.cloud`, `silvera.ph`, `silveraph.shop` + localhost for dev)
- **Credentials**: `false` (no cookie auth)
- **Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Headers**: `Content-Type, Authorization`

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/login` | 10 requests | 15 minutes |
| `/api/auth/register` | 10 requests | 15 minutes |
| `/api/auth/forgot-password` | 10 requests | 15 minutes |
| All `/api/*` routes | 100 requests | 1 minute |

Rate limits use `express-rate-limit` with `trust proxy` enabled for correct client IP behind Traefik.

---

## Input Validation & SQL Injection Prevention

- **All SQL queries** use parameterized prepared statements via `better-sqlite3` (`db.prepare().run/get/all()` with `?` placeholders)
- **No raw SQL string concatenation** anywhere in the codebase
- **Custom validators** for email, password (6-128 chars), string sanitization (trimmed, length-capped)
- **File uploads** restricted to JPEG/PNG/WebP/GIF, max 10MB, via multer memory storage

---

## Payment Webhook Security

| Control | Implementation |
|---------|---------------|
| **Signature verification** | HMAC-SHA256 with `DIRECTPAY_MERCHANT_KEY` |
| **Timing-safe comparison** | `crypto.timingSafeEqual()` prevents timing attacks |
| **Duplicate detection** | `webhook_logs` table tracks processed webhooks to prevent double-processing |
| **Audit logging** | All webhook events logged with source, status, signature validity, errors |
| **Alerting** | Telegram alerts for signature failures, unknown orders, failed payments, and processing errors |
| **Production enforcement** | Unsigned webhooks rejected in production (no bypass) |

---

## Secret Management

| Practice | Status |
|----------|--------|
| `.env` in `.gitignore` | Yes |
| `.env.*` in `.gitignore` | Yes (except `.env.example` and `.env.production.example`) |
| CI secret scanning | Yes (GitHub Actions job scans for hardcoded credentials on every push/PR) |
| Secrets via environment variables | Yes (all secrets read from `process.env`) |
| Docker Compose uses `${VAR}` references | Yes (no hardcoded values) |

### Git History Remediation (2026-02-15)

On 2026-02-15, BFG Repo-Cleaner was used to purge 7 hardcoded secrets from all 151 commits in the repository history. A force push replaced the entire history with scrubbed versions. The secrets below were exposed and **must be rotated** even though they no longer appear in git.

### Credential Rotation Checklist

- [ ] JWT secret
- [ ] SMTP password
- [ ] NexusPay API password
- [ ] NexusPay merchant key
- [ ] MinIO access key
- [ ] MinIO secret key
- [ ] Admin password

---

## Credential Rotation Guide

### 1. JWT Secret

**Risk**: Anyone with the old secret can forge authentication tokens for any user, including admin.

```bash
# 1. Generate a new 64-byte hex secret
openssl rand -hex 64

# 2. Update the .env file on the server
#    SSH into the server or update via Dokploy environment variables
JWT_SECRET=<paste-new-value>

# 3. Restart the application
#    All existing user sessions will be invalidated (users must re-login)
docker restart silverav2-app
```

**Verify**: Try logging in — a new JWT should be issued. Old tokens should return 401.

---

### 2. SMTP Password (Hostinger Email)

**Risk**: Attacker could send emails as your domain, read mailbox, or use it for phishing.

```
1. Log in to Hostinger control panel → Email Accounts
2. Select the SMTP account (e.g. noreply@silvera.ph)
3. Change the password to a strong random value (20+ chars)
4. Update .env on the server:
   SMTP_PASSWORD=<new-password>
5. Restart the application
```

**Verify**: Trigger a password reset or place an order — confirm the email is delivered.

---

### 3. NexusPay API Password

**Risk**: Attacker could authenticate to the NexusPay API and initiate transactions on your merchant account.

```
1. Log in to NexusPay / DirectPay merchant dashboard
2. Navigate to API Settings → Credentials
3. Regenerate the API password
4. Update .env on the server:
   NEXUSPAY_PASSWORD=<new-password>
5. Restart the application
```

**Verify**: Place a test order with GCash/Maya payment — confirm the payment session is created.

---

### 4. NexusPay Merchant Key

**Risk**: Attacker could forge webhook signatures, marking fake payments as completed.

```
1. Log in to NexusPay / DirectPay merchant dashboard
2. Navigate to API Settings → Webhook Configuration
3. Regenerate the merchant key (HMAC signing key)
4. Update .env on the server:
   NEXUSPAY_KEY=<new-key>
   DIRECTPAY_MERCHANT_KEY=<new-key>
5. Restart the application
```

**Verify**: Process a sandbox payment end-to-end — confirm webhook signature verification passes.

---

### 5. MinIO Access Key

**Risk**: Attacker could read, upload, or delete any file in the S3 bucket (product images, category images).

```
1. Access MinIO admin console (e.g. https://s3.innoserver.cloud/console)
2. Navigate to Identity → Users or Access Keys
3. Create a new access key pair for the silvera service account
4. Revoke/delete the old access key
5. Update .env on the server:
   MINIO_ACCESS_KEY=<new-access-key>
   MINIO_SECRET_KEY=<new-secret-key>
6. Restart the application
```

**Verify**: Upload a product image via Admin → Products — confirm the image appears at the public URL.

---

### 6. MinIO Secret Key

Rotated together with the access key in step 5 above. They are a pair — always rotate both.

---

### 7. Admin Password

**Risk**: Attacker could log in as admin and access all admin functionality (orders, users, settings, products).

```bash
# 1. Log in to the admin panel at /admin
# 2. Or reset via the API directly:

# Generate a new bcrypt hash
node -e "console.log(require('bcryptjs').hashSync('YourNewStrongPassword123!', 10))"

# Update the database directly (SSH into server)
sqlite3 /data/silvera.db "UPDATE users SET password='<bcrypt-hash>' WHERE role='admin';"

# 3. Also update .env so the seed script uses the new password on fresh deploys:
ADMIN_PASSWORD=<new-plaintext-password>

# 4. Restart the application
```

**Verify**: Log in to `/admin` with the new password. Confirm the old password no longer works.

---

### Post-Rotation Verification

After rotating all credentials, run this checklist:

```
[ ] JWT:      Log in → receive token → access protected route
[ ] SMTP:     Trigger password reset email → email received
[ ] NexusPay: Create GCash test payment → payment URL returned
[ ] Webhook:  Complete sandbox payment → webhook accepted (200)
[ ] MinIO:    Upload product image via admin → image loads publicly
[ ] Admin:    Log in to /admin with new password → dashboard loads
[ ] E2E:      npx playwright test --project=chromium → all tests pass
```

---

## CI/CD Security

- **Secret scanning**: Every push and PR is scanned for hardcoded credentials (JWT_SECRET, SMTP_PASSWORD, NEXUSPAY_*, MINIO_*, ADMIN_PASSWORD)
- **E2E tests**: 85 Playwright tests run on every push to `main`/`develop`
- **Deploy via SSH**: GitHub Actions deploys via SSH key (stored as GitHub Secret)
- **No secrets in workflow files**: Test credentials use separate values from production

---

## Known Limitations & Accepted Risks

1. **`unsafe-inline` in CSP for styles**: Required by Tailwind CSS inline styles. Scripts do NOT use `unsafe-inline`.
2. **JWT in localStorage (client)**: Standard pattern for SPA + API architecture. XSS is mitigated by CSP. HttpOnly cookies would require significant architectural changes.
3. **SQLite single-writer**: Acceptable for current traffic volume. PostgreSQL migration documented as future option.
4. **No Sentry/error tracking**: Errors logged to stdout/stderr. Structured logging is a future improvement.

---

## Security Checklist for Contributors

- [ ] Never hardcode secrets — use `process.env.VARIABLE_NAME`
- [ ] Use parameterized queries — never concatenate user input into SQL
- [ ] Validate all user input at API boundaries
- [ ] Use `auth` middleware on all endpoints that require authentication
- [ ] Use `adminOnly` middleware on all admin endpoints
- [ ] Test rate limiting doesn't block legitimate usage
- [ ] Run `npx playwright test` before pushing to verify no regressions
