const AWS = require('aws-sdk');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  signatureVersion: 'v4'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Allowed file types with size limits
const ALLOWED_TYPES = {
  images: {
    types: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  documents: {
    types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 50 * 1024 * 1024 // 50MB
  },
  spreadsheets: {
    types: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    maxSize: 25 * 1024 * 1024 // 25MB
  },
  text: {
    types: ['text/plain', 'text/csv'],
    maxSize: 5 * 1024 * 1024 // 5MB
  }
};

// Get all allowed types and max size for a file type
function getFileTypeInfo(mimeType) {
  for (const [category, config] of Object.entries(ALLOWED_TYPES)) {
    if (config.types.includes(mimeType)) {
      return { category, maxSize: config.maxSize };
    }
  }
  return null;
}

// Generate secure filename
function generateSecureFilename(originalName, folder = 'documents') {
  const timestamp = Date.now();
  const uuid = uuidv4().split('-')[0]; // Short UUID
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${folder}/${timestamp}_${uuid}_${baseName}${ext}`;
}

// Generate pre-signed URL for upload
async function generateUploadUrl(fileName, fileType, fileSize, folder = 'documents', expiresIn = 300) {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
    }
    // Validate file type
    const typeInfo = getFileTypeInfo(fileType);
    if (!typeInfo) {
      throw new Error(`File type ${fileType} is not allowed`);
    }

    // Validate file size
    if (fileSize > typeInfo.maxSize) {
      throw new Error(`File size ${fileSize} exceeds maximum allowed size of ${typeInfo.maxSize} bytes`);
    }

    // Generate secure S3 key
    const s3Key = generateSecureFilename(fileName, folder);

    // Pre-signed URL parameters
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Expires: expiresIn, // URL expires in 5 minutes by default
      ContentType: fileType
    };

    // Generate pre-signed URL
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

    return {
      uploadUrl,
      key: s3Key,
      expiresIn,
      maxSize: typeInfo.maxSize,
      category: typeInfo.category
    };

  } catch (error) {
    throw new Error(`Failed to generate upload URL: ${error.message}`);
  }
}

// Generate pre-signed URL for download
async function generateDownloadUrl(key, expiresIn = 3600) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn
    };

    const downloadUrl = await s3.getSignedUrlPromise('getObject', params);
    
    return {
      downloadUrl,
      expiresIn
    };

  } catch (error) {
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }
}

// Verify file was uploaded successfully
async function verifyUpload(key) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    const headResult = await s3.headObject(params).promise();
    
    return {
      exists: true,
      size: headResult.ContentLength,
      lastModified: headResult.LastModified,
      contentType: headResult.ContentType,
      etag: headResult.ETag
    };

  } catch (error) {
    if (error.code === 'NotFound') {
      return { exists: false };
    }
    throw new Error(`Failed to verify upload: ${error.message}`);
  }
}

// Delete file from S3
async function deleteFile(key) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();
    return true;

  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

// Generate pre-signed POST URL (alternative method with more security)
async function generatePostUrl(fileName, fileType, fileSize, folder = 'documents', expiresIn = 300) {
  try {
    // Validate file type and size
    const typeInfo = getFileTypeInfo(fileType);
    if (!typeInfo) {
      throw new Error(`File type ${fileType} is not allowed`);
    }

    if (fileSize > typeInfo.maxSize) {
      throw new Error(`File size exceeds maximum allowed size`);
    }

    const s3Key = generateSecureFilename(fileName, folder);

    const params = {
      Bucket: BUCKET_NAME,
      Fields: {
        key: s3Key,
        'Content-Type': fileType
      },
      Conditions: [
        ['content-length-range', 0, typeInfo.maxSize],
        ['eq', '$Content-Type', fileType],
        ['eq', '$key', s3Key]
      ],
      Expires: expiresIn
    };

    const postData = await s3.createPresignedPost(params);

    return {
      postData,
      key: s3Key,
      expiresIn,
      maxSize: typeInfo.maxSize,
      category: typeInfo.category
    };

  } catch (error) {
    throw new Error(`Failed to generate POST URL: ${error.message}`);
  }
}

module.exports = {
  generateUploadUrl,
  generateDownloadUrl,
  generatePostUrl,
  verifyUpload,
  deleteFile,
  getFileTypeInfo,
  ALLOWED_TYPES,
  BUCKET_NAME
};