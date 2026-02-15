const crypto = require('crypto');
const db = require('../db');

function getAnalyticsSalt() {
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.prepare('SELECT salt FROM analytics_salt WHERE date = ?').get(today);
  if (existing) return existing.salt;
  const salt = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT OR IGNORE INTO analytics_salt (date, salt) VALUES (?, ?)').run(today, salt);
  return salt;
}

function hashVisitor(ip, ua) {
  const salt = getAnalyticsSalt();
  return crypto.createHash('sha256').update(`${ip}${ua}${salt}`).digest('hex').slice(0, 16);
}

function extractReferrerDomain(referrer, host) {
  if (!referrer || typeof referrer !== 'string') return null;
  try {
    const url = new URL(referrer);
    const domain = url.hostname.replace(/^www\./, '');
    // Ignore same-site referrers
    if (host) {
      const hostClean = host.replace(/^www\./, '').split(':')[0];
      if (domain === hostClean) return null;
    }
    return domain;
  } catch {
    return null;
  }
}

function pruneAnalytics() {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('DELETE FROM analytics_page_views WHERE created_at < ?').run(cutoff);
    db.prepare('DELETE FROM analytics_events WHERE created_at < ?').run(cutoff);
    db.prepare('DELETE FROM analytics_salt WHERE date < ?').run(cutoff.slice(0, 10));
  } catch (e) {
    console.error('Analytics prune error:', e.message);
  }
}

// Prune old analytics on startup + every 24 hours
pruneAnalytics();
setInterval(pruneAnalytics, 24 * 60 * 60 * 1000);

module.exports = { getAnalyticsSalt, hashVisitor, extractReferrerDomain, pruneAnalytics };
