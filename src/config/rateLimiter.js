const rateLimit = require('express-rate-limit');

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  keyGenerator: (req, res) => {
    return req.user?.userId || rateLimit.ipKeyGenerator(req, res);
  },
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { publicLimiter, userLimiter };
