const express = require('express');
const router = express.Router();
const db = require('../../db');
const { auth, adminOnly } = require('../../middleware/auth');
const { SERVER_START_TIME, METRICS_WINDOW_MS, metricsStore, pruneMetrics } = require('../../middleware/metrics');

// ==================== PERFORMANCE METRICS API ====================

router.get('/admin/performance/metrics', auth, adminOnly, (req, res) => {
  try {
    pruneMetrics();
    const now = Date.now();

    // Flatten all entries
    const allEntries = [];
    for (const entries of Object.values(metricsStore)) {
      for (const e of entries) allEntries.push(e);
    }

    // Overall stats
    const totalRequests = allEntries.length;
    const durations = allEntries.map(e => e.duration).sort((a, b) => a - b);
    const errorCount = allEntries.filter(e => e.status >= 400).length;
    const avgResponseTime = totalRequests > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / totalRequests)
      : 0;
    const p95ResponseTime = totalRequests > 0
      ? durations[Math.floor(totalRequests * 0.95)] || durations[durations.length - 1]
      : 0;
    const p99ResponseTime = totalRequests > 0
      ? durations[Math.floor(totalRequests * 0.99)] || durations[durations.length - 1]
      : 0;
    const errorRate = totalRequests > 0
      ? Math.round((errorCount / totalRequests) * 10000) / 100
      : 0;
    const uptimeMs = now - SERVER_START_TIME;
    const uptimeHours = Math.round(uptimeMs / 3600000 * 10) / 10;

    // Per-endpoint breakdown
    const endpoints = Object.entries(metricsStore).map(([key, entries]) => {
      const [method, ...pathParts] = key.split(':');
      const ePath = pathParts.join(':');
      const eDurations = entries.map(e => e.duration).sort((a, b) => a - b);
      const eErrors = entries.filter(e => e.status >= 400).length;
      const eAvg = Math.round(eDurations.reduce((a, b) => a + b, 0) / eDurations.length);
      const eP95 = eDurations[Math.floor(eDurations.length * 0.95)] || eDurations[eDurations.length - 1];
      return {
        method,
        path: ePath,
        avgTime: eAvg,
        p95Time: eP95,
        calls: entries.length,
        errorRate: Math.round((eErrors / entries.length) * 10000) / 100,
      };
    });

    // Sort by avg time descending, take top 20
    endpoints.sort((a, b) => b.avgTime - a.avgTime);
    const topEndpoints = endpoints.slice(0, 20);

    // Time-series: per-minute averages for last 60 minutes
    const timeSeries = [];
    for (let m = 59; m >= 0; m--) {
      const minuteStart = now - (m + 1) * 60000;
      const minuteEnd = now - m * 60000;
      const minuteEntries = allEntries.filter(e => e.time >= minuteStart && e.time < minuteEnd);
      const minuteAvg = minuteEntries.length > 0
        ? Math.round(minuteEntries.reduce((sum, e) => sum + e.duration, 0) / minuteEntries.length)
        : 0;
      const minuteErrors = minuteEntries.filter(e => e.status >= 400).length;
      timeSeries.push({
        time: new Date(minuteEnd).toISOString(),
        avgResponseTime: minuteAvg,
        requests: minuteEntries.length,
        errors: minuteErrors,
      });
    }

    res.json({
      overall: {
        avgResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        totalRequests,
        errorRate,
        uptimeHours,
      },
      endpoints: topEndpoints,
      timeSeries,
    });
  } catch (e) {
    console.error('Performance metrics error:', e.message);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// ==================== WEBHOOK HEALTH CHECK ====================

router.get('/admin/webhooks/health', auth, adminOnly, (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Summary stats for last 24 hours
    const stats24h = db.prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END), 0) as processed,
        COALESCE(SUM(CASE WHEN signature_valid = 0 THEN 1 ELSE 0 END), 0) as invalid_signatures,
        COALESCE(SUM(CASE WHEN duplicate = 1 THEN 1 ELSE 0 END), 0) as duplicates,
        COALESCE(SUM(CASE WHEN error_message IS NOT NULL AND error_message != '' THEN 1 ELSE 0 END), 0) as errors,
        COALESCE(SUM(CASE WHEN event_type = 'payment_success' THEN 1 ELSE 0 END), 0) as successful_payments,
        COALESCE(SUM(CASE WHEN event_type = 'payment_failed' THEN 1 ELSE 0 END), 0) as failed_payments
      FROM webhook_logs WHERE created_at >= ?
    `).get(last24h);

    // Summary stats for last 7 days
    const stats7d = db.prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END), 0) as processed,
        COALESCE(SUM(CASE WHEN error_message IS NOT NULL AND error_message != '' THEN 1 ELSE 0 END), 0) as errors
      FROM webhook_logs WHERE created_at >= ?
    `).get(last7d);

    // Recent webhook logs (last 20)
    const recentLogs = db.prepare(`
      SELECT id, source, event_type, payment_ref, transaction_id, status, amount,
             signature_valid, response_code, error_message, processed, duplicate, created_at
      FROM webhook_logs ORDER BY created_at DESC LIMIT 20
    `).all();

    // Last successful webhook
    const lastSuccess = db.prepare(`
      SELECT created_at FROM webhook_logs
      WHERE event_type = 'payment_success' AND processed = 1
      ORDER BY created_at DESC LIMIT 1
    `).get();

    // Error rate
    const errorRate = stats24h.total > 0
      ? ((stats24h.errors / stats24h.total) * 100).toFixed(1)
      : '0.0';

    // Health status
    let healthStatus = 'healthy';
    if (stats24h.errors > 5 || parseFloat(errorRate) > 50) healthStatus = 'degraded';
    if (stats24h.invalid_signatures > 3) healthStatus = 'warning';

    res.json({
      status: healthStatus,
      last_24h: {
        total_webhooks: stats24h.total,
        processed: stats24h.processed,
        successful_payments: stats24h.successful_payments,
        failed_payments: stats24h.failed_payments,
        invalid_signatures: stats24h.invalid_signatures,
        duplicates: stats24h.duplicates,
        errors: stats24h.errors,
        error_rate: `${errorRate}%`
      },
      last_7d: {
        total_webhooks: stats7d.total,
        processed: stats7d.processed,
        errors: stats7d.errors
      },
      last_successful_webhook: lastSuccess ? lastSuccess.created_at : null,
      recent_logs: recentLogs
    });
  } catch (e) {
    console.error('Webhook health check error:', e.message);
    res.status(500).json({ error: 'Failed to fetch webhook health data' });
  }
});

