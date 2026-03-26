# Documents API Documentation

Base URL: `/api/documents`

## Overview
Document management endpoints for uploading, viewing, downloading, and managing documents.

**Authentication Required:** All endpoints require JWT token (except view with flexible auth).

---

## Endpoints

### 1. Upload Document
**POST** `/api/documents/upload`

Upload a new document with metadata.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` (required): Document file
- `folderId` (optional): Folder ID to organize document
- `category` (required): Document category
- `title` (optional): Document title
- `subtitle` (optional): Document subtitle
- `keywords` (optional): Comma-separated keywords

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "report.pdf",
    "originalName": "Sales Report Q1.pdf",
    "filePath": "/uploads/documents/report-123456.pdf",
    "fileType": "application/pdf",
    "fileSize": 1048576,
    "title": "Sales Report Q1",
    "subtitle": "First Quarter Analysis",
    "category": "reports",
    "keywords": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "sales"
      }
    ],
    "folderId": "507f1f77bcf86cd799439013",
    "uploadedBy": "507f1f77bcf86cd799439014",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Document uploaded successfully"
}
```

**Error Responses:**
- `400`: No file provided or validation failed
- `401`: Unauthorized
- `500`: Failed to upload document

---

### 2. Get Documents
**GET** `/api/documents`

Retrieve paginated list of documents with filtering.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by title, subtitle, or filename
- `category` (optional): Filter by category
- `folderId` (optional): Filter by folder ID
- `keywords` (optional): Filter by keyword IDs (comma-separated)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "documents": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "fileName": "report.pdf",
        "originalName": "Sales Report Q1.pdf",
        "title": "Sales Report Q1",
        "subtitle": "First Quarter Analysis",
        "category": "reports",
        "fileType": "application/pdf",
        "fileSize": 1048576,
        "keywords": [
          {
            "_id": "507f1f77bcf86cd799439012",
            "name": "sales"
          }
        ],
        "uploadedBy": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "createdAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 50,
      "limit": 10
    }
  },
  "message": "Documents retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to retrieve documents

---

### 3. Get Document
**GET** `/api/documents/:id`

Retrieve single document details.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): Document ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "report.pdf",
    "originalName": "Sales Report Q1.pdf",
    "filePath": "/uploads/documents/report-123456.pdf",
    "fileType": "application/pdf",
    "fileSize": 1048576,
    "title": "Sales Report Q1",
    "subtitle": "First Quarter Analysis",
    "category": "reports",
    "keywords": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "sales"
      }
    ],
    "folderId": "507f1f77bcf86cd799439013",
    "uploadedBy": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Document retrieved successfully"
}
```

**Error Responses:**
- `404`: Document not found
- `500`: Failed to retrieve document

---

### 4. View Document
**GET** `/api/documents/:id/view`

View document in browser (flexible authentication for iframe/img src).

**Headers:**
```
Authorization: Bearer <token> (optional - can also use query param)
```

**Query Parameters:**
- `token` (optional): JWT token as query parameter

**Path Parameters:**
- `id` (required): Document ID

**Success Response (200):**
- Returns document file for viewing in browser

**Error Responses:**
- `401`: Unauthorized
- `404`: Document not found
- `500`: Failed to view document

---

### 5. Download Document
**GET** `/api/documents/:id/download`

Download document file.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): Document ID

**Success Response (200):**
- Returns document file as download
- Content-Disposition: attachment

**Error Responses:**
- `400`: Invalid document ID or file not found
- `401`: Unauthorized
- `404`: Document not found
- `500`: Failed to download document

---

### 6. Update Document
**PUT** `/api/documents/:id`

Update document metadata.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required): Document ID

**Request Body:**
```json
{
  "title": "Updated Title",
  "subtitle": "Updated Subtitle",
  "category": "reports",
  "keywords": ["sales", "quarterly"]
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Updated Title",
    "subtitle": "Updated Subtitle",
    "category": "reports",
    "keywords": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "sales"
      }
    ],
    "updatedAt": "2025-01-15T11:00:00.000Z"
  },
  "message": "Document updated successfully"
}
```

**Error Responses:**
- `404`: Document not found
- `500`: Failed to update document

---

### 7. Delete Document
**DELETE** `/api/documents/:id`

Soft delete document.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): Document ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": null,
  "message": "Document deleted successfully"
}
```

**Error Responses:**
- `404`: Document not found
- `500`: Failed to delete document

---

## Document Fields

### Required Fields
- `file`: Document file (on upload)
- `category`: Document category

### Optional Fields
- `title`: Document title
- `subtitle`: Document subtitle
- `keywords`: Array of keyword names
- `folderId`: Folder ID for organization

### Auto-Generated Fields
- `_id`: Unique MongoDB ObjectId
- `fileName`: Stored filename
- `originalName`: Original uploaded filename
- `filePath`: Server file path
- `fileType`: MIME type
- `fileSize`: File size in bytes
- `uploadedBy`: User who uploaded the document
- `createdAt`: Timestamp of upload
- `updatedAt`: Timestamp of last update
- `deletedAt`: Soft delete timestamp (null if active)

---

## Document Categories

Common categories:
- `reports`: Business reports
- `contracts`: Legal contracts
- `invoices`: Financial invoices
- `presentations`: Presentation files
- `images`: Image files
- `other`: Miscellaneous documents

---

## Supported File Types

- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV
- **Images**: JPG, JPEG, PNG, GIF, SVG
- **Videos**: MP4, AVI, MOV
- **Audio**: MP3, WAV
- **Archives**: ZIP, RAR

---

## Notes

- Maximum file size may be limited by server configuration
- Files are stored in `/uploads/documents/` directory
- Original filenames are preserved in `originalName` field
- Stored filenames are unique to prevent conflicts
- Keywords are automatically created if they don't exist
- View endpoint supports flexible authentication for embedding
- Download endpoint forces file download with proper headers
- All delete operations are soft deletes (sets `deletedAt` timestamp)
- Search works across title, subtitle, and filename
