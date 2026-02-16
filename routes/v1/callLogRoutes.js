const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const callLogController = require('../../controllers/v1/callLogController');

router.get('/', authenticateToken, callLogController.getAll);

module.exports = router;
