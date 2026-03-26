# Users API Documentation

Base URL: `/api/users`

## Overview
User management endpoints for creating, updating, and managing user accounts.

**Authentication Required:** All endpoints require JWT token.

---

## User CRUD Operations

### Get All Users
**GET** `/api/users`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search by name, email, mobile, designation
- `role`: Filter by role ID or slug
- `status`: Filter by status ID
- `centre`: Filter by centre ID

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "mobileNumber": "9876543210",
      "designation": "Sales Manager",
      "roleId": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Sales Agent",
        "slug": "sales_agent"
      },
      "statusId": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Active",
        "slug": "active"
      },
      "centreId": {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Mumbai",
        "slug": "mumbai"
      },
      "languageIds": [
        { "_id": "...", "name": "English" },
        { "_id": "...", "name": "Hindi" }
      ],
      "qualification": "high_value",
      "userType": "regular",
      "profileImage": "profile-1234567890.jpg",
      "leadCount": 45,
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

### Get All Users (No Filter)
**GET** `/api/users/all`

Returns all users without role-based filtering.

### Create User
**POST** `/api/users`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "mobileNumber": "9876543210",
  "password": "password123",
  "designation": "Sales Manager",
  "roleId": "507f1f77bcf86cd799439011",
  "statusId": "507f1f77bcf86cd799439012",
  "centreId": "507f1f77bcf86cd799439013",
  "languageIds": ["507f1f77bcf86cd799439014", "507f1f77bcf86cd799439015"],
  "qualification": "high_value",
  "userType": "regular"
}
```

**Validation:**
- `name`: Required
- `email`: Valid email format (required)
- `mobileNumber`: Required
- `password`: Minimum 6 characters (required)
- `designation`: Required
- `roleId`: Required
- `statusId`: Required
- `qualification`: Must be "high_value" or "low_value"
- `userType`: Required for presales agents ("regular" or "cp_presales")

**Success Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  ...
}
```

**Error Responses:**
- `400`: Validation errors or email already exists
- `403`: Insufficient permissions to create user with specified role

### Update User
**PUT** `/api/users/:id`

**Request Body:** Same as create (password optional)

**Notes:**
- Empty password field will not update password
- HOD sales/sales manager cannot change centre

### Delete User
**DELETE** `/api/users/:id`

Soft deletes user.

**Success Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

---

## Profile Image Management

### Upload Profile Image
**POST** `/api/users/:id/profile-image`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `profileImage`: Image file (max 2MB, image formats only)

**Success Response (200):**
```json
{
  "message": "Profile image uploaded successfully",
  "profileImage": "profile-1234567890.jpg"
}
```

**Error Responses:**
- `400`: No image file provided or invalid file type
- `404`: User not found

### Get Profile Image
**GET** `/api/users/profile-image/:filename`

Returns image file.

---

## Export

### Export Users
**GET** `/api/users/export`

Returns CSV-formatted JSON data of all users.

**Success Response (200):**
```json
[
  {
    "Name": "John Doe",
    "Email": "john@example.com",
    "Mobile Number": "9876543210",
    "Designation": "Sales Manager",
    "Role": "Sales Agent",
    "Status": "Active",
    "Centre": "Mumbai",
    "Languages": "English, Hindi",
    "Qualification": "high_value",
    "User Type": "regular",
    "Created": "2025-01-01T00:00:00.000Z"
  }
]
```

---

## Search Dropdown

### Search Users for Dropdown
**GET** `/api/users/search-dropdown`

Returns minimal user data for dropdown/autocomplete components.

**Query Parameters:**
- `search`: Search by name (required, min 3 characters)
- `role`: Filter by role ID or slug (optional)
- `centre`: Filter by centre ID or slug (optional)

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "roleId": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Sales Agent",
        "slug": "sales_agent"
      },
      "centreId": {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Mumbai",
        "slug": "mumbai"
      },
      "statusId": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Active",
        "slug": "active"
      },
      "languageIds": [
        {
          "_id": "507f1f77bcf86cd799439015",
          "name": "English",
          "slug": "english",
          "code": "en"
        }
      ]
    }
  ],
  "message": "Users retrieved successfully"
}
```

**Notes:**
- Returns maximum 20 results
- Results sorted alphabetically by name
- Supports both role ID (MongoDB ObjectId) and role slug
- Supports both centre ID (MongoDB ObjectId) and centre slug

---

## Role-Based Access Control

### Admin
- Full access to all users
- Can create/update/delete any user

### HOD Presales / Manager Presales
- Can only view/manage presales users
- Cannot create sales users

### HOD Sales
- Can only view/manage users from their centre
- Can create sales-related users in their centre

### Sales Manager
- Can only view/manage users from their centre
- Can create sales-related users in their centre

### Other Roles
- Limited or no access to user management

---

## User Types

### Regular
- Standard user type for most roles

### CP Presales
- Special presales agent type for Channel Partner leads
- Only applicable to presales_agent role
- Required field when creating presales agents

---

## Qualification Levels

- `high_value`: High-value lead qualification
- `low_value`: Low-value lead qualification

---

## Notes

- Passwords are automatically hashed before storage
- Profile images stored in `/uploads/profiles/`
- Lead count only calculated for sales and presales agents
- Deleted users cannot be restored (soft delete)
