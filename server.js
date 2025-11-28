const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
process.env.TZ = 'Asia/Kolkata';


// Import middleware
const apiKeyAuth = require('./middleware/apiKeyAuth');

// Import routes at top
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const leadSourceRoutes = require('./routes/leadSources');
const projectHouseTypeRoutes = require('./routes/projectAndHouseTypes');
const leadRoutes = require('./routes/leads');
const dashboardRoutes = require('./routes/dashboard');
const callLogRoutes = require('./routes/callLogs');
const activityLogRoutes = require('./routes/activityLogs');
const leadActivityRoutes = require('./routes/leadActivities');
const metaRoutes = require('./routes/meta');
const { startTokenScheduler } = require('./utils/tokenScheduler');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000','https://crm.reminiscent.in'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting - user-based for authenticated routes, IP-based for public routes
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50000, // Very high limit for shared networks
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Per user limit
  keyGenerator: (req, res) => {
    // Use user ID if authenticated, otherwise fall back to IP with IPv6 support
    return req.user?.userId || rateLimit.ipKeyGenerator(req, res);
  },
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply public limiter to auth routes, user limiter to authenticated routes
app.use('/api/auth', publicLimiter);
app.use('/api', userLimiter);

// API Key protection for all routes except health check, document serving, and webhooks
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path.startsWith('/leads/document/') || req.path.startsWith('/leads/webhook/')) {
    return next();
  }
  apiKeyAuth(req, res, next);
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Start token scheduler after DB connection
    // startTokenScheduler();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/lead-sources', leadSourceRoutes);
app.use('/api/project-house-types', projectHouseTypeRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/call-logs', callLogRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/lead-activities', leadActivityRoutes);
app.use('/api/meta', metaRoutes);

// For Vercel deployment
module.exports = app;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}