const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { auth, JWT_SECRET } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rate-limiters');
const { validateEmail, validatePassword, sanitizeString } = require('../helpers/validators');
const emailService = require('../services/email-service');

router.post('/auth/register', authLimiter, (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // Validate input
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be 6-128 characters' });
    }

    const safeName = sanitizeString(name);
    const safePhone = sanitizeString(phone);

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (email, password, name, phone) VALUES (?, ?, ?, ?)').run(
      email.toLowerCase().trim(), hashedPassword, safeName, safePhone
    );
    const token = jwt.sign({ id: result.lastInsertRowid, email: email.toLowerCase(), role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result.lastInsertRowid, email: email.toLowerCase(), name: safeName, role: 'customer' } });

    // Fire-and-forget welcome email
    emailService.sendWelcome(email.toLowerCase().trim(), safeName).catch(err =>
      console.error('Welcome email failed:', err.message));
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Email already registered' });
    }
    console.error('Register error:', e.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/auth/login', authLimiter, (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Forgot Password - Send OTP to email
router.post('/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email.toLowerCase().trim());

    // Security: Don't reveal if email exists (prevents user enumeration)
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with this email exists, a verification code has been sent.'
      });
    }

    // Generate OTP (6 digits)
    const crypto = require('crypto');
    const otp = crypto.randomInt(100000, 1000000).toString();
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token and OTP in database
    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ?, reset_otp = ? WHERE id = ?')
      .run(resetToken, expiresAt.toISOString(), otp, user.id);

    // Send OTP via email service
    const emailResult = await emailService.sendOTP(user.email, {
      recipientName: user.name || 'Valued Customer',
      otp: otp,
      purpose: 'password_reset',
      expiryMinutes: 15
    });

    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      // Still return success to avoid revealing email issues to users
    }

    res.json({
      success: true,
      message: 'If an account with this email exists, a verification code has been sent.',
      reset_token: resetToken
    });
  } catch (e) {
    console.error('Forgot password error:', e.message);
    res.status(500).json({ error: 'Request failed' });
  }
});

// Verify Reset OTP
router.post('/auth/verify-reset-otp', authLimiter, (req, res) => {
  try {
    const { reset_token, otp } = req.body;

    if (!reset_token || !otp) {
      return res.status(400).json({ error: 'Reset token and OTP required' });
    }

    const user = db.prepare('SELECT id, email, reset_token, reset_token_expires, reset_otp FROM users WHERE reset_token = ?').get(reset_token);

    if (!user) {
      return res.status(404).json({ error: 'Invalid reset token' });
    }

    const expiresAt = new Date(user.reset_token_expires);
    if (expiresAt < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Validate OTP format
    if (otp.length !== 6 || isNaN(otp)) {
      return res.status(400).json({ error: 'Invalid OTP format' });
    }

    // Verify OTP matches stored OTP
    if (otp !== user.reset_otp) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    res.json({
      success: true,
      message: 'OTP verified. You can now reset your password.',
      reset_token: reset_token
    });
  } catch (e) {
    console.error('Verify OTP error:', e.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Reset Password
router.post('/auth/reset-password', authLimiter, (req, res) => {
  try {
    const { reset_token, new_password, confirm_password } = req.body;

    if (!reset_token || !new_password || !confirm_password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (!validatePassword(new_password)) {
      return res.status(400).json({ error: 'Password must be 6-128 characters' });
    }

    const user = db.prepare('SELECT id, email, reset_token, reset_token_expires FROM users WHERE reset_token = ?').get(reset_token);

    if (!user) {
      return res.status(404).json({ error: 'Invalid reset token' });
    }

    const expiresAt = new Date(user.reset_token_expires);
    if (expiresAt < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Update password and clear reset token
    const hashedPassword = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
      .run(hashedPassword, user.id);

    console.log(`[Password Reset] User: ${user.email}`);

    res.json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
      redirect: '/authentication-log-in.html'
    });
  } catch (e) {
    console.error('Reset password error:', e.message);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Setup PIN (during registration or in profile)
router.post('/users/setup-pin', auth, (req, res) => {
  try {
    const { pin, confirm_pin } = req.body;

    if (!pin || !confirm_pin) {
      return res.status(400).json({ error: 'PIN and confirmation required' });
    }

    if (pin !== confirm_pin) {
      return res.status(400).json({ error: 'PINs do not match' });
    }

    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }

    // Hash PIN using bcrypt
    const hashedPin = bcrypt.hashSync(pin, 10);
    const createdAt = new Date().toISOString();

    db.prepare('UPDATE users SET pin = ?, pin_created_at = ? WHERE id = ?')
      .run(hashedPin, createdAt, req.user.id);

    console.log(`[PIN Setup] User: ${req.user.id}`);

    res.json({
      success: true,
      message: 'PIN setup successfully. Use this for secure transactions.'
    });
  } catch (e) {
    console.error('PIN setup error:', e.message);
    res.status(500).json({ error: 'PIN setup failed' });
  }
});

// Change PIN (when logged in)
router.put('/users/change-pin', auth, (req, res) => {
  try {
    const { old_pin, new_pin, confirm_pin } = req.body;

    if (!old_pin || !new_pin || !confirm_pin) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const user = db.prepare('SELECT pin FROM users WHERE id = ?').get(req.user.id);

    if (!user || !user.pin) {
      return res.status(400).json({ error: 'No PIN set up. Please setup PIN first.' });
    }

    if (!bcrypt.compareSync(old_pin, user.pin)) {
      return res.status(401).json({ error: 'Incorrect current PIN' });
    }

    if (new_pin !== confirm_pin) {
      return res.status(400).json({ error: 'New PINs do not match' });
    }

    if (!/^\d{4,6}$/.test(new_pin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }

    const hashedPin = bcrypt.hashSync(new_pin, 10);
    const updatedAt = new Date().toISOString();

    db.prepare('UPDATE users SET pin = ?, pin_created_at = ? WHERE id = ?')
      .run(hashedPin, updatedAt, req.user.id);

    console.log(`[PIN Changed] User: ${req.user.id}`);

    res.json({
      success: true,
      message: 'PIN changed successfully.'
    });
  } catch (e) {
    console.error('Change PIN error:', e.message);
    res.status(500).json({ error: 'PIN change failed' });
  }
});

router.get('/auth/me', auth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, name, phone, role FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/users/profile', auth, (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?')
      .run(name.trim(), (phone || '').trim(), req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = db.prepare('SELECT id, email, name, phone, role FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: updatedUser });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
