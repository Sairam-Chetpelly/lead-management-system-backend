const AWS = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { addWatermark } = require('./watermark');

// Ensure environment variables are loaded
if (!process.env.AWS_S3_BUCKET_NAME) {
  console.warn('AWS_S3_BUCKET_NAME not found in environment variables');
}

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Allowed file types
const ALLOWED_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  spreadsheets: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  text: ['text/plain', 'text/csv']
};

const ALL_ALLOWED_TYPES = [...ALLOWED_TYPES.images, ...ALLOWED_TYPES.documents, ...ALLOWED_TYPES.spreadsheets, ...ALLOWED_TYPES.text];

// Multer configuration for temporary file storage
function createUploadMiddleware() {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/temp/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  return multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
      if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed`), false);
      }
    }
  });
}

const upload = createUploadMiddleware();

// Upload file to S3
async function uploadToS3(filePath, key, contentType) {
  try {
    const fileContent = await fs.readFile(filePath);
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
      ACL: 'private'
    };

    const result = await s3.upload(params).promise();
    return result;
  } catch (error) {
    throw new Error(`S3 upload failed: ${error.message}`);
  }
}

// Delete file from S3
async function deleteFromS3(key) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };
    
    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    throw new Error(`S3 delete failed: ${error.message}`);
  }
}

// Get signed URL for private file access
async function getSignedUrl(key, expiresIn = 3600) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn
    };
    
    return s3.getSignedUrl('getObject', params);
  } catch (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
}

// Main upload function with watermarking
async function uploadFile(file, folder = 'documents', addWatermarkFlag = true) {
  try {
    const tempPath = file.path;
    const originalName = file.originalname;
    const mimeType = file.mimetype;
    
    // Generate S3 key
    const timestamp = Date.now();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `${folder}/${timestamp}_${sanitizedName}`;
    
    let finalPath = tempPath;
    
    // Apply watermark for images and PDFs
    if (addWatermarkFlag && (ALLOWED_TYPES.images.includes(mimeType) || mimeType === 'application/pdf')) {
      try {
        finalPath = await addWatermark(tempPath, mimeType);
      } catch (watermarkError) {
        console.warn(`Watermark failed, uploading original: ${watermarkError.message}`);
      }
    }
    
    // Upload to S3
    const uploadResult = await uploadToS3(finalPath, s3Key, mimeType);
    
    // Clean up temp file
    try {
      await fs.unlink(tempPath);
    } catch (cleanupError) {
      console.warn(`Failed to cleanup temp file: ${cleanupError.message}`);
    }
    
    return {
      success: true,
      data: {
        key: s3Key,
        location: uploadResult.Location,
        bucket: uploadResult.Bucket,
        originalName,
        mimeType,
        size: file.size,
        watermarked: addWatermarkFlag && (ALLOWED_TYPES.images.includes(mimeType) || mimeType === 'application/pdf')
      }
    };
    
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(file.path);
    } catch (cleanupError) {
      console.warn(`Failed to cleanup temp file on error: ${cleanupError.message}`);
    }
    
    throw new Error(`File upload failed: ${error.message}`);
  }
}

// Upload multiple files
async function uploadMultipleFiles(files, folder = 'documents', addWatermarkFlag = true) {
  const results = [];
  const errors = [];
  
  for (const file of files) {
    try {
      const result = await uploadFile(file, folder, addWatermarkFlag);
      results.push(result.data);
    } catch (error) {
      errors.push({
        filename: file.originalname,
        error: error.message
      });
    }
  }
  
  return {
    success: errors.length === 0,
    uploaded: results,
    errors,
    totalFiles: files.length,
    successCount: results.length,
    errorCount: errors.length
  };
}

module.exports = {
  upload,
  uploadFile,
  uploadMultipleFiles,
  deleteFromS3,
  getSignedUrl,
  ALLOWED_TYPES,
  s3,
  BUCKET_NAME
};