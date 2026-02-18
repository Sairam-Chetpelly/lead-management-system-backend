# User Management API Documentation

Base URL: `/api/users`

## Overview
User management endpoints for creating, reading, updating, and deleting users with role-based access control.

**Authentication Required:** All endpoints require JWT token.

---

## Endpoints

### 1. Get All Users
**GET** `/api/users`

Retrieve paginated list of users with filtering and role-based access.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name, email, mobile, or designation
- `role` (optional): Filter by role ID or slug
- `status` (optional): Filter by status ID
- `centre` (optional): Filter by centre ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "userId": "USR000001",
        "name": "John Doe",
        "email": "john@example.com",
        "mobileNumber": "9876543210",
        "designation": "Sales Manager",
        "qualification": "high_value",
        "userType": "regular",
        "profileImage": "profile-123456.jpg",
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
          {
            "_id": "507f1f77bcf86cd799439015",
            "name": "English",
            "slug": "english",
            "code": "en"
          }
        ],
        "leadCount": 45,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 50,
      "limit": 10
    }
  },
  "message": "Users retrieved successfully"
}
```

**Role-Based Filtering:**
- **HOD Presales / Manager Presales**: Only see presales users
- **HOD Sales / Sales Manager**: Only see users from their centre
- **Admin / Marketing**: See all users

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to retrieve users

---

### 2. Get All Users (No Filtering)
**GET** `/api/users/all`

Retrieve all users without role-based filtering (admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:** Same as GET /api/users

**Success Response (200):** Same structure as GET /api/users

---

### 3. Create User
**POST** `/api/users`

Create a new user with role-based restrictions.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "mobileNumber": "9876543210",
  "password": "password123",
  "designation": "Sales Manager",
  "roleId": "507f1f77bcf86cd799439012",
  "statusId": "507f1f77bcf86cd799439013",
  "centreId": "507f1f77bcf86cd799439014",
  "languageIds": ["507f1f77bcf86cd799439015"],
  "qualification": "high_value",
  "userType": "regular",
  "parentId": "507f1f77bcf86cd799439016"
}
```

**Validation:**
- `name`: Required, non-empty string
- `email`: Required, valid email format
- `mobileNumber`: Required, non-empty string
- `password`: Required, minimum 6 characters
- `designation`: Required, non-empty string
- `roleId`: Required, valid role ID
- `statusId`: Required, valid status ID
- `qualification`: Required, must be "high_value" or "low_value"
- `userType`: Required for presales_agent role ("regular" or "cp_presales")
- `centreId`: Optional, valid centre ID
- `languageIds`: Optional, array of language IDs
- `parentId`: Optional, valid user ID

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "USR000001",
    "name": "John Doe",
    "email": "john@example.com",
    "mobileNumber": "9876543210",
    "designation": "Sales Manager",
    "qualification": "high_value",
    "userType": "regular",
    "roleId": { ... },
    "statusId": { ... },
    "centreId": { ... },
    "languageIds": [ ... ],
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "User created successfully"
}
```

**Role-Based Restrictions:**
- **HOD Sales / Sales Manager**: Can only create sales users in their centre
- **HOD Presales / Manager Presales**: Can only create presales users
- **Admin**: Can create any user

**Error Responses:**
- `400`: Validation failed or email already exists
- `403`: Access denied (role restrictions)
- `500`: Failed to create user

---

### 4. Update User
**PUT** `/api/users/:id`

Update an existing user with role-based restrictions.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required): User ID

**Request Body:** Same fields as create (all optional, password can be omitted)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "USR000001",
    "name": "John Doe Updated",
    ...
  },
  "message": "User updated successfully"
}
```

**Role-Based Restrictions:**
- **HOD Sales / Sales Manager**: Can only update users from their centre, cannot change centre
- **HOD Presales / Manager Presales**: Can only update presales users
- **Admin**: Can update any user

**Error Responses:**
- `400`: Validation failed
- `403`: Access denied (role restrictions)
- `404`: User not found
- `500`: Failed to update user

---

