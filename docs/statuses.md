# Statuses API Documentation

Base URL: `/api/admin`

## Overview
Status management endpoints for creating, reading, updating, and deleting statuses with usage tracking.

**Authentication Required:** All endpoints require JWT token.

---

## Endpoints

### 1. Get All Statuses (Dropdown)
**GET** `/api/admin/statuses/all`

Retrieve all statuses without pagination for dropdown lists.

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
      "name": "Active",
      "slug": "active",
      "type": "status",
      "description": "User is active"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Qualified",
      "slug": "qualified",
      "type": "leadStatus",
      "description": "Lead is qualified"
    }
  ],
  "message": "Statuses retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to retrieve statuses

---

### 2. Get Statuses (Paginated)
**GET** `/api/admin/statuses`

Retrieve paginated list of statuses with usage counts.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name, slug, or description

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "statuses": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Active",
        "slug": "active",
        "type": "status",
        "description": "User is active",
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Qualified",
        "slug": "qualified",
        "type": "leadStatus",
        "description": "Lead is qualified",
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
  "message": "Statuses retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to retrieve statuses

---

### 3. Create Status
**POST** `/api/admin/statuses`

Create a new status.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Active",
  "slug": "active",
  "type": "status",
  "description": "User is active"
}
```

**Validation:**
- `name`: Required, non-empty string
- `slug`: Required, non-empty string, unique
- `type`: Required, must be "status", "leadStatus", or "leadSubStatus"
- `description`: Required, non-empty string

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Active",
    "slug": "active",
    "type": "status",
    "description": "User is active",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Status created successfully"
}
```

**Error Responses:**
- `400`: Validation failed or duplicate slug
- `401`: Unauthorized
- `500`: Failed to create status

---

### 4. Update Status
**PUT** `/api/admin/statuses/:id`

Update an existing status.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required): Status ID

**Request Body:**
```json
{
  "name": "Active (Updated)",
  "slug": "active",
  "type": "status",
  "description": "Updated description"
}
```

**Validation:** Same as create (all fields optional)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Active (Updated)",
    "slug": "active",
    "type": "status",
    "description": "Updated description",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  },
  "message": "Status updated successfully"
}
```

**Error Responses:**
- `400`: Validation failed
- `404`: Status not found
- `500`: Failed to update status

---

### 5. Delete Status
**DELETE** `/api/admin/statuses/:id`

Soft delete a status with usage validation.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): Status ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": null,
  "message": "Status deleted successfully"
}
```

**Error Responses:**
- `400`: Cannot delete status with assigned users or leads
- `404`: Status not found
- `500`: Failed to delete status

**Validation:**
Statuses with assigned users or leads cannot be deleted. Example error:
```json
{
  "status": "error",
  "message": "Cannot delete status \"Active\". This status has 85 users and 450 leads. Please reassign or remove them first."
}
```

---

### 6. Export Statuses
**GET** `/api/admin/statuses/export`

Export all statuses as CSV data.

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
      "Name": "Active",
      "Slug": "active",
      "Type": "status",
      "Description": "User is active",
      "Created": "2025-01-15T10:30:00.000Z"
    },
    {
      "Name": "Qualified",
      "Slug": "qualified",
      "Type": "leadStatus",
      "Description": "Lead is qualified",
      "Created": "2025-01-15T10:30:00.000Z"
    }
  ],
  "message": "Statuses exported successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to export statuses

---

## Status Fields

### Required Fields
- `name`: Status name (e.g., "Active", "Qualified")
- `slug`: URL-friendly identifier (e.g., "active", "qualified")
- `type`: Status type - "status", "leadStatus", or "leadSubStatus"
- `description`: Description of the status

### Auto-Generated Fields
- `_id`: Unique MongoDB ObjectId
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `deletedAt`: Soft delete timestamp (null if active)

---

## Status Types

### User Status (`type: "status"`)
Status for user accounts:
- Active
- Inactive
- Suspended
- Pending

### Lead Status (`type: "leadStatus"`)
Primary status for leads:
- New
- Contacted
- Qualified
- Lost
- Won

### Lead Sub-Status (`type: "leadSubStatus"`)
Detailed sub-status for leads:
- Not Interested
- Budget Issue
- Wrong Number
- Follow Up Required
- Site Visit Scheduled
- Documentation Pending

---

## Common Statuses

| Name | Slug | Type | Description |
|------|------|------|-------------|
| Active | active | status | User is active |
| Inactive | inactive | status | User is inactive |
| New | new | leadStatus | New lead |
| Contacted | contacted | leadStatus | Lead has been contacted |
| Qualified | qualified | leadStatus | Lead is qualified |
| Lost | lost | leadStatus | Lead is lost |
| Won | won | leadStatus | Lead is won |
| Not Interested | not-interested | leadSubStatus | Customer not interested |
| Budget Issue | budget-issue | leadSubStatus | Budget constraints |
| Follow Up Required | follow-up-required | leadSubStatus | Needs follow up |

---

## Usage Tracking

Statuses track their usage across:
- **Users**: Users have a single status assigned via `statusId` (type: "status")
- **Leads**: Lead activities have status via `leadStatusId` (type: "leadStatus") and `leadSubStatusId` (type: "leadSubStatus")

---

## Notes

- Status slugs must be unique across all statuses
- Statuses cannot be deleted if they are assigned to users or leads
- All delete operations are soft deletes (sets `deletedAt` timestamp)
- Search functionality works across name, slug, and description fields
- Type field must be one of: "status", "leadStatus", or "leadSubStatus"
- User statuses control account access and permissions
- Lead statuses track the sales pipeline progression
- Lead sub-statuses provide detailed reasons for lead status
