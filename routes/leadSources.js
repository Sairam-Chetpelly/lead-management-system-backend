const express = require('express');
const router = express.Router();
const { authenticateToken, checkRole } = require('../middleware/auth');
const controller = require('../controllers/leadSourceController');

router.use(authenticateToken);

router.get('/export-csv', controller.exportCSV);
router.get('/export', controller.exportJSON);
router.get('/all', controller.getAllSimple);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', checkRole(['admin']), controller.create);
router.put('/:id', checkRole(['admin']), controller.update);
router.delete('/:id', checkRole(['admin']), controller.delete);

module.exports = router;
