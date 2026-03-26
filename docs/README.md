# LMS API Documentation

## Overview

Complete API documentation for the Lead Management System (LMS) backend.

**Base URL:** `http://localhost:5000/api` (Development)

**Version:** 1.0.0

---

## Table of Contents

1. [Authentication](./auth.md) - Login, password reset, session management
2. [Admin](./admin.md) - Roles, centres, languages, statuses management
3. [Leads](./leads.md) - Lead CRUD, bulk upload, webhooks, activities
4. [Users](./users.md) - User management, profile images
5. [Dashboard](./dashboard.md) - Analytics, metrics, charts
6. [Additional APIs](./additional-apis.md) - Call logs, activity logs, documents, etc.

---

## Quick Start

### 1. Authentication

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lms.com","password":"admin123"}'

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### 2. Authenticated Request

```bash
# Get leads
curl -X GET http://localhost:5000/api/leads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-api-key: lms-secure-api-key-2024"
```

---

## Authentication

All API requests (except webhooks and public endpoints) require:

1. **JWT Token** in Authorization header:
   ```
   Authorization: Bearer <token>
   ```

2. **API Key** in header:
   ```
   x-api-key: lms-secure-api-key-2024
   ```

---

## Common Response Formats

### Success Response
```json
{
  "data": [ ... ],
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "error": "Error message",
  "errors": [
    {
      "msg": "Validation error message",
      "param": "fieldName"
    }
  ]
}
```

### Paginated Response
```json
{
  "data": [ ... ],
  "pagination": {
    "current": 1,
    "pages": 10,
    "total": 100,
    "limit": 10
  }
}
```

---

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `207` - Multi-Status (partial success in bulk operations)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- **IP-based:** 100 requests per 15 minutes
- **User-based:** Configurable per endpoint
- Headers returned:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

## CORS Configuration

Allowed origins configured via `CORS_ORIGINS` environment variable.

Default: `http://localhost:3000`

---

## Data Formats

### Dates
- Format: ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- Timezone: UTC (converted to IST for display)
- Date filters: `YYYY-MM-DD`

### Phone Numbers
- Format: 10 digits (Indian format)
- Example: `9876543210`

### Email
- Standard email format validation
- Example: `user@example.com`

---

## File Uploads

### Supported Formats

**Documents:**
- PDF, DOC, DOCX, XLS, XLSX
- Images: JPG, JPEG, PNG, WEBP
- Archives: ZIP
- Audio: MP3
- Video: MP4
- Text: TXT, CSV
- Max size: 50MB

**Profile Images:**
- Formats: JPG, JPEG, PNG
- Max size: 2MB

**CSV Uploads:**
- Format: CSV
- Max size: 5MB
- Max rows: 2000

---

## Soft Delete

All delete operations use soft delete:
- Records marked with `deletedAt` timestamp
- Excluded from queries with `deletedAt: null` filter
- Data retained for audit purposes

---

## Role-Based Access Control (RBAC)

### Roles

1. **Admin** - Full system access
2. **HOD Presales** - Presales team management
3. **Manager Presales** - Presales operations
4. **Presales Agent** - Lead qualification
5. **HOD Sales** - Sales team management (centre-specific)
6. **Sales Manager** - Sales operations (centre-specific)
7. **Sales Agent** - Lead conversion
8. **Marketing** - Analytics and reporting

### Access Levels

| Endpoint | Admin | HOD Presales | Presales Agent | HOD Sales | Sales Manager | Sales Agent | Marketing |
|----------|-------|--------------|----------------|-----------|---------------|-------------|-----------|
| Admin APIs | ✓ | Limited | ✗ | Limited | Limited | ✗ | ✗ |
| All Leads | ✓ | Presales only | Own leads | Centre only | Centre only | Own leads | ✓ |
| Dashboard | ✓ | Presales data | Own data | Centre data | Centre data | Own data | ✓ |
| Users | ✓ | Presales users | ✗ | Centre users | Centre users | ✗ | ✗ |

---

## Webhooks

### Google Ads Webhook
- **URL:** `/api/leads/webhook/google-ads`
- **Method:** POST
- **Auth:** Webhook key validation
- **Purpose:** Automatic lead creation from Google Ads

### Meta Ads Webhook
- **URL:** `/api/leads/webhook/meta-ads`
- **Methods:** GET (verification), POST (lead creation)
- **Auth:** Webhook key validation
- **Purpose:** Automatic lead creation from Facebook/Instagram

---

## Environment Variables

Required environment variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/lms

# Authentication
JWT_SECRET=your-secret-key
API_KEY=lms-secure-api-key-2024

# CORS
CORS_ORIGINS=http://localhost:3000

# Email
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-email-password

# Webhooks
GOOGLE_ADS_WEBHOOK_KEY=your-webhook-key
META_ADS_WEBHOOK_KEY=your-webhook-key
META_USER_ACCESS_TOKEN=your-meta-token
META_PAGE_ACCESS_TOKEN=your-page-token

# WhatsApp (MSG91)
MSG91_API_KEY=your-api-key
MSG91_WHATSAPP_NUMBER=your-number
```

---

## Testing

### Default Admin Credentials
```
Email: admin@lms.com
Password: admin123
```

### Postman Collection
Import the Postman collection from `/postman/LMS-API.postman_collection.json`

---

## Error Handling

### Validation Errors
```json
{
  "errors": [
    {
      "msg": "Email is required",
      "param": "email",
      "location": "body"
    }
  ]
}
```

### Database Errors
```json
{
  "error": "Duplicate key error",
  "code": 11000
}
```

### Authentication Errors
```json
{
  "error": "Invalid token",
  "message": "Token has expired"
}
```

---

## Best Practices

1. **Always include API key** in requests
2. **Handle token expiry** (24-hour validity)
3. **Use pagination** for large datasets
4. **Implement retry logic** for failed requests
5. **Validate data** before sending
6. **Handle file uploads** with proper content types
7. **Use filters** to reduce data transfer
8. **Cache reference data** (roles, statuses, etc.)

---

## Support

For issues or questions:
- Check individual API documentation files
- Review error messages and status codes
- Contact development team

---

## Changelog

### Version 1.0.0 (2025)
- Initial release
- Complete CRUD operations for all entities
- Webhook integrations (Google Ads, Meta Ads)
- WhatsApp notifications
- Advanced analytics dashboard
- Role-based access control
- Bulk upload functionality
- Document management
