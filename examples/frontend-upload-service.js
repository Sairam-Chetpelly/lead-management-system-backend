// Frontend Upload Utility for Pre-signed URLs
// Works with React, Vue, or vanilla JavaScript

class S3UploadService {
  constructor(apiBaseUrl, getAuthToken) {
    this.apiBaseUrl = apiBaseUrl;
    this.getAuthToken = getAuthToken;
  }

  // Get authorization headers
  getHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Upload single file using pre-signed URL
  async uploadFile(file, folder = 'documents', onProgress = null) {
    try {
      // Step 1: Get pre-signed URL from backend
      const uploadUrlResponse = await fetch(`${this.apiBaseUrl}/presigned/upload-url`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          folder
        })
      });

      if (!uploadUrlResponse.ok) {
        const error = await uploadUrlResponse.json();
        throw new Error(error.message || 'Failed to get upload URL');
      }

      const { data: urlData } = await uploadUrlResponse.json();

      // Step 2: Upload file directly to S3
      const uploadResponse = await this.uploadToS3(file, urlData.uploadUrl, onProgress);

      // Step 3: Verify upload completion
      const verifyResponse = await fetch(`${this.apiBaseUrl}/presigned/verify/${encodeURIComponent(urlData.key)}`, {
        headers: this.getHeaders()
      });

      if (!verifyResponse.ok) {
        throw new Error('Upload verification failed');
      }

      const { data: verificationData } = await verifyResponse.json();

      return {
        success: true,
        key: urlData.key,
        size: verificationData.size,
        contentType: verificationData.contentType,
        uploadedAt: verificationData.lastModified,
        category: urlData.category
      };

    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  // Upload file directly to S3 using pre-signed URL
  async uploadToS3(file, uploadUrl, onProgress = null) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  // Upload multiple files
  async uploadMultipleFiles(files, folder = 'documents', onProgress = null) {
    try {
      // Step 1: Get pre-signed URLs for all files
      const filesData = Array.from(files).map(file => ({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      }));

      const urlsResponse = await fetch(`${this.apiBaseUrl}/presigned/batch-upload-urls`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          files: filesData,
          folder
        })
      });

      if (!urlsResponse.ok) {
        const error = await urlsResponse.json();
        throw new Error(error.message || 'Failed to get upload URLs');
      }

      const { data: urlsData } = await urlsResponse.json();

      // Step 2: Upload all files concurrently
      const uploadPromises = urlsData.success.map(async (urlInfo, index) => {
        const file = files[index];
        
        try {
          await this.uploadToS3(file, urlInfo.uploadUrl, (progress) => {
            if (onProgress) {
              onProgress(index, progress, file.name);
            }
          });

          // Verify upload
          const verifyResponse = await fetch(`${this.apiBaseUrl}/presigned/verify/${encodeURIComponent(urlInfo.key)}`, {
            headers: this.getHeaders()
          });

          if (verifyResponse.ok) {
            const { data: verificationData } = await verifyResponse.json();
            return {
              success: true,
              fileName: file.name,
              key: urlInfo.key,
              size: verificationData.size,
              contentType: verificationData.contentType
            };
          } else {
            throw new Error('Verification failed');
          }

        } catch (error) {
          return {
            success: false,
            fileName: file.name,
            error: error.message
          };
        }
      });

      const results = await Promise.all(uploadPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return {
        success: failed.length === 0,
        uploaded: successful,
        failed,
        totalFiles: files.length,
        successCount: successful.length,
        errorCount: failed.length
      };

    } catch (error) {
      throw new Error(`Batch upload failed: ${error.message}`);
    }
  }

  // Get download URL for a file
  async getDownloadUrl(key, expiresIn = 3600) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/presigned/download-url/${encodeURIComponent(key)}?expires=${expiresIn}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get download URL');
      }

      const { data } = await response.json();
      return data.downloadUrl;

    } catch (error) {
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
  }

  // Delete file
  async deleteFile(key) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/presigned/delete/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete file');
      }

      return true;

    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  // Get allowed file types
  async getAllowedTypes() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/presigned/file-types`);
      
      if (!response.ok) {
        throw new Error('Failed to get allowed types');
      }

      const { data } = await response.json();
      return data;

    } catch (error) {
      throw new Error(`Failed to get allowed types: ${error.message}`);
    }
  }
}

// Vanilla JavaScript Example
async function simpleUpload(file, token) {
  const uploadService = new S3UploadService('http://localhost:5000/api', () => token);
  
  try {
    const result = await uploadService.uploadFile(file, 'documents', (progress) => {
      console.log(`Upload progress: ${progress}%`);
    });
    
    console.log('Upload successful:', result);
    return result;
    
  } catch (error) {
    console.error('Upload failed:', error.message);
    throw error;
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { S3UploadService, simpleUpload };
}

if (typeof window !== 'undefined') {
  window.S3UploadService = S3UploadService;
  window.simpleUpload = simpleUpload;
}