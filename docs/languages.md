# Languages API Documentation

Base URL: `/api/admin`

## Overview
Language management endpoints for creating, reading, updating, and deleting languages with usage tracking.

**Authentication Required:** All endpoints require JWT token.

---

## Endpoints

### 1. Get All Languages (Dropdown)
**GET** `/api/admin/languages/all`

Retrieve all languages without pagination for dropdown lists.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "English",
      "slug": "english",
      "code": "en"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Hindi",
      "slug": "hindi",
      "code": "hi"
    }
  ],
  "message": "Languages retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to retrieve languages

---

### 2. Get Languages (Paginated)
**GET** `/api/admin/languages`

Retrieve paginated list of languages with usage counts.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name, slug, or code

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "languages": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "English",
        "slug": "english",
        "code": "en",
        "userCount": 45,
        "leadCount": 120,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Hindi",
        "slug": "hindi",
        "code": "hi",
        "userCount": 38,
        "leadCount": 95,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 3,
      "total": 25,
      "limit": 10
    }
  },
  "message": "Languages retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to retrieve languages

---

### 3. Get Language by ID
**GET** `/api/admin/languages/:id`

Retrieve a single language by ID with usage counts.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): Language ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "English",
    "slug": "english",
    "code": "en",
    "userCount": 45,
    "leadCount": 120,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Language retrieved successfully"
}
```

**Error Responses:**
- `404`: Language not found
- `500`: Failed to retrieve language

---

### 4. Create Language
**POST** `/api/admin/languages`

Create a new language.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "English",
  "slug": "english",
  "code": "en"
}
```

**Validation:**
- `name`: Required, non-empty string
- `slug`: Required, non-empty string, unique
- `code`: Required, non-empty string (ISO 639-1 language code)

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "English",
    "slug": "english",
    "code": "en",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Language created successfully"
}
```

**Error Responses:**
- `400`: Validation failed or duplicate slug
- `401`: Unauthorized
- `500`: Failed to create language

---

### 5. Update Language
**PUT** `/api/admin/languages/:id`

Update an existing language.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required): Language ID

**Request Body:**
```json
{
  "name": "English (Updated)",
  "slug": "english",
  "code": "en"
}
```

**Validation:** Same as create (all fields optional)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "English (Updated)",
    "slug": "english",
    "code": "en",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  },
  "message": "Language updated successfully"
}
```

**Error Responses:**
- `400`: Validation failed
- `404`: Language not found
- `500`: Failed to update language

---

### 6. Delete Language
**DELETE** `/api/admin/languages/:id`

Soft delete a language with usage validation.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): Language ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": null,
  "message": "Language deleted successfully"
}
```

**Error Responses:**
- `400`: Cannot delete language with assigned users or leads
- `404`: Language not found
- `500`: Failed to delete language

**Validation:**
Languages with assigned users or leads cannot be deleted. Example error:
```json
{
  "status": "error",
  "message": "Cannot delete language \"English\". This language has 45 users and 120 leads. Please reassign or remove them first."
}
```

---

### 7. Export Languages
**GET** `/api/admin/languages/export`

Export all languages as CSV data.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "Name": "English",
      "Slug": "english",
      "Code": "en",
      "User Count": 45,
      "Lead Count": 120,
      "Created": "2025-01-15T10:30:00.000Z"
    },
    {
      "Name": "Hindi",
      "Slug": "hindi",
      "Code": "hi",
      "User Count": 38,
      "Lead Count": 95,
      "Created": "2025-01-15T10:30:00.000Z"
    }
  ],
  "message": "Languages exported successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to export languages

---

## Language Fields

### Required Fields
- `name`: Language name (e.g., "English", "Hindi")
- `slug`: URL-friendly identifier (e.g., "english", "hindi")
- `code`: ISO 639-1 language code (e.g., "en", "hi")

### Auto-Generated Fields
- `_id`: Unique MongoDB ObjectId
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `deletedAt`: Soft delete timestamp (null if active)

### Computed Fields
- `userCount`: Number of users assigned to this language
- `leadCount`: Number of leads assigned to this language

---

## Usage Tracking

Languages track their usage across:
- **Users**: Users can have multiple languages assigned via `languageIds` array
- **Leads**: Lead activities can have a single language assigned via `languageId`

---

## Common Language Codes

| Language | Code | Slug |
|----------|------|------|
| English | en | english |
| Hindi | hi | hindi |
| Marathi | mr | marathi |
| Gujarati | gu | gujarati |
| Tamil | ta | tamil |
| Telugu | te | telugu |
| Kannada | kn | kannada |
| Malayalam | ml | malayalam |
| Bengali | bn | bengali |
| Punjabi | pa | punjabi |

---

## Notes

- Language slugs must be unique across all languages
- Languages cannot be deleted if they are assigned to users or leads
- Language codes should follow ISO 639-1 standard (2-letter codes)
- All delete operations are soft deletes (sets `deletedAt` timestamp)
- Search functionality works across name, slug, and code fields
- Usage counts are calculated dynamically for each request
