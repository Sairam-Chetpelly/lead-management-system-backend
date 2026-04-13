const {
  generateUploadUrl,
  generateDownloadUrl,
  generatePostUrl,
  verifyUpload,
  deleteFile,
  getFileTypeInfo,
  ALLOWED_TYPES
} = require('../utils/presignedUrlService');
const { addWatermark } = require('../utils/watermark');
const { successResponse, errorResponse } = require('../utils/response');

// Generate pre-signed URL for upload
const getUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType, fileSize, folder = 'documents' } = req.body;

    // Validation
    if (!fileName || !fileType || !fileSize) {
      return errorResponse(res, 'fileName, fileType, and fileSize are required', 400);
    }

    if (typeof fileSize !== 'number' || fileSize <= 0) {
      return errorResponse(res, 'fileSize must be a positive number', 400);
    }

    const result = await generateUploadUrl(fileName, fileType, fileSize, folder);
    
    return successResponse(res, 'Upload URL generated successfully', result);

  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// Generate pre-signed POST URL (more secure alternative)
const getPostUrl = async (req, res) => {
  try {
    const { fileName, fileType, fileSize, folder = 'documents' } = req.body;

    // Validation
    if (!fileName || !fileType || !fileSize) {
      return errorResponse(res, 'fileName, fileType, and fileSize are required', 400);
    }

    if (typeof fileSize !== 'number' || fileSize <= 0) {
      return errorResponse(res, 'fileSize must be a positive number', 400);
    }

    const result = await generatePostUrl(fileName, fileType, fileSize, folder);
    
    return successResponse(res, 'POST URL generated successfully', result);

  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// Generate pre-signed URL for download
const getDownloadUrl = async (req, res) => {
  try {
    const { key } = req.params;
    const { expires = 3600 } = req.query;

    if (!key) {
      return errorResponse(res, 'File key is required', 400);
    }

    // Verify file exists first
    const verification = await verifyUpload(key);
    if (!verification.exists) {
      return errorResponse(res, 'File not found', 404);
    }

    const result = await generateDownloadUrl(key, parseInt(expires));
    
    return successResponse(res, 'Download URL generated successfully', {
      ...result,
      fileInfo: verification
    });

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Verify file upload completion
const verifyFileUpload = async (req, res) => {
  try {
    const { key } = req.params;

    if (!key) {
      return errorResponse(res, 'File key is required', 400);
    }

    const result = await verifyUpload(key);
    
    if (!result.exists) {
      return errorResponse(res, 'File not found or upload incomplete', 404);
    }

    return successResponse(res, 'File upload verified successfully', result);

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Delete file
const deleteFileHandler = async (req, res) => {
  try {
    const { key } = req.params;

    if (!key) {
      return errorResponse(res, 'File key is required', 400);
    }

    // Verify file exists first
    const verification = await verifyUpload(key);
    if (!verification.exists) {
      return errorResponse(res, 'File not found', 404);
    }

    await deleteFile(key);
    
    return successResponse(res, 'File deleted successfully');

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get file type information and limits
const getFileTypeInfoHandler = async (req, res) => {
  try {
    const { mimeType } = req.query;

    if (mimeType) {
      const typeInfo = getFileTypeInfo(mimeType);
      if (!typeInfo) {
        return errorResponse(res, `File type ${mimeType} is not allowed`, 400);
      }
      return successResponse(res, 'File type information', typeInfo);
    }

    // Return all allowed types
    return successResponse(res, 'All allowed file types', ALLOWED_TYPES);

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Process uploaded file (apply watermark if needed)
const processUploadedFile = async (req, res) => {
  try {
    const { key, applyWatermark = false } = req.body;

    if (!key) {
      return errorResponse(res, 'File key is required', 400);
    }

    // Verify file exists
    const verification = await verifyUpload(key);
    if (!verification.exists) {
      return errorResponse(res, 'File not found', 404);
    }

    let processedKey = key;

    // Apply watermark if requested and file type supports it
    if (applyWatermark) {
      const contentType = verification.contentType;
      const isImage = contentType.startsWith('image/');
      const isPdf = contentType === 'application/pdf';

      if (isImage || isPdf) {
        try {
          // Download file, apply watermark, and re-upload
          // This is a simplified version - in production, you might want to use Lambda or similar
          console.log(`Watermarking requested for ${key} but not implemented in pre-signed URL flow`);
          // Note: Watermarking with pre-signed URLs requires additional processing
          // Consider using AWS Lambda triggers or separate processing endpoint
        } catch (watermarkError) {
          console.warn(`Watermark failed for ${key}:`, watermarkError.message);
        }
      }
    }

    return successResponse(res, 'File processed successfully', {
      originalKey: key,
      processedKey,
      watermarkApplied: false, // Set to true when watermarking is implemented
      fileInfo: verification
    });

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Batch operations for multiple files
const batchGenerateUploadUrls = async (req, res) => {
  try {
    const { files, folder = 'documents' } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return errorResponse(res, 'Files array is required', 400);
    }

    if (files.length > 10) {
      return errorResponse(res, 'Maximum 10 files allowed per batch', 400);
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const { fileName, fileType, fileSize } = file;
        
        if (!fileName || !fileType || !fileSize) {
          throw new Error('fileName, fileType, and fileSize are required for each file');
        }

        const result = await generateUploadUrl(fileName, fileType, fileSize, folder);
        results.push({
          fileName,
          ...result
        });

      } catch (error) {
        errors.push({
          fileName: file.fileName || 'unknown',
          error: error.message
        });
      }
    }

    return successResponse(res, 'Batch upload URLs generated', {
      success: results,
      errors,
      totalRequested: files.length,
      successCount: results.length,
      errorCount: errors.length
    });

  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getUploadUrl,
  getPostUrl,
  getDownloadUrl,
  verifyFileUpload,
  deleteFileHandler,
  getFileTypeInfoHandler,
  processUploadedFile,
  batchGenerateUploadUrls
};