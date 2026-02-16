const adminUserService = require('../../services/v1/adminUserService');
const { successResponse, errorResponse } = require('../../utils/response');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const result = await adminUserService.getAll(parseInt(page), parseInt(limit), search);
    return successResponse(res, { data: result.data, pagination: { current: result.page, pages: result.pages, total: result.total, limit: result.limit } }, 'Users retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

const deleteUser = async (req, res) => {
  try {
    const result = await adminUserService.delete(req.params.id);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

module.exports = { getAll, deleteUser };
