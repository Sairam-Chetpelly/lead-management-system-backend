const { validationResult } = require('express-validator');
const leadSourceService = require('../../services/v1/leadSourceService');
const { successResponse, errorResponse } = require('../../utils/response');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', isApiSource = '' } = req.query;
    const result = await leadSourceService.getAll(parseInt(page), parseInt(limit), search, isApiSource);
    return successResponse(res, { data: result.data, pagination: { current: result.page, pages: result.pages, total: result.total, limit: result.limit } }, 'Lead sources retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const getAllSimple = async (req, res) => {
  try {
    const result = await leadSourceService.getAllSimple();
    return successResponse(res, result, 'Lead sources retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const getById = async (req, res) => {
  try {
    const result = await leadSourceService.getById(req.params.id);
    return successResponse(res, result, 'Lead source retrieved successfully', 200);
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
    const result = await leadSourceService.create(req.body);
    return successResponse(res, result, 'Lead source created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const update = async (req, res) => {
  try {
    const result = await leadSourceService.update(req.params.id, req.body);
    return successResponse(res, result, 'Lead source updated successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const deleteLeadSource = async (req, res) => {
  try {
    const result = await leadSourceService.delete(req.params.id);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const exportLeadSources = async (req, res) => {
  try {
    const result = await leadSourceService.export();
    return successResponse(res, result, 'Lead sources exported successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

module.exports = { getAll, getAllSimple, getById, create, update, deleteLeadSource, exportLeadSources };
