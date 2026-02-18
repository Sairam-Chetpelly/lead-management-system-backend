# Dashboard API Documentation

Base URL: `/api/dashboard`

## Overview
Analytics and reporting endpoints providing comprehensive dashboard metrics, charts, and statistics.

**Authentication Required:** All endpoints require JWT token.

---

## Main Dashboard

### Get Admin Dashboard
**GET** `/api/dashboard`

**Query Parameters:**
- `userType`: Filter by user type ("presales", "sales", or empty for all)
- `agentId`: Filter by specific agent ID (or "all")
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `sourceId`: Filter by lead source ID (or "all")
- `centreId`: Filter by centre ID (or "all")

**Success Response (200):**
```json
{
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
  "dailySiteVisits": [ ... ],
  "dailyCenterVisits": [ ... ],
  "dailyVirtualMeetings": [ ... ],
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
}
```

---

## Metrics Explanation

### Card Metrics
- **Total**: All-time count (filtered by date range if provided)
- **MTD**: Month-to-date count (or date range if provided)
- **Today**: Today's count (IST timezone)

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
- `dailyQualificationRate`: Qualification percentage per day
- `dailyCallsPerLead`: Average calls per lead per day

### Admin/Marketing Charts
Available for admin and marketing roles:
- `centerWonData`: Won leads and project value by centre
- `sourceCenterData`: Qualified leads matrix (source × centre)

---

## Utility Endpoints

### Get All Sources
**GET** `/api/dashboard/sources`

Returns all lead sources for dropdown.

**Success Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Google Ads"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Facebook"
  }
]
```

### Get All Centres
**GET** `/api/dashboard/centres`

Returns all centres for dropdown.

### Get Users by Type
**GET** `/api/dashboard/users/:type`

**Path Parameters:**
- `type`: "sales", "presales", or "all"

Returns users filtered by role type.

**Success Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
]
```

---

## Export Dashboard

### Export Dashboard Data
**GET** `/api/dashboard/export`

Exports dashboard data as CSV.

**Query Parameters:** Same as GET /api/dashboard

**Response:** CSV file download

---

## Role-Based Filtering

### Presales Agent
- Auto-filtered to show only their assigned leads
- Only presales leads (status = "lead")

### Sales Agent
- Auto-filtered to show only their assigned leads
- Excludes won/lost leads

### HOD Presales / Manager Presales
- Shows all presales leads
- Can filter by specific presales agent

### Sales Manager
- Shows leads from their centre only
- Only qualified leads
- Can filter by specific sales agent

### HOD Sales
- Shows leads from their centre only
- Can filter by specific sales agent

### Admin / Marketing
- Full access to all data
- Can filter by centre, source, user type, agent

---

## Date Range Behavior

### Without Date Range
- **Total**: All-time data
- **MTD**: Current month data
- **Today**: Today's data (IST)
- **Charts**: Last 30 days

### With Date Range
- **Total**: Data within date range
- **MTD**: Data within date range
- **Today**: Not affected (always today)
- **Charts**: Data within date range

---

## Lost Leads Logic

### Presales Lost
- Leads with status "lost"
- `qualifiedDate` is null (lost before qualification)

### Sales Lost
- Leads with status "lost"
- `qualifiedDate` is not null (lost after qualification)

---

## Performance Optimization

- Uses MongoDB aggregation pipelines
- Parallel queries with Promise.all
- Efficient date-based indexing
- Minimal data transfer for charts
