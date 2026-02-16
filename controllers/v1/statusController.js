const { validationResult } = require('express-validator');
const statusService = require('../../services/v1/statusService');
const { successResponse, errorResponse } = require('../../utils/response');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const result = await statusService.getAll(parseInt(page), parseInt(limit), search);
    return successResponse(res, { data: result.data, pagination: { current: result.page, pages: result.pages, total: result.total, limit: result.limit } }, 'Statuses retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const getAllSimple = async (req, res) => {
  try {
    const result = await statusService.getAllSimple();
    return successResponse(res, result, 'Statuses retrieved successfully', 200);
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
    const result = await statusService.create(req.body);
    return successResponse(res, result, 'Status created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const update = async (req, res) => {
  try {
    const result = await statusService.update(req.params.id, req.body);
    return successResponse(res, result, 'Status updated successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const deleteStatus = async (req, res) => {
  try {
    const result = await statusService.delete(req.params.id);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const exportStatuses = async (req, res) => {
  try {
    const result = await statusService.export();
    return successResponse(res, result, 'Statuses exported successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

module.exports = { getAll, getAllSimple, create, update, deleteStatus, exportStatuses };
