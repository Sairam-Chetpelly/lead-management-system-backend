# Leads API Documentation

Base URL: `/api/leads`

## Overview
Comprehensive lead management endpoints including CRUD operations, bulk upload, webhooks, and activity tracking.

**Authentication Required:** Most endpoints require JWT token (except webhooks).

---

## Lead CRUD Operations

### Get All Leads
**GET** `/api/leads`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search by name, email, contact, leadID
- `source`: Filter by source ID
- `leadValue`: Filter by lead value (high value/low value)
- `centre`: Filter by centre ID
- `assignedTo`: Filter by assigned user ID
- `leadStatus`: Filter by lead status ID
- `leadSubStatus`: Filter by lead sub-status ID
- `siteVisit`: Filter by site visit (true/false)
- `centerVisit`: Filter by center visit (true/false)
- `virtualMeeting`: Filter by virtual meeting (true/false)
- `outOfStation`: Filter by out of station (true/false)
- `requirementWithinTwoMonths`: Filter (true/false)
- `adname`: Filter by ad name
- `adset`: Filter by ad set
- `campaign`: Filter by campaign
- `dateFrom`: Start date (YYYY-MM-DD)
- `dateTo`: End date (YYYY-MM-DD)
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: asc/desc (default: desc)

**Success Response (200):**
```json
{
  "leads": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "leadID": "LMS-2025-00001",
      "name": "John Doe",
      "email": "john@example.com",
      "contactNumber": "9876543210",
      "sourceId": { "name": "Google Ads" },
      "centreId": { "name": "Mumbai" },
      "languageId": { "name": "English" },
      "presalesUserId": { "name": "Agent 1" },
      "salesUserId": { "name": "Agent 2" },
      "leadStatusId": { "name": "Qualified", "slug": "qualified" },
      "leadSubStatusId": { "name": "Hot", "slug": "hot" },
      "leadValue": "high value",
      "comment": "Interested in 3BHK",
      "callLogCount": 5,
      "activityLogCount": 3,
      "salesActivity": true,
      "hasActivity": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
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

### Get Lead by ID
**GET** `/api/leads/:id`

**Success Response (200):**
```json
{
  "lead": { ... },
  "callLogs": [ ... ],
  "activityLogs": [ ... ]
}
```

### Create Lead
**POST** `/api/leads`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "contactNumber": "9876543210",
  "assignmentType": "presales",
  "leadSourceId": "507f1f77bcf86cd799439011",
  "centreId": "507f1f77bcf86cd799439012",
  "languageId": "507f1f77bcf86cd799439013",
  "projectTypeId": "507f1f77bcf86cd799439014",
  "houseTypeId": "507f1f77bcf86cd799439015",
  "leadValue": "high value",
  "comment": "Interested in 3BHK",
  "cpUserName": "Channel Partner Name"
}
```

**Validation:**
- `contactNumber`: Exactly 10 digits (required)
- `assignmentType`: "presales" or "sales" (required)
- `leadSourceId`: Valid ObjectId (required)

**Success Response (201):**
```json
{
  "message": "Lead created successfully",
  "lead": { ... }
}
```

### Update Lead
**PUT** `/api/leads/:id`

Updates lead and creates activity snapshot.

### Delete Lead
**DELETE** `/api/leads/:id`

Soft deletes lead and all related activities.

---

## Bulk Upload

### Bulk Upload Presales Leads
**POST** `/api/leads/bulk-upload`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: CSV file (max 5MB, max 2000 rows)

**CSV Format:**
Required columns: `name`, `email`, `contactNumber`, `comment`, `leadSource`
Optional columns: `presalesUser`

**Success Response (201/207):**
```json
{
  "message": "Processed 100 rows: 95 successful, 5 failed",
  "totalRows": 100,
  "successful": 95,
  "failed": 5,
  "results": [ ... ],
  "errors": [ ... ],
  "failedFileUrl": "/api/leads/download-failed/failed_leads_1234567890.csv"
}
```

### Bulk Upload Sales Leads
**POST** `/api/leads/bulk-upload-sales`

**CSV Format:**
Required columns: `Client name`, `Centre`, `Phone Number`, `Lead Qualified date`, `Lead Generation Date`, `Value`, `Lead Source`, `Sales Person`, `Activity Comments`, `Status`, `Sub Status`

