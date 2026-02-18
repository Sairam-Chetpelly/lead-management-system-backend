# Keywords API Documentation

Base URL: `/api/keywords`

## Overview
Keyword management endpoints for creating, reading, updating, and deleting keywords with usage tracking.

**Authentication Required:** All endpoints require JWT token.

---

## Endpoints

### 1. Get All Keywords (No Pagination)
**GET** `/api/keywords`

Retrieve all keywords without pagination for dropdown lists.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `search` (optional): Search by keyword name
- `sortBy` (optional): Sort field - "name" or "usageCount" (default: "usageCount")
- `sortOrder` (optional): Sort order - "asc" or "desc" (default: "desc")

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "keywords": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "luxury",
        "usageCount": 45,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "affordable",
        "usageCount": 38,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ]
  },
  "message": "Keywords retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to retrieve keywords

---

### 2. Get Keywords (Paginated)
**GET** `/api/keywords`

Retrieve paginated list of keywords with usage counts.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (required): Page number
- `limit` (required): Items per page
- `search` (optional): Search by keyword name
- `sortBy` (optional): Sort field - "name" or "usageCount" (default: "usageCount")
- `sortOrder` (optional): Sort order - "asc" or "desc" (default: "desc")

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "keywords": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "luxury",
        "usageCount": 45,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "affordable",
        "usageCount": 38,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  },
  "message": "Keywords retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to retrieve keywords

---

### 3. Get Keyword by ID
**GET** `/api/keywords/:id`

Retrieve a single keyword by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): Keyword ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "luxury",
    "usageCount": 45,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Keyword retrieved successfully"
}
```

**Error Responses:**
- `404`: Keyword not found
- `500`: Failed to retrieve keyword

---

### 4. Create Keyword
**POST** `/api/keywords`

Create a new keyword.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "luxury"
}
```

**Validation:**
- `name`: Required, non-empty string, unique, automatically converted to lowercase

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "luxury",
    "usageCount": 0,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Keyword created successfully"
}
```

**Error Responses:**
- `400`: Keyword already exists
- `401`: Unauthorized
- `500`: Failed to create keyword

---

### 5. Update Keyword
**PUT** `/api/keywords/:id`

Update an existing keyword.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required): Keyword ID

**Request Body:**
```json
{
  "name": "premium luxury"
}
```

**Validation:**
- `name`: Required, non-empty string, unique, automatically converted to lowercase

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "premium luxury",
    "usageCount": 45,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  },
  "message": "Keyword updated successfully"
}
```

**Error Responses:**
- `400`: Keyword already exists
- `404`: Keyword not found
- `500`: Failed to update keyword

---

### 6. Delete Keyword
**DELETE** `/api/keywords/:id`

Permanently delete a keyword.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): Keyword ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": null,
  "message": "Keyword deleted successfully"
}
```

**Error Responses:**
- `404`: Keyword not found
- `500`: Failed to delete keyword

---

## Keyword Fields

### Required Fields
- `name`: Keyword name (automatically converted to lowercase and trimmed)

### Auto-Generated Fields
- `_id`: Unique MongoDB ObjectId
- `usageCount`: Number of times keyword is used (default: 0)
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

---

## Usage Tracking

Keywords track their usage across:
- **Documents**: Documents can have multiple keywords assigned
- **Search**: Keywords are used for document search and filtering
- **Analytics**: Usage count helps identify popular tags

---

## Common Keywords

| Keyword | Usage Context |
|---------|---------------|
| luxury | High-end properties |
| affordable | Budget-friendly options |
| spacious | Large properties |
| modern | Contemporary design |
| furnished | Ready-to-move properties |
| gated-community | Secured complexes |
| near-metro | Transportation access |
| school-nearby | Family-friendly |
| investment | Investment properties |
| commercial | Business properties |

---

## Sorting Options

### Sort by Usage Count (Default)
Most used keywords appear first, useful for:
- Popular tag suggestions
- Trending keywords
- Analytics dashboards

### Sort by Name
Alphabetical order, useful for:
- Dropdown lists
- Search filters
- Organized displays

---

## Notes

- Keyword names are automatically converted to lowercase
- Keyword names are trimmed of whitespace
- Keyword names must be unique (case-insensitive)
- Usage count is automatically managed by the system
- Keywords are permanently deleted (no soft delete)
- Search is case-insensitive
- Keywords can contain spaces and special characters
- Empty or whitespace-only names are not allowed
