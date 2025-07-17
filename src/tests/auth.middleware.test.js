const { authenticate } = require('../middleware/auth');
const { verifyAccessToken } = require('../utils/jwt');
const Token = require('../models/Token');
const User = require('../models/User');

jest.mock('../config/database', () => ({
  db: {},
  initDatabase: jest.fn(),
  runQuery: jest.fn(),
  getOne: jest.fn(),
  getAll: jest.fn(),
  uuidv4: jest.fn(() => 'mock-uuid')
}));

jest.mock('../utils/jwt');
jest.mock('../models/Token');
jest.mock('../models/User');

describe('Auth Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      headers: {},
      user: null,
      token: null
    };
    
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('should authenticate user with valid token', async () => {
      const mockToken = 'valid-token-123';
      const mockDecodedToken = { userId: 'user123', email: 'test@example.com' };
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };
      const mockFormattedUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      mockReq.headers.authorization = `Bearer ${mockToken}`;
      
      Token.isTokenBlacklisted.mockResolvedValue(false);
      verifyAccessToken.mockReturnValue(mockDecodedToken);
      User.findById.mockResolvedValue(mockUser);
      User.formatUser.mockReturnValue(mockFormattedUser);

      await authenticate(mockReq, mockRes, mockNext);

      expect(Token.isTokenBlacklisted).toHaveBeenCalledWith(mockToken);
      expect(verifyAccessToken).toHaveBeenCalledWith(mockToken);
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(User.formatUser).toHaveBeenCalledWith(mockUser);
      expect(mockReq.user).toEqual(mockFormattedUser);
      expect(mockReq.token).toBe(mockToken);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 for missing authorization header', async () => {
      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid authorization header format', async () => {
      mockReq.headers.authorization = 'InvalidFormat token123';

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for blacklisted token', async () => {
      const mockToken = 'blacklisted-token';
      mockReq.headers.authorization = `Bearer ${mockToken}`;
      
      Token.isTokenBlacklisted.mockResolvedValue(true);

      await authenticate(mockReq, mockRes, mockNext);

      expect(Token.isTokenBlacklisted).toHaveBeenCalledWith(mockToken);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TOKEN_BLACKLISTED',
          message: 'Token has been revoked'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', async () => {
      const mockToken = 'expired-token';
      mockReq.headers.authorization = `Bearer ${mockToken}`;
      
      Token.isTokenBlacklisted.mockResolvedValue(false);
      verifyAccessToken.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(Token.isTokenBlacklisted).toHaveBeenCalledWith(mockToken);
      expect(verifyAccessToken).toHaveBeenCalledWith(mockToken);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      const mockToken = 'invalid-token';
      mockReq.headers.authorization = `Bearer ${mockToken}`;
      
      Token.isTokenBlacklisted.mockResolvedValue(false);
      verifyAccessToken.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(Token.isTokenBlacklisted).toHaveBeenCalledWith(mockToken);
      expect(verifyAccessToken).toHaveBeenCalledWith(mockToken);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for non-existent user', async () => {
      const mockToken = 'valid-token-123';
      const mockDecodedToken = { userId: 'nonexistent-user', email: 'test@example.com' };

      mockReq.headers.authorization = `Bearer ${mockToken}`;
      
      Token.isTokenBlacklisted.mockResolvedValue(false);
      verifyAccessToken.mockReturnValue(mockDecodedToken);
      User.findById.mockResolvedValue(null);

      await authenticate(mockReq, mockRes, mockNext);

      expect(Token.isTokenBlacklisted).toHaveBeenCalledWith(mockToken);
      expect(verifyAccessToken).toHaveBeenCalledWith(mockToken);
      expect(User.findById).toHaveBeenCalledWith('nonexistent-user');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors during token blacklist check', async () => {
      const mockToken = 'valid-token-123';
      mockReq.headers.authorization = `Bearer ${mockToken}`;
      
      Token.isTokenBlacklisted.mockRejectedValue(new Error('Database error'));

      await authenticate(mockReq, mockRes, mockNext);

      expect(Token.isTokenBlacklisted).toHaveBeenCalledWith(mockToken);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors during user lookup', async () => {
      const mockToken = 'valid-token-123';
      const mockDecodedToken = { userId: 'user123', email: 'test@example.com' };

      mockReq.headers.authorization = `Bearer ${mockToken}`;
      
      Token.isTokenBlacklisted.mockResolvedValue(false);
      verifyAccessToken.mockReturnValue(mockDecodedToken);
      User.findById.mockRejectedValue(new Error('Database error'));

      await authenticate(mockReq, mockRes, mockNext);

      expect(Token.isTokenBlacklisted).toHaveBeenCalledWith(mockToken);
      expect(verifyAccessToken).toHaveBeenCalledWith(mockToken);
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed JWT token', async () => {
      const mockToken = 'malformed-token';
      mockReq.headers.authorization = `Bearer ${mockToken}`;
      
      Token.isTokenBlacklisted.mockResolvedValue(false);
      verifyAccessToken.mockImplementation(() => {
        const error = new Error('Malformed token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty token after Bearer', async () => {
      mockReq.headers.authorization = 'Bearer ';

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});