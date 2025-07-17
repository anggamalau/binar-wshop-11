const jwt = require('jsonwebtoken');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration
} = require('../utils/jwt');

jest.mock('jsonwebtoken');

describe('JWT Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRE_TIME = '15m';
    process.env.JWT_REFRESH_EXPIRE_TIME = '7d';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_EXPIRE_TIME;
    delete process.env.JWT_REFRESH_EXPIRE_TIME;
  });

  describe('generateAccessToken', () => {
    it('should generate access token with correct payload and options', () => {
      const payload = { userId: 'user123', email: 'test@example.com' };
      const expectedToken = 'access-token-123';

      jwt.sign.mockReturnValue(expectedToken);

      const result = generateAccessToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret',
        { expiresIn: '15m' }
      );
      expect(result).toBe(expectedToken);
    });

    it('should use default expiration time when not set', () => {
      delete process.env.JWT_EXPIRE_TIME;
      const payload = { userId: 'user123' };
      const expectedToken = 'access-token-123';

      jwt.sign.mockReturnValue(expectedToken);

      const result = generateAccessToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret',
        { expiresIn: '15m' }
      );
      expect(result).toBe(expectedToken);
    });

    it('should handle JWT signing errors', () => {
      const payload = { userId: 'user123' };
      jwt.sign.mockImplementation(() => {
        throw new Error('JWT signing error');
      });

      expect(() => generateAccessToken(payload)).toThrow('JWT signing error');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with correct payload and options', () => {
      const payload = { userId: 'user123', email: 'test@example.com' };
      const expectedToken = 'refresh-token-123';

      jwt.sign.mockReturnValue(expectedToken);

      const result = generateRefreshToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test-refresh-secret',
        { expiresIn: '7d' }
      );
      expect(result).toBe(expectedToken);
    });

    it('should use default expiration time when not set', () => {
      delete process.env.JWT_REFRESH_EXPIRE_TIME;
      const payload = { userId: 'user123' };
      const expectedToken = 'refresh-token-123';

      jwt.sign.mockReturnValue(expectedToken);

      const result = generateRefreshToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test-refresh-secret',
        { expiresIn: '7d' }
      );
      expect(result).toBe(expectedToken);
    });

    it('should handle JWT signing errors', () => {
      const payload = { userId: 'user123' };
      jwt.sign.mockImplementation(() => {
        throw new Error('JWT signing error');
      });

      expect(() => generateRefreshToken(payload)).toThrow('JWT signing error');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify access token with correct secret', () => {
      const token = 'access-token-123';
      const expectedPayload = { userId: 'user123', email: 'test@example.com' };

      jwt.verify.mockReturnValue(expectedPayload);

      const result = verifyAccessToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(result).toEqual(expectedPayload);
    });

    it('should handle token verification errors', () => {
      const token = 'invalid-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      expect(() => verifyAccessToken(token)).toThrow('Invalid token');
    });

    it('should handle expired token errors', () => {
      const token = 'expired-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      expect(() => verifyAccessToken(token)).toThrow('Token expired');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify refresh token with correct secret', () => {
      const token = 'refresh-token-123';
      const expectedPayload = { userId: 'user123', email: 'test@example.com' };

      jwt.verify.mockReturnValue(expectedPayload);

      const result = verifyRefreshToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-refresh-secret');
      expect(result).toEqual(expectedPayload);
    });

    it('should handle token verification errors', () => {
      const token = 'invalid-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      expect(() => verifyRefreshToken(token)).toThrow('Invalid token');
    });

    it('should handle expired token errors', () => {
      const token = 'expired-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      expect(() => verifyRefreshToken(token)).toThrow('Token expired');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = 'some-token-123';
      const expectedPayload = { userId: 'user123', email: 'test@example.com', exp: 1234567890 };

      jwt.decode.mockReturnValue(expectedPayload);

      const result = decodeToken(token);

      expect(jwt.decode).toHaveBeenCalledWith(token);
      expect(result).toEqual(expectedPayload);
    });

    it('should handle malformed tokens', () => {
      const token = 'malformed-token';
      jwt.decode.mockReturnValue(null);

      const result = decodeToken(token);

      expect(jwt.decode).toHaveBeenCalledWith(token);
      expect(result).toBeNull();
    });

    it('should handle decode errors', () => {
      const token = 'invalid-token';
      jwt.decode.mockImplementation(() => {
        throw new Error('Decode error');
      });

      expect(() => decodeToken(token)).toThrow('Decode error');
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for given time string', () => {
      const mockToken = 'dummy-token';
      const mockExpiration = 1234567890;
      const expectedDate = new Date(mockExpiration * 1000);

      jwt.decode.mockReturnValue({ exp: mockExpiration });
      jwt.sign.mockReturnValue(mockToken);

      const result = getTokenExpiration('1h');

      expect(jwt.sign).toHaveBeenCalledWith({}, 'dummy', { expiresIn: '1h' });
      expect(jwt.decode).toHaveBeenCalledWith(mockToken);
      expect(result).toEqual(expectedDate);
    });

    it('should handle different time formats', () => {
      const mockToken = 'dummy-token';
      const mockExpiration = 1234567890;
      const expectedDate = new Date(mockExpiration * 1000);

      jwt.decode.mockReturnValue({ exp: mockExpiration });
      jwt.sign.mockReturnValue(mockToken);

      const result = getTokenExpiration('7d');

      expect(jwt.sign).toHaveBeenCalledWith({}, 'dummy', { expiresIn: '7d' });
      expect(jwt.decode).toHaveBeenCalledWith(mockToken);
      expect(result).toEqual(expectedDate);
    });

    it('should handle JWT signing errors', () => {
      jwt.sign.mockImplementation(() => {
        throw new Error('JWT signing error');
      });

      expect(() => getTokenExpiration('1h')).toThrow('JWT signing error');
    });

    it('should handle JWT decode errors', () => {
      const mockToken = 'dummy-token';
      jwt.sign.mockReturnValue(mockToken);
      jwt.decode.mockImplementation(() => {
        throw new Error('JWT decode error');
      });

      expect(() => getTokenExpiration('1h')).toThrow('JWT decode error');
    });

    it('should handle missing expiration in decoded token', () => {
      const mockToken = 'dummy-token';
      jwt.sign.mockReturnValue(mockToken);
      jwt.decode.mockReturnValue({ userId: 'user123' }); // No exp field

      expect(() => getTokenExpiration('1h')).toThrow();
    });
  });
});