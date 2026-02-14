# Authentication API Documentation

Base URL: `/api/auth`

## Overview
Authentication endpoints for user login, password management, and session validation.

---

## Endpoints

### 1. Login
**POST** `/api/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Validation:**
- `email`: Valid email format (required)
- `password`: Non-empty string (required)

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1735689600000,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin",
    "status": "active"
  }
}
```

**Error Responses:**
- `400`: Validation errors
- `401`: Invalid credentials or inactive account

---

### 2. Check User Status
**GET** `/api/auth/status`

Verify JWT token validity and get current user status.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "isActive": true,
  "status": "active",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin",
    "status": "active"
  }
}
```

**Error Responses:**
- `401`: No token provided, invalid token, or user not found

---

### 3. Forgot Password
**POST** `/api/auth/forgot-password`

Request password reset email with reset token.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "Password reset email sent successfully"
}
```

**Error Responses:**
- `400`: Validation errors
- `404`: User not found
- `500`: Failed to send reset email

---

### 4. Reset Password
**POST** `/api/auth/reset-password`

Reset password using token from email.

**Request Body:**
```json
{
  "token": "abc123def456...",
  "password": "newPassword123"
}
```

**Validation:**
- `password`: Minimum 6 characters (required)

**Success Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

**Error Responses:**
- `400`: Validation errors or invalid/expired token
- `500`: Failed to reset password
