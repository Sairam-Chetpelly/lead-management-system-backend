const express = require('express');
const router = express.Router();
const { login, forgotPassword, resetPassword, status } = require('../../controllers/v1/authController');
const { loginValidation, forgotPasswordValidation, resetPasswordValidation } = require('../../validations/v1/authValidation');

router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.get('/status', status);

module.exports = router;
