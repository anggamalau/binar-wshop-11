const Token = require('../models/Token');
const { runQuery, getOne, getAll, uuidv4 } = require('../config/database');

// Database mocking is handled globally in jest.setup.js

describe('Token Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRefreshToken', () => {
    it('should create a new refresh token', async () => {
      const mockId = 'token-123';
      const mockUserId = 'user-123';
      const mockToken = 'refresh-token-123';
      const mockExpiresAt = '2024-01-01T00:00:00.000Z';

      uuidv4.mockReturnValue(mockId);
      runQuery.mockResolvedValue();

      const result = await Token.createRefreshToken(mockUserId, mockToken, mockExpiresAt);

      expect(uuidv4).toHaveBeenCalled();
      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        [mockId, mockUserId, mockToken, mockExpiresAt]
      );
      expect(result).toEqual({
        id: mockId,
        userId: mockUserId,
        token: mockToken,
        expiresAt: mockExpiresAt
      });
    });

    it('should handle database errors during creation', async () => {
      const mockId = 'token-123';
      uuidv4.mockReturnValue(mockId);
      runQuery.mockRejectedValue(new Error('Database error'));

      await expect(Token.createRefreshToken('user-123', 'token', '2024-01-01'))
        .rejects.toThrow('Database error');
    });
  });

  describe('findRefreshToken', () => {
    it('should find refresh token by token value', async () => {
      const mockTokenData = {
        id: 'token-123',
        userId: 'user-123',
        token: 'refresh-token-123',
        expiresAt: '2024-01-01T00:00:00.000Z'
      };

      getOne.mockResolvedValue(mockTokenData);

      const result = await Token.findRefreshToken('refresh-token-123');

      expect(getOne).toHaveBeenCalledWith(
        'SELECT * FROM refresh_tokens WHERE token = ?',
        ['refresh-token-123']
      );
      expect(result).toEqual(mockTokenData);
    });

    it('should return null for non-existent token', async () => {
      getOne.mockResolvedValue(null);

      const result = await Token.findRefreshToken('nonexistent-token');

      expect(getOne).toHaveBeenCalledWith(
        'SELECT * FROM refresh_tokens WHERE token = ?',
        ['nonexistent-token']
      );
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      getOne.mockRejectedValue(new Error('Database error'));

      await expect(Token.findRefreshToken('refresh-token-123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('deleteRefreshToken', () => {
    it('should delete refresh token by token value', async () => {
      const mockResult = { changes: 1 };
      runQuery.mockResolvedValue(mockResult);

      const result = await Token.deleteRefreshToken('refresh-token-123');

      expect(runQuery).toHaveBeenCalledWith(
        'DELETE FROM refresh_tokens WHERE token = ?',
        ['refresh-token-123']
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle deletion of non-existent token', async () => {
      const mockResult = { changes: 0 };
      runQuery.mockResolvedValue(mockResult);

      const result = await Token.deleteRefreshToken('nonexistent-token');

      expect(runQuery).toHaveBeenCalledWith(
        'DELETE FROM refresh_tokens WHERE token = ?',
        ['nonexistent-token']
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle database errors', async () => {
      runQuery.mockRejectedValue(new Error('Database error'));

      await expect(Token.deleteRefreshToken('refresh-token-123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('deleteUserRefreshTokens', () => {
    it('should delete all refresh tokens for a user', async () => {
      const mockResult = { changes: 3 };
      runQuery.mockResolvedValue(mockResult);

      const result = await Token.deleteUserRefreshTokens('user-123');

      expect(runQuery).toHaveBeenCalledWith(
        'DELETE FROM refresh_tokens WHERE userId = ?',
        ['user-123']
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle deletion for user with no tokens', async () => {
      const mockResult = { changes: 0 };
      runQuery.mockResolvedValue(mockResult);

      const result = await Token.deleteUserRefreshTokens('user-with-no-tokens');

      expect(runQuery).toHaveBeenCalledWith(
        'DELETE FROM refresh_tokens WHERE userId = ?',
        ['user-with-no-tokens']
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle database errors', async () => {
      runQuery.mockRejectedValue(new Error('Database error'));

      await expect(Token.deleteUserRefreshTokens('user-123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist a token', async () => {
      const mockId = 'blacklist-123';
      const mockToken = 'access-token-123';
      const mockExpiresAt = '2024-01-01T00:00:00.000Z';

      uuidv4.mockReturnValue(mockId);
      runQuery.mockResolvedValue();

      const result = await Token.blacklistToken(mockToken, mockExpiresAt);

      expect(uuidv4).toHaveBeenCalled();
      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO token_blacklist'),
        [mockId, mockToken, mockExpiresAt]
      );
      expect(result).toEqual({
        id: mockId,
        token: mockToken,
        expiresAt: mockExpiresAt
      });
    });

    it('should handle database errors during blacklisting', async () => {
      const mockId = 'blacklist-123';
      uuidv4.mockReturnValue(mockId);
      runQuery.mockRejectedValue(new Error('Database error'));

      await expect(Token.blacklistToken('token', '2024-01-01'))
        .rejects.toThrow('Database error');
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      const mockBlacklistedToken = {
        id: 'blacklist-123',
        token: 'blacklisted-token',
        expiresAt: '2024-01-01T00:00:00.000Z'
      };

      getOne.mockResolvedValue(mockBlacklistedToken);

      const result = await Token.isTokenBlacklisted('blacklisted-token');

      expect(getOne).toHaveBeenCalledWith(
        'SELECT * FROM token_blacklist WHERE token = ?',
        ['blacklisted-token']
      );
      expect(result).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      getOne.mockResolvedValue(null);

      const result = await Token.isTokenBlacklisted('valid-token');

      expect(getOne).toHaveBeenCalledWith(
        'SELECT * FROM token_blacklist WHERE token = ?',
        ['valid-token']
      );
      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      getOne.mockRejectedValue(new Error('Database error'));

      await expect(Token.isTokenBlacklisted('token'))
        .rejects.toThrow('Database error');
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should clean up expired tokens from both tables', async () => {
      runQuery.mockResolvedValue({ changes: 2 });

      await Token.cleanupExpiredTokens();

      expect(runQuery).toHaveBeenCalledTimes(2);
      expect(runQuery).toHaveBeenCalledWith(
        'DELETE FROM token_blacklist WHERE expiresAt < datetime("now")'
      );
      expect(runQuery).toHaveBeenCalledWith(
        'DELETE FROM refresh_tokens WHERE expiresAt < datetime("now")'
      );
    });

    it('should handle database errors during cleanup', async () => {
      runQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(Token.cleanupExpiredTokens())
        .rejects.toThrow('Database error');
    });

    it('should handle partial cleanup failure', async () => {
      runQuery.mockResolvedValueOnce({ changes: 1 });
      runQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(Token.cleanupExpiredTokens())
        .rejects.toThrow('Database error');
    });
  });
});