# Additional APIs Documentation

## Call Logs API

Base URL: `/api/call-logs`

### Get Call Logs
**GET** `/api/call-logs`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `userId`: Filter by user ID
- `search`: Search by call ID

**Success Response (200):**
```json
{
  "callLogs": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "callId": "CALL-2025-00001",
      "userId": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "leadId": {
        "name": "Customer Name",
        "contactNumber": "9876543210"
      },
      "dateTime": "2025-01-01T10:30:00.000Z",
      "createdAt": "2025-01-01T10:30:00.000Z"
    }
  ],
  "pagination": {
    "current": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

---

## Activity Logs API

Base URL: `/api/activity-logs`

### Get Activity Logs
**GET** `/api/activity-logs`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `userId`: Filter by user ID
- `type`: Filter by activity type
- `search`: Search by comment

**Success Response (200):**
```json
{
  "activityLogs": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "leadId": {
        "leadID": "LMS-2025-00001",
        "name": "Customer Name",
        "contactNumber": "9876543210"
      },
      "type": "call",
      "comment": "Follow-up call completed",
      "document": "doc-1234567890.pdf",
      "createdAt": "2025-01-01T10:30:00.000Z"
    }
  ],
  "pagination": {
    "current": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

---

## Lead Sources API

Base URL: `/api/lead-sources`

### Get All Lead Sources (Paginated)
**GET** `/api/lead-sources`

**Query Parameters:**
- `page`, `limit`, `search`
- `isApiSource`: Filter by API source (true/false)

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Google Ads",
      "slug": "google",
      "description": "Leads from Google Ads campaigns",
      "isApiSource": true,
      "leadCount": 450,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

### Get All Lead Sources (Simple)
**GET** `/api/lead-sources/all`

Returns all lead sources without pagination.

### Get Lead Source by ID
**GET** `/api/lead-sources/:id`

### Create Lead Source
**POST** `/api/lead-sources`

**Request Body:**
```json
{
  "name": "Instagram",
  "slug": "instagram",
  "description": "Leads from Instagram Ads",
  "isApiSource": true
}
```

### Update Lead Source
**PUT** `/api/lead-sources/:id`

### Delete Lead Source
**DELETE** `/api/lead-sources/:id`

**Error Response (400):**
```json
{
  "error": "Cannot delete lead source \"Google Ads\". This lead source has 450 leads. Please reassign or remove them first."
}
```

### Export Lead Sources
**GET** `/api/lead-sources/export`

---

## Project & House Types API

Base URL: `/api/project-and-house-types`

### Get All Types (Paginated)
**GET** `/api/project-and-house-types`

**Query Parameters:**
- `page`, `limit`, `search`
- `type`: Filter by type ("project" or "house")

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Villa",
      "type": "house",
      "description": "Independent villa",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

### Get Type by ID
**GET** `/api/project-and-house-types/:id`

### Create Type
**POST** `/api/project-and-house-types`

**Request Body:**
```json
{
  "name": "Apartment",
  "type": "house",
  "description": "Multi-story apartment"
}
```

### Update Type
**PUT** `/api/project-and-house-types/:id`

### Delete Type
**DELETE** `/api/project-and-house-types/:id`

### Export Types
**GET** `/api/project-and-house-types/export`

---

## Documents API

Base URL: `/api/documents`

### Upload Document
**POST** `/api/documents/upload`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Document file (max 50MB)
- `leadId`: Lead ID (optional)
- `folderId`: Folder ID (optional)
- `keywords`: Array of keyword IDs (optional)
- `description`: Document description (optional)

**Success Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "filename": "document.pdf",
  "originalName": "Project Proposal.pdf",
  "mimeType": "application/pdf",
  "size": 1024000,
  "uploadedBy": "507f1f77bcf86cd799439012",
  "leadId": "507f1f77bcf86cd799439013",
  "folderId": "507f1f77bcf86cd799439014",
  "keywords": ["507f1f77bcf86cd799439015"],
  "description": "Project proposal document",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### Get Documents
**GET** `/api/documents`

**Query Parameters:**
- `page`, `limit`
- `leadId`: Filter by lead
- `folderId`: Filter by folder
- `keyword`: Filter by keyword
- `search`: Search by filename/description

### Get Document
**GET** `/api/documents/:id`

### View Document
**GET** `/api/documents/:id/view`

Returns document file for viewing (supports flexible auth for iframe/img).

### Download Document
**GET** `/api/documents/:id/download`

Downloads document file.

### Update Document
**PUT** `/api/documents/:id`

**Request Body:**
```json
{
  "description": "Updated description",
  "keywords": ["507f1f77bcf86cd799439015"],
  "folderId": "507f1f77bcf86cd799439014"
}
```

### Delete Document
**DELETE** `/api/documents/:id`

Soft deletes document.

---

## Folders API

Base URL: `/api/folders`

### Get All Folders
**GET** `/api/folders`

### Create Folder
**POST** `/api/folders`

**Request Body:**
```json
{
  "name": "Project Documents",
  "parentId": "507f1f77bcf86cd799439011"
}
```

### Update Folder
**PUT** `/api/folders/:id`

### Delete Folder
**DELETE** `/api/folders/:id`

---

## Keywords API

Base URL: `/api/keywords`

### Get All Keywords
**GET** `/api/keywords`

### Create Keyword
**POST** `/api/keywords`

**Request Body:**
```json
{
  "name": "Contract",
  "color": "#FF5733"
}
```

### Update Keyword
**PUT** `/api/keywords/:id`

### Delete Keyword
**DELETE** `/api/keywords/:id`

---

## Lead Activities API

Base URL: `/api/lead-activities`

### Get Lead Activities
**GET** `/api/lead-activities`

**Query Parameters:**
- `leadId`: Filter by lead ID (required)
- `page`, `limit`

Returns historical snapshots of lead changes.

---

## Meta Token API

Base URL: `/api/meta`

### Refresh Meta Token
**POST** `/api/leads/test/refresh-token`

Manually triggers Meta API token refresh.

**Success Response (200):**
```json
{
  "message": "Token refresh completed successfully",
  "tokenExists": true,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## Notes

- All endpoints require authentication unless specified
- Soft delete is used for all delete operations
- File uploads support various formats (PDF, images, documents, etc.)
- Documents are stored with watermarks for security
- All dates use ISO 8601 format
- Pagination defaults: page=1, limit=10
