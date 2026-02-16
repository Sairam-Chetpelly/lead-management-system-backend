const { validationResult } = require('express-validator');
const centreService = require('../../services/v1/centreService');
const { successResponse, errorResponse } = require('../../utils/response');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const result = await centreService.getAll(parseInt(page), parseInt(limit), search);
    return successResponse(res, { data: result.data, pagination: { current: result.page, pages: result.pages, total: result.total, limit: result.limit } }, 'Centres retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const getAllSimple = async (req, res) => {
  try {
    const result = await centreService.getAllSimple();
    return successResponse(res, result, 'Centres retrieved successfully', 200);
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
    const result = await centreService.create(req.body);
    return successResponse(res, result, 'Centre created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const update = async (req, res) => {
  try {
    const result = await centreService.update(req.params.id, req.body);
    return successResponse(res, result, 'Centre updated successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const deleteCentre = async (req, res) => {
  try {
    const result = await centreService.delete(req.params.id);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const exportCentres = async (req, res) => {
  try {
    const result = await centreService.export();
    return successResponse(res, result, 'Centres exported successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

module.exports = { getAll, getAllSimple, create, update, deleteCentre, exportCentres };
