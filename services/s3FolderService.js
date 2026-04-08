const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const path = require('path');

class S3FolderService {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    this.bucketName = process.env.AWS_S3_BUCKET_NAME;
  }

  // Generate S3 folder path
  generateS3FolderPath(folderName, userId, parentPath = '') {
    const sanitizedName = folderName.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    if (parentPath) {
      // Remove trailing slash from parent path if it exists
      const cleanParentPath = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath;
      return `${cleanParentPath}/${sanitizedName}/`;
    } else {
      return `folders/${userId}/${sanitizedName}/`;
    }
  }

  // Create folder in S3 (by creating a placeholder object)
  async createFolder(s3Path) {
    try {
      // Create a placeholder file to represent the folder
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: `${s3Path}.folderplaceholder`,
        Body: '',
        ContentType: 'text/plain',
        Metadata: {
          'folder-marker': 'true'
        }
      });

      await this.s3Client.send(command);
      
      return {
        success: true,
        s3Path: s3Path,
        message: 'Folder created in S3'
      };
    } catch (error) {
      console.error('S3 folder creation error:', error);
      throw new Error(`Failed to create folder in S3: ${error.message}`);
    }
  }

  // Delete folder and all its contents from S3
  async deleteFolder(s3Path) {
    try {
      // List all objects with the folder prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: s3Path,
      });

      const listResponse = await this.s3Client.send(listCommand);
      
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return { success: true, message: 'No objects found to delete' };
      }

      // Delete all objects in the folder
      const deletePromises = listResponse.Contents.map(object => {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: object.Key,
        });
        return this.s3Client.send(deleteCommand);
      });

      await Promise.all(deletePromises);

      return {
        success: true,
        deletedCount: listResponse.Contents.length,
        message: `Deleted ${listResponse.Contents.length} objects from S3`
      };
    } catch (error) {
      console.error('S3 folder deletion error:', error);
      throw new Error(`Failed to delete folder from S3: ${error.message}`);
    }
  }

  // List folder contents in S3
  async listFolderContents(s3Path) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: s3Path,
        Delimiter: '/',
      });

      const response = await this.s3Client.send(command);
      
      return {
        success: true,
        folders: response.CommonPrefixes?.map(prefix => prefix.Prefix) || [],
        files: response.Contents?.filter(obj => !obj.Key.endsWith('.folderplaceholder')) || []
      };
    } catch (error) {
      console.error('S3 folder listing error:', error);
      throw new Error(`Failed to list folder contents: ${error.message}`);
    }
  }

  // Check if folder exists in S3
  async folderExists(s3Path) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: s3Path,
        MaxKeys: 1,
      });

      const response = await this.s3Client.send(command);
      return response.Contents && response.Contents.length > 0;
    } catch (error) {
      console.error('S3 folder existence check error:', error);
      return false;
    }
  }

  // Get full S3 path for a folder hierarchy
  async getFolderHierarchyPath(folderId, Folder) {
    const buildPath = async (currentFolderId, pathParts = []) => {
      if (!currentFolderId) return pathParts.reverse().join('/');
      
      const folder = await Folder.findById(currentFolderId);
      if (!folder) return pathParts.reverse().join('/');
      
      pathParts.push(folder.name.replace(/[^a-zA-Z0-9-_]/g, '_'));
      
      if (folder.parentFolderId) {
        return buildPath(folder.parentFolderId, pathParts);
      }
      
      return pathParts.reverse().join('/');
    };

    const hierarchyPath = await buildPath(folderId);
    return hierarchyPath ? `folders/${hierarchyPath}/` : 'folders/';
  }
}

module.exports = new S3FolderService();