const rateLimit = require('express-rate-limit');
const { authRateLimiter, generalRateLimiter } = require('../middleware/rateLimiter');

jest.mock('express-rate-limit');

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authRateLimiter', () => {
    it('should configure auth rate limiter with correct options', () => {
      const mockRateLimiter = jest.fn();
      rateLimit.mockReturnValue(mockRateLimiter);

      // Re-import to trigger rate limiter setup
      require('../middleware/rateLimiter');

      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 60000, // Default value
        max: 5, // Default value
        message: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts, please try again later'
          }
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: expect.any(Function)
      });
    });

    it('should use environment variables for window and max', () => {
      process.env.RATE_LIMIT_WINDOW = '120000';
      process.env.RATE_LIMIT_MAX = '10';

      const mockRateLimiter = jest.fn();
      rateLimit.mockReturnValue(mockRateLimiter);

      // Clear module cache and re-import
      delete require.cache[require.resolve('../middleware/rateLimiter')];
      require('../middleware/rateLimiter');

      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 120000,
        max: 10,
        message: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts, please try again later'
          }
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: expect.any(Function)
      });

      // Clean up
      delete process.env.RATE_LIMIT_WINDOW;
      delete process.env.RATE_LIMIT_MAX;
    });

    it('should use IP address as key generator', () => {
      const mockRateLimiter = jest.fn();
      rateLimit.mockReturnValue(mockRateLimiter);

      // Re-import to trigger rate limiter setup
      require('../middleware/rateLimiter');

      const rateLimiterConfig = rateLimit.mock.calls[0][0];
      const keyGenerator = rateLimiterConfig.keyGenerator;

      const mockReq = { ip: '192.168.1.1' };
      const result = keyGenerator(mockReq);

      expect(result).toBe('192.168.1.1');
    });

    it('should handle missing IP address', () => {
      const mockRateLimiter = jest.fn();
      rateLimit.mockReturnValue(mockRateLimiter);

      // Re-import to trigger rate limiter setup
      require('../middleware/rateLimiter');

      const rateLimiterConfig = rateLimit.mock.calls[0][0];
      const keyGenerator = rateLimiterConfig.keyGenerator;

      const mockReq = {}; // No IP address
      const result = keyGenerator(mockReq);

      expect(result).toBeUndefined();
    });
  });

  describe('generalRateLimiter', () => {
    it('should configure general rate limiter with correct options', () => {
      const mockRateLimiter = jest.fn();
      rateLimit.mockReturnValue(mockRateLimiter);

      // Re-import to trigger rate limiter setup
      require('../middleware/rateLimiter');

      // Second call should be for general rate limiter
      expect(rateLimit).toHaveBeenCalledTimes(2);
      expect(rateLimit).toHaveBeenNthCalledWith(2, {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000,
        message: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
          }
        },
        standardHeaders: true,
        legacyHeaders: false
      });
    });

    it('should not have custom key generator', () => {
      const mockRateLimiter = jest.fn();
      rateLimit.mockReturnValue(mockRateLimiter);

      // Re-import to trigger rate limiter setup
      require('../middleware/rateLimiter');

      const generalRateLimiterConfig = rateLimit.mock.calls[1][0];
      expect(generalRateLimiterConfig.keyGenerator).toBeUndefined();
    });
  });

  describe('exported modules', () => {
    it('should export authRateLimiter', () => {
      expect(authRateLimiter).toBeDefined();
      expect(typeof authRateLimiter).toBe('function');
    });

    it('should export generalRateLimiter', () => {
      expect(generalRateLimiter).toBeDefined();
      expect(typeof generalRateLimiter).toBe('function');
    });
  });

  describe('rate limiter behavior simulation', () => {
    it('should call rate limiter middleware functions', () => {
      const mockAuthRateLimiter = jest.fn();
      const mockGeneralRateLimiter = jest.fn();
      
      rateLimit.mockReturnValueOnce(mockAuthRateLimiter);
      rateLimit.mockReturnValueOnce(mockGeneralRateLimiter);

      // Re-import to get fresh instances
      delete require.cache[require.resolve('../middleware/rateLimiter')];
      const { authRateLimiter: freshAuthRL, generalRateLimiter: freshGeneralRL } = require('../middleware/rateLimiter');

      const mockReq = { ip: '192.168.1.1' };
      const mockRes = {};
      const mockNext = jest.fn();

      // Test that the middleware functions can be called
      expect(() => freshAuthRL(mockReq, mockRes, mockNext)).not.toThrow();
      expect(() => freshGeneralRL(mockReq, mockRes, mockNext)).not.toThrow();

      expect(mockAuthRateLimiter).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockGeneralRateLimiter).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });
  });
});