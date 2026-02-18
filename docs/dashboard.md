# Dashboard API Documentation

Base URL: `/api/dashboard`

## Overview
Analytics and reporting endpoints providing comprehensive dashboard metrics, charts, and statistics.

**Authentication Required:** All endpoints require JWT token.

---

## Endpoints

### 1. Get Dashboard Data
**GET** `/api/dashboard`

Retrieve comprehensive dashboard analytics with role-based filtering.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `userType` (optional): Filter by user type - "presales", "sales", or empty for all
- `agentId` (optional): Filter by specific agent ID or "all"
- `startDate` (optional): Start date in YYYY-MM-DD format
- `endDate` (optional): End date in YYYY-MM-DD format
- `sourceId` (optional): Filter by lead source ID or "all"
- `centreId` (optional): Filter by centre ID or "all"

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "totalLeads": 1500,
    "leadsMTD": 450,
    "leadsToday": 25,
    "totalCalls": 3200,
    "callsMTD": 980,
    "callsToday": 65,
    "totalQualified": 750,
    "qualifiedMTD": 220,
    "qualifiedToday": 12,
    "totalLost": 200,
    "lostMTD": 45,
    "lostToday": 3,
    "totalWon": 180,
    "wonMTD": 55,
    "wonToday": 4,
    "siteVisits": 320,
    "centerVisits": 280,
    "virtualMeetings": 450,
    "dailyLeads": [
      { "date": "2025-01-01", "count": 25 },
      { "date": "2025-01-02", "count": 30 }
    ],
    "dailyCalls": [
      { "date": "2025-01-01", "count": 65 },
      { "date": "2025-01-02", "count": 72 }
    ],
    "dailyQualified": [
      { "date": "2025-01-01", "count": 12 },
      { "date": "2025-01-02", "count": 15 }
    ],
    "dailyLost": [
      { "date": "2025-01-01", "count": 3 },
      { "date": "2025-01-02", "count": 2 }
    ],
    "dailyWon": [
      { "date": "2025-01-01", "count": 4 },
      { "date": "2025-01-02", "count": 5 }
    ],
    "dailySiteVisits": [
      { "date": "2025-01-01", "count": 8 }
    ],
    "dailyCenterVisits": [
      { "date": "2025-01-01", "count": 6 }
    ],
    "dailyVirtualMeetings": [
      { "date": "2025-01-01", "count": 10 }
    ],
    "sourceLeads": [
      { "_id": "Google Ads", "count": 450 },
      { "_id": "Facebook", "count": 380 }
    ],
    "sourceQualified": [
      { "_id": "Google Ads", "count": 220 },
      { "_id": "Facebook", "count": 180 }
    ],
    "sourceWon": [
      { "_id": "Google Ads", "count": 85 },
      { "_id": "Facebook", "count": 65 }
    ],
    "dailyQualificationRate": [
      {
        "date": "2025-01-01",
        "rate": 48.5,
        "allocated": 25,
        "qualified": 12
      }
    ],
    "dailyCallsPerLead": [
      {
        "date": "2025-01-01",
        "ratio": 2.6,
        "calls": 65,
        "allocated": 25
      }
    ],
    "centerWonData": [
      {
        "_id": "Mumbai",
        "wonCount": 85,
        "totalValue": 45000000
      }
    ],
    "sourceCenterData": [
      {
        "_id": {
          "source": "Google Ads",
          "centre": "Mumbai"
        },
        "count": 120
      }
    ],
    "role": "admin",
    "showFilters": true
  },
  "message": "Dashboard data retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized - Invalid or missing token
- `500`: Failed to fetch dashboard data

---

### 2. Get All Sources
**GET** `/api/dashboard/sources`

Retrieve all lead sources for dropdown filters.

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
      "name": "Google Ads"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Facebook"
    }
  ],
  "message": "Sources retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to fetch sources

---

### 3. Get All Centres
**GET** `/api/dashboard/centres`

Retrieve all centres for dropdown filters.

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
      "name": "Mumbai"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Delhi"
    }
  ],
  "message": "Centres retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to fetch centres

---

### 4. Get Users by Type
**GET** `/api/dashboard/users/:type`

Retrieve users filtered by role type for agent dropdown.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `type` (required): User type - "sales", "presales", or "all"

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ],
  "message": "Users retrieved successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to fetch users

---

### 5. Export Dashboard Data
**GET** `/api/dashboard/export`

Export dashboard data as CSV file.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:** Same as GET /api/dashboard

**Success Response (200):**
- Content-Type: text/csv
- Content-Disposition: attachment; filename=dashboard-export.csv
- Returns CSV file with all dashboard metrics and charts

**Error Responses:**
- `401`: Unauthorized
- `500`: Export failed

---

## Metrics Explanation

### Card Metrics
- **Total**: All-time count (filtered by date range if provided)
- **MTD**: Month-to-date count (or date range if provided)
- **Today**: Today's count (IST timezone: 5:30 AM - 11:59 PM)

### Lead Metrics
- `totalLeads`: Total leads created
- `totalQualified`: Leads with qualified status
- `totalLost`: Lost leads (presales: before qualification, sales: after qualification)
- `totalWon`: Won leads

### Call Metrics
- `totalCalls`: Total call logs created
- Filtered by user type when specified

### Visit & Meeting Metrics
- `siteVisits`: Completed site visits
- `centerVisits`: Completed center visits
- `virtualMeetings`: Completed virtual meetings

---

## Chart Data

### Daily Trends
Arrays of date/count pairs for 30-day period (or custom date range):
- `dailyLeads`: Lead creation trend
- `dailyCalls`: Call activity trend
- `dailyQualified`: Qualification trend
- `dailyLost`: Lost leads trend
- `dailyWon`: Won leads trend
- `dailySiteVisits`: Site visit completion trend
- `dailyCenterVisits`: Center visit completion trend
- `dailyVirtualMeetings`: Virtual meeting completion trend

### Source-Wise Data
- `sourceLeads`: Lead count by source
- `sourceQualified`: Qualified lead count by source
- `sourceWon`: Won lead count by source

### Agent-Specific Charts
Available when filtering by presales or sales user type:
- `dailyQualificationRate`: Qualification percentage per day with allocated and qualified counts
- `dailyCallsPerLead`: Average calls per lead per day with calls and allocated counts

### Admin/Marketing Charts
Available for admin and marketing roles:
- `centerWonData`: Won leads and project value by centre
- `sourceCenterData`: Qualified leads matrix (source × centre)

---

## Role-Based Filtering

### Presales Agent
- Auto-filtered to show only their assigned leads
- userType automatically set to "presales"
- agentId automatically set to their user ID

### Manager Presales / HOD Presales
- Shows all presales leads
- userType automatically set to "presales"
- Can filter by specific presales agent

### Sales Agent
- Auto-filtered to show only their assigned leads
- userType automatically set to "sales"
- agentId automatically set to their user ID

### Sales Manager
- Shows leads from their centre only
- userType automatically set to "sales"
- Can filter by specific sales agent from their centre

### HOD Sales
- Shows all sales leads
- userType automatically set to "sales"
- Can filter by centre and specific sales agent

### Admin / Marketing
- Full access to all data
- Can filter by centre, source, user type, and agent
- Access to centerWonData and sourceCenterData charts

---

## Date Range Behavior

### Without Date Range
- **Total**: All-time data
- **MTD**: Current month data (from 1st of current month)
- **Today**: Today's data (IST: 5:30 AM - 11:59 PM)
- **Charts**: Last 30 days

### With Date Range
- **Total**: Data within date range
- **MTD**: Data within date range
- **Today**: Today's data (not affected by date range)
- **Charts**: Data within date range

---

## Lost Leads Logic

### Presales Lost
- Leads with leadStatusId = "lost"
- qualifiedDate is null (lost before qualification)
- Counted in presales metrics

### Sales Lost
- Leads with leadStatusId = "lost"
- qualifiedDate is not null (lost after qualification)
- Counted in sales metrics

---

## Performance Optimization

- Uses MongoDB aggregation pipelines for complex queries
- Parallel queries with Promise.all for faster response
- Efficient date-based indexing
- Minimal data transfer for chart data
- Role-based query optimization

---

## Notes

- All dates are in IST timezone (UTC+5:30)
- Date ranges are inclusive (start and end dates included)
- Empty or "all" values in filters mean no filtering applied
- Chart data automatically fills missing dates with 0 count
- Project values in centerWonData are converted to numeric for aggregation
