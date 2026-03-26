# Lead Sources API Documentation

Base URL: `/api/lead-sources`

## Overview
Lead source management endpoints for creating, reading, updating, and deleting lead sources with usage tracking.

**Authentication Required:** Not required for most endpoints (public API).

---

## Endpoints

### 1. Get All Lead Sources (Dropdown)
**GET** `/api/lead-sources/all`

Retrieve all lead sources without pagination for dropdown lists.

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Google Ads",
      "slug": "google-ads"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Facebook",
      "slug": "facebook"
    }
  ],
  "message": "Lead sources retrieved successfully"
}
```

**Error Responses:**
- `500`: Failed to retrieve lead sources

---

### 2. Get Lead Sources (Paginated)
**GET** `/api/lead-sources`

Retrieve paginated list of lead sources with usage counts.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name, slug, or description
- `isApiSource` (optional): Filter by API source ("true" or "false")

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "leadSources": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Google Ads",
        "slug": "google-ads",
        "description": "Leads from Google Ads campaigns",
        "isApiSource": true,
        "leadCount": 450,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Facebook",
        "slug": "facebook",
        "description": "Leads from Facebook campaigns",
        "isApiSource": true,
        "leadCount": 380,
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
  "message": "Lead sources retrieved successfully"
}
```

**Error Responses:**
- `500`: Failed to retrieve lead sources

---

### 3. Get Lead Source by ID
**GET** `/api/lead-sources/:id`

Retrieve a single lead source by ID.

**Path Parameters:**
- `id` (required): Lead source ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Google Ads",
    "slug": "google-ads",
    "description": "Leads from Google Ads campaigns",
    "isApiSource": true,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Lead source retrieved successfully"
}
```

**Error Responses:**
- `404`: Lead source not found
- `500`: Failed to retrieve lead source

---

### 4. Create Lead Source
**POST** `/api/lead-sources`

Create a new lead source.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Google Ads",
  "slug": "google-ads",
  "description": "Leads from Google Ads campaigns",
  "isApiSource": true
}
```

**Validation:**
- `name`: Required, non-empty string
- `slug`: Required, non-empty string, unique
- `description`: Required, non-empty string
- `isApiSource`: Required, boolean (default: false)

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Google Ads",
    "slug": "google-ads",
    "description": "Leads from Google Ads campaigns",
    "isApiSource": true,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Lead source created successfully"
}
```

**Error Responses:**
- `400`: Validation failed or duplicate slug
- `500`: Failed to create lead source

---

### 5. Update Lead Source
**PUT** `/api/lead-sources/:id`

Update an existing lead source.

**Headers:**
```
Content-Type: application/json
```

**Path Parameters:**
- `id` (required): Lead source ID

**Request Body:**
```json
{
  "name": "Google Ads (Updated)",
  "slug": "google-ads",
  "description": "Updated description",
  "isApiSource": true
}
```

**Validation:** Same as create (all fields optional)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Google Ads (Updated)",
    "slug": "google-ads",
    "description": "Updated description",
    "isApiSource": true,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  },
  "message": "Lead source updated successfully"
}
```

**Error Responses:**
- `400`: Validation failed
- `404`: Lead source not found
- `500`: Failed to update lead source

---

### 6. Delete Lead Source
**DELETE** `/api/lead-sources/:id`

Soft delete a lead source with usage validation.

**Path Parameters:**
- `id` (required): Lead source ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": null,
  "message": "Lead source deleted successfully"
}
```

**Error Responses:**
- `400`: Cannot delete lead source with assigned leads
- `404`: Lead source not found
- `500`: Failed to delete lead source

**Validation:**
Lead sources with assigned leads cannot be deleted. Example error:
```json
{
  "status": "error",
  "message": "Cannot delete lead source \"Google Ads\". This lead source has 450 leads. Please reassign or remove them first."
}
```

---

### 7. Export Lead Sources
**GET** `/api/lead-sources/export`

Export all lead sources as CSV data.

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "Name": "Google Ads",
      "Slug": "google-ads",
      "Description": "Leads from Google Ads campaigns",
      "Type": "API",
      "Lead Count": 450,
      "Created": "2025-01-15T10:30:00.000Z"
    },
    {
      "Name": "Facebook",
      "Slug": "facebook",
      "Description": "Leads from Facebook campaigns",
      "Type": "API",
      "Lead Count": 380,
      "Created": "2025-01-15T10:30:00.000Z"
    }
  ],
  "message": "Lead sources exported successfully"
}
```

**Error Responses:**
- `500`: Failed to export lead sources

---

## Lead Source Fields

### Required Fields
- `name`: Lead source name (e.g., "Google Ads", "Facebook")
- `slug`: URL-friendly identifier (e.g., "google-ads", "facebook")
- `description`: Description of the lead source
- `isApiSource`: Boolean indicating if source is from API integration

### Auto-Generated Fields
- `_id`: Unique MongoDB ObjectId
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `deletedAt`: Soft delete timestamp (null if active)

### Computed Fields
- `leadCount`: Number of leads from this source

---

## Lead Source Types

### API Sources (`isApiSource: true`)
- Leads automatically created via API integrations
- Examples: Google Ads, Facebook Ads, Meta Ads
- Cannot be manually modified by users

### Manual Sources (`isApiSource: false`)
- Leads manually created by users
- Examples: Walk-in, Referral, Cold Call
- Can be freely modified

---

## Common Lead Sources

| Name | Slug | Type | Description |
|------|------|------|-------------|
| Google Ads | google-ads | API | Leads from Google Ads campaigns |
| Facebook | facebook | API | Leads from Facebook campaigns |
| Meta Ads | meta-ads | API | Leads from Meta advertising |
| Walk-in | walk-in | Manual | Direct walk-in customers |
| Referral | referral | Manual | Customer referrals |
| Cold Call | cold-call | Manual | Outbound cold calling |
| Website | website | Manual | Website inquiries |
| Email | email | Manual | Email inquiries |

---

## Usage Tracking

Lead sources track their usage across:
- **Leads**: Lead activities have a single source assigned via `sourceId`
- **Analytics**: Used for source-wise reporting and ROI analysis

---

## Notes

- Lead source slugs must be unique across all sources
- Lead sources cannot be deleted if they have assigned leads
- All delete operations are soft deletes (sets `deletedAt` timestamp)
- Search functionality works across name, slug, and description fields
- Lead counts are calculated dynamically for each request
- API sources are typically created automatically via webhook integrations
- Manual sources are created by administrators for offline lead tracking
