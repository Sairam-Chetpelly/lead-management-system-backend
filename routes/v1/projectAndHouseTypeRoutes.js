const express = require('express');
const router = express.Router();
const projectAndHouseTypeController = require('../../controllers/v1/projectAndHouseTypeController');

router.get('/export', projectAndHouseTypeController.exportTypes);
router.get('/', projectAndHouseTypeController.getAll);
router.get('/:id', projectAndHouseTypeController.getById);
router.post('/', projectAndHouseTypeController.create);
router.put('/:id', projectAndHouseTypeController.update);
router.delete('/:id', projectAndHouseTypeController.deleteType);

module.exports = router;
