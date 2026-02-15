# Monitoring & Error Tracking

## Sentry

Silvera V2 uses [Sentry](https://sentry.io) for error monitoring and performance tracing on both client and server. **All Sentry code is no-op when DSN environment variables are not set.**

### Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SENTRY_DSN` | `client/.env` | Client-side Sentry DSN (public, safe to expose) |
| `SENTRY_DSN` | `.env` (root) | Server-side Sentry DSN |
| `SENTRY_AUTH_TOKEN` | `.env` / CI | Auth token for source map uploads (build-time only) |
| `SENTRY_ORG` | `.env` / CI | Sentry organization slug (build-time only) |
| `SENTRY_PROJECT` | `.env` / CI | Sentry project slug (build-time only) |

### Architecture

**Client** (`@sentry/react`):
- Initialized in `main.tsx` before React renders (installs global error handlers)
- `captureException()` called from `ErrorBoundary.componentDidCatch`
- User context set on auth restore via `setSentryUser()`
- Browser tracing: 10% sample rate in production, 100% in development
- Session replay: 1% normal sessions, 100% on error (all text masked)

**Server** (`@sentry/node`):
- Initialized at top of `server/index.js` (conditional on `SENTRY_DSN`)
- `Sentry.setupExpressErrorHandler(app)` before global error handler
- Strips `authorization` and `cookie` headers from events
- Traces: 10% sample rate

### Source Maps

When `SENTRY_AUTH_TOKEN` is set during build:
1. Vite generates source maps (`sourcemap: true`)
2. `@sentry/vite-plugin` uploads them to Sentry
3. `.map` files are deleted from `dist/` after upload (not served to browsers)

Without the auth token, the plugin is disabled — source maps are still generated but remain in `dist/`.

### CSP Configuration

The server's Content-Security-Policy includes:
- `connect-src`: `https://*.ingest.sentry.io` (error/performance data)
- `worker-src`: `'self' blob:` (Sentry replay worker)

### Disabling Sentry

Remove or leave empty the `VITE_SENTRY_DSN` and `SENTRY_DSN` environment variables. No code changes needed.

## Admin Performance Dashboard

Built-in performance monitoring at `/admin/performance`. See the admin panel for real-time metrics (response times, error rates, per-endpoint breakdown).

## Google Analytics

See `client/src/utils/analytics.ts`. Controlled by `VITE_GA_MEASUREMENT_ID`.
