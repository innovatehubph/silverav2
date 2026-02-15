const express = require('express');
const router = express.Router();
const db = require('../db');
const { analyticsLimiter } = require('../middleware/rate-limiters');
const { hashVisitor, extractReferrerDomain } = require('../helpers/analytics');

// Public: collect page view (no auth, rate-limited)
router.post('/analytics/collect', analyticsLimiter, (req, res) => {
  try {
    const { path: pagePath, referrer, screenWidth } = req.body;
    if (!pagePath || typeof pagePath !== 'string') {
      return res.status(400).json({ error: 'path required' });
    }
    const ip = req.ip || req.connection.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    const visitorHash = hashVisitor(ip, ua);
    const cleanPath = pagePath.slice(0, 500);
    const cleanReferrer = extractReferrerDomain(referrer, req.headers.host);
    const sw = typeof screenWidth === 'number' && screenWidth > 0 ? Math.round(screenWidth) : null;
    db.prepare('INSERT INTO analytics_page_views (visitor_hash, path, referrer, screen_width) VALUES (?, ?, ?, ?)').run(
      visitorHash, cleanPath, cleanReferrer, sw
    );
    res.status(202).json({ ok: true });
  } catch (e) {
    console.error('Analytics collect error:', e.message);
    res.status(500).json({ error: 'Failed to record page view' });
  }
});

// Public: collect custom event (no auth, rate-limited)
router.post('/analytics/event', analyticsLimiter, (req, res) => {
  try {
    const { name, props, path: pagePath } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name required' });
    }
    const ip = req.ip || req.connection.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    const visitorHash = hashVisitor(ip, ua);
    const cleanName = name.slice(0, 200);
    const cleanPath = (pagePath && typeof pagePath === 'string') ? pagePath.slice(0, 500) : null;
    const cleanProps = props ? JSON.stringify(props).slice(0, 1000) : null;
    db.prepare('INSERT INTO analytics_events (visitor_hash, name, props, path) VALUES (?, ?, ?, ?)').run(
      visitorHash, cleanName, cleanProps, cleanPath
    );
    res.status(202).json({ ok: true });
  } catch (e) {
    console.error('Analytics event error:', e.message);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

module.exports = router;
