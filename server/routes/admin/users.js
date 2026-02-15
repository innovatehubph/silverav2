const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../../db');
const { auth, adminOnly } = require('../../middleware/auth');
const { validateEmail } = require('../../helpers/validators');
const emailService = require('../../services/email-service');

// Get all users (admin)
router.get('/admin/users', auth, adminOnly, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.email, u.name, u.phone, u.role, u.is_active, u.created_at,
             (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as orders_count
      FROM users u
      ORDER BY u.created_at DESC
    `).all();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user with orders and addresses (admin)
router.get('/admin/users/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = db.prepare(`
      SELECT id, email, name, phone, role, is_active, created_at
      FROM users WHERE id = ?
    `).get(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's orders
    const orders = db.prepare(`
      SELECT id, status, total, payment_status, payment_method, created_at
      FROM orders WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(id);

    // Get user's addresses
    const addresses = db.prepare(`
      SELECT id, label, name, phone, region, province, municipality, barangay,
             street_address, zip_code, is_default
      FROM addresses WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(id);

    res.json({ ...user, orders, addresses });
  } catch (e) {
    console.error('Get user error:', e.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user details (admin)
router.put('/admin/users/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { name, email, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Check if email already exists for another user
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.toLowerCase().trim(), id);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use by another user' });
    }

    db.prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?')
      .run(name.trim(), email.toLowerCase().trim(), (phone || '').trim(), id);

    const updatedUser = db.prepare('SELECT id, email, name, phone, role, is_active, created_at FROM users WHERE id = ?').get(id);
    res.json(updatedUser);
  } catch (e) {
    console.error('Update user error:', e.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Change user role (admin)
router.put('/admin/users/:id/role', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { role } = req.body;
    if (!['customer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "customer" or "admin"' });
    }

    // Prevent changing own role (safety)
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);

    const updatedUser = db.prepare('SELECT id, email, name, phone, role, is_active, created_at FROM users WHERE id = ?').get(id);
    res.json(updatedUser);
  } catch (e) {
    console.error('Change role error:', e.message);
    res.status(500).json({ error: 'Failed to change user role' });
  }
});

// Enable/Disable user account (admin)
router.put('/admin/users/:id/status', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { is_active } = req.body;
    if (typeof is_active !== 'boolean' && ![0, 1].includes(is_active)) {
      return res.status(400).json({ error: 'is_active must be boolean' });
    }

    // Prevent disabling own account
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot disable your own account' });
    }

    const activeValue = is_active ? 1 : 0;
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(activeValue, id);

    const updatedUser = db.prepare('SELECT id, email, name, phone, role, is_active, created_at FROM users WHERE id = ?').get(id);
    res.json(updatedUser);
  } catch (e) {
    console.error('Update status error:', e.message);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Reset user password (admin) - generates temporary password
router.post('/admin/users/:id/reset-password', auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex'); // 16 char password
    const hashedPassword = bcrypt.hashSync(tempPassword, 10);

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);

    // Optionally send email with new password
    try {
      await emailService.sendOTP(user.email, {
        recipientName: user.name || 'User',
        otp: tempPassword,
        purpose: 'password_reset_admin',
        expiryMinutes: 60
      });
      console.log(`✅ Password reset email sent to ${user.email}`);
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr.message);
    }

    res.json({
      success: true,
      message: 'Password has been reset. The new temporary password was sent to the user\'s email.',
    });
  } catch (e) {
    console.error('Reset password error:', e.message);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Delete user (admin) - soft delete by deactivating, or hard delete
router.delete('/admin/users/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Prevent deleting own account
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for hard_delete query param
    const hardDelete = req.query.hard === 'true';

    if (hardDelete) {
      // Hard delete - remove user and related data
      db.prepare('DELETE FROM cart WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM wishlist WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM addresses WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM notifications WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM reviews WHERE user_id = ?').run(id);
      // Keep orders for audit trail but unlink user
      db.prepare('UPDATE orders SET user_id = NULL WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);

      res.json({ success: true, message: 'User permanently deleted' });
    } else {
      // Soft delete - just deactivate
      db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
      res.json({ success: true, message: 'User account deactivated' });
    }
  } catch (e) {
    console.error('Delete user error:', e.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
