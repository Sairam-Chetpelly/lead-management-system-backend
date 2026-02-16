const { validationResult } = require('express-validator');
const roleService = require('../../services/v1/roleService');
const { successResponse, errorResponse } = require('../../utils/response');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const result = await roleService.getAll(parseInt(page), parseInt(limit), search);
    return successResponse(res, { data: result.data, pagination: { current: result.page, pages: result.pages, total: result.total, limit: result.limit } }, 'Roles retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const getAllSimple = async (req, res) => {
  try {
    const result = await roleService.getAllSimple();
    return successResponse(res, result, 'Roles retrieved successfully', 200);
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
    const result = await roleService.create(req.body);
    return successResponse(res, result, 'Role created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const update = async (req, res) => {
  try {
    const result = await roleService.update(req.params.id, req.body);
    return successResponse(res, result, 'Role updated successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const deleteRole = async (req, res) => {
  try {
    const result = await roleService.delete(req.params.id);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const exportRoles = async (req, res) => {
  try {
    const result = await roleService.export();
    return successResponse(res, result, 'Roles exported successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

module.exports = { getAll, getAllSimple, create, update, deleteRole, exportRoles };
