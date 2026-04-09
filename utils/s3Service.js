const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const DOCUMENTS_PREFIX = 'documents/';

// Validate and ensure folder is created inside documents prefix
const validateAndFormatFolderPath = (folderPath) => {
  // Remove any leading slashes
  let cleanPath = folderPath.replace(/^\/+/, '');
  
  // Prevent path traversal attacks
  if (cleanPath.includes('../') || cleanPath.includes('..\\')) {
    throw new Error('Invalid folder path: Path traversal not allowed');
  }
  
  // Ensure folder is created inside documents prefix
  if (!cleanPath.startsWith(DOCUMENTS_PREFIX)) {
    cleanPath = `${DOCUMENTS_PREFIX}${cleanPath}`;
  }
  
  // Ensure trailing slash for folder
  return cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`;
};

// Create folder in S3 bucket (always inside documents prefix)
const createS3Folder = async (folderPath) => {
  try {
    const validatedPath = validateAndFormatFolderPath(folderPath);
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: validatedPath,
      Body: ''
    };

    await s3.putObject(params).promise();
    console.log(`S3 folder created inside documents: ${validatedPath}`);
    return { success: true, path: params.Key };
  } catch (error) {
    console.error('S3 folder creation error:', error);
    throw error;
  }
};

// Delete folder from S3 bucket (only inside documents prefix)
const deleteS3Folder = async (folderPath) => {
  try {
    const validatedPath = validateAndFormatFolderPath(folderPath);
    
    // List all objects with the folder prefix
    const listParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Prefix: validatedPath
    };

    const objects = await s3.listObjectsV2(listParams).promise();
    
    if (objects.Contents.length > 0) {
      const deleteParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Delete: {
          Objects: objects.Contents.map(obj => ({ Key: obj.Key }))
        }
      };
      
      await s3.deleteObjects(deleteParams).promise();
    }
    
    console.log(`S3 folder deleted from documents: ${validatedPath}`);
    return { success: true };
  } catch (error) {
    console.error('S3 folder deletion error:', error);
    throw error;
  }
};

// Generate folder path for S3 (always inside documents prefix)
const generateS3FolderPath = async (folderId, folderName, parentFolderId = null) => {
  const Folder = require('../models/Folder');
  
  let folderPath;
  
  if (!parentFolderId) {
    folderPath = folderName;
  } else {
    // Build path by traversing up the folder hierarchy
    const buildPath = async (currentFolderId) => {
      const folder = await Folder.findById(currentFolderId);
      if (!folder || !folder.parentFolderId) {
        return folder ? folder.name : '';
      }
      
      const parentPath = await buildPath(folder.parentFolderId);
      return parentPath ? `${parentPath}/${folder.name}` : folder.name;
    };
    
    const parentPath = await buildPath(parentFolderId);
    folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
  }
  
  // Ensure path is inside documents prefix
  return validateAndFormatFolderPath(folderPath);
};

// Check and create folder inside documents prefix
const checkAndCreateFolder = async (folderPath) => {
  try {
    const validatedPath = validateAndFormatFolderPath(folderPath);
    return await createS3Folder(validatedPath);
  } catch (error) {
    console.error('Folder check and creation failed:', error);
    throw error;
  }
};

module.exports = {
  createS3Folder,
  deleteS3Folder,
  generateS3FolderPath,
  checkAndCreateFolder,
  validateAndFormatFolderPath
};