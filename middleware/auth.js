const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Check if user exists and is active
    const user = await User.findById(decoded.userId)
      .populate('statusId')
      .populate('roleId');
    
    if (!user || user.deletedAt) {
      return res.status(401).json({ error: 'User not found.' });
    }
    
    if (user.statusId.slug !== 'active') {
      return res.status(403).json({ error: 'Account is inactive. Access denied.' });
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

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    
    next();
  };
};

module.exports = { authenticateToken, checkRole };