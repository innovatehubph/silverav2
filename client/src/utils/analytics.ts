const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const API_URL = import.meta.env.VITE_API_URL || '/api';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;

// ==================== Google Analytics ====================

export function initGA(): void {
  if (!GA_ID || initialized) return;
  initialized = true;

  // Seed dataLayer + define gtag helper
  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false });

  // Inject gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

// ==================== Self-Hosted Analytics ====================

function sendToSelfHosted(endpoint: string, payload: Record<string, unknown>): void {
  const url = `${API_URL}/analytics/${endpoint}`;
  const body = JSON.stringify(payload);

  // Prefer sendBeacon (fire-and-forget, survives page unload)
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    const sent = navigator.sendBeacon(url, blob);
    if (sent) return;
  }

  // Fallback to fetch (keepalive for page transitions)
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Silently ignore analytics failures
  });
}

// ==================== Dual-Tracking Public API ====================

export function trackPageView(path: string, title?: string): void {
  // Google Analytics
  if (GA_ID) {
    window.gtag('event', 'page_view', {
      page_path: path,
      ...(title && { page_title: title }),
    });
  }

  // Self-hosted analytics
  sendToSelfHosted('collect', {
    path,
    referrer: document.referrer || undefined,
    screenWidth: window.innerWidth,
  });
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  // Google Analytics
  if (GA_ID) {
    window.gtag('event', name, params);
  }

  // Self-hosted analytics
  sendToSelfHosted('event', {
    name,
    props: params || undefined,
    path: window.location.pathname,
  });
}
