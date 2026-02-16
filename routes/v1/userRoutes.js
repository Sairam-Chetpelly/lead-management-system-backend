const express = require('express');
const router = express.Router();
const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../../controllers/v1/userController');
const { createUserValidation, updateUserValidation } = require('../../validations/v1/userValidation');
const { authenticateToken } = require('../../middleware/auth');

router.get('/', authenticateToken, getUsers);
router.get('/:id', authenticateToken, getUserById);
router.post('/', authenticateToken, createUserValidation, createUser);
router.put('/:id', authenticateToken, updateUserValidation, updateUser);
router.delete('/:id', authenticateToken, deleteUser);

module.exports = router;
