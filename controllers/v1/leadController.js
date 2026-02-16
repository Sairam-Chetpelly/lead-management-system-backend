const leadService = require('../../services/v1/leadService');
const { successResponse, errorResponse } = require('../../utils/response');

const deleteLead = async (req, res) => {
  try {
    const result = await leadService.delete(req.params.id);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
};

module.exports = { deleteLead };