### 5. Delete User
**DELETE** `/api/users/:id`

Soft delete a user (sets deletedAt timestamp).

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): User ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": null,
  "message": "User deleted successfully"
}
```

**Error Responses:**
- `404`: User not found
- `500`: Failed to delete user

---

### 6. Upload Profile Image
**POST** `/api/users/:id/profile-image`

Upload profile image for a user.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Path Parameters:**
- `id` (required): User ID

**Form Data:**
- `profileImage` (required): Image file (max 2MB, image formats only)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "profileImage": "profile-1234567890.jpg"
  },
  "message": "Profile image uploaded successfully"
}
```

**Error Responses:**
- `400`: No image file provided or invalid file type
- `404`: User not found
- `500`: Failed to upload image

---

### 7. Get Profile Image
**GET** `/api/users/profile-image/:filename`

Retrieve profile image file.

**Path Parameters:**
- `filename` (required): Image filename

**Success Response (200):**
- Returns image file

**Error Responses:**
- `404`: Image not found

---

### 8. Export Users
**GET** `/api/users/export`

Export all users as CSV data.

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
      "Created": "2025-01-15T10:30:00.000Z"
    }
  ],
  "message": "Users exported successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Failed to export users

---

## Admin User Management

Base URL: `/api/admin`

### 9. Get Users (Admin)
**GET** `/api/admin/users`

Admin endpoint to retrieve users with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name or email

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "users": [ ... ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 50,
      "limit": 10
    }
  },
  "message": "Users retrieved successfully"
}
```

---

### 10. Delete User (Admin)
**DELETE** `/api/admin/users/:id`

Admin endpoint to delete a user with lead validation.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (required): User ID

**Success Response (200):**
```json
{
  "status": "success",
  "data": null,
  "message": "User deleted successfully"
}
```

**Error Responses:**
- `400`: Cannot delete user with assigned leads
- `404`: User not found
- `500`: Failed to delete user

**Note:** Users with assigned leads cannot be deleted. Reassign or remove leads first.

---

## User Fields

### Required Fields
- `name`: User's full name
- `email`: Unique email address
- `mobileNumber`: Contact number
- `password`: Minimum 6 characters (only for creation)
- `designation`: Job title
- `roleId`: Reference to Role document
- `statusId`: Reference to Status document
- `qualification`: "high_value" or "low_value"

### Optional Fields
- `centreId`: Reference to Centre document
- `languageIds`: Array of Language document references
- `parentId`: Reference to parent User document
- `userType`: "regular" or "cp_presales" (required for presales_agent role)
- `profileImage`: Filename of uploaded profile image

### Auto-Generated Fields
- `userId`: Auto-generated unique ID (USR000001, USR000002, etc.)
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `deletedAt`: Soft delete timestamp (null if active)

### Computed Fields
- `leadCount`: Number of leads assigned to user (only for sales/presales agents)

---

## User Types

### Qualification
- `high_value`: High-value customer handling
- `low_value`: Standard customer handling

### User Type (Presales Only)
- `regular`: Regular presales agent
- `cp_presales`: Channel partner presales agent

---

## Role-Based Access Control

### Admin
- Full access to all user operations
- Can create, update, delete any user
- Can assign any role and centre

### HOD Sales
- Can view and manage users from their centre
- Can create sales-related users in their centre
- Cannot change user's centre

### Sales Manager
- Can view and manage users from their centre
- Can create sales agents in their centre
- Cannot change user's centre

### HOD Presales
- Can view and manage all presales users
- Can create presales-related users
- Can assign any centre

### Manager Presales
- Can view and manage all presales users
- Can create presales agents
- Can assign any centre

---

## Notes

- All passwords are hashed using bcrypt before storage
- Profile images are stored in `/uploads/profiles/` directory
- Maximum profile image size is 2MB
- Only image file formats are allowed for profile images
- Users with assigned leads cannot be deleted
- Email addresses must be unique across all users
- User IDs are auto-generated sequentially
- Lead counts are calculated dynamically for sales and presales agents
