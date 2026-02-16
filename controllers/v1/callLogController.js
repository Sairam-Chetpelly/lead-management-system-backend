const callLogService = require('../../services/v1/callLogService');
const { successResponse, errorResponse } = require('../../utils/response');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, userId, search } = req.query;
    const result = await callLogService.getAll(parseInt(page), parseInt(limit), { startDate, endDate, userId, search });
    return successResponse(res, { callLogs: result.data, pagination: { current: result.page, limit: result.limit, total: result.total, pages: result.pages } }, 'Call logs retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

module.exports = { getAll };
