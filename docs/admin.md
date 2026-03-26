# Admin API Documentation

Base URL: `/api/admin`

## Overview
Admin endpoints for managing roles, centres, languages, statuses, users, and leads.

**Authentication Required:** All endpoints require JWT token in Authorization header.

---

## Roles Management

### Get All Roles (Paginated)
**GET** `/api/admin/roles`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search term

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Admin",
      "slug": "admin",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 5,
    "total": 50,
    "limit": 10
  }
}
```

### Get All Roles (Simple)
**GET** `/api/admin/roles/all`

Returns all roles without pagination for dropdowns.

### Create Role
**POST** `/api/admin/roles`

**Request Body:**
```json
{
  "name": "Manager",
  "slug": "manager"
}
```

### Update Role
**PUT** `/api/admin/roles/:id`

### Delete Role
**DELETE** `/api/admin/roles/:id`

### Export Roles
**GET** `/api/admin/roles/export`

Returns CSV-formatted JSON data.

---

## Centres Management

### Get All Centres (Paginated)
**GET** `/api/admin/centres`

**Query Parameters:**
- `page`, `limit`, `search`

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Mumbai Centre",
      "slug": "mumbai",
      "userCount": 15,
      "leadCount": 250,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

### Get All Centres (Simple)
**GET** `/api/admin/centres/all`

### Create Centre
**POST** `/api/admin/centres`

**Request Body:**
```json
{
  "name": "Delhi Centre",
  "slug": "delhi"
}
```

### Update Centre
**PUT** `/api/admin/centres/:id`

### Delete Centre
**DELETE** `/api/admin/centres/:id`

**Error Response (400):**
```json
{
  "error": "Cannot delete centre \"Mumbai\". This centre has 15 users and 250 leads. Please reassign or remove them first."
}
```

### Export Centres
**GET** `/api/admin/centres/export`

---

## Languages Management

### Get All Languages (Paginated)
**GET** `/api/admin/languages`

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "English",
      "slug": "english",
      "code": "en",
      "userCount": 25,
      "leadCount": 500,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

### Get All Languages (Simple)
**GET** `/api/admin/languages/all`

### Create Language
**POST** `/api/admin/languages`

**Request Body:**
```json
{
  "name": "Hindi",
  "slug": "hindi",
  "code": "hi"
}
```

### Update Language
**PUT** `/api/admin/languages/:id`

### Delete Language
**DELETE** `/api/admin/languages/:id`

### Export Languages
**GET** `/api/admin/languages/export`

---

## Statuses Management

### Get All Statuses (Paginated)
**GET** `/api/admin/statuses`

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Active",
      "slug": "active",
      "type": "userStatus",
      "description": "User is active",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

### Get All Statuses (Simple)
**GET** `/api/admin/statuses/all`

### Create Status
**POST** `/api/admin/statuses`

**Request Body:**
```json
{
  "name": "Qualified",
  "slug": "qualified",
  "type": "leadStatus",
  "description": "Lead is qualified"
}
```

### Update Status
**PUT** `/api/admin/statuses/:id`

### Delete Status
**DELETE** `/api/admin/statuses/:id`

### Export Statuses
**GET** `/api/admin/statuses/export`

---

## Users Management

### Get All Users
**GET** `/api/admin/users`

**Query Parameters:**
- `page`, `limit`, `search`

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "mobileNumber": "9876543210",
      "roleId": { "name": "Sales Agent", "slug": "sales_agent" },
      "statusId": { "name": "Active", "slug": "active" },
      "centreId": { "name": "Mumbai", "slug": "mumbai" },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

### Delete User
**DELETE** `/api/admin/users/:id`

**Error Response (400):**
```json
{
  "error": "Cannot delete user \"John Doe\". This user has 50 leads assigned. Please reassign or remove them first."
}
```

---

## Leads Management

### Delete Lead
**DELETE** `/api/admin/leads/:id`

Soft deletes lead and all related lead activities.

**Success Response (200):**
```json
{
  "message": "Lead deleted successfully"
}
```

**Error Response (404):**
```json
{
  "error": "Lead not found"
}
```

---

## Role-Based Access Control

### Admin
- Full access to all endpoints

### HOD Presales / Manager Presales
- Can only view/manage presales-related data

### HOD Sales / Sales Manager
- Can only view/manage data from their centre
- Sales Manager: Only qualified leads

### Other Roles
- Limited or no access to admin endpoints
