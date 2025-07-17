const rateLimit = require('express-rate-limit');

jest.mock('express-rate-limit', () => {
  return jest.fn(() => jest.fn((req, res, next) => next()));
});

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear module cache to ensure fresh require
    delete require.cache[require.resolve('../middleware/rateLimiter')];
  });

  describe('Module exports', () => {
    it('should export authRateLimiter as a function', () => {
      const { authRateLimiter } = require('../middleware/rateLimiter');
      expect(authRateLimiter).toBeDefined();
      expect(typeof authRateLimiter).toBe('function');
    });

    it('should export generalRateLimiter as a function', () => {
      const { generalRateLimiter } = require('../middleware/rateLimiter');
      expect(generalRateLimiter).toBeDefined();
      expect(typeof generalRateLimiter).toBe('function');
    });
  });

  describe('Rate limiter functionality', () => {
    it('should call middleware functions without throwing', () => {
      const { authRateLimiter, generalRateLimiter } = require('../middleware/rateLimiter');
      const mockReq = { ip: '192.168.1.1' };
      const mockRes = {};
      const mockNext = jest.fn();

      // Test that the middleware functions can be called
      expect(() => authRateLimiter(mockReq, mockRes, mockNext)).not.toThrow();
      expect(() => generalRateLimiter(mockReq, mockRes, mockNext)).not.toThrow();
    });

    it('should work with different request types', () => {
      const { authRateLimiter, generalRateLimiter } = require('../middleware/rateLimiter');
      
      const mockReq = { 
        ip: '192.168.1.1',
        method: 'POST',
        url: '/api/auth/login'
      };
      const mockRes = {};
      const mockNext = jest.fn();

      // Test that the middleware functions work with different request types
      expect(() => authRateLimiter(mockReq, mockRes, mockNext)).not.toThrow();
      expect(() => generalRateLimiter(mockReq, mockRes, mockNext)).not.toThrow();
    });
  });

  describe('Rate limiter configuration', () => {
    it('should be created with express-rate-limit', () => {
      require('../middleware/rateLimiter');
      
      // Verify that express-rate-limit was used to create the limiters
      expect(rateLimit).toHaveBeenCalled();
      expect(rateLimit.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should create middleware functions that can be called', () => {
      const { authRateLimiter, generalRateLimiter } = require('../middleware/rateLimiter');
      // Test that both rate limiters are callable functions
      expect(typeof authRateLimiter).toBe('function');
      expect(typeof generalRateLimiter).toBe('function');
      
      // Test that they are Express middleware (should accept 3 parameters)
      expect(authRateLimiter.length).toBe(3); // req, res, next
      expect(generalRateLimiter.length).toBe(3); // req, res, next
    });
  });

  describe('Integration with Express', () => {
    it('should work as Express middleware', () => {
      const { authRateLimiter, generalRateLimiter } = require('../middleware/rateLimiter');
      
      const mockReq = { ip: '192.168.1.1', method: 'POST', url: '/api/auth/login' };
      const mockRes = {};
      const mockNext = jest.fn();

      // Test auth rate limiter
      expect(() => authRateLimiter(mockReq, mockRes, mockNext)).not.toThrow();

      // Test general rate limiter
      expect(() => generalRateLimiter(mockReq, mockRes, mockNext)).not.toThrow();
    });

    it('should handle different HTTP methods', () => {
      const { authRateLimiter, generalRateLimiter } = require('../middleware/rateLimiter');
      const mockRes = {};
      const mockNext = jest.fn();

      ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach(method => {
        const mockReq = { ip: '192.168.1.1', method, url: '/api/test' };
        
        expect(() => authRateLimiter(mockReq, mockRes, mockNext)).not.toThrow();
        expect(() => generalRateLimiter(mockReq, mockRes, mockNext)).not.toThrow();
      });
    });
  });
});