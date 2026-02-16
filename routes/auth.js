const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const crypto = require('crypto');
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

    // if (user.statusId.slug !== 'active') {
    //   return res.status(401).json({ error: 'Account is not active' });
    // }

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
    const { sendPasswordResetEmail } = require('../utils/emailService');
    const user = await User.findOne({ email, deletedAt: null });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found with this email' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000);
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    await sendPasswordResetEmail(email, resetToken);

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