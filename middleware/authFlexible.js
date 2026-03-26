const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Flexible auth that accepts token from header or query param
const authenticateTokenFlexible = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const queryToken = req.query.token;
  
  const token = headerToken || queryToken;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    const user = await User.findById(decoded.userId)
      .populate('statusId')
      .populate('roleId');
    
    if (!user || user.deletedAt) {
      return res.status(401).json({ error: 'User not found.' });
    }
    
    req.user = {
      userId: user._id,
      role: user.roleId.slug,
      status: user.statusId.slug,
      name: user.name,
      email: user.email,
      fullUser: user
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token.' });
    }
    return res.status(500).json({ error: 'Authentication error.' });
  }
};

module.exports = { authenticateTokenFlexible };
