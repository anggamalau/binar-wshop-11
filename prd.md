# RESTful API Product Requirements Document

## Overview
This document outlines the requirements for a RESTful API that provides user authentication and profile management capabilities using JWT tokens with refresh token functionality.

## Core Features

### 1. Authentication System
- JWT-based authentication with access and refresh tokens
- Secure token generation and validation
- Token expiration and refresh mechanisms
- Session management and cleanup

### 2. User Management
- User login with email and password
- Secure logout functionality
- User profile retrieval and updates
- Password validation and security

## API Endpoints

### 1. Login Endpoint
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userPassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

**Error Responses:**
- **401 Unauthorized:** Invalid email or password
- **400 Bad Request:** Missing required fields
- **422 Unprocessable Entity:** Invalid email format
- **429 Too Many Requests:** Rate limit exceeded

**Requirements:**
- Validate email format and password strength
- Return JWT access token (15-minute expiration)
- Return refresh token (7-day expiration)
- Hash and verify passwords using bcrypt
- Implement rate limiting (5 attempts per minute per IP)
- Log authentication attempts for security monitoring

### 2. Logout Endpoint
**POST** `/api/auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Error Responses:**
- **401 Unauthorized:** Invalid or expired access token
- **400 Bad Request:** Missing refresh token

**Requirements:**
- Invalidate both access and refresh tokens
- Add tokens to blacklist/revocation list
- Clear any server-side session data
- Return success confirmation

### 3. Profile Endpoint
**GET** `/api/user/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "dateOfBirth": "1990-01-15",
      "profilePicture": "https://api.example.com/uploads/profile_123.jpg",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

**PUT** `/api/user/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "dateOfBirth": "1990-01-15"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "user_uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "dateOfBirth": "1990-01-15",
      "profilePicture": "https://api.example.com/uploads/profile_123.jpg",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T12:45:00Z"
    }
  }
}
```

**Error Responses:**
- **401 Unauthorized:** Invalid or expired access token
- **400 Bad Request:** Invalid field values
- **422 Unprocessable Entity:** Validation errors

**Requirements:**
- Authenticate user via JWT token
- Allow updating: firstName, lastName, phoneNumber, dateOfBirth
- Validate phone number format
- Validate date of birth format (YYYY-MM-DD)
- Sanitize input data
- Email cannot be updated via this endpoint

## Token Management

### Access Token
- **Type:** JWT (JSON Web Token)
- **Expiration:** 15 minutes
- **Payload:** userId, email, iat, exp
- **Algorithm:** HS256 or RS256

### Refresh Token
- **Type:** JWT or random string
- **Expiration:** 7 days
- **Storage:** Database with user association
- **Usage:** Generate new access tokens

### Token Refresh Endpoint
**POST** `/api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

## Security Requirements

### Authentication Security
- Hash passwords using bcrypt with salt rounds ≥ 12
- Implement JWT token validation middleware
- Use secure JWT signing keys (minimum 256-bit)
- Implement token blacklisting for logout
- Rate limiting on authentication endpoints

### Data Security
- Validate and sanitize all input data
- Implement CORS with appropriate origins
- Use HTTPS for all API communications
- Implement request logging for security monitoring
- Never expose passwords in API responses

### Error Handling
- Consistent error response format
- No sensitive information in error messages
- Appropriate HTTP status codes
- Generic error messages for security-sensitive failures

## Data Models

### User Model
```json
{
  "id": "string (UUID)",
  "email": "string (unique, required)",
  "password": "string (hashed, required)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "phoneNumber": "string (optional)",
  "dateOfBirth": "date (optional)",
  "profilePicture": "string (URL, optional)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Token Blacklist Model
```json
{
  "id": "string (UUID)",
  "token": "string (JWT token)",
  "expiresAt": "datetime",
  "createdAt": "datetime"
}
```

## Response Format Standards

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

## HTTP Status Codes
- **200 OK:** Successful operation
- **201 Created:** Resource created successfully
- **400 Bad Request:** Invalid request format
- **401 Unauthorized:** Authentication required or failed
- **403 Forbidden:** Access denied
- **404 Not Found:** Resource not found
- **422 Unprocessable Entity:** Validation errors
- **429 Too Many Requests:** Rate limit exceeded
- **500 Internal Server Error:** Server error

## Environment Configuration
- **JWT_SECRET:** Secret key for JWT signing
- **JWT_REFRESH_SECRET:** Secret key for refresh token signing
- **JWT_EXPIRE_TIME:** Access token expiration (15m)
- **JWT_REFRESH_EXPIRE_TIME:** Refresh token expiration (7d)
- **BCRYPT_ROUNDS:** Password hashing rounds (12)
- **RATE_LIMIT_WINDOW:** Rate limiting window (1 minute)
- **RATE_LIMIT_MAX:** Maximum requests per window (5)

## Database Requirements
- User table with appropriate indexes on email
- Token blacklist table for logout functionality
- Database connection pooling for performance
- Data backup and recovery procedures

## Performance Requirements
- Response time < 200ms for authentication endpoints
- Response time < 100ms for profile endpoints
- Support for concurrent users
- Database query optimization
- Caching strategy for frequently accessed data

## Validation Rules
- **Email:** Valid email format, maximum 255 characters
- **Password:** Minimum 8 characters, at least one uppercase, lowercase, number
- **First Name:** Required, 2-50 characters, alphabetic only
- **Last Name:** Required, 2-50 characters, alphabetic only
- **Phone Number:** Optional, E.164 format
- **Date of Birth:** Optional, YYYY-MM-DD format, must be in the past