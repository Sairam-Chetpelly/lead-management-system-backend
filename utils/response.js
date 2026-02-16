// Standardized response utility for v1 APIs
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    data,
    message
  });
};

const errorResponse = (res, message = 'Error occurred', statusCode = 400, errors = null) => {
  const response = {
    status: 'error',
    message
  };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

module.exports = { successResponse, errorResponse };
