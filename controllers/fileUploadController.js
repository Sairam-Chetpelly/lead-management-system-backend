const { uploadFile, uploadMultipleFiles, deleteFromS3, getSignedUrl, ALLOWED_TYPES } = require('../utils/s3Service');
const { successResponse, errorResponse } = require('../utils/response');

// Single file upload
const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file provided', 400);
    }

    const { folder = 'documents', watermark = 'true' } = req.body;
    const addWatermark = watermark === 'true';

    const result = await uploadFile(req.file, folder, addWatermark);
    
    return successResponse(res, 'File uploaded successfully', result.data);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Multiple files upload
const uploadMultipleFilesHandler = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return errorResponse(res, 'No files provided', 400);
    }

    const { folder = 'documents', watermark = 'true' } = req.body;
    const addWatermark = watermark === 'true';

    const result = await uploadMultipleFiles(req.files, folder, addWatermark);
    
    if (result.success) {
      return successResponse(res, 'All files uploaded successfully', result);
    } else {
      return successResponse(res, 'Some files uploaded with errors', result, 207); // Multi-status
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Delete file from S3
const deleteFile = async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return errorResponse(res, 'File key is required', 400);
    }

    await deleteFromS3(key);
    
    return successResponse(res, 'File deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get signed URL for file access
const getFileUrl = async (req, res) => {
  try {
    const { key } = req.params;
    const { expires = 3600 } = req.query;
    
    if (!key) {
      return errorResponse(res, 'File key is required', 400);
    }

    const signedUrl = await getSignedUrl(key, parseInt(expires));
    
    return successResponse(res, 'Signed URL generated successfully', { 
      url: signedUrl,
      expiresIn: expires 
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get allowed file types
const getAllowedTypes = (req, res) => {
  return successResponse(res, 'Allowed file types', ALLOWED_TYPES);
};

module.exports = {
  uploadSingleFile,
  uploadMultipleFilesHandler,
  deleteFile,
  getFileUrl,
  getAllowedTypes
};