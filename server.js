const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes at top
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const setupRoutes = require('./routes/setup');
const adminRoutes = require('./routes/admin');
const leadRoutes = require('./routes/leads');
const leadSourceRoutes = require('./routes/leadSources');
const callLogRoutes = require('./routes/callLogs');
const leadActivityRoutes = require('./routes/leadActivities');
const projectHouseTypeRoutes = require('./routes/projectAndHouseTypes');
const apiIntegrationRoutes = require('./routes/apiIntegration');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/lead-sources', leadSourceRoutes);
app.use('/api/call-logs', callLogRoutes);
app.use('/api/lead-activities', leadActivityRoutes);
app.use('/api/project-house-types', projectHouseTypeRoutes);
app.use('/api/integration', apiIntegrationRoutes);

const PORT = process.env.PORT || 5000;
try {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}