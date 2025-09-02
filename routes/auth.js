const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = express.Router();

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    const user = await User.findOne({ email, deletedAt: null })
      .populate('roleId')
      .populate('statusId');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.statusId.slug !== 'active') {
      return res.status(401).json({ error: 'Account is not active' });
    }

    const expiresIn = '24h';
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    res.json({
      token,
      expiresAt: expiryTime.getTime(),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.roleId.slug,
        status: user.statusId.slug
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check user status
router.get('/status', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .populate('statusId')
      .populate('roleId');

    if (!user || user.deletedAt) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Ensure statusId is populated
    if (!user.statusId) {
      return res.status(500).json({ error: 'User status not found' });
    }

    const isActive = user.statusId.slug === 'active';
    
    res.json({
      isActive,
      status: user.statusId.slug,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.roleId?.slug || 'unknown',
        status: user.statusId.slug
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Forgot password
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email, deletedAt: null });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found with this email' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const resetUrl = `${process.env.FRONTEND_URL}/?token=${resetToken}`;
    console.log('Reset URL:', resetUrl); // For debugging
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Request</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
            <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0f172a;">
              <h1 style="color: #0f172a; margin: 0; font-size: 24px;">Password Reset Request</h1>
            </div>
            
            <div style="padding: 30px 20px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hello,</p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                We received a request to reset your password for your account. If you made this request, please click the button below to reset your password:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Reset My Password</a>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.5;">
                  <strong>Security Notice:</strong> This link will expire in 1 hour for your security. If you don't reset your password within this time, you'll need to request a new reset link.
                </p>
              </div>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
                If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
              </p>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                If you're having trouble clicking the button, copy and paste the following link into your browser:
                <br><span style="color: #0f172a; word-break: break-all;">${resetUrl}</span>
              </p>
            </div>
            
            <div style="border-top: 1px solid #e9ecef; padding: 20px; text-align: center;">
              <p style="color: #666666; font-size: 12px; margin: 0;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    

    res.json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// Reset password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() },
      deletedAt: null
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;