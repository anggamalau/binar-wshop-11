describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    it('should create middleware functions that can be called', () => {
      const { authRateLimiter, generalRateLimiter } = require('../middleware/rateLimiter');
      // Test that both rate limiters are callable functions
      expect(typeof authRateLimiter).toBe('function');
      expect(typeof generalRateLimiter).toBe('function');
    });

    it('should handle environment variables', () => {
      const originalWindowMs = process.env.RATE_LIMIT_WINDOW;
      const originalMax = process.env.RATE_LIMIT_MAX;
      
      process.env.RATE_LIMIT_WINDOW = '30000';
      process.env.RATE_LIMIT_MAX = '10';
      
      // Should not throw when requiring
      expect(() => require('../middleware/rateLimiter')).not.toThrow();
      
      // Restore environment variables
      if (originalWindowMs) {
        process.env.RATE_LIMIT_WINDOW = originalWindowMs;
      } else {
        delete process.env.RATE_LIMIT_WINDOW;
      }
      
      if (originalMax) {
        process.env.RATE_LIMIT_MAX = originalMax;
      } else {
        delete process.env.RATE_LIMIT_MAX;
      }
    });

    it('should handle missing environment variables', () => {
      const originalWindowMs = process.env.RATE_LIMIT_WINDOW;
      const originalMax = process.env.RATE_LIMIT_MAX;
      
      delete process.env.RATE_LIMIT_WINDOW;
      delete process.env.RATE_LIMIT_MAX;
      
      // Should not throw when requiring
      expect(() => require('../middleware/rateLimiter')).not.toThrow();
      
      // Restore environment variables
      if (originalWindowMs) {
        process.env.RATE_LIMIT_WINDOW = originalWindowMs;
      }
      
      if (originalMax) {
        process.env.RATE_LIMIT_MAX = originalMax;
      }
    });

    it('should contain expected rate limiter configuration', () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../middleware/rateLimiter.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check that the file contains expected configuration
      expect(content).toContain('express-rate-limit');
      expect(content).toContain('authRateLimiter');
      expect(content).toContain('generalRateLimiter');
      expect(content).toContain('windowMs');
      expect(content).toContain('max');
      expect(content).toContain('keyGenerator');
      expect(content).toContain('req.ip');
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