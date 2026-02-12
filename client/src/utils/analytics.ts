const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;

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

export function trackPageView(path: string, title?: string): void {
  if (!GA_ID) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    ...(title && { page_title: title }),
  });
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!GA_ID) return;
  window.gtag('event', name, params);
}
