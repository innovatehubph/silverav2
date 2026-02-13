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
   * Send order confirmation email
   */
  async sendOrderConfirmation(emailAddress, orderData) {
    try {
      if (!this.initialized) {
        console.warn('⚠️  Email service not initialized, skipping order confirmation email');
        return { success: true, message: 'Order confirmation email skipped (email service not ready)' };
      }

      const {
        customerName,
        orderNumber,
        orderDate,
        total,
        items = [],
        shippingAddress = {},
        paymentMethod = 'NexusPay'
      } = orderData;

      const itemsHtml = items.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₱${item.price.toFixed(2)}</td>
        </tr>
      `).join('');

      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 10px; }
        .header .checkmark { font-size: 48px; margin-bottom: 10px; }
        .content { padding: 30px 20px; }
        .greeting { font-size: 16px; color: #333; margin-bottom: 20px; }
        .order-info { background: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .order-info-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 14px; }
        .order-info-label { color: #666; }
        .order-info-value { font-weight: 600; color: #333; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background: #f9f9f9; padding: 10px; text-align: left; font-size: 12px; color: #666; text-transform: uppercase; border-bottom: 2px solid #eee; }
        .items-table td { padding: 10px; border-bottom: 1px solid #eee; font-size: 14px; }
        .total-row { background: #f0f0f0; font-weight: bold; font-size: 16px; }
        .shipping-info { background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 14px; }
        .shipping-info h3 { font-size: 16px; margin-bottom: 10px; color: #333; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        .footer-text { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="checkmark">✓</div>
            <h1>Order Confirmed!</h1>
            <p>Thank you for your purchase</p>
        </div>

        <div class="content">
            <div class="greeting">Hi ${customerName},</div>

            <p style="color: #666; margin-bottom: 20px; line-height: 1.6;">
                Thank you for shopping with Silvera! Your order has been confirmed and we're preparing it for shipment.
                You'll receive a shipping confirmation email once your order is on its way.
            </p>

            <div class="order-info">
                <div class="order-info-row">
                    <span class="order-info-label">Order Number:</span>
                    <span class="order-info-value">#${orderNumber}</span>
                </div>
                <div class="order-info-row">
                    <span class="order-info-label">Order Date:</span>
                    <span class="order-info-value">${orderDate}</span>
                </div>
                <div class="order-info-row">
                    <span class="order-info-label">Payment Method:</span>
                    <span class="order-info-value">${paymentMethod}</span>
                </div>
            </div>

            <h3 style="font-size: 18px; margin: 30px 0 15px 0; color: #333;">Order Details</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th style="text-align: center;">Quantity</th>
                        <th style="text-align: right;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                    <tr class="total-row">
                        <td colspan="2" style="padding: 15px;">Total</td>
                        <td style="padding: 15px; text-align: right;">₱${total.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="shipping-info">
                <h3>Shipping Address</h3>
                <p style="color: #666; line-height: 1.6;">
                    ${shippingAddress.street || ''}<br>
                    ${shippingAddress.city || ''}, ${shippingAddress.province || ''} ${shippingAddress.zipCode || ''}<br>
                    ${shippingAddress.country || 'Philippines'}
                </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="https://silvera.innoserver.cloud/orders/${orderNumber}" class="button">View Order Details</a>
            </div>

            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                Questions about your order? Contact us at <a href="mailto:support@silvera.ph" style="color: #667eea;">support@silvera.ph</a>
                or visit our help center.
            </p>
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

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@silvera.ph',
        to: emailAddress,
        subject: `Order Confirmation #${orderNumber} - Silvera`,
        html: htmlContent,
        text: `Order #${orderNumber} confirmed. Total: ₱${total.toFixed(2)}. Thank you for shopping with Silvera!`
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Order confirmation email sent to ${emailAddress} (Order: ${orderNumber})`);
      return {
        success: true,
        message: 'Order confirmation email sent successfully',
        messageId: result.messageId
      };
    } catch (error) {
      console.error(`❌ Failed to send order confirmation email to ${emailAddress}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send shipping update email
   */
  async sendShippingUpdate(emailAddress, orderData) {
    try {
      if (!this.initialized) {
        console.warn('⚠️  Email service not initialized, skipping shipping update email');
        return { success: true, message: 'Shipping update email skipped (email service not ready)' };
      }

      const {
        customerName,
        orderNumber,
        trackingNumber,
        carrier,
        estimatedDelivery
      } = orderData;

      // Philippine carrier tracking URLs
      const carrierLinks = {
        'lbc': `https://www.lbcexpress.com/track/?tracking_no=${trackingNumber}`,
        'j&t': `https://www.jtexpress.ph/trajectoryQuery?waybillNo=${trackingNumber}`,
        'jnt': `https://www.jtexpress.ph/trajectoryQuery?waybillNo=${trackingNumber}`,
        'j&t express': `https://www.jtexpress.ph/trajectoryQuery?waybillNo=${trackingNumber}`,
        'flash express': `https://www.flashexpress.ph/fle/tracking?se=${trackingNumber}`,
        'ninja van': `https://www.ninjavan.co/en-ph/tracking?id=${trackingNumber}`,
        'ninjavan': `https://www.ninjavan.co/en-ph/tracking?id=${trackingNumber}`,
        'grab express': `https://www.grab.com/ph/express/`,
      };

      const carrierKey = (carrier || '').toLowerCase();
      const trackingUrl = carrierLinks[carrierKey] || null;

      const trackingSection = trackingNumber ? `
            <div style="background: #f0f4ff; border: 2px dashed #667eea; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
                <p style="color: #666; font-size: 14px; margin-bottom: 8px;">Tracking Number</p>
                <p style="font-size: 22px; font-weight: bold; color: #333; letter-spacing: 2px; font-family: 'Courier New', monospace;">${trackingNumber}</p>
                ${carrier ? `<p style="color: #666; font-size: 14px; margin-top: 8px;">Carrier: <strong>${carrier}</strong></p>` : ''}
                ${trackingUrl ? `
                <a href="${trackingUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 15px;">Track Your Order</a>
                ` : ''}
            </div>` : '';

      const estimatedSection = estimatedDelivery ? `
            <p style="color: #666; font-size: 14px; margin-top: 15px;">
                Estimated delivery: <strong>${estimatedDelivery}</strong>
            </p>` : '';

      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Order Has Been Shipped</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 10px; }
        .header .icon { font-size: 48px; margin-bottom: 10px; }
        .content { padding: 30px 20px; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        .footer-text { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">📦</div>
            <h1>Your Order Has Been Shipped!</h1>
            <p>Order #${orderNumber}</p>
        </div>

        <div class="content">
            <div style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello ${customerName || 'Valued Customer'},</div>

            <p style="color: #666; margin-bottom: 20px; line-height: 1.6;">
                Great news! Your order <strong>#${orderNumber}</strong> has been shipped and is on its way to you.
            </p>

            ${trackingSection}
            ${estimatedSection}

            <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 25px 0;">
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                    <strong>What's next?</strong><br>
                    You'll receive another email when your order has been delivered. You can also check your order status anytime in your Silvera account.
                </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="https://silvera.innoserver.cloud/orders/${orderNumber}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order Details</a>
            </div>

            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Questions about your delivery? Contact us at <a href="mailto:support@silvera.ph" style="color: #667eea;">support@silvera.ph</a>
            </p>
        </div>

        <div class="footer">
            <div class="footer-text">&copy; ${new Date().getFullYear()} Silvera E-Commerce Platform. All rights reserved.</div>
            <div class="footer-text">This is an automated email. Please do not reply to this address.</div>
            <div class="footer-text">Need help? Contact us at support@silvera.ph</div>
        </div>
    </div>
</body>
</html>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@silvera.ph',
        to: emailAddress,
        subject: `Your Order #${orderNumber} Has Been Shipped - Silvera`,
        html: htmlContent,
        text: `Your order #${orderNumber} has been shipped!${trackingNumber ? ` Tracking: ${carrier ? carrier + ' ' : ''}${trackingNumber}` : ''}`
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Shipping update email sent to ${emailAddress} (Order: ${orderNumber})`);
      return {
        success: true,
        message: 'Shipping update email sent successfully',
        messageId: result.messageId
      };
    } catch (error) {
      console.error(`❌ Failed to send shipping update email to ${emailAddress}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send delivery confirmation email
   */
  async sendDeliveryConfirmation(emailAddress, orderData) {
    try {
      if (!this.initialized) {
        console.warn('⚠️  Email service not initialized, skipping delivery confirmation email');
        return { success: true, message: 'Delivery confirmation email skipped (email service not ready)' };
      }

      const {
        customerName,
        orderNumber,
        deliveryDate
      } = orderData;

      const formattedDate = deliveryDate || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Order Has Been Delivered</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 10px; }
        .header .icon { font-size: 48px; margin-bottom: 10px; }
        .content { padding: 30px 20px; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        .footer-text { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">✅</div>
            <h1>Order Delivered!</h1>
            <p>Order #${orderNumber}</p>
        </div>

        <div class="content">
            <div style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello ${customerName || 'Valued Customer'},</div>

            <p style="color: #666; margin-bottom: 20px; line-height: 1.6;">
                Your order <strong>#${orderNumber}</strong> has been delivered on <strong>${formattedDate}</strong>.
                We hope you love your purchase!
            </p>

            <div style="background: #f0fff0; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
                <p style="font-size: 16px; color: #155724; font-weight: 600; margin-bottom: 10px;">How was your experience?</p>
                <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Your feedback helps us improve and helps other shoppers make great choices.</p>
                <a href="https://silvera.innoserver.cloud/orders/${orderNumber}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Leave a Review</a>
            </div>

            <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 25px 0;">
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                    <strong>Not what you expected?</strong><br>
                    If there's any issue with your order, you can request a return or exchange from your order details page within our return policy period.
                </p>
            </div>

            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                Thank you for shopping with Silvera! We look forward to serving you again.
            </p>
        </div>

        <div class="footer">
            <div class="footer-text">&copy; ${new Date().getFullYear()} Silvera E-Commerce Platform. All rights reserved.</div>
            <div class="footer-text">This is an automated email. Please do not reply to this address.</div>
            <div class="footer-text">Need help? Contact us at support@silvera.ph</div>
        </div>
    </div>
</body>
</html>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@silvera.ph',
        to: emailAddress,
        subject: `Your Order #${orderNumber} Has Been Delivered - Silvera`,
        html: htmlContent,
        text: `Your order #${orderNumber} has been delivered on ${formattedDate}. Thank you for shopping with Silvera!`
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Delivery confirmation email sent to ${emailAddress} (Order: ${orderNumber})`);
      return {
        success: true,
        message: 'Delivery confirmation email sent successfully',
        messageId: result.messageId
      };
    } catch (error) {
      console.error(`❌ Failed to send delivery confirmation email to ${emailAddress}:`, error.message);
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
