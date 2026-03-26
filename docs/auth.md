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
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1735689600000,
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "admin",
      "status": "active"
    }
  },
  "message": "Successfully logged in"
}
```

**Error Responses:**
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": []
}
```
- `400`: Validation errors
- `401`: Invalid credentials

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
  "status": "success",
  "data": {
    "isActive": true,
    "status": "active",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "admin",
      "status": "active"
    }
  },
  "message": "Status retrieved successfully"
}
```

**Error Responses:**
```json
{
  "status": "error",
  "message": "No token provided"
}
```
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
  "status": "success",
  "data": {
    "message": "Password reset email sent successfully"
  },
  "message": "Password reset email sent successfully"
}
```

**Error Responses:**
```json
{
  "status": "error",
  "message": "User not found with this email"
}
```
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
  "status": "success",
  "data": {
    "message": "Password reset successfully"
  },
  "message": "Password reset successfully"
}
```

**Error Responses:**
```json
{
  "status": "error",
  "message": "Invalid or expired reset token"
}
```
- `400`: Invalid or expired reset token
- `500`: Failed to reset password

---

### 5. Forgot Password with OTP
**POST** `/api/auth/forgot-password-otp`

Request password reset OTP via email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": null,
  "message": "OTP sent successfully to your email"
}
```

**Error Responses:**
- `400`: Validation errors
- `404`: User not found
- `500`: Failed to send OTP

---

### 6. Verify OTP
**POST** `/api/auth/verify-otp`

Verify OTP and receive reset token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Validation:**
- `email`: Valid email format (required)
- `otp`: 6 digits (required)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "token": "abc123def456..."
  },
  "message": "OTP verified successfully"
}
```

**Error Responses:**
- `400`: Validation errors or invalid/expired OTP
- `500`: Failed to verify OTP

---

### 7. Reset Password with Token
**POST** `/api/auth/reset-password-with-token`

Reset password using token from OTP verification.

**Request Body:**
```json
{
  "token": "abc123def456...",
  "password": "newPassword123"
}
```

**Validation:**
- `token`: Non-empty string (required)
- `password`: Minimum 6 characters (required)

**Success Response (200):**
```json
{
  "status": "success",
  "data": null,
  "message": "Password reset successfully"
}
```

**Error Responses:**
- `400`: Validation errors or invalid/expired token
- `500`: Failed to reset password

---

## OTP Password Reset Flow

1. **Request OTP**: `POST /api/auth/forgot-password-otp` with email
2. **Verify OTP**: `POST /api/auth/verify-otp` with email and OTP → Receive token
3. **Reset Password**: `POST /api/auth/reset-password-with-token` with token and new password

**Notes:**
- OTP expires in 10 minutes
- Reset token from OTP verification expires in 10 minutes
- OTP is 6 digits
