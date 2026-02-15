const SERVER_START_TIME = Date.now();
const METRICS_WINDOW_MS = 60 * 60 * 1000; // 1 hour rolling window
const metricsStore = {}; // keyed by "METHOD:path" → [{time, status, duration}]

function pruneMetrics() {
  const cutoff = Date.now() - METRICS_WINDOW_MS;
  for (const key of Object.keys(metricsStore)) {
    metricsStore[key] = metricsStore[key].filter(e => e.time > cutoff);
    if (metricsStore[key].length === 0) delete metricsStore[key];
  }
}

// Normalize route paths: collapse IDs/slugs to `:id` for grouping
function normalizePath(url) {
  return url.split('?')[0].replace(/\/\d+/g, '/:id');
}

// Metrics middleware — record request duration
function metricsMiddleware(req, res, next) {
  // Skip static files & non-API routes
  if (!req.path.startsWith('/api/')) return next();
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const key = `${req.method}:${normalizePath(req.path)}`;
    if (!metricsStore[key]) metricsStore[key] = [];
    metricsStore[key].push({ time: Date.now(), status: res.statusCode, duration });
  });
  next();
}

// Prune old entries every 5 minutes
setInterval(pruneMetrics, 5 * 60 * 1000);

module.exports = { SERVER_START_TIME, METRICS_WINDOW_MS, metricsStore, pruneMetrics, normalizePath, metricsMiddleware };
