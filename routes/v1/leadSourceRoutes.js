const express = require('express');
const router = express.Router();
const leadSourceController = require('../../controllers/v1/leadSourceController');

router.get('/export', leadSourceController.exportLeadSources);
router.get('/all', leadSourceController.getAllSimple);
router.get('/', leadSourceController.getAll);
router.get('/:id', leadSourceController.getById);
router.post('/', leadSourceController.create);
router.put('/:id', leadSourceController.update);
router.delete('/:id', leadSourceController.deleteLeadSource);

module.exports = router;
