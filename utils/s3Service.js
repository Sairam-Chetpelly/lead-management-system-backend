const { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks for better progress tracking

class S3Service {
  // Generate pre-signed URL for single file upload (< 100MB)
  static async getPresignedUploadUrl(key, contentType, expiresIn = 3600) {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  // Initialize multipart upload for large files
  static async initializeMultipartUpload(key, contentType, metadata = {}) {
    const command = new CreateMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      Metadata: metadata,
    });

    const response = await s3Client.send(command);
    return response.UploadId;
  }

  // Generate pre-signed URLs for multipart upload chunks
  static async getMultipartPresignedUrls(key, uploadId, totalParts) {
    const presignedUrls = [];
    
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const command = new UploadPartCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      });
      
      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      presignedUrls.push({
        partNumber,
        presignedUrl,
      });
    }
    
    return presignedUrls;
  }

  // Complete multipart upload
  static async completeMultipartUpload(key, uploadId, parts) {
    const command = new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map(part => ({
          ETag: part.etag,
          PartNumber: part.partNumber,
        })),
      },
    });

    return await s3Client.send(command);
  }

  // Abort multipart upload
  static async abortMultipartUpload(key, uploadId) {
    const command = new AbortMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
    });

    return await s3Client.send(command);
  }

  // Calculate number of parts needed
  static calculateParts(fileSize) {
    return Math.ceil(fileSize / CHUNK_SIZE);
  }

  // Generate S3 key based on folder structure
  static async generateS3KeyByFolder(userId, fileName, folderId = null) {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    let folderPath = 'root'; // Default for root level
    
    if (folderId) {
      // Get folder and build path
      const Folder = require('../models/Folder');
      const folder = await Folder.findById(folderId);
      if (folder) {
        folderPath = await this.buildFolderPath(folder);
      }
    }
    
    return `documents/${folderPath}/${timestamp}-${randomSuffix}-${sanitizedFileName}`;
  }
  
  // Build complete folder path (handles nested folders)
  static async buildFolderPath(folder) {
    const Folder = require('../models/Folder');
    let path = folder.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize folder name
    
    if (folder.parentFolderId) {
      const parentFolder = await Folder.findById(folder.parentFolderId);
      if (parentFolder) {
        const parentPath = await this.buildFolderPath(parentFolder);
        path = `${parentPath}/${path}`;
      }
    }
    
    return path;
  }

  // Generate pre-signed URL for downloading
  static async getPresignedDownloadUrl(key, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn });
  }
}

module.exports = S3Service;