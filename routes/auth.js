const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
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

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
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

    res.json({
      isActive: user.statusId.slug === 'active',
      status: user.statusId.slug,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.roleId.slug,
        status: user.statusId.slug
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;