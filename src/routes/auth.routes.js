const express = require('express');
const authController = require('../modules/auth/auth.controller');
const { validateLogin, validateForgotPassword, validateResetPassword } = require('../validations/auth.validation');

const router = express.Router();

router.post('/login', validateLogin, authController.login);
router.get('/status', authController.checkStatus);
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', validateResetPassword, authController.resetPassword);

module.exports = router;
