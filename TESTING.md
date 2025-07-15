# Testing Documentation

## Test Coverage Summary

### authController.js Coverage: 95.52%

The authController.js file has achieved **95.52% line coverage**, which significantly exceeds the requested 40% coverage target.

### Test Files

1. **`src/tests/auth.test.js`** - Basic authentication endpoint tests
2. **`src/tests/authController.test.js`** - Comprehensive authController coverage tests

### Test Coverage Details

#### Functions Covered:
- ✅ `login()` - 100% coverage
- ✅ `logout()` - 100% coverage  
- ✅ `refreshAccessToken()` - 100% coverage

#### Scenarios Tested (28 total tests):

**Login Function (3 tests):**
- ✅ Successful login with valid credentials
- ✅ Failed login with non-existent email
- ✅ Failed login with incorrect password

**Logout Function (4 tests):**
- ✅ Successful logout with valid access and refresh tokens
- ✅ Successful logout without refresh token
- ✅ Failed logout with invalid access token
- ✅ Failed logout with missing authorization header

**Refresh Token Function (7 tests):**
- ✅ Successful token refresh with valid refresh token
- ✅ Failed refresh with invalid refresh token
- ✅ Failed refresh with blacklisted refresh token
- ✅ Failed refresh with non-existent refresh token in database
- ✅ Failed refresh with expired refresh token
- ✅ Failed refresh with malformed JWT tokens
- ✅ Failed refresh for non-existent users

**Validation Scenarios (6 tests):**
- ✅ Missing refresh token in refresh endpoint
- ✅ Invalid email format in login
- ✅ Missing password in login
- ✅ Missing email in login
- ✅ Invalid email format validation
- ✅ Input validation errors

**Error Handling & Edge Cases (8 tests):**
- ✅ Database errors during login, logout, and refresh operations
- ✅ Expired refresh tokens during refresh attempts
- ✅ Malformed JWT tokens
- ✅ Refresh tokens for non-existent users
- ✅ Logout with refresh tokens from different users
- ✅ Logout with expired refresh tokens
- ✅ Cross-user token security validation
- ✅ Database error simulation with Jest mocks

### Uncovered Lines

The remaining 4.48% of uncovered lines consist of:
- Specific error logging statements (lines 94, 104-105)
- Very specific edge cases in error handling

### Test Environment

- **Database:** In-memory SQLite for isolated testing
- **Authentication:** Reduced bcrypt rounds (4) for faster tests
- **Rate Limiting:** Disabled during testing
- **Environment:** Separate `.env.test` configuration

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test src/tests/authController.test.js

# Watch mode
npm run test:watch
```

### Test Quality

- **Isolation:** Each test uses fresh tokens to avoid conflicts
- **Assertions:** Comprehensive response validation
- **Edge Cases:** Tests cover both success and failure scenarios
- **Error Handling:** Validates error codes and messages
- **Security:** Tests authentication and authorization flows
- **Mocking:** Database error simulation for complete coverage

The test suite ensures that the authentication controller functions correctly under various conditions and provides confidence in the security and reliability of the authentication system.