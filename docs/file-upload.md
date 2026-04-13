# S3 File Upload Service Documentation

## Overview
This service provides comprehensive file upload functionality with S3 integration, automatic watermarking for images and PDFs, and secure file management.

## Features
- ✅ Single and multiple file uploads
- ✅ Automatic watermarking for images and PDFs
- ✅ File type validation
- ✅ Secure S3 storage with private ACL
- ✅ Signed URL generation for secure access
- ✅ File deletion from S3
- ✅ Temporary file cleanup
- ✅ Error handling and validation

## Supported File Types
- **Images**: JPEG, JPG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX
- **Spreadsheets**: XLS, XLSX
- **Text**: TXT, CSV

## API Endpoints

### 1. Upload Single File
```
POST /api/files/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- file: File (required)
- folder: String (optional, default: "documents")
- watermark: String (optional, default: "true")
```

### 2. Upload Multiple Files
```
POST /api/files/upload-multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- files: File[] (required, max 10 files)
- folder: String (optional, default: "documents")
- watermark: String (optional, default: "true")
```

### 3. Delete File
```
DELETE /api/files/:key
Authorization: Bearer <token>
```

### 4. Get Signed URL
```
GET /api/files/url/:key?expires=3600
Authorization: Bearer <token>
```

### 5. Get Allowed Types
```
GET /api/files/allowed-types
```

## Usage Examples

### Frontend JavaScript (with fetch)
```javascript
// Single file upload
async function uploadFile(file, folder = 'documents', watermark = true) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('watermark', watermark.toString());

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
}

// Multiple files upload
async function uploadMultipleFiles(files, folder = 'documents', watermark = true) {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  formData.append('folder', folder);
  formData.append('watermark', watermark.toString());

  const response = await fetch('/api/files/upload-multiple', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
}

// Get file URL
async function getFileUrl(key, expires = 3600) {
  const response = await fetch(`/api/files/url/${key}?expires=${expires}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
}

// Delete file
async function deleteFile(key) {
  const response = await fetch(`/api/files/${key}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
}
```

### Backend Usage (Direct Service)
```javascript
const { uploadFile, uploadMultipleFiles, deleteFromS3, getSignedUrl } = require('./utils/s3Service');

// Upload single file
const result = await uploadFile(file, 'images', true);

// Upload multiple files
const results = await uploadMultipleFiles(files, 'documents', false);

// Delete file
await deleteFromS3('documents/1234567890_file.pdf');

// Get signed URL
const url = await getSignedUrl('documents/1234567890_file.pdf', 7200);
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "key": "documents/1234567890_example.pdf",
    "location": "https://bucket.s3.region.amazonaws.com/documents/1234567890_example.pdf",
    "bucket": "your-bucket-name",
    "originalName": "example.pdf",
    "mimeType": "application/pdf",
    "size": 1024000,
    "watermarked": true
  }
}
```

### Multiple Files Response
```json
{
  "success": true,
  "message": "All files uploaded successfully",
  "data": {
    "uploaded": [...],
    "errors": [],
    "totalFiles": 3,
    "successCount": 3,
    "errorCount": 0
  }
}
```

## Configuration

### Environment Variables
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=your-bucket-name
```

### File Limits
- Maximum file size: 50MB
- Maximum files per request: 10
- Supported formats: See "Supported File Types" section

## Watermarking
- Automatically applied to images and PDFs when `watermark=true`
- Uses company logo from `backend/assets/logo.png`
- Fallback to text watermark if logo not found
- Configurable opacity and positioning

## Security Features
- JWT authentication required
- File type validation
- Private S3 ACL (files not publicly accessible)
- Signed URLs for secure access
- Temporary file cleanup
- Rate limiting protection

## Error Handling
- File type validation errors
- File size limit errors
- S3 upload failures
- Watermarking failures (graceful fallback)
- Temporary file cleanup on errors

## Folder Structure
```
uploads/
├── temp/           # Temporary files (auto-cleaned)
└── ...

S3 Structure:
├── documents/      # Default folder
├── images/         # Image uploads
├── profiles/       # Profile pictures
└── ...            # Custom folders
```