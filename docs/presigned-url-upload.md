# Pre-signed URL File Upload Service - BEST PRACTICE

## 🚀 Why Pre-signed URLs?

**Traditional Upload Flow Problems:**
- AWS credentials exposed to frontend
- Files go through backend (bandwidth bottleneck)
- Backend memory usage for large files
- Slower uploads due to double transfer

**Pre-signed URL Benefits:**
- ✅ **Secure**: No AWS credentials exposed
- ✅ **Fast**: Direct upload to S3
- ✅ **Scalable**: No backend load during upload
- ✅ **Efficient**: Single transfer, no memory usage
- ✅ **Controlled**: Time-limited URLs with validation

## 📋 Flow Diagram

```
Frontend → Backend: Request upload URL
Backend → S3: Generate pre-signed URL
Backend → Frontend: Return pre-signed URL
Frontend → S3: Upload file directly
Frontend → Backend: Verify upload completion
```

## 🛠 Implementation

### Backend Services

#### 1. Pre-signed URL Service (`utils/presignedUrlService.js`)
- Generates secure upload URLs
- Validates file types and sizes
- Creates unique S3 keys
- Handles batch operations

#### 2. Controller (`controllers/presignedUrlController.js`)
- API endpoints for URL generation
- Upload verification
- File management operations

#### 3. Routes (`routes/presignedUrl.js`)
- RESTful API with Swagger docs
- Authentication middleware
- Error handling

### Frontend Integration

#### JavaScript/React Service (`examples/frontend-upload-service.js`)
- Complete upload utility class
- Progress tracking
- Error handling
- Batch uploads

## 🔧 API Endpoints

### Generate Upload URL
```http
POST /api/presigned/upload-url
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileName": "document.pdf",
  "fileType": "application/pdf",
  "fileSize": 1024000,
  "folder": "documents"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://bucket.s3.region.amazonaws.com/...",
    "key": "documents/1234567890_uuid_document.pdf",
    "expiresIn": 300,
    "maxSize": 52428800,
    "category": "documents"
  }
}
```

### Batch Upload URLs
```http
POST /api/presigned/batch-upload-urls
Authorization: Bearer <token>

{
  "files": [
    {
      "fileName": "doc1.pdf",
      "fileType": "application/pdf", 
      "fileSize": 1024000
    },
    {
      "fileName": "image1.jpg",
      "fileType": "image/jpeg",
      "fileSize": 512000
    }
  ],
  "folder": "documents"
}
```

### Verify Upload
```http
GET /api/presigned/verify/{key}
Authorization: Bearer <token>
```

### Get Download URL
```http
GET /api/presigned/download-url/{key}?expires=3600
Authorization: Bearer <token>
```

### Delete File
```http
DELETE /api/presigned/delete/{key}
Authorization: Bearer <token>
```

## 💻 Frontend Usage Examples

### Vanilla JavaScript
```javascript
const uploadService = new S3UploadService('http://localhost:5000/api', () => token);

// Single file upload
const result = await uploadService.uploadFile(file, 'documents', (progress) => {
  console.log(`Upload progress: ${progress}%`);
});

// Multiple files
const results = await uploadService.uploadMultipleFiles(files, 'documents');
```

### React Hook
```javascript
function useS3Upload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const uploadFile = async (file, folder = 'documents') => {
    setUploading(true);
    try {
      const result = await uploadService.uploadFile(file, folder, setProgress);
      return result;
    } finally {
      setUploading(false);
    }
  };
  
  return { uploadFile, uploading, progress };
}
```

### React Component
```jsx
function FileUpload() {
  const { uploadFile, uploading, progress } = useS3Upload();
  
  const handleUpload = async (event) => {
    const file = event.target.files[0];
    try {
      const result = await uploadFile(file, 'documents');
      console.log('Upload successful:', result);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };
  
  return (
    <div>
      <input type="file" onChange={handleUpload} disabled={uploading} />
      {uploading && <progress value={progress} max="100" />}
    </div>
  );
}
```

## 🔒 Security Features

### File Validation
- **Type checking**: Only allowed MIME types
- **Size limits**: Per category limits (images: 10MB, docs: 50MB)
- **Filename sanitization**: Remove special characters
- **Unique keys**: Timestamp + UUID prevents conflicts

### Access Control
- **JWT authentication**: Required for all operations
- **Private S3 ACL**: Files not publicly accessible
- **Signed URLs**: Time-limited access (default 5 minutes)
- **Content-Type validation**: Prevents MIME type spoofing

### Upload Security
```javascript
// Backend validation
const params = {
  Bucket: BUCKET_NAME,
  Key: s3Key,
  Expires: 300, // 5 minutes
  ContentType: fileType,
  ContentLength: fileSize,
  Conditions: [
    ['content-length-range', 0, maxSize],
    ['eq', '$Content-Type', fileType]
  ]
};
```

## 📊 File Type Limits

| Category | Types | Max Size |
|----------|-------|----------|
| **Images** | JPEG, PNG, GIF, WebP | 10 MB |
| **Documents** | PDF, DOC, DOCX | 50 MB |
| **Spreadsheets** | XLS, XLSX | 25 MB |
| **Text** | TXT, CSV | 5 MB |

## 🧪 Testing

### Test S3 Connection
```bash
node test-s3.js
```

### HTML Test Interface
Open `test-presigned-upload.html` in browser for interactive testing.

### Manual API Testing
```bash
# Get upload URL
curl -X POST http://localhost:5000/api/presigned/upload-url \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.pdf","fileType":"application/pdf","fileSize":1024}'

# Upload to S3 (use returned URL)
curl -X PUT "<presigned-url>" \
  -H "Content-Type: application/pdf" \
  --data-binary @test.pdf

# Verify upload
curl http://localhost:5000/api/presigned/verify/documents/123_test.pdf \
  -H "Authorization: Bearer <token>"
```

## 🚀 Production Deployment

### Environment Variables
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=your-bucket-name
```

### S3 Bucket Configuration
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::account:user/your-user"},
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket/*"
    }
  ]
}
```

### CORS Configuration
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "DELETE"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## 🔄 Advanced Features

### Watermarking Integration
For watermarking with pre-signed URLs, consider:
1. **Lambda Triggers**: S3 event → Lambda → apply watermark
2. **Processing Endpoint**: Separate API for post-upload processing
3. **Queue System**: Background processing with SQS

### Monitoring
- CloudWatch metrics for upload success/failure
- S3 access logs
- Application logs for debugging

### Optimization
- **CDN**: CloudFront for faster downloads
- **Multipart uploads**: For large files (>100MB)
- **Compression**: Client-side compression before upload

## 🎯 Best Practices Summary

1. **Always validate** file types and sizes on backend
2. **Use short expiration times** for upload URLs (5-15 minutes)
3. **Implement progress tracking** for better UX
4. **Verify uploads** after completion
5. **Handle errors gracefully** with retry logic
6. **Monitor upload metrics** for performance insights
7. **Use unique file keys** to prevent conflicts
8. **Implement proper CORS** for cross-origin uploads

This implementation provides a production-ready, secure, and scalable file upload solution following AWS best practices.