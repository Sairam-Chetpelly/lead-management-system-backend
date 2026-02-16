const activityLogService = require('../../services/v1/activityLogService');
const { successResponse, errorResponse } = require('../../utils/response');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, userId, type, search } = req.query;
    const result = await activityLogService.getAll(parseInt(page), parseInt(limit), { startDate, endDate, userId, type, search });
    return successResponse(res, { activityLogs: result.data, pagination: { current: result.page, limit: result.limit, total: result.total, pages: result.pages } }, 'Activity logs retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

module.exports = { getAll };
