require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const { app, initializeApp } = require('../app');
const User = require('../models/User');

describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      // Initialize the app and database
      initializeApp();
      
      // Wait for database to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create test user
      const testUser = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        dateOfBirth: '1990-01-15'
      };
      
      try {
        await User.create(testUser);
      } catch (error) {
        // User might already exist, ignore error
      }
    });

    test('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123'
      };
  
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);
  
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.tokens).toHaveProperty('expiresIn');
    });
  
    test('should return 401 for non-existent email', async () => {
      const loginData = {
        email: 'notfound@example.com',
        password: 'password123'
      };
  
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
  
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });
  
    test('should return 401 for incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };
  
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
  
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    test('should return 422 for invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'TestPassword123'
      };
  
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);
  
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    test('should return 400 for missing email', async () => {
      const loginData = {
        password: 'TestPassword123'
      };
  
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);
  
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    test('should return 400 for missing password', async () => {
      const loginData = {
        email: 'test@example.com'
      };
  
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);
  
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });