import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let initialized = false;

export function initSentry(): void {
  if (!SENTRY_DSN || initialized) return;
  initialized = true;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : undefined,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export function setSentryUser(user: { id: number; email: string; role: string } | null): void {
  if (!SENTRY_DSN) return;
  if (user) {
    Sentry.setUser({ id: String(user.id), email: user.email, role: user.role } as Sentry.User);
  } else {
    Sentry.setUser(null);
  }
}
