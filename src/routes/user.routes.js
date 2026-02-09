const express = require('express');
const userController = require('../modules/user/user.controller');
const { authenticateToken } = require('../middlewares/auth');
const { validateCreateUser } = require('../validations/user.validation');
const { uploadProfileImage, serveProfileImage } = require('../modules/user/user.upload');

const router = express.Router();

router.get('/', authenticateToken, userController.getAll);
router.get('/all', authenticateToken, userController.getAll);
router.post('/', authenticateToken, validateCreateUser, userController.create);
router.put('/:id', authenticateToken, userController.update);
router.delete('/:id', authenticateToken, userController.delete);
router.get('/export', authenticateToken, userController.export);
router.post('/:id/profile-image', authenticateToken, uploadProfileImage);
router.get('/profile-image/:filename', serveProfileImage);

module.exports = router;
