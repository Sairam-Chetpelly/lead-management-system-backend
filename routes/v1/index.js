const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const adminRoutes = require('./adminRoutes');
const activityLogRoutes = require('./activityLogRoutes');
const callLogRoutes = require('./callLogRoutes');
const leadSourceRoutes = require('./leadSourceRoutes');
const projectAndHouseTypeRoutes = require('./projectAndHouseTypeRoutes');
const metaRoutes = require('./metaRoutes');

// Mount v1 routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/call-logs', callLogRoutes);
router.use('/lead-sources', leadSourceRoutes);
router.use('/project-and-house-types', projectAndHouseTypeRoutes);
router.use('/meta', metaRoutes);

module.exports = router;
