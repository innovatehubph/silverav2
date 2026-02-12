# Silvera V2 - Security Posture

**Last Updated**: February 12, 2026

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

### Credential Rotation Required

> **WARNING**: This repository was previously public with hardcoded credentials in git history. The following credentials are exposed in git history and **must be rotated**:

- [ ] `JWT_SECRET` - Rotate and update `.env`
- [ ] `SMTP_PASSWORD` - Rotate via Hostinger email admin
- [ ] `NEXUSPAY_PASSWORD` / `NEXUSPAY_KEY` - Rotate via NexusPay/DirectPay dashboard
- [ ] `ADMIN_PASSWORD` - Rotate and update bcrypt hash in database
- [ ] `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` - Rotate via MinIO admin console

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
