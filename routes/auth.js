const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const crypto = require('crypto');
const { successResponse, errorResponse } = require('../utils/response');
const router = express.Router();

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email, password } = req.body;
    
    const user = await User.findOne({ email, deletedAt: null })
      .populate('roleId')
      .populate('statusId');
    
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // if (user.statusId.slug !== 'active') {
    //   return errorResponse(res, 'Account is not active', 401);
    // }

    const expiresIn = '24h';
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return successResponse(res, {
      token,
      expiresAt: expiryTime.getTime(),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.roleId.slug,
        status: user.statusId.slug
      }
    }, 'Login successful');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Check user status
router.get('/status', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return errorResponse(res, 'No token provided', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .populate('statusId')
      .populate('roleId');

    if (!user || user.deletedAt) {
      return errorResponse(res, 'User not found', 401);
    }

    if (!user.statusId) {
      return errorResponse(res, 'User status not found', 500);
    }

    const isActive = user.statusId.slug === 'active';
    
    return successResponse(res, {
      isActive,
      status: user.statusId.slug,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.roleId?.slug || 'unknown',
        status: user.statusId.slug
      }
    }, 'Status retrieved successfully');
  } catch (error) {
    console.error('Status check error:', error);
    return errorResponse(res, 'Invalid token', 401);
  }
});

// Forgot password
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email } = req.body;
    const { sendPasswordResetEmail } = require('../utils/emailService');
    const user = await User.findOne({ email, deletedAt: null });
    
    if (!user) {
      return errorResponse(res, 'User not found with this email', 404);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000);
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    await sendPasswordResetEmail(email, resetToken);

    return successResponse(res, null, 'Password reset email sent successfully');
  } catch (error) {
    console.error('Forgot password error:', error);
    return errorResponse(res, 'Failed to send reset email', 500);
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
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() },
      deletedAt: null
    });
    
    if (!user) {
      return errorResponse(res, 'Invalid or expired reset token', 400);
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    return successResponse(res, null, 'Password reset successfully');
  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponse(res, 'Failed to reset password', 500);
  }
});

// Send OTP for password reset
router.post('/forgot-password-otp', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email } = req.body;
    const { sendPasswordResetOTP } = require('../utils/emailService');
    const user = await User.findOne({ email, deletedAt: null });
    
    if (!user) {
      return errorResponse(res, 'User not found with this email', 404);
    }

    const otp = Math.floor(1000 + Math.random() * 9999).toString();
    const otpExpiry = new Date(Date.now() + 600000); // 10 minutes
    
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = otpExpiry;
    await user.save();

    await sendPasswordResetOTP(email, otp);

    return successResponse(res, null, 'OTP sent successfully to your email');
  } catch (error) {
    console.error('Send OTP error:', error);
    return errorResponse(res, 'Failed to send OTP', 500);
  }
});

// Verify OTP
router.post('/verify-otp', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('otp').isLength({ min: 4, max: 4 }).withMessage('OTP must be 4 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email, otp } = req.body;
    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpiry: { $gt: new Date() },
      deletedAt: null
    });
    
    if (!user) {
      return errorResponse(res, 'Invalid or expired OTP', 400);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 600000); // 10 minutes
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    return successResponse(res, { token: resetToken }, 'OTP verified successfully');
  } catch (error) {
    console.error('Verify OTP error:', error);
    return errorResponse(res, 'Failed to verify OTP', 500);
  }
});

// Reset password with token
router.post('/reset-password-with-token', [
  body('token').notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() },
      deletedAt: null
    });
    
    if (!user) {
      return errorResponse(res, 'Invalid or expired token', 400);
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpiry = undefined;
    await user.save();

    return successResponse(res, null, 'Password reset successfully');
  } catch (error) {
    console.error('Reset password with token error:', error);
    return errorResponse(res, 'Failed to reset password', 500);
  }
});

module.exports = router;
