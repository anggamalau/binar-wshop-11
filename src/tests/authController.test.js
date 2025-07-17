const authController = require('../controllers/authController');
const User = require('../models/User');
const Token = require('../models/Token');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration
} = require('../utils/jwt');

jest.mock('../config/database', () => ({
  db: {},
  initDatabase: jest.fn(),
  runQuery: jest.fn(),
  getOne: jest.fn(),
  getAll: jest.fn(),
  uuidv4: jest.fn(() => 'mock-uuid')
}));

jest.mock('../models/User');
jest.mock('../models/Token');
jest.mock('../utils/jwt');

describe('AuthController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      user: { id: 'user123', email: 'test@example.com' },
      token: 'mock-access-token'
    };
    
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('login', () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      password: 'hashedPassword123'
    };

    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123'
      };
    });

    it('should login successfully with valid credentials', async () => {
      User.findByEmail.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(true);
      User.formatUser.mockReturnValue({
        id: 'user123',
        email: 'test@example.com'
      });
      
      generateAccessToken.mockReturnValue('access-token');
      generateRefreshToken.mockReturnValue('refresh-token');
      getTokenExpiration.mockReturnValue(new Date('2024-01-01'));
      decodeToken.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });
      
      Token.createRefreshToken.mockResolvedValue();

      await authController.login(mockReq, mockRes);

      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(User.verifyPassword).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(Token.createRefreshToken).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: { id: 'user123', email: 'test@example.com' },
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresIn: expect.any(Number)
          }
        }
      });
    });

    it('should fail login with non-existent email', async () => {
      User.findByEmail.mockResolvedValue(null);

      await authController.login(mockReq, mockRes);

      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(User.verifyPassword).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    });

    it('should fail login with incorrect password', async () => {
      User.findByEmail.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(false);

      await authController.login(mockReq, mockRes);

      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(User.verifyPassword).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    });

    it('should handle missing email', async () => {
      mockReq.body = { password: 'password123' };

      await authController.login(mockReq, mockRes);

      expect(User.findByEmail).toHaveBeenCalledWith(undefined);
      expect(User.findByEmail).toHaveBeenCalled();
    });

    it('should handle missing password', async () => {
      mockReq.body = { email: 'test@example.com' };
      User.findByEmail.mockResolvedValue(mockUser);

      await authController.login(mockReq, mockRes);

      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(User.verifyPassword).toHaveBeenCalledWith(undefined, 'hashedPassword123');
    });

    it('should handle database errors during login', async () => {
      User.findByEmail.mockRejectedValue(new Error('Database error'));

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    });

    it('should handle token generation errors', async () => {
      User.findByEmail.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(true);
      generateAccessToken.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    });

    it('should handle refresh token creation errors', async () => {
      User.findByEmail.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(true);
      generateAccessToken.mockReturnValue('access-token');
      generateRefreshToken.mockReturnValue('refresh-token');
      getTokenExpiration.mockReturnValue(new Date('2024-01-01'));
      Token.createRefreshToken.mockRejectedValue(new Error('Token creation failed'));

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      mockReq.body = {
        refreshToken: 'refresh-token-123'
      };
      mockReq.token = 'access-token-123';
      mockReq.user = { id: 'user123' };
    });

    it('should logout successfully with valid tokens', async () => {
      const mockRefreshTokenData = {
        userId: 'user123',
        token: 'refresh-token-123'
      };

      decodeToken.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });
      Token.blacklistToken.mockResolvedValue();
      Token.findRefreshToken.mockResolvedValue(mockRefreshTokenData);
      Token.deleteRefreshToken.mockResolvedValue();
      verifyRefreshToken.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 7200 });

      await authController.logout(mockReq, mockRes);

      expect(decodeToken).toHaveBeenCalledWith('access-token-123');
      expect(Token.blacklistToken).toHaveBeenCalledTimes(2);
      expect(Token.findRefreshToken).toHaveBeenCalledWith('refresh-token-123');
      expect(Token.deleteRefreshToken).toHaveBeenCalledWith('refresh-token-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });

    it('should logout successfully without refresh token', async () => {
      mockReq.body = {};
      decodeToken.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });
      Token.blacklistToken.mockResolvedValue();

      await authController.logout(mockReq, mockRes);

      expect(Token.blacklistToken).toHaveBeenCalledTimes(1);
      expect(Token.findRefreshToken).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });

    it('should handle logout with invalid refresh token', async () => {
      decodeToken.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });
      Token.blacklistToken.mockResolvedValue();
      Token.findRefreshToken.mockResolvedValue(null);

      await authController.logout(mockReq, mockRes);

      expect(Token.blacklistToken).toHaveBeenCalledTimes(1);
      expect(Token.deleteRefreshToken).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });

    it('should handle logout with refresh token from different user', async () => {
      const mockRefreshTokenData = {
        userId: 'different-user',
        token: 'refresh-token-123'
      };

      decodeToken.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });
      Token.blacklistToken.mockResolvedValue();
      Token.findRefreshToken.mockResolvedValue(mockRefreshTokenData);

      await authController.logout(mockReq, mockRes);

      expect(Token.deleteRefreshToken).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });

    it('should handle expired refresh token during logout', async () => {
      const mockRefreshTokenData = {
        userId: 'user123',
        token: 'refresh-token-123'
      };

      decodeToken.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });
      Token.blacklistToken.mockResolvedValue();
      Token.findRefreshToken.mockResolvedValue(mockRefreshTokenData);
      Token.deleteRefreshToken.mockResolvedValue();
      verifyRefreshToken.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await authController.logout(mockReq, mockRes);

      expect(Token.deleteRefreshToken).toHaveBeenCalledWith('refresh-token-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });

    it('should handle database errors during logout', async () => {
      decodeToken.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });
      Token.blacklistToken.mockRejectedValue(new Error('Database error'));

      await authController.logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    });
  });

  describe('refreshAccessToken', () => {
    beforeEach(() => {
      mockReq.body = {
        refreshToken: 'refresh-token-123'
      };
    });

    it('should refresh access token successfully', async () => {
      const mockStoredToken = {
        userId: 'user123',
        token: 'refresh-token-123'
      };
      const mockUser = {
        id: 'user123',
        email: 'test@example.com'
      };

      Token.isTokenBlacklisted.mockResolvedValue(false);
      Token.findRefreshToken.mockResolvedValue(mockStoredToken);
      verifyRefreshToken.mockReturnValue({ userId: 'user123', email: 'test@example.com' });
      User.findById.mockResolvedValue(mockUser);
      generateAccessToken.mockReturnValue('new-access-token');
      decodeToken.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });

      await authController.refreshAccessToken(mockReq, mockRes);

      expect(Token.isTokenBlacklisted).toHaveBeenCalledWith('refresh-token-123');
      expect(Token.findRefreshToken).toHaveBeenCalledWith('refresh-token-123');
      expect(verifyRefreshToken).toHaveBeenCalledWith('refresh-token-123');
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(generateAccessToken).toHaveBeenCalledWith({
        userId: 'user123',
        email: 'test@example.com'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          accessToken: 'new-access-token',
          expiresIn: expect.any(Number)
        }
      });
    });

    it('should fail refresh with blacklisted token', async () => {
      Token.isTokenBlacklisted.mockResolvedValue(true);

      await authController.refreshAccessToken(mockReq, mockRes);

      expect(Token.isTokenBlacklisted).toHaveBeenCalledWith('refresh-token-123');
      expect(Token.findRefreshToken).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TOKEN_BLACKLISTED',
          message: 'Refresh token has been revoked'
        }
      });
    });

    it('should fail refresh with invalid refresh token', async () => {
      Token.isTokenBlacklisted.mockResolvedValue(false);
      Token.findRefreshToken.mockResolvedValue(null);

      await authController.refreshAccessToken(mockReq, mockRes);

      expect(Token.findRefreshToken).toHaveBeenCalledWith('refresh-token-123');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token'
        }
      });
    });

    it('should fail refresh when user not found', async () => {
      const mockStoredToken = {
        userId: 'user123',
        token: 'refresh-token-123'
      };

      Token.isTokenBlacklisted.mockResolvedValue(false);
      Token.findRefreshToken.mockResolvedValue(mockStoredToken);
      verifyRefreshToken.mockReturnValue({ userId: 'user123', email: 'test@example.com' });
      User.findById.mockResolvedValue(null);

      await authController.refreshAccessToken(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    });

    it('should handle expired refresh token', async () => {
      const mockStoredToken = {
        userId: 'user123',
        token: 'refresh-token-123'
      };

      Token.isTokenBlacklisted.mockResolvedValue(false);
      Token.findRefreshToken.mockResolvedValue(mockStoredToken);
      verifyRefreshToken.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });
      Token.deleteRefreshToken.mockResolvedValue();

      await authController.refreshAccessToken(mockReq, mockRes);

      expect(Token.deleteRefreshToken).toHaveBeenCalledWith('refresh-token-123');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Refresh token has expired'
        }
      });
    });

    it('should handle malformed refresh token', async () => {
      const mockStoredToken = {
        userId: 'user123',
        token: 'refresh-token-123'
      };

      Token.isTokenBlacklisted.mockResolvedValue(false);
      Token.findRefreshToken.mockResolvedValue(mockStoredToken);
      verifyRefreshToken.mockImplementation(() => {
        const error = new Error('Malformed token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await authController.refreshAccessToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token'
        }
      });
    });

    it('should handle database errors during refresh', async () => {
      Token.isTokenBlacklisted.mockRejectedValue(new Error('Database error'));

      await authController.refreshAccessToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    });

    it('should handle missing refresh token', async () => {
      mockReq.body = {};

      await authController.refreshAccessToken(mockReq, mockRes);

      expect(Token.isTokenBlacklisted).toHaveBeenCalledWith(undefined);
    });
  });
});