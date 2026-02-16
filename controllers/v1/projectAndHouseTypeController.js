const { validationResult } = require('express-validator');
const projectAndHouseTypeService = require('../../services/v1/projectAndHouseTypeService');
const { successResponse, errorResponse } = require('../../utils/response');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', type = '' } = req.query;
    const result = await projectAndHouseTypeService.getAll(parseInt(page), parseInt(limit), search, type);
    return successResponse(res, { data: result.data, pagination: { current: result.page, pages: result.pages, total: result.total, limit: result.limit } }, 'Types retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const getById = async (req, res) => {
  try {
    const result = await projectAndHouseTypeService.getById(req.params.id);
    return successResponse(res, result, 'Type retrieved successfully', 200);
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
    const result = await projectAndHouseTypeService.create(req.body);
    return successResponse(res, result, 'Type created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const update = async (req, res) => {
  try {
    const result = await projectAndHouseTypeService.update(req.params.id, req.body);
    return successResponse(res, result, 'Type updated successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const deleteType = async (req, res) => {
  try {
    const result = await projectAndHouseTypeService.delete(req.params.id);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const exportTypes = async (req, res) => {
  try {
    const result = await projectAndHouseTypeService.export();
    return successResponse(res, result, 'Types exported successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

module.exports = { getAll, getById, create, update, deleteType, exportTypes };
