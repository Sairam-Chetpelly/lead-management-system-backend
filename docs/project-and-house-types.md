# Project and House Types API Documentation

Base URL: `/api/project-and-house-types`

## Overview
Project and house type management endpoints for creating, reading, updating, and deleting types with usage tracking.

**Authentication Required:** Not required for most endpoints (public API).

---

## Endpoints

### 1. Get Project and House Types (Paginated)
**GET** `/api/project-and-house-types`

Retrieve paginated list of project and house types.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name or description
- `type` (optional): Filter by type ("project" or "house")

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "types": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Villa",
        "type": "house",
        "description": "Independent villa with garden",
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Residential Complex",
        "type": "project",
        "description": "Multi-unit residential project",
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 2,
      "total": 15,
      "limit": 10
    }
  },
  "message": "Project and house types retrieved successfully"
}
```

**Error Responses:**
- `500`: Failed to retrieve types

---

### 2. Get Type by ID
**GET** `/api/project-and-house-types/:id`

Retrieve a single project or house type by ID.

**Path Parameters:**
- `id` (required): Type ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Villa",
    "type": "house",
    "description": "Independent villa with garden",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Type retrieved successfully"
}
```

**Error Responses:**
- `404`: Type not found
- `500`: Failed to retrieve type

---

### 3. Create Type
**POST** `/api/project-and-house-types`

Create a new project or house type.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Villa",
  "type": "house",
  "description": "Independent villa with garden"
}
```

**Validation:**
- `name`: Required, non-empty string
- `type`: Required, must be "project" or "house"
- `description`: Required, non-empty string

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Villa",
    "type": "house",
    "description": "Independent villa with garden",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Type created successfully"
}
```

**Error Responses:**
- `400`: Validation failed
- `500`: Failed to create type

---

### 4. Update Type
**PUT** `/api/project-and-house-types/:id`

Update an existing project or house type.

**Headers:**
```
Content-Type: application/json
```

**Path Parameters:**
- `id` (required): Type ID

**Request Body:**
```json
{
  "name": "Luxury Villa",
  "type": "house",
  "description": "Premium independent villa with garden"
}
```

**Validation:** Same as create (all fields optional)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Luxury Villa",
    "type": "house",
    "description": "Premium independent villa with garden",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  },
  "message": "Type updated successfully"
}
```

**Error Responses:**
- `400`: Validation failed
- `404`: Type not found
- `500`: Failed to update type

---

### 5. Delete Type
**DELETE** `/api/project-and-house-types/:id`

Soft delete a project or house type with usage validation.

**Path Parameters:**
- `id` (required): Type ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": null,
  "message": "house deleted successfully"
}
```

**Error Responses:**
- `400`: Cannot delete type with assigned leads
- `404`: Type not found
- `500`: Failed to delete type

**Validation:**
Types with assigned leads cannot be deleted. Example error:
```json
{
  "status": "error",
  "message": "Cannot delete house \"Villa\". This house has 25 leads. Please reassign or remove them first."
}
```

---

### 6. Export Types
**GET** `/api/project-and-house-types/export`

Export all project and house types as CSV data.

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "Name": "Villa",
      "Type": "house",
      "Description": "Independent villa with garden",
      "Created": "2025-01-15T10:30:00.000Z"
    },
    {
      "Name": "Residential Complex",
      "Type": "project",
      "Description": "Multi-unit residential project",
      "Created": "2025-01-15T10:30:00.000Z"
    }
  ],
  "message": "Project and house types exported successfully"
}
```

**Error Responses:**
- `500`: Failed to export types

---

## Type Fields

### Required Fields
- `name`: Type name (e.g., "Villa", "Apartment", "Residential Complex")
- `type`: Type category - "project" or "house"
- `description`: Description of the type

### Auto-Generated Fields
- `_id`: Unique MongoDB ObjectId
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `deletedAt`: Soft delete timestamp (null if active)

---

## Type Categories

### Project Types (`type: "project"`)
Large-scale real estate projects with multiple units:
- Residential Complex
- Commercial Complex
- Mixed-Use Development
- Township
- Gated Community

### House Types (`type: "house"`)
Individual property types:
- Villa
- Apartment
- Penthouse
- Studio
- Duplex
- Row House
- Independent House

---

## Common Types

| Name | Type | Description |
|------|------|-------------|
| Villa | house | Independent villa with garden |
| Apartment | house | Multi-story residential unit |
| Penthouse | house | Top-floor luxury apartment |
| Studio | house | Single-room apartment |
| Duplex | house | Two-floor apartment |
| Row House | house | Attached single-family homes |
| Residential Complex | project | Multi-unit residential project |
| Commercial Complex | project | Office and retail spaces |
| Township | project | Large integrated development |
| Gated Community | project | Secured residential community |

---

## Usage Tracking

Types track their usage across:
- **Leads**: Lead activities can have project type via `projectTypeId` or house type via `houseTypeId`
- **Analytics**: Used for property type analysis and inventory tracking

---

## Notes

- Types cannot be deleted if they have assigned leads
- All delete operations are soft deletes (sets `deletedAt` timestamp)
- Search functionality works across name and description fields
- Type field must be either "project" or "house"
- Project types are used for large-scale developments
- House types are used for individual property units
- Both types can be used together in lead management
