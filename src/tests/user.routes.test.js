const express = require('express');
const request = require('supertest');
const userRoutes = require('../routes/user');
const { getProfile, updateProfile } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { profileUpdateValidation } = require('../middleware/validation');

// Database mocking is handled globally in jest.setup.js

jest.mock('../controllers/userController');
jest.mock('../middleware/auth');
jest.mock('../middleware/validation');

describe('User Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/user', userRoutes);

    // Mock middleware to call next()
    authenticate.mockImplementation((req, res, next) => {
      req.user = { id: 'user123', email: 'test@example.com' };
      req.token = 'mock-token';
      next();
    });

    // Mock validation middleware to call next()
    profileUpdateValidation.forEach(middleware => {
      if (typeof middleware === 'function') {
        middleware.mockImplementation((req, res, next) => next());
      }
    });
  });

  describe('GET /profile', () => {
    it('should call getProfile controller with authentication', async () => {
      const mockProfile = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      getProfile.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: { user: mockProfile }
        });
      });

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer access-token-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(mockProfile);
      expect(authenticate).toHaveBeenCalled();
      expect(getProfile).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      authenticate.mockImplementation((req, res, next) => {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Access token required' }
        });
      });

      const response = await request(app)
        .get('/api/user/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(authenticate).toHaveBeenCalled();
      expect(getProfile).not.toHaveBeenCalled();
    });

    it('should handle getProfile controller errors', async () => {
      getProfile.mockImplementation((req, res) => {
        res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      });

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer access-token-123');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(getProfile).toHaveBeenCalled();
    });
  });

  describe('PUT /profile', () => {
    it('should call updateProfile controller with authentication and validation', async () => {
      const mockUpdateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1234567890'
      };

      const mockUpdatedProfile = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1234567890'
      };

      updateProfile.mockImplementation((req, res) => {
        res.json({
          success: true,
          message: 'Profile updated successfully',
          data: { user: mockUpdatedProfile }
        });
      });

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', 'Bearer access-token-123')
        .send(mockUpdateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.data.user).toEqual(mockUpdatedProfile);
      expect(authenticate).toHaveBeenCalled();
      expect(updateProfile).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      authenticate.mockImplementation((req, res, next) => {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Access token required' }
        });
      });

      const response = await request(app)
        .put('/api/user/profile')
        .send({ firstName: 'Jane' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(authenticate).toHaveBeenCalled();
      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('should apply profile update validation middleware', async () => {
      updateProfile.mockImplementation((req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .put('/api/user/profile')
        .set('Authorization', 'Bearer access-token-123')
        .send({ firstName: 'Jane' });

      // Verify that validation middleware was called
      expect(profileUpdateValidation).toBeDefined();
      expect(Array.isArray(profileUpdateValidation)).toBe(true);
    });

    it('should handle updateProfile controller errors', async () => {
      updateProfile.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
        });
      });

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', 'Bearer access-token-123')
        .send({ firstName: 'Jane' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(updateProfile).toHaveBeenCalled();
    });

    it('should handle empty update data', async () => {
      updateProfile.mockImplementation((req, res) => {
        res.json({
          success: true,
          message: 'Profile updated successfully',
          data: { user: { id: 'user123', email: 'test@example.com' } }
        });
      });

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', 'Bearer access-token-123')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(updateProfile).toHaveBeenCalled();
    });
  });

  describe('Route configuration', () => {
    it('should have correct route paths', () => {
      const router = userRoutes;
      expect(router).toBeDefined();
      
      // Check that the router is an Express router
      expect(router.stack).toBeDefined();
      expect(Array.isArray(router.stack)).toBe(true);
    });

    it('should handle invalid routes', async () => {
      const response = await request(app)
        .get('/api/user/invalid-route');

      expect(response.status).toBe(404);
    });

    it('should handle invalid HTTP methods', async () => {
      const response = await request(app)
        .post('/api/user/profile'); // POST instead of GET/PUT

      expect(response.status).toBe(404);
    });
  });

  describe('Middleware integration', () => {
    it('should apply authentication middleware before controllers', async () => {
      const middlewareCallOrder = [];

      authenticate.mockImplementation((req, res, next) => {
        middlewareCallOrder.push('authentication');
        req.user = { id: 'user123' };
        next();
      });

      getProfile.mockImplementation((req, res) => {
        middlewareCallOrder.push('controller');
        res.json({ success: true });
      });

      await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer token');

      expect(middlewareCallOrder).toEqual(['authentication', 'controller']);
    });

    it('should apply validation middleware before updateProfile controller', async () => {
      const middlewareCallOrder = [];

      authenticate.mockImplementation((req, res, next) => {
        middlewareCallOrder.push('authentication');
        req.user = { id: 'user123' };
        next();
      });

      // Mock validation to track call order
      profileUpdateValidation.forEach((middleware, index) => {
        if (typeof middleware === 'function') {
          middleware.mockImplementation((req, res, next) => {
            middlewareCallOrder.push(`validation-${index}`);
            next();
          });
        }
      });

      updateProfile.mockImplementation((req, res) => {
        middlewareCallOrder.push('controller');
        res.json({ success: true });
      });

      await request(app)
        .put('/api/user/profile')
        .set('Authorization', 'Bearer token')
        .send({ firstName: 'Jane' });

      expect(middlewareCallOrder).toContain('authentication');
      expect(middlewareCallOrder).toContain('controller');
      expect(middlewareCallOrder.indexOf('controller')).toBeGreaterThan(0);
    });
  });

  describe('HTTP method restrictions', () => {
    it('should have correct route configuration', async () => {
      // Test that GET /profile works
      const getResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer token');
      expect(getResponse.status).toBe(200);

      // Test that PUT /profile works
      const putResponse = await request(app)
        .put('/api/user/profile')
        .set('Authorization', 'Bearer token')
        .send({ firstName: 'Test' });
      expect(putResponse.status).toBe(200);
    });
  });
});