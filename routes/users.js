const express = require('express');
const { authenticateToken, checkRole } = require('../middleware/auth');
const controller = require('../controllers/userController');
const { createUserValidation } = require('../validators/userValidation');
const router = express.Router();

router.get('/export-csv', authenticateToken, controller.exportCSV);
router.get('/search-dropdown', authenticateToken, controller.searchDropdown);
router.get('/all', authenticateToken, controller.getAllUnfiltered);
router.get('/profile-image/:filename', controller.getProfileImage);
router.get('/', authenticateToken, controller.getAll);
router.post('/', authenticateToken,  createUserValidation, controller.create);
router.post('/:id/profile-image', authenticateToken, controller.uploadProfileImage);
router.put('/:id', authenticateToken, controller.update);
router.delete('/:id', authenticateToken, checkRole(['admin']), controller.delete);

module.exports = router;