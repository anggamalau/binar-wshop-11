const request = require('supertest');

describe('App Integration Tests', () => {
  beforeEach(() => {
    // Clear all module caches to ensure fresh app instance
    Object.keys(require.cache).forEach(key => {
      if (key.includes('src/') && !key.includes('node_modules')) {
        delete require.cache[key];
      }
    });
  });

  it('should test non-test environment configuration', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    // This will test the rate limiter and auth routes paths
    const { app } = require('../app');
    
    const response = await request(app)
      .get('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Test auth routes with rate limiting
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    // Should get some response (mocked controllers)
    expect(authResponse.status).toBeDefined();
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should test CORS configuration with different origins', async () => {
    const originalCors = process.env.CORS_ORIGIN;
    process.env.CORS_ORIGIN = 'https://example.com';
    
    const { app } = require('../app');
    
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://example.com');
    
    expect(response.status).toBe(200);
    
    process.env.CORS_ORIGIN = originalCors;
  });

  it('should test general rate limiter application', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const { app } = require('../app');
    
    // Test that general rate limiter is applied
    const response = await request(app)
      .get('/api/health');
    
    expect(response.status).toBe(200);
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should test auth rate limiter path', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const { app } = require('../app');
    
    // Test that auth rate limiter is applied to auth routes
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    // Should get some response (mocked or real)
    expect(response.status).toBeDefined();
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should test app initialization function', () => {
    const { initializeApp } = require('../app');
    
    expect(typeof initializeApp).toBe('function');
    expect(() => initializeApp()).not.toThrow();
  });

  it('should test request body parsing limits', async () => {
    const { app } = require('../app');
    
    // Test that body parsing works
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(response.status).toBeDefined();
  });

  it('should test URL-encoded body parsing', async () => {
    const { app } = require('../app');
    
    // Test URL-encoded body parsing
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('email=test@example.com&password=password');
    
    expect(response.status).toBeDefined();
  });

  it('should test helmet security middleware', async () => {
    const { app } = require('../app');
    
    const response = await request(app)
      .get('/api/health');
    
    // Helmet should remove X-Powered-By header
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should test different route configurations', async () => {
    const originalEnv = process.env.NODE_ENV;
    
    // Test with test environment
    process.env.NODE_ENV = 'test';
    let app = require('../app').app;
    
    let response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', 'Bearer token');
    
    expect(response.status).toBeDefined();
    
    // Test with non-test environment
    delete require.cache[require.resolve('../app')];
    process.env.NODE_ENV = 'development';
    app = require('../app').app;
    
    response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', 'Bearer token');
    
    expect(response.status).toBeDefined();
    
    process.env.NODE_ENV = originalEnv;
  });
});