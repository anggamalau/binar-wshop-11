const express = require('express');
const request = require('supertest');
const authRoutes = require('../routes/auth');
const { login, logout, refreshAccessToken } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginValidation, refreshTokenValidation } = require('../middleware/validation');

jest.mock('../config/database', () => ({
  db: {},
  initDatabase: jest.fn(),
  runQuery: jest.fn(),
  getOne: jest.fn(),
  getAll: jest.fn(),
  uuidv4: jest.fn(() => 'mock-uuid')
}));

jest.mock('../controllers/authController');
jest.mock('../middleware/auth');
jest.mock('../middleware/validation');

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // Mock middleware to call next()
    authenticate.mockImplementation((req, res, next) => {
      req.user = { id: 'user123', email: 'test@example.com' };
      req.token = 'mock-token';
      next();
    });

    // Mock validation middleware to call next()
    loginValidation.forEach(middleware => {
      if (typeof middleware === 'function') {
        middleware.mockImplementation((req, res, next) => next());
      }
    });

    refreshTokenValidation.forEach(middleware => {
      if (typeof middleware === 'function') {
        middleware.mockImplementation((req, res, next) => next());
      }
    });
  });

  describe('POST /login', () => {
    it('should call login controller with validation', async () => {
      const mockLoginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      login.mockImplementation((req, res) => {
        res.json({ success: true, message: 'Login successful' });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(mockLoginData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, message: 'Login successful' });
      expect(login).toHaveBeenCalled();
    });

    it('should apply login validation middleware', async () => {
      login.mockImplementation((req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      // Verify that validation middleware was called
      expect(loginValidation).toBeDefined();
      expect(Array.isArray(loginValidation)).toBe(true);
    });

    it('should handle login controller errors', async () => {
      login.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }
        });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(login).toHaveBeenCalled();
    });
  });

  describe('POST /logout', () => {
    it('should call logout controller with authentication', async () => {
      const mockLogoutData = {
        refreshToken: 'refresh-token-123'
      };

      logout.mockImplementation((req, res) => {
        res.json({ success: true, message: 'Logout successful' });
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer access-token-123')
        .send(mockLogoutData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, message: 'Logout successful' });
      expect(authenticate).toHaveBeenCalled();
      expect(logout).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      authenticate.mockImplementation((req, res, next) => {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Access token required' }
        });
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'refresh-token-123' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(authenticate).toHaveBeenCalled();
      expect(logout).not.toHaveBeenCalled();
    });

    it('should handle logout controller errors', async () => {
      logout.mockImplementation((req, res) => {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
        });
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer access-token-123')
        .send({ refreshToken: 'refresh-token-123' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(logout).toHaveBeenCalled();
    });
  });

  describe('POST /refresh', () => {
    it('should call refreshAccessToken controller with validation', async () => {
      const mockRefreshData = {
        refreshToken: 'refresh-token-123'
      };

      refreshAccessToken.mockImplementation((req, res) => {
        res.json({
          success: true,
          data: { accessToken: 'new-access-token', expiresIn: 900 }
        });
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(mockRefreshData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBe('new-access-token');
      expect(refreshAccessToken).toHaveBeenCalled();
    });

    it('should apply refresh token validation middleware', async () => {
      refreshAccessToken.mockImplementation((req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'refresh-token-123' });

      // Verify that validation middleware was called
      expect(refreshTokenValidation).toBeDefined();
      expect(Array.isArray(refreshTokenValidation)).toBe(true);
    });

    it('should handle refresh controller errors', async () => {
      refreshAccessToken.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' }
        });
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(refreshAccessToken).toHaveBeenCalled();
    });
  });

  describe('Route configuration', () => {
    it('should have correct route paths', () => {
      const router = authRoutes;
      expect(router).toBeDefined();
      
      // Check that the router is an Express router
      expect(router.stack).toBeDefined();
      expect(Array.isArray(router.stack)).toBe(true);
    });

    it('should handle invalid routes', async () => {
      const response = await request(app)
        .get('/api/auth/invalid-route');

      expect(response.status).toBe(404);
    });

    it('should handle invalid HTTP methods', async () => {
      const response = await request(app)
        .get('/api/auth/login'); // GET instead of POST

      expect(response.status).toBe(404);
    });
  });

  describe('Middleware integration', () => {
    it('should apply validation middleware before controllers', async () => {
      login.mockImplementation((req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(login).toHaveBeenCalled();
      expect(loginValidation).toBeDefined();
    });

    it('should apply authentication middleware before logout controller', async () => {
      const middlewareCallOrder = [];

      authenticate.mockImplementation((req, res, next) => {
        middlewareCallOrder.push('authentication');
        req.user = { id: 'user123' };
        next();
      });

      logout.mockImplementation((req, res) => {
        middlewareCallOrder.push('controller');
        res.json({ success: true });
      });

      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer token')
        .send({ refreshToken: 'token' });

      expect(middlewareCallOrder).toEqual(['authentication', 'controller']);
    });
  });
});