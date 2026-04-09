const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// Upload file to S3
const uploadFileToS3 = async (file, folderPath = '') => {
  try {
    const fileExtension = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = uniqueSuffix + fileExtension;
    
    // Build S3 key path
    const s3Key = folderPath ? `${folderPath}/${fileName}` : fileName;
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key,
      Body: fs.readFileSync(file.path),
      ContentType: file.mimetype,
      ACL: 'private' // Files are private by default
    };

    const result = await s3.upload(params).promise();
    
    // Clean up local file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    return {
      success: true,
      s3Key: s3Key,
      s3Url: result.Location,
      fileName: fileName,
      originalName: file.originalname
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
};

// Upload processed file (after watermark/conversion) to S3
const uploadProcessedFileToS3 = async (filePath, originalName, mimeType, folderPath = '') => {
  try {
    const fileExtension = path.extname(filePath);
    const baseName = path.basename(originalName, path.extname(originalName));
    const fileName = `${baseName}_${Date.now()}${fileExtension}`;
    
    // Build S3 key path
    const s3Key = folderPath ? `${folderPath}/${fileName}` : fileName;
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key,
      Body: fs.readFileSync(filePath),
      ContentType: mimeType,
      ACL: 'private'
    };

    const result = await s3.upload(params).promise();
    
    // Clean up local file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return {
      success: true,
      s3Key: s3Key,
      s3Url: result.Location,
      fileName: fileName
    };
  } catch (error) {
    console.error('S3 processed file upload error:', error);
    throw error;
  }
};

// Delete file from S3
const deleteFileFromS3 = async (s3Key) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key
    };

    await s3.deleteObject(params).promise();
    return { success: true };
  } catch (error) {
    console.error('S3 delete error:', error);
    throw error;
  }
};

// Generate presigned URL for file access
const generatePresignedUrl = async (s3Key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key,
      Expires: expiresIn // URL expires in 1 hour by default
    };

    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error('Presigned URL generation error:', error);
    throw error;
  }
};

// Get S3 file stream for download
const getS3FileStream = async (s3Key) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key
    };

    return s3.getObject(params).createReadStream();
  } catch (error) {
    console.error('S3 file stream error:', error);
    throw error;
  }
};

// Generate folder path based on folder hierarchy
const generateDocumentS3Path = async (folderId) => {
  if (!folderId) return 'documents'; // Root folder
  
  const Folder = require('../models/Folder');
  
  const buildPath = async (currentFolderId) => {
    const folder = await Folder.findById(currentFolderId);
    if (!folder || !folder.parentFolderId) {
      return folder ? folder.name : '';
    }
    
    const parentPath = await buildPath(folder.parentFolderId);
    return parentPath ? `${parentPath}/${folder.name}` : folder.name;
  };
  
  const folderPath = await buildPath(folderId);
  return `documents/${folderPath}`;
};

module.exports = {
  uploadFileToS3,
  uploadProcessedFileToS3,
  deleteFileFromS3,
  generatePresignedUrl,
  getS3FileStream,
  generateDocumentS3Path
};