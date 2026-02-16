const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const { sendPasswordResetEmail } = require('../../utils/emailService');


class AuthService {
  async login(email, password) {
    const user = await User.findOne({ email, deletedAt: null })
      .populate('roleId')
      .populate('statusId');

    if (!user || !(await user.comparePassword(password))) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      token,
      expiresAt: expiryTime.getTime(),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.roleId.slug,
        status: user.statusId.slug
      }
    };
  }

  async forgotPassword(email) {
    const crypto = require('crypto');

    const user = await User.findOne({ email, deletedAt: null });
    if (!user) {
      throw { statusCode: 404, message: 'User not found with this email' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    await sendPasswordResetEmail(email, resetToken);

    return { message: 'Password reset email sent successfully' };
  }

  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() },
      deletedAt: null
    });

    if (!user) {
      throw { statusCode: 400, message: 'Invalid or expired reset token' };
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    return { message: 'Password reset successfully' };
  }

  async checkStatus(token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .populate('statusId')
      .populate('roleId');

    if (!user || user.deletedAt) {
      throw { statusCode: 401, message: 'User not found' };
    }

    if (!user.statusId) {
      throw { statusCode: 500, message: 'User status not found' };
    }

    const isActive = user.statusId.slug === 'active';
    
    return {
      isActive,
      status: user.statusId.slug,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.roleId?.slug || 'unknown',
        status: user.statusId.slug
      }
    };
  }
}

module.exports = new AuthService();
