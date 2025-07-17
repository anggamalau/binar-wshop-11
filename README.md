[![codecov](https://codecov.io/github/anggamalau/binar-wshop-11/graph/badge.svg?token=YX895CSEUM)](https://codecov.io/github/anggamalau/binar-wshop-11)

# RESTful API with JWT Authentication

A secure RESTful API built with Express.js and SQLite, featuring JWT-based authentication with refresh tokens, user profile management, and comprehensive security measures.

## Features

- **JWT Authentication**: Access and refresh token implementation
- **User Management**: Profile retrieval and updates
- **Security**: Rate limiting, input validation, password hashing
- **Database**: SQLite with proper indexing
- **Token Management**: Blacklisting and cleanup mechanisms

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your configuration.

4. Seed the database with a test user:
```bash
npm run seed
```

5. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /api/health
```

### Authentication

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "TestPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_uuid",
      "email": "test@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  }
}
```

#### Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout
```
POST /api/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### User Profile

#### Get Profile
```
GET /api/user/profile
Authorization: Bearer <access_token>
```

#### Update Profile
```
PUT /api/user/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "dateOfBirth": "1990-01-15"
}
```

## Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: HS256 algorithm with secure secrets
- **Rate Limiting**: 5 login attempts per minute per IP
- **Input Validation**: Comprehensive validation using express-validator
- **CORS**: Configured for specific origins
- **Helmet**: Security headers
- **Token Blacklisting**: Invalidated tokens are stored and checked

## Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_minimum_256_bits
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here_minimum_256_bits
JWT_EXPIRE_TIME=15m
JWT_REFRESH_EXPIRE_TIME=7d

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=5

# Database Configuration
DB_PATH=./database.sqlite

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## Database Schema

### Users Table
- `id` (TEXT, Primary Key, UUID)
- `email` (TEXT, Unique, Required)
- `password` (TEXT, Required, Hashed)
- `firstName` (TEXT, Required)
- `lastName` (TEXT, Required)
- `phoneNumber` (TEXT, Optional)
- `dateOfBirth` (TEXT, Optional)
- `profilePicture` (TEXT, Optional)
- `createdAt` (DATETIME)
- `updatedAt` (DATETIME)

### Refresh Tokens Table
- `id` (TEXT, Primary Key, UUID)
- `userId` (TEXT, Foreign Key)
- `token` (TEXT, Required)
- `expiresAt` (DATETIME, Required)
- `createdAt` (DATETIME)

### Token Blacklist Table
- `id` (TEXT, Primary Key, UUID)
- `token` (TEXT, Required)
- `expiresAt` (DATETIME, Required)
- `createdAt` (DATETIME)

## Error Handling

All endpoints return consistent error responses:

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

### Common Error Codes
- `UNAUTHORIZED`: Authentication required or failed
- `INVALID_CREDENTIALS`: Wrong email or password
- `TOKEN_EXPIRED`: JWT token has expired
- `TOKEN_BLACKLISTED`: Token has been revoked
- `VALIDATION_ERROR`: Input validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Server error

## Validation Rules

### Email
- Valid email format
- Maximum 255 characters

### Password (for login)
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Name Fields
- 2-50 characters
- Alphabetic characters only

### Phone Number
- E.164 format (optional)

### Date of Birth
- YYYY-MM-DD format
- Must be in the past

## Testing

Use the seeded test user:
- **Email**: `test@example.com`
- **Password**: `TestPassword123`

### Example cURL Commands

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'

# Get Profile (replace TOKEN with actual access token)
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer TOKEN"

# Update Profile
curl -X PUT http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Jane","lastName":"Smith"}'
```

## Project Structure

```
src/
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   └── userController.js    # User profile logic
├── middleware/
│   ├── auth.js             # JWT authentication middleware
│   ├── rateLimiter.js      # Rate limiting configuration
│   └── validation.js       # Input validation rules
├── models/
│   ├── Token.js            # Token management model
│   └── User.js             # User model
├── routes/
│   ├── auth.js             # Authentication routes
│   └── user.js             # User profile routes
├── scripts/
│   └── seedUsers.js        # Database seeding script
├── utils/
│   └── jwt.js              # JWT utility functions
└── server.js               # Main application file
```

## Development

### Adding New Endpoints

1. Create controller function in appropriate controller file
2. Add validation rules in `middleware/validation.js`
3. Define route in appropriate route file
4. Update this README with endpoint documentation

### Database Changes

1. Modify the schema in `config/database.js`
2. Update model files accordingly
3. Test with fresh database

## License

ISC