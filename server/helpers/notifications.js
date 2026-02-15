const db = require('../db');

const TELEGRAM_CHAT_ID = '1104423387';
let _telegramBotToken = null;

function getTelegramBotToken() {
  if (_telegramBotToken) return _telegramBotToken;
  try {
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('/root/.openclaw/openclaw.json', 'utf8'));
    _telegramBotToken = config.channels.telegram.botToken;
    return _telegramBotToken;
  } catch {
    return null;
  }
}

async function sendTelegramAlert(message) {
  const token = getTelegramBotToken();
  if (!token) return;
  try {
    const https = require('https');
    const data = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' });
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => { res.on('data', () => {}); res.on('end', resolve); });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  } catch (err) {
    console.error('Telegram alert failed:', err.message);
  }
}

function checkAndNotifyLowStock(productId) {
  try {
    const product = db.prepare('SELECT id, name, stock, low_stock_threshold FROM products WHERE id = ?').get(productId);
    if (!product) return;
    const threshold = product.low_stock_threshold || 10;
    if (product.stock > threshold) return;

    // Dedup: check if a low-stock notification was already sent in last 24h
    const recent = db.prepare(`
      SELECT id FROM notifications
      WHERE type = 'low_stock' AND message LIKE ? AND created_at > datetime('now', '-24 hours')
      LIMIT 1
    `).get(`%Product #${product.id}%`);
    if (recent) return;

    // Notify all admins
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
    const insertNotif = db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)');
    for (const admin of admins) {
      insertNotif.run(
        admin.id,
        'low_stock',
        'Low Stock Alert',
        `Product #${product.id} "${product.name}" has ${product.stock} units left (threshold: ${threshold})`
      );
    }
  } catch (e) {
    console.error('Low stock notification error:', e.message);
  }
}

module.exports = { getTelegramBotToken, sendTelegramAlert, checkAndNotifyLowStock, TELEGRAM_CHAT_ID };
