const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('../../services/emailService');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      const user = await User.findOne({ email, deletedAt: null })
        .populate('roleId')
        .populate('statusId');
      
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const expiresIn = '24h';
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn }
      );

      const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
  }

  async checkStatus(req, res) {
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
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email, deletedAt: null });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found with this email' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000);
      
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpiry = resetTokenExpiry;
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL}/?token=${resetToken}`;
      await sendPasswordResetEmail(email, resetUrl);

      res.json({ message: 'Password reset email sent successfully' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Failed to send reset email' });
    }
  }

  async resetPassword(req, res) {
    try {
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
  }
}

module.exports = new AuthController();
