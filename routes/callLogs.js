const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const controller = require('../controllers/callLogController');

const router = express.Router();

router.get('/', authenticateToken, controller.getAll);
router.post('/:id', authenticateToken, controller.createCallLog);
router.get('/:id/recording', authenticateToken, controller.downloadRecording);
router.get('/export', authenticateToken, controller.exportCSV);

module.exports = router;
