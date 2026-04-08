const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// Create folder in S3 bucket
const createS3Folder = async (folderPath) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: folderPath.endsWith('/') ? folderPath : `${folderPath}/`,
      Body: ''
    };

    await s3.putObject(params).promise();
    return { success: true, path: params.Key };
  } catch (error) {
    console.error('S3 folder creation error:', error);
    throw error;
  }
};

// Delete folder from S3 bucket
const deleteS3Folder = async (folderPath) => {
  try {
    // List all objects with the folder prefix
    const listParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Prefix: folderPath.endsWith('/') ? folderPath : `${folderPath}/`
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
    
    return { success: true };
  } catch (error) {
    console.error('S3 folder deletion error:', error);
    throw error;
  }
};

// Generate folder path for S3
const generateS3FolderPath = async (folderId, folderName, parentFolderId = null) => {
  const Folder = require('../models/Folder');
  
  if (!parentFolderId) {
    return folderName;
  }
  
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
  return parentPath ? `${parentPath}/${folderName}` : folderName;
};

module.exports = {
  createS3Folder,
  deleteS3Folder,
  generateS3FolderPath
};