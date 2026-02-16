const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const activityLogController = require('../../controllers/v1/activityLogController');

router.get('/', authenticateToken, activityLogController.getAll);

module.exports = router;
