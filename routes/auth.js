const express = require('express');
const controller = require('../controllers/authController');
const { loginValidation, emailValidation, resetPasswordValidation, verifyOTPValidation } = require('../validators/authValidator');
const router = express.Router();

router.post('/login', loginValidation, controller.login);
router.get('/status', controller.checkStatus);
router.post('/forgot-password', emailValidation, controller.forgotPassword);
router.post('/reset-password', resetPasswordValidation, controller.resetPassword);
router.post('/forgot-password-otp', emailValidation, controller.sendOTP);
router.post('/verify-otp', verifyOTPValidation, controller.verifyOTP);
router.post('/reset-password-with-token', resetPasswordValidation, controller.resetPasswordWithToken);

module.exports = router;
