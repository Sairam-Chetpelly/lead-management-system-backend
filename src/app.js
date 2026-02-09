const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
process.env.TZ = 'Asia/Kolkata';

const corsOptions = require('./config/cors');
const { publicLimiter, userLimiter } = require('./config/rateLimiter');
const apiKeyAuth = require('./middlewares/apiKeyAuth');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('../routes/admin');
const leadSourceRoutes = require('../routes/leadSources');
const projectHouseTypeRoutes = require('../routes/projectAndHouseTypes');
const leadRoutes = require('../routes/leads');
const dashboardRoutes = require('../routes/dashboard');
const callLogRoutes = require('../routes/callLogs');
const activityLogRoutes = require('../routes/activityLogs');
const leadActivityRoutes = require('../routes/leadActivities');
const metaRoutes = require('../routes/meta');

const app = express();

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting
app.use('/api/auth', publicLimiter);
app.use('/api', userLimiter);

// API Key protection
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path.startsWith('/leads/document/') || req.path.startsWith('/leads/webhook/')) {
    return next();
  }
  apiKeyAuth(req, res, next);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Routes
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

module.exports = app;
