const { validationResult } = require('express-validator');
const languageService = require('../../services/v1/languageService');
const { successResponse, errorResponse } = require('../../utils/response');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const result = await languageService.getAll(parseInt(page), parseInt(limit), search);
    return successResponse(res, { data: result.data, pagination: { current: result.page, pages: result.pages, total: result.total, limit: result.limit } }, 'Languages retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const getAllSimple = async (req, res) => {
  try {
    const result = await languageService.getAllSimple();
    return successResponse(res, result, 'Languages retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }
    const result = await languageService.create(req.body);
    return successResponse(res, result, 'Language created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const update = async (req, res) => {
  try {
    const result = await languageService.update(req.params.id, req.body);
    return successResponse(res, result, 'Language updated successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const deleteLanguage = async (req, res) => {
  try {
    const result = await languageService.delete(req.params.id);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const exportLanguages = async (req, res) => {
  try {
    const result = await languageService.export();
    return successResponse(res, result, 'Languages exported successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

module.exports = { getAll, getAllSimple, create, update, deleteLanguage, exportLanguages };
