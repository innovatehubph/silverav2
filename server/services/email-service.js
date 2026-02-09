/**
 * Email Service for Silvera V2
 * Handles OTP and password reset emails using Nodemailer
 * Based on PayVerse and BTS Delivery implementations
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initializeTransporter();
  }

  /**
   * Initialize Nodemailer transporter
   * Uses environment variables or defaults to test configuration
   */
  initializeTransporter() {
    try {
      // Read from environment or use default SMTP settings
      const smtpConfig = {
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE !== 'false', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || 'noreply@innovatehub.ph',
          pass: process.env.SMTP_PASSWORD || ''
        }
      };

      this.transporter = nodemailer.createTransport(smtpConfig);

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email service connection failed:', error.message);
          this.initialized = false;
        } else {
          console.log('✅ Email service ready');
          this.initialized = true;
        }
      });
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Generate OTP email HTML template
   */
  generateOtpTemplate(data) {
    const {
      recipientName,
      otp,
      purpose,
      expiryMinutes = 15
    } = data;

    const purposeText = {
      verification: 'Verify Your Email',
      password_reset: 'Reset Your Password',
      login: 'Confirm Your Login',
      pin_change: 'Confirm PIN Change',
      address_verification: 'Verify Your Address'
    };

    const purposeDescription = {
      verification: 'Please use this code to verify your email address',
      password_reset: 'Use this code to reset your password',
      login: 'Use this code to complete your login',
      pin_change: 'Use this code to change your PIN',
      address_verification: 'Use this code to verify your address'
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${purposeText[purpose] || 'OTP Verification'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 10px; }
        .content { padding: 30px 20px; }
        .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
        .description { color: #666; margin-bottom: 30px; line-height: 1.6; }
        .otp-section { text-align: center; margin: 30px 0; }
        .otp-code {
            font-family: 'Courier New', monospace;
            font-size: 48px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #764ba2;
            background: #f0f0f0;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            word-break: break-all;
        }
        .expiry {
            color: #ff6b6b;
            font-size: 14px;
            margin-top: 15px;
            font-weight: 600;
        }
        .security-note {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 25px 0;
            border-radius: 4px;
            font-size: 13px;
            color: #664d03;
            line-height: 1.6;
        }
        .footer {
            background: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
        }
        .footer-text { margin: 5px 0; }
        .divider { height: 1px; background: #eee; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${purposeText[purpose] || 'OTP Verification'}</h1>
            <p>Silvera E-Commerce Platform</p>
        </div>

        <div class="content">
            <div class="greeting">Hello ${recipientName || 'Valued Customer'},</div>

            <p class="description">
                ${purposeDescription[purpose] || 'Please use the following code to complete your request'}.
                This code will expire in ${expiryMinutes} minutes.
            </p>

            <div class="otp-section">
                <p style="color: #666; font-size: 14px; margin-bottom: 10px;">Your Verification Code:</p>
                <div class="otp-code">${otp}</div>
                <div class="expiry">⏱️ Valid for ${expiryMinutes} minutes</div>
            </div>

            <div class="security-note">
                <strong>🔒 Security Reminder:</strong>
                <ul style="margin: 10px 0 0 20px; padding: 0;">
                    <li>Never share this code with anyone</li>
                    <li>Silvera staff will never ask for your OTP</li>
                    <li>This code is valid for one-time use only</li>
                </ul>
            </div>

            <div style="margin-top: 30px; font-size: 14px; color: #666; line-height: 1.6;">
                <p>If you didn't request this code, please ignore this email or contact our support team.</p>
            </div>
        </div>

        <div class="footer">
            <div class="footer-text">© ${new Date().getFullYear()} Silvera E-Commerce Platform. All rights reserved.</div>
            <div class="footer-text">This is an automated email. Please do not reply to this address.</div>
            <div class="footer-text">Need help? Contact us at support@silvera.ph</div>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate password reset email template
   */
  generatePasswordResetTemplate(data) {
    const {
      recipientName,
      resetLink,
      expiryHours = 1
    } = data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 10px; }
        .content { padding: 30px 20px; }
        .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
        .description { color: #666; margin-bottom: 30px; line-height: 1.6; }
        .action-section { text-align: center; margin: 30px 0; }
        .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .reset-button:hover { opacity: 0.9; }
        .alt-link {
            margin-top: 20px;
            font-size: 12px;
            color: #999;
        }
        .alt-link a { color: #667eea; text-decoration: none; }
        .expiry {
            color: #ff6b6b;
            font-size: 14px;
            margin-top: 15px;
            font-weight: 600;
        }
        .security-note {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 25px 0;
            border-radius: 4px;
            font-size: 13px;
            color: #664d03;
            line-height: 1.6;
        }
        .footer {
            background: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
        }
        .footer-text { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reset Your Password</h1>
            <p>Silvera E-Commerce Platform</p>
        </div>

        <div class="content">
            <div class="greeting">Hello ${recipientName || 'Valued Customer'},</div>

            <p class="description">
                We received a request to reset your password. Click the button below to create a new password.
                This link will expire in ${expiryHours} hour${expiryHours !== 1 ? 's' : ''}.
            </p>

            <div class="action-section">
                <a href="${resetLink}" class="reset-button">Reset Password</a>
                <div class="expiry">⏱️ Link expires in ${expiryHours} hour${expiryHours !== 1 ? 's' : ''}</div>
                <div class="alt-link">
                    If the button doesn't work, copy and paste this link in your browser:<br>
                    <a href="${resetLink}">${resetLink}</a>
                </div>
            </div>

            <div class="security-note">
                <strong>🔒 Security Reminder:</strong>
                <ul style="margin: 10px 0 0 20px; padding: 0;">
                    <li>Never share this link with anyone</li>
                    <li>Silvera staff will never ask for your password</li>
                    <li>If you didn't request this, your account may be compromised</li>
                    <li>Change your password immediately if someone else has access</li>
                </ul>
            </div>

            <div style="margin-top: 30px; font-size: 14px; color: #666; line-height: 1.6;">
                <p>If you didn't request this password reset, please ignore this email or contact our support team immediately.</p>
            </div>
        </div>

        <div class="footer">
            <div class="footer-text">© ${new Date().getFullYear()} Silvera E-Commerce Platform. All rights reserved.</div>
            <div class="footer-text">This is an automated email. Please do not reply to this address.</div>
            <div class="footer-text">Need help? Contact us at support@silvera.ph</div>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Send OTP email
   */
  async sendOTP(emailAddress, data) {
    try {
      if (!this.initialized) {
        console.warn('⚠️  Email service not initialized, logging OTP instead');
        console.log(`[OTP-EMAIL] To: ${emailAddress}, OTP: ${data.otp}, Purpose: ${data.purpose}`);
        return { success: true, message: 'OTP logged (email service not ready)' };
      }

      const htmlContent = this.generateOtpTemplate(data);

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@silvera.ph',
        to: emailAddress,
        subject: `Your ${data.purpose === 'password_reset' ? 'Password Reset' : 'Verification'} Code - Silvera`,
        html: htmlContent,
        text: `Your OTP code is: ${data.otp}. Valid for ${data.expiryMinutes || 15} minutes.`
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`✅ OTP email sent to ${emailAddress} (Message ID: ${result.messageId})`);
      return {
        success: true,
        message: 'OTP sent successfully',
        messageId: result.messageId
      };
    } catch (error) {
      console.error(`❌ Failed to send OTP email to ${emailAddress}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(emailAddress, data) {
    try {
      if (!this.initialized) {
        console.warn('⚠️  Email service not initialized, logging reset link instead');
        console.log(`[PASSWORD-RESET-EMAIL] To: ${emailAddress}, Link: ${data.resetLink}`);
        return { success: true, message: 'Reset link logged (email service not ready)' };
      }

      const htmlContent = this.generatePasswordResetTemplate(data);

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@silvera.ph',
        to: emailAddress,
        subject: 'Password Reset Request - Silvera',
        html: htmlContent,
        text: `Click here to reset your password: ${data.resetLink}`
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Password reset email sent to ${emailAddress} (Message ID: ${result.messageId})`);
      return {
        success: true,
        message: 'Password reset email sent successfully',
        messageId: result.messageId
      };
    } catch (error) {
      console.error(`❌ Failed to send password reset email to ${emailAddress}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcome(emailAddress, userName) {
    try {
      if (!this.initialized) {
        console.warn('⚠️  Email service not initialized, skipping welcome email');
        return { success: true, message: 'Welcome email skipped (email service not ready)' };
      }

      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Silvera</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px;">
        <h1 style="color: #667eea; margin-bottom: 20px;">Welcome to Silvera! 🎉</h1>
        <p>Hi ${userName},</p>
        <p>Your account has been successfully created. Start shopping now and enjoy exclusive deals!</p>
        <p style="margin-top: 30px; color: #999; font-size: 12px;">
            © ${new Date().getFullYear()} Silvera E-Commerce. All rights reserved.
        </p>
    </div>
</body>
</html>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@silvera.ph',
        to: emailAddress,
        subject: 'Welcome to Silvera!',
        html: htmlContent,
        text: `Welcome to Silvera, ${userName}! Start shopping now.`
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Welcome email sent to ${emailAddress}`);
      return {
        success: true,
        message: 'Welcome email sent successfully',
        messageId: result.messageId
      };
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${emailAddress}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if email service is ready
   */
  isReady() {
    return this.initialized;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      smtpHost: process.env.SMTP_HOST || 'smtp.hostinger.com',
      fromEmail: process.env.SMTP_FROM || 'noreply@silvera.ph'
    };
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
