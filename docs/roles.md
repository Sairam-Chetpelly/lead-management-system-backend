# Roles API Documentation

Base URL: `/api/admin`

## Overview
Role management endpoints for creating, reading, updating, and deleting roles with usage tracking.

**Authentication Required:** All endpoints require JWT token.

---

## Endpoints

### 1. Get All Roles (Dropdown)
**GET** `/api/admin/roles/all`

Retrieve all roles without pagination for dropdown lists.

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
      "name": "Admin",
      "slug": "admin"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Sales Agent",
      "slug": "sales_agent"
    }
  ],
  "message": "Roles retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to retrieve roles

---

### 2. Get Roles (Paginated)
**GET** `/api/admin/roles`

Retrieve paginated list of roles.

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
    "roles": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Admin",
        "slug": "admin",
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Sales Agent",
        "slug": "sales_agent",
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 2,
      "total": 12,
      "limit": 10
    }
  },
  "message": "Roles retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to retrieve roles

---

### 3. Create Role
**POST** `/api/admin/roles`

Create a new role.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Sales Agent",
  "slug": "sales_agent"
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
    "_id": "507f1f77bcf86cd799439012",
    "name": "Sales Agent",
    "slug": "sales_agent",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Role created successfully"
}
```

**Error Responses:**
- `400`: Validation failed or duplicate slug
- `401`: Unauthorized
- `500`: Failed to create role

---

### 4. Update Role
**PUT** `/api/admin/roles/:id`

Update an existing role.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required): Role ID

**Request Body:**
```json
{
  "name": "Senior Sales Agent",
  "slug": "sales_agent"
}
```

**Validation:** Same as create (all fields optional)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Senior Sales Agent",
    "slug": "sales_agent",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  },
  "message": "Role updated successfully"
}
```

**Error Responses:**
- `400`: Validation failed
- `404`: Role not found
- `500`: Failed to update role

---

### 5. Delete Role
**DELETE** `/api/admin/roles/:id`

Soft delete a role with usage validation.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): Role ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": null,
  "message": "Role deleted successfully"
}
```

**Error Responses:**
- `400`: Cannot delete role with assigned users
- `404`: Role not found
- `500`: Failed to delete role

**Validation:**
Roles with assigned users cannot be deleted. Example error:
```json
{
  "status": "error",
  "message": "Cannot delete role \"Sales Agent\". This role has 45 users. Please reassign or remove them first."
}
```

---

### 6. Export Roles
**GET** `/api/admin/roles/export`

Export all roles as CSV data.

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
      "Name": "Admin",
      "Slug": "admin",
      "Created": "2025-01-15T10:30:00.000Z"
    },
    {
      "Name": "Sales Agent",
      "Slug": "sales_agent",
      "Created": "2025-01-15T10:30:00.000Z"
    }
  ],
  "message": "Roles exported successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to export roles

---

## Role Fields

### Required Fields
- `name`: Role name (e.g., "Admin", "Sales Agent")
- `slug`: URL-friendly identifier (e.g., "admin", "sales_agent")

### Auto-Generated Fields
- `_id`: Unique MongoDB ObjectId
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `deletedAt`: Soft delete timestamp (null if active)

---

## System Roles

### Administrative Roles
| Name | Slug | Description |
|------|------|-------------|
| Admin | admin | Full system access |
| Marketing | marketing | Marketing and analytics access |

### Presales Roles
| Name | Slug | Description |
|------|------|-------------|
| HOD Presales | hod_presales | Head of presales department |
| Manager Presales | manager_presales | Presales team manager |
| Presales Agent | presales_agent | Presales representative |

### Sales Roles
| Name | Slug | Description |
|------|------|-------------|
| HOD Sales | hod_sales | Head of sales department |
| Sales Manager | sales_manager | Sales team manager |
| Sales Agent | sales_agent | Sales representative |

---

## Role Permissions

### Admin
- Full access to all features
- User management (create, update, delete)
- System configuration
- All reports and analytics
- Centre management

### Marketing
- View all data across centres
- Access to analytics and reports
- Lead source management
- Campaign tracking
- No user management access

### HOD Presales
- Manage all presales users
- View all presales leads
- Access presales analytics
- Can create presales agents
- Cross-centre visibility

### Manager Presales
- Manage presales team
- View all presales leads
- Access presales reports
- Can create presales agents
- Cross-centre visibility

### Presales Agent
- View assigned leads only
- Update lead information
- Make calls and log activities
- Qualify leads
- Limited to own data

### HOD Sales
- Manage sales users in their centre
- View all sales leads in their centre
- Access sales analytics
- Can create sales agents
- Centre-specific access

### Sales Manager
- Manage sales team in their centre
- View sales leads in their centre
- Access sales reports
- Can create sales agents
- Centre-specific access

### Sales Agent
- View assigned leads only
- Update lead information
- Make calls and log activities
- Close deals
- Limited to own data

---

## Role Hierarchy

```
Admin / Marketing (Full Access)
    |
    ├── HOD Presales
    |       └── Manager Presales
    |               └── Presales Agent
    |
    └── HOD Sales
            └── Sales Manager
                    └── Sales Agent
```

---

## Usage Tracking

Roles track their usage across:
- **Users**: Users have a single role assigned via `roleId`
- **Access Control**: Roles determine feature access and data visibility

---

## Notes

- Role slugs must be unique across all roles
- Roles cannot be deleted if they are assigned to users
- All delete operations are soft deletes (sets `deletedAt` timestamp)
- Search functionality works across name and slug fields
- System roles should not be modified or deleted
- Role slugs are used for permission checks in the application
- Presales roles handle lead qualification
- Sales roles handle deal closure
- Centre-based roles have restricted data access