// ==================== SELF-HOSTED ANALYTICS (Admin) ====================

// Admin: query analytics visitors
router.get('/admin/analytics/visitors', auth, adminOnly, (req, res) => {
  try {
    const period = req.query.period || 'week';
    let days;
    switch (period) {
      case 'day': days = 1; break;
      case 'month': days = 30; break;
      default: days = 7; break;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const periodStart = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

    // Today stats
    const todayStats = db.prepare(`
      SELECT COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
      FROM analytics_page_views WHERE created_at >= ?
    `).get(todayStart);

    // Period stats
    const periodStats = db.prepare(`
      SELECT COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
      FROM analytics_page_views WHERE created_at >= ?
    `).get(periodStart);

    // Top pages
    const topPages = db.prepare(`
      SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
      FROM analytics_page_views WHERE created_at >= ?
      GROUP BY path ORDER BY views DESC LIMIT 10
    `).all(periodStart);

    // Top referrers
    const topReferrers = db.prepare(`
      SELECT referrer, COUNT(*) as views
      FROM analytics_page_views WHERE created_at >= ? AND referrer IS NOT NULL
      GROUP BY referrer ORDER BY views DESC LIMIT 5
    `).all(periodStart);

    // Hourly breakdown (last 24 hours)
    const hourly = [];
    for (let h = 23; h >= 0; h--) {
      const hourStart = new Date(now - (h + 1) * 60 * 60 * 1000).toISOString();
      const hourEnd = new Date(now - h * 60 * 60 * 1000).toISOString();
      const row = db.prepare(`
        SELECT COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
        FROM analytics_page_views WHERE created_at >= ? AND created_at < ?
      `).get(hourStart, hourEnd);
      hourly.push({
        hour: new Date(now - h * 60 * 60 * 1000).getHours(),
        views: row.views,
        visitors: row.visitors,
      });
    }

    // Top events
    const topEvents = db.prepare(`
      SELECT name, COUNT(*) as count
      FROM analytics_events WHERE created_at >= ?
      GROUP BY name ORDER BY count DESC LIMIT 10
    `).all(periodStart);

    // Device breakdown (mobile < 768, tablet 768-1024, desktop > 1024)
    const devices = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN screen_width IS NOT NULL AND screen_width < 768 THEN 1 ELSE 0 END), 0) as mobile,
        COALESCE(SUM(CASE WHEN screen_width >= 768 AND screen_width <= 1024 THEN 1 ELSE 0 END), 0) as tablet,
        COALESCE(SUM(CASE WHEN screen_width > 1024 THEN 1 ELSE 0 END), 0) as desktop,
        COALESCE(SUM(CASE WHEN screen_width IS NULL THEN 1 ELSE 0 END), 0) as unknown
      FROM analytics_page_views WHERE created_at >= ?
    `).get(periodStart);

    // Pages per visitor
    const pagesPerVisitor = periodStats.visitors > 0
      ? Math.round((periodStats.views / periodStats.visitors) * 10) / 10
      : 0;

    res.json({
      today: { views: todayStats.views, visitors: todayStats.visitors },
      period: { days, views: periodStats.views, visitors: periodStats.visitors, pagesPerVisitor },
      topPages,
      topReferrers,
      hourly,
      topEvents,
      devices,
    });
  } catch (e) {
    console.error('Analytics visitors error:', e.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
