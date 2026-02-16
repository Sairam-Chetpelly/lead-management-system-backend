const { validationResult } = require('express-validator');
const authService = require('../../services/v1/authService');
const { successResponse, errorResponse } = require('../../utils/response');

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    return successResponse(res, result, 'Successfully logged in', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const status = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return errorResponse(res, 'No token provided', 401);
    }

    const result = await authService.checkStatus(token);
    return successResponse(res, result, 'Status retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 401);
  }
};

module.exports = {
  login,
  forgotPassword,
  resetPassword,
  status
};
