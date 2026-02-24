# Export APIs Documentation

This document covers all CSV export endpoints available in the LMS backend.

## Overview

All export endpoints return CSV files with proper headers and cleaned data. The `cleanText` function is used across all exports to:
- Replace HTML entities (&quot;, &#39;, &lt;, &gt;, &amp;)
- Remove line breaks and tabs
- Replace commas with pipes (|) to prevent CSV column splitting
- Trim whitespace

## Authentication

All export endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 1. Leads Export

### Endpoint
```
GET /api/leads/export-csv
```

### Query Parameters
- `search` - Search by name, email, contact, leadID
- `source` - Filter by source ID
- `centre` - Filter by centre ID
- `leadStatus` - Filter by lead status ID
- `leadSubStatus` - Filter by lead sub-status ID
- `dateFrom` - Start date filter
- `dateTo` - End date filter
- `siteVisit` - Filter by site visit (true/false)
- `centerVisit` - Filter by center visit (true/false)
- `virtualMeeting` - Filter by virtual meeting (true/false)
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - Sort order (asc/desc)

### Response
CSV file with 41 fields including:
- Lead ID, Name, Email, Contact Number
- Language, Source, Centre
- Presales Agent, Sales Agent
- Lead Status, Lead Sub Status, Lead Value
- Project details, House Type, Possession Date
- Visit dates (Site, Center, Virtual)
- Status dates (Qualified, Hot, Warm, etc.)
- Ad fields, Comments, Timestamps

### Role-Based Access
- **presales_agent**: Only their assigned leads with status "lead"
- **sales_agent**: Only their assigned leads (excluding won/lost)
- **hod_presales/manager_presales**: Only leads with status "lead"
- **sales_manager**: Only leads from their centre with status "qualified"
- **admin/marketing**: All leads

---

## 2. Lead Activities Export

### Endpoint
```
GET /api/lead-activities/export
```

### Query Parameters
- `startDate` - Start date filter
- `endDate` - End date filter
- `userId` - Filter by user ID
- `search` - Search in name, email, contact, comment

### Response
CSV file with fields:
- Lead ID, Activity ID, Name, Email, Contact
- Source, Centre, Agents
- Lead Status, Sub Status, Value
- Project/House details
- All visit dates and completion dates
- Status dates, Comments
- Ad fields, Updated By, Timestamps

### Role-Based Access
- **presales_agent/sales_agent**: Only their activities
- **hod_sales/sales_manager**: Activities from their centre
- **admin/marketing**: All activities

---

## 3. Call Logs Export

### Endpoint
```
GET /api/call-logs/export
```

### Query Parameters
- `startDate` - Start date filter
- `endDate` - End date filter
- `userId` - Filter by user ID
- `search` - Search by call ID

### Response
CSV file with fields:
- Call ID, Lead ID, Lead Name
- Lead Contact, Lead Email
- User Name, User Email
- Call Date Time, Created At

### Role-Based Access
- **presales_agent/sales_agent**: Only their call logs
- **hod_sales/sales_manager**: Call logs from their centre leads
- **admin/marketing**: All call logs

---

## 4. Activity Logs Export

### Endpoint
```
GET /api/activity-logs/export
```

### Query Parameters
- `startDate` - Start date filter
- `endDate` - End date filter
- `userId` - Filter by user ID
- `type` - Filter by activity type (call/manual)
- `search` - Search in comments

### Response
CSV file with fields:
- Activity ID, Lead ID, Lead Name
- Lead Contact, Lead Email
- User Name, User Email
- Type, Comment, Document
- Created At

### Role-Based Access
- **presales_agent/sales_agent**: Only their activity logs
- **hod_sales/sales_manager**: Activity logs from their centre leads
- **admin/marketing**: All activity logs

---

## 5. Lead Sources Export

### Endpoint
```
GET /api/lead-sources/export-csv
```

### Query Parameters
- `search` - Search by name, slug, description
- `isApiSource` - Filter by source type (true/false)

### Response
CSV file with fields:
- Name, Slug, Description
- Type (API/Manual)
- Lead Count, Created

### Access
All authenticated users

---

## 6. Project & House Types Export

### Endpoint
```
GET /api/project-and-house-types/export-csv
```

### Query Parameters
- `search` - Search by name, description
- `type` - Filter by type (project/house)

### Response
CSV file with fields:
- Name, Type (project/house)
- Description, Created

### Access
All authenticated users

---

## 7. Dashboard Export

### Endpoint
```
GET /api/dashboard/export
```

### Query Parameters
- `userType` - Filter by user type (sales/presales)
- `agentId` - Filter by agent ID
- `startDate` - Start date filter
- `endDate` - End date filter
- `sourceId` - Filter by source ID
- `centreId` - Filter by centre ID

### Response
CSV file with sections:
1. **Summary Metrics**
   - Total Leads, Leads MTD
   - Total Qualified, Qualified MTD
   - Total Lost, Lost MTD
   - Total Won, Won MTD
   - Visit counts (Site, Center, Virtual)

2. **Source Wise Data**
   - Source Wise Leads
   - Source Wise Qualified
   - Source Wise Won

3. **Center Data**
   - Center Won Leads with Project Values

4. **Distribution Matrix**
   - Source/Center Qualified Distribution

### Role-Based Access
- **sales_manager**: Only their centre data
- **admin/marketing**: All data with optional filters

---

## 8. Centres Export

### Endpoint
```
GET /api/admin/centres/export-csv
```

### Query Parameters
- `search` - Search by name, slug

### Response
CSV file with fields:
- Name, Slug
- User Count, Lead Count
- Created

### Access
Admin users only

---

## 9. Roles Export

### Endpoint
```
GET /api/admin/roles/export-csv
```

### Query Parameters
None

### Response
CSV file with fields:
- Name, Slug, Created

### Access
Admin users only

---

## 10. Languages Export

### Endpoint
```
GET /api/admin/languages/export-csv
```

### Query Parameters
- `search` - Search by name, slug, code

### Response
CSV file with fields:
- Name, Slug, Code, Created

### Access
Admin users only

---

## 11. Statuses Export

### Endpoint
```
GET /api/admin/statuses/export-csv
```

### Query Parameters
- `search` - Search by name, slug
- `type` - Filter by type (leadStatus/leadSubStatus/userStatus)

### Response
CSV file with fields:
- Name, Slug, Type
- Description, Created

### Access
Admin users only

---

## 12. Users Export

### Endpoint
```
GET /api/users/export-csv
```

### Query Parameters
- `search` - Search by name, email
- `role` - Filter by role ID
- `status` - Filter by status ID
- `centre` - Filter by centre ID

### Response
CSV file with fields:
- Name, Email, Mobile Number
- Role, Status, Centre
- Created At

### Access
Admin users only

---

## Common Response Headers

All CSV exports include these headers:
```
Content-Type: text/csv
Content-Disposition: attachment; filename=<filename>.csv
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 500
}
```

Common error codes:
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `500` - Internal server error

---

## Data Cleaning

All text fields in CSV exports are processed through the `cleanText` function:

```javascript
const cleanText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/,/g, '|')
    .trim();
};
```

This ensures:
- HTML entities are decoded
- Line breaks and tabs are removed
- Commas are replaced with pipes to prevent CSV column splitting
- Extra whitespace is trimmed

---

## Frontend Integration

All exports use blob response type in the frontend:

```typescript
const response = await authAPI.exportLeads(params);
const blob = new Blob([response.data], { type: 'text/csv' });
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'filename.csv';
link.click();
window.URL.revokeObjectURL(url);
```

---

## Notes

1. All exports respect role-based access control
2. Date filters use ISO format (YYYY-MM-DD)
3. Boolean filters accept 'true' or 'false' strings
4. All timestamps are in ISO 8601 format
5. Empty fields are represented as empty strings in CSV
6. Commas in data are replaced with pipes (|) to maintain CSV structure
