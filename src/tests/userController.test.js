require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const { app, initializeApp } = require('../app');
const User = require('../models/User');

describe('User Controller', () => {
  let testUser;

  beforeAll(async () => {
    // Initialize the app and database
    initializeApp();
    
    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create test user
    const testUserData = {
      email: 'usertest@example.com',
      password: 'TestPassword123',
      firstName: 'User',
      lastName: 'Test',
      phoneNumber: '+1234567890',
      dateOfBirth: '1990-01-15'
    };
    
    try {
      testUser = await User.create(testUserData);
    } catch (error) {
      // User might already exist, find it
      testUser = await User.findByEmail(testUserData.email);
    }
  });

  // Helper function to get fresh access token
  const getFreshAccessToken = async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'usertest@example.com',
        password: 'TestPassword123'
      });
    return loginResponse.body.data.tokens.accessToken;
  };

  describe('GET /api/user/profile', () => {
    test('should get user profile successfully with valid token', async () => {
      const accessToken = await getFreshAccessToken();
      
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('email', 'usertest@example.com');
      expect(response.body.data.user).toHaveProperty('firstName', 'User');
      expect(response.body.data.user).toHaveProperty('lastName', 'Test');
      expect(response.body.data.user).toHaveProperty('phoneNumber', '+1234567890');
      expect(response.body.data.user).toHaveProperty('dateOfBirth', '1990-01-15');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('should return 401 for missing authorization header', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    test('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'INVALID_TOKEN');
    });

    test('should handle database error when finding user', async () => {
      const accessToken = await getFreshAccessToken();
      
      // Mock User.findById to throw an error only on the second call (first call is in auth middleware)
      const originalFindById = User.findById;
      let callCount = 0;
      User.findById = jest.fn().mockImplementation((id) => {
        callCount++;
        if (callCount === 1) {
          // First call in auth middleware - return the test user
          return originalFindById(id);
        } else {
          // Second call in controller - throw error
          throw new Error('Database error');
        }
      });

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'INTERNAL_ERROR');
      expect(response.body.error).toHaveProperty('message', 'Internal server error');

      // Restore original method
      User.findById = originalFindById;
    });

    test('should return 404 when user not found in database', async () => {
      const accessToken = await getFreshAccessToken();
      
      // Mock User.findById to return null only on the second call (first call is in auth middleware)
      const originalFindById = User.findById;
      let callCount = 0;
      User.findById = jest.fn().mockImplementation((id) => {
        callCount++;
        if (callCount === 1) {
          // First call in auth middleware - return the test user
          return originalFindById(id);
        } else {
          // Second call in controller - return null
          return null;
        }
      });

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'USER_NOT_FOUND');
      expect(response.body.error).toHaveProperty('message', 'User not found');

      // Restore original method
      User.findById = originalFindById;
    });
  });

  describe('PUT /api/user/profile', () => {
    test('should update user profile successfully with valid data', async () => {
      const accessToken = await getFreshAccessToken();
      
      const updateData = {
        firstName: 'UpdatedUser',
        lastName: 'UpdatedTest',
        phoneNumber: '+9876543210',
        dateOfBirth: '1985-05-15'
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('firstName', 'UpdatedUser');
      expect(response.body.data.user).toHaveProperty('lastName', 'UpdatedTest');
      expect(response.body.data.user).toHaveProperty('phoneNumber', '+9876543210');
      expect(response.body.data.user).toHaveProperty('dateOfBirth', '1985-05-15');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('should update profile with partial data', async () => {
      const accessToken = await getFreshAccessToken();
      
      const updateData = {
        firstName: 'PartialUpdate'
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body.data.user).toHaveProperty('firstName', 'PartialUpdate');
    });

    test('should return validation error for invalid phone number', async () => {
      const accessToken = await getFreshAccessToken();
      
      const updateData = {
        phoneNumber: 'invalid-phone'
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    test('should return validation error for invalid date of birth', async () => {
      const accessToken = await getFreshAccessToken();
      
      const updateData = {
        dateOfBirth: 'invalid-date'
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    test('should return validation error for future date of birth', async () => {
      const accessToken = await getFreshAccessToken();
      
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const updateData = {
        dateOfBirth: futureDateString
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    test('should return validation error for invalid first name', async () => {
      const accessToken = await getFreshAccessToken();
      
      const updateData = {
        firstName: 'A' // Too short
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    test('should return validation error for invalid last name with numbers', async () => {
      const accessToken = await getFreshAccessToken();
      
      const updateData = {
        lastName: 'Test123' // Contains numbers
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    test('should return 401 for missing authorization header', async () => {
      const updateData = {
        firstName: 'Test'
      };

      const response = await request(app)
        .put('/api/user/profile')
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    test('should return 401 for invalid token', async () => {
      const updateData = {
        firstName: 'Test'
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'INVALID_TOKEN');
    });

    test('should handle database error during update', async () => {
      const accessToken = await getFreshAccessToken();
      
      // Mock User.update to throw an error
      const originalUpdate = User.update;
      User.update = jest.fn().mockRejectedValue(new Error('Database error'));

      const updateData = {
        firstName: 'TestError'
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'INTERNAL_ERROR');
      expect(response.body.error).toHaveProperty('message', 'Internal server error');

      // Restore original method
      User.update = originalUpdate;
    });

    test('should return 404 when user not found during update', async () => {
      const accessToken = await getFreshAccessToken();
      
      // Mock User.update to return null
      const originalUpdate = User.update;
      User.update = jest.fn().mockResolvedValue(null);

      const updateData = {
        firstName: 'TestNotFound'
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'USER_NOT_FOUND');
      expect(response.body.error).toHaveProperty('message', 'User not found');

      // Restore original method
      User.update = originalUpdate;
    });

    test('should update profile successfully with empty request body', async () => {
      const accessToken = await getFreshAccessToken();
      
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
    });

    test('should handle profile update with valid phone number in E.164 format', async () => {
      const accessToken = await getFreshAccessToken();
      
      const updateData = {
        phoneNumber: '+12345678901234' // Valid E.164 format
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user).toHaveProperty('phoneNumber', '+12345678901234');
    });

    test('should handle profile update with valid date of birth', async () => {
      const accessToken = await getFreshAccessToken();
      
      const validDate = '1995-12-25';
      const updateData = {
        dateOfBirth: validDate
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user).toHaveProperty('dateOfBirth', validDate);
    });
  });

  describe('Authorization and Authentication Edge Cases', () => {
    test('should handle expired token', async () => {
      // Create an expired token
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'TOKEN_EXPIRED');
    });

    test('should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    test('should handle authorization header without Bearer prefix', async () => {
      const accessToken = await getFreshAccessToken();
      
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', accessToken)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });
});