const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// Dashboard routes
router.get('/', authenticateToken, dashboardController.getDashboard);
router.get('/export', authenticateToken, dashboardController.exportDashboard);
router.get('/sources', authenticateToken, dashboardController.getSources);
router.get('/centres', authenticateToken, dashboardController.getCentres);
router.get('/users/:type', authenticateToken, dashboardController.getUsersByType);

module.exports = router;
