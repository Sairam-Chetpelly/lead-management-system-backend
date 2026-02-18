# Centres API Documentation

Base URL: `/api/admin`

## Overview
Centre management endpoints for creating, reading, updating, and deleting centres with usage tracking.

**Authentication Required:** All endpoints require JWT token.

---

## Endpoints

### 1. Get All Centres (Dropdown)
**GET** `/api/admin/centres/all`

Retrieve all centres without pagination for dropdown lists.

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
      "name": "Mumbai",
      "slug": "mumbai"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Delhi",
      "slug": "delhi"
    }
  ],
  "message": "Centres retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to retrieve centres

---

### 2. Get Centres (Paginated)
**GET** `/api/admin/centres`

Retrieve paginated list of centres with usage counts.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name or slug

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "centres": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Mumbai",
        "slug": "mumbai",
        "userCount": 85,
        "leadCount": 450,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Delhi",
        "slug": "delhi",
        "userCount": 72,
        "leadCount": 380,
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
  "message": "Centres retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to retrieve centres

---

### 3. Get Centre by ID
**GET** `/api/admin/centres/:id`

Retrieve a single centre by ID with usage counts.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): Centre ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Mumbai",
    "slug": "mumbai",
    "userCount": 85,
    "leadCount": 450,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Centre retrieved successfully"
}
```

**Error Responses:**
- `404`: Centre not found
- `500`: Failed to retrieve centre

---

### 4. Create Centre
**POST** `/api/admin/centres`

Create a new centre.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Mumbai",
  "slug": "mumbai"
}
```

**Validation:**
- `name`: Required, non-empty string
- `slug`: Required, non-empty string, unique

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Mumbai",
    "slug": "mumbai",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Centre created successfully"
}
```

**Error Responses:**
- `400`: Validation failed or duplicate slug
- `401`: Unauthorized
- `500`: Failed to create centre

---

### 5. Update Centre
**PUT** `/api/admin/centres/:id`

Update an existing centre.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required): Centre ID

**Request Body:**
```json
{
  "name": "Mumbai (Updated)",
  "slug": "mumbai"
}
```

**Validation:** Same as create (all fields optional)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Mumbai (Updated)",
    "slug": "mumbai",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  },
  "message": "Centre updated successfully"
}
```

**Error Responses:**
- `400`: Validation failed
- `404`: Centre not found
- `500`: Failed to update centre

---

### 6. Delete Centre
**DELETE** `/api/admin/centres/:id`

Soft delete a centre with usage validation.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): Centre ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": null,
  "message": "Centre deleted successfully"
}
```

**Error Responses:**
- `400`: Cannot delete centre with assigned users or leads
- `404`: Centre not found
- `500`: Failed to delete centre

**Validation:**
Centres with assigned users or leads cannot be deleted. Example error:
```json
{
  "status": "error",
  "message": "Cannot delete centre \"Mumbai\". This centre has 85 users and 450 leads. Please reassign or remove them first."
}
```

---

### 7. Export Centres
**GET** `/api/admin/centres/export`

Export all centres as CSV data.

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
      "Name": "Mumbai",
      "Slug": "mumbai",
      "User Count": 85,
      "Lead Count": 450,
      "Created": "2025-01-15T10:30:00.000Z"
    },
    {
      "Name": "Delhi",
      "Slug": "delhi",
      "User Count": 72,
      "Lead Count": 380,
      "Created": "2025-01-15T10:30:00.000Z"
    }
  ],
  "message": "Centres exported successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to export centres

---

## Centre Fields

### Required Fields
- `name`: Centre name (e.g., "Mumbai", "Delhi")
- `slug`: URL-friendly identifier (e.g., "mumbai", "delhi")

### Auto-Generated Fields
- `_id`: Unique MongoDB ObjectId
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `deletedAt`: Soft delete timestamp (null if active)

### Computed Fields
- `userCount`: Number of users assigned to this centre
- `leadCount`: Number of leads assigned to this centre

---

## Usage Tracking

Centres track their usage across:
- **Users**: Users can have a single centre assigned via `centreId`
- **Leads**: Lead activities can have a single centre assigned via `centreId`

---

## Common Centres

| Centre | Slug |
|--------|------|
| Mumbai | mumbai |
| Delhi | delhi |
| Bangalore | bangalore |
| Pune | pune |
| Hyderabad | hyderabad |
| Chennai | chennai |
| Kolkata | kolkata |
| Ahmedabad | ahmedabad |

---

## Role-Based Access

### Sales Manager
- Can only view and manage users/leads from their assigned centre
- Cannot create or delete centres

### HOD Sales
- Can view and manage users/leads from their assigned centre
- Can filter data by centre

### Admin / Marketing
- Full access to all centre operations
- Can create, update, and delete centres
- Can view all centres and their data

---

## Notes

- Centre slugs must be unique across all centres
- Centres cannot be deleted if they are assigned to users or leads
- All delete operations are soft deletes (sets `deletedAt` timestamp)
- Search functionality works across name and slug fields
- Usage counts are calculated dynamically for each request
- Centres are used for geographical or organizational segmentation
