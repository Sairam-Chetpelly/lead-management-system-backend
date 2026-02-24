const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const crypto = require('crypto');
const { successResponse, errorResponse } = require('../utils/response');

exports.login = async (req, res) => {
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
};

exports.checkStatus = async (req, res) => {
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
};

exports.forgotPassword = async (req, res) => {
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
};

exports.resetPassword = async (req, res) => {
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
};

exports.sendOTP = async (req, res) => {
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
    const otpExpiry = new Date(Date.now() + 600000);
    
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = otpExpiry;
    await user.save();

    await sendPasswordResetOTP(email, otp);

    return successResponse(res, null, 'OTP sent successfully to your email');
  } catch (error) {
    console.error('Send OTP error:', error);
    return errorResponse(res, 'Failed to send OTP', 500);
  }
};

exports.verifyOTP = async (req, res) => {
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
    const resetTokenExpiry = new Date(Date.now() + 600000);
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    return successResponse(res, { token: resetToken }, 'OTP verified successfully');
  } catch (error) {
    console.error('Verify OTP error:', error);
    return errorResponse(res, 'Failed to verify OTP', 500);
  }
};

exports.resetPasswordWithToken = async (req, res) => {
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
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpiry = null;
    await user.save();

    return successResponse(res, null, 'Password reset successfully');
  } catch (error) {
    console.error('Reset password with token error:', error);
    return errorResponse(res, 'Failed to reset password', 500);
  }
};