---

## Lead Activities

### Get Lead Activities
**GET** `/api/leads/:id/activities`

Returns all historical snapshots of lead changes.

### Get Lead Timeline
**GET** `/api/leads/:id/timeline`

Returns combined timeline of call logs and activity logs.

### Create Lead Activity (Full Update)
**POST** `/api/leads/:id/lead-activity`

**Content-Type:** `multipart/form-data`

Updates all lead fields and creates activity snapshot.

**Form Data:**
- All lead fields
- `files`: Multiple files (max 5)

### Create Presales Activity (Limited Update)
**POST** `/api/leads/:id/presales-activity`

Limited fields update for presales agents.

### Log Call
**POST** `/api/leads/:id/call`

Creates call log entry.

### Log Activity
**POST** `/api/leads/:id/activity`

**Content-Type:** `multipart/form-data`

**Form Data:**
```json
{
  "type": "call",
  "comment": "Follow-up call completed",
  "document": "file.pdf"
}
```

---

## Lead Assignment

### Assign Lead
**POST** `/api/leads/:id/assign`

**Request Body:**
```json
{
  "presalesUserId": "507f1f77bcf86cd799439011",
  "salesUserId": "507f1f77bcf86cd799439012"
}
```

### Change Language
**POST** `/api/leads/:id/change-language`

**Request Body:**
```json
{
  "languageId": "507f1f77bcf86cd799439011"
}
```

Automatically reassigns to agent with matching language proficiency.

---

## Export & Download

### Export Leads
**GET** `/api/leads/export`

Supports same filters as GET /api/leads. Returns CSV-formatted JSON.

### Download Failed Entries
**GET** `/api/leads/download-failed/:filename`

Downloads CSV file of failed bulk upload entries.

### Download Document
**GET** `/api/leads/document/:filename`

Downloads activity document.

---

## Webhooks

### Google Ads Webhook
**POST** `/api/leads/webhook/google-ads`

**Request Body:**
```json
{
  "google_key": "your-webhook-key",
  "lead_id": "123456",
  "campaign_id": "789",
  "adgroup_id": "456",
  "form_id": "321",
  "user_column_data": [
    { "column_id": "FULL_NAME", "string_value": "John Doe" },
    { "column_id": "EMAIL", "string_value": "john@example.com" },
    { "column_id": "PHONE_NUMBER", "string_value": "9876543210" }
  ]
}
```

### Meta Ads Webhook (Verification)
**GET** `/api/leads/webhook/meta-ads`

**Query Parameters:**
- `hub.mode`: subscribe
- `hub.verify_token`: your-webhook-key
- `hub.challenge`: challenge string

### Meta Ads Webhook (Lead Creation)
**POST** `/api/leads/webhook/meta-ads`

Processes Facebook/Instagram lead generation events.

---

## Utility Endpoints

### Get Unsigned Leads Count
**GET** `/api/leads/unsigned`

Returns count of leads without presales or sales assignment.

### Get Ad Field Values
**GET** `/api/leads/ad-values/:field`

**Path Parameters:**
- `field`: adname, adset, or campaign

Returns distinct values for filtering.

### Get Form Data
**GET** `/api/leads/form/data`

Returns all dropdown data for lead creation form.

**Success Response (200):**
```json
{
  "centres": [ ... ],
  "languages": [ ... ],
  "leadSources": [ ... ],
  "projectTypes": [ ... ],
  "houseTypes": [ ... ],
  "leadValues": [
    { "value": "high value", "label": "High Value" },
    { "value": "low value", "label": "Low Value" }
  ]
}
```

---

## Round-Robin Assignment Logic

### Presales Assignment
- Regular leads: Assigned to regular presales agents
- CP leads: Assigned to CP presales agents
- Uses round-robin algorithm

### Sales Assignment
1. Prioritizes agents in same centre with matching language
2. Falls back to any available sales agent
3. Uses round-robin per centre

---

## WhatsApp Notifications

Automatic WhatsApp notifications sent via MSG91 when:
- Lead assigned to sales agent
- Lead status changes to qualified
- Sales agent changes for qualified lead
