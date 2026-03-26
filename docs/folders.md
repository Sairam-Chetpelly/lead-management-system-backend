# Folders API Documentation

Base URL: `/api/folders`

## Overview
Folder management endpoints for organizing documents in a hierarchical structure.

**Authentication Required:** All endpoints require JWT token.

---

## Endpoints

### 1. Get Folders
**GET** `/api/folders`

Retrieve folders by parent or root level.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `parentFolderId` (optional): Parent folder ID (omit or null for root folders)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "folders": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Sales Documents",
        "parentFolderId": null,
        "createdBy": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ]
  },
  "message": "Folders retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to retrieve folders

---

### 2. Get Folder Contents
**GET** `/api/folders/:id`

Retrieve folder details with subfolders and documents.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): Folder ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "folder": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Sales Documents",
      "parentFolderId": null,
      "createdBy": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    },
    "subfolders": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Q1 Reports",
        "parentFolderId": "507f1f77bcf86cd799439011"
      }
    ],
    "documents": [
      {
        "_id": "507f1f77bcf86cd799439014",
        "title": "Sales Report",
        "fileName": "report.pdf",
        "folderId": "507f1f77bcf86cd799439011",
        "uploadedBy": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "John Doe",
          "email": "john@example.com"
        }
      }
    ]
  },
  "message": "Folder contents retrieved successfully"
}
```

**Error Responses:**
- `404`: Folder not found
- `500`: Failed to retrieve folder contents

---

### 3. Create Folder
**POST** `/api/folders`

Create a new folder.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Sales Documents",
  "parentFolderId": null
}
```

**Validation:**
- `name`: Required, non-empty string
- `parentFolderId`: Optional, parent folder ID (null for root level)

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Sales Documents",
    "parentFolderId": null,
    "createdBy": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Folder created successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to create folder

---

### 4. Update Folder
**PUT** `/api/folders/:id`

Update folder name.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required): Folder ID

**Request Body:**
```json
{
  "name": "Updated Folder Name"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Updated Folder Name",
    "parentFolderId": null,
    "createdBy": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  },
  "message": "Folder updated successfully"
}
```

**Error Responses:**
- `404`: Folder not found
- `500`: Failed to update folder

---

### 5. Delete Folder
**DELETE** `/api/folders/:id`

Soft delete folder and all its contents (subfolders and documents).

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): Folder ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": null,
  "message": "Folder deleted successfully"
}
```

**Error Responses:**
- `404`: Folder not found
- `500`: Failed to delete folder

**Note:** Deleting a folder will also soft delete all subfolders and documents within it.

---

## Folder Fields

### Required Fields
- `name`: Folder name

### Optional Fields
- `parentFolderId`: Parent folder ID (null for root level)

### Auto-Generated Fields
- `_id`: Unique MongoDB ObjectId
- `createdBy`: User who created the folder
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `deletedAt`: Soft delete timestamp (null if active)

---

## Folder Structure

### Root Level Folders
- `parentFolderId`: null
- Top-level folders in the hierarchy

### Nested Folders
- `parentFolderId`: ID of parent folder
- Can be nested multiple levels deep

---

## Notes

- Folders support hierarchical organization
- Deleting a folder cascades to all subfolders and documents
- All delete operations are soft deletes (sets `deletedAt` timestamp)
- Folders are sorted by creation date (newest first)
- Only folder name can be updated (not parent folder)
- Created by user is automatically set from JWT token
