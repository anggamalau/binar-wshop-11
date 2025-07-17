const User = require('../models/User');
const { runQuery, getOne, uuidv4 } = require('../config/database');
const bcrypt = require('bcrypt');

jest.mock('../config/database');
jest.mock('bcrypt');

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockUserData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890',
      dateOfBirth: '1990-01-01',
      profilePicture: 'profile.jpg'
    };

    it('should create a new user with hashed password', async () => {
      const mockId = 'user-123';
      const mockHashedPassword = 'hashedPassword123';
      const mockCreatedUser = {
        id: mockId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      uuidv4.mockReturnValue(mockId);
      bcrypt.hash.mockResolvedValue(mockHashedPassword);
      runQuery.mockResolvedValue();
      
      const findByIdSpy = jest.spyOn(User, 'findById').mockResolvedValue(mockCreatedUser);

      const result = await User.create(mockUserData);

      expect(uuidv4).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [mockId, 'test@example.com', mockHashedPassword, 'John', 'Doe', '+1234567890', '1990-01-01', 'profile.jpg']
      );
      expect(findByIdSpy).toHaveBeenCalledWith(mockId);
      expect(result).toEqual(mockCreatedUser);
    });

    it('should use environment bcrypt rounds', async () => {
      process.env.BCRYPT_ROUNDS = '10';
      const mockId = 'user-123';
      const mockHashedPassword = 'hashedPassword123';

      uuidv4.mockReturnValue(mockId);
      bcrypt.hash.mockResolvedValue(mockHashedPassword);
      runQuery.mockResolvedValue();
      jest.spyOn(User, 'findById').mockResolvedValue({});

      await User.create(mockUserData);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      
      delete process.env.BCRYPT_ROUNDS;
    });

    it('should handle database errors during creation', async () => {
      const mockId = 'user-123';
      const mockHashedPassword = 'hashedPassword123';

      uuidv4.mockReturnValue(mockId);
      bcrypt.hash.mockResolvedValue(mockHashedPassword);
      runQuery.mockRejectedValue(new Error('Database error'));

      await expect(User.create(mockUserData)).rejects.toThrow('Database error');
    });

    it('should handle bcrypt errors', async () => {
      const mockId = 'user-123';

      uuidv4.mockReturnValue(mockId);
      bcrypt.hash.mockRejectedValue(new Error('Bcrypt error'));

      await expect(User.create(mockUserData)).rejects.toThrow('Bcrypt error');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John'
      };

      getOne.mockResolvedValue(mockUser);

      const result = await User.findByEmail('test@example.com');

      expect(getOne).toHaveBeenCalledWith('SELECT * FROM users WHERE email = ?', ['test@example.com']);
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent email', async () => {
      getOne.mockResolvedValue(null);

      const result = await User.findByEmail('nonexistent@example.com');

      expect(getOne).toHaveBeenCalledWith('SELECT * FROM users WHERE email = ?', ['nonexistent@example.com']);
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      getOne.mockRejectedValue(new Error('Database error'));

      await expect(User.findByEmail('test@example.com')).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John'
      };

      getOne.mockResolvedValue(mockUser);

      const result = await User.findById('user-123');

      expect(getOne).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', ['user-123']);
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent id', async () => {
      getOne.mockResolvedValue(null);

      const result = await User.findById('nonexistent-id');

      expect(getOne).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', ['nonexistent-id']);
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      getOne.mockRejectedValue(new Error('Database error'));

      await expect(User.findById('user-123')).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    const mockUserId = 'user-123';
    const mockUser = {
      id: mockUserId,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe'
    };

    it('should update user with valid fields', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+0987654321'
      };

      runQuery.mockResolvedValue();
      const findByIdSpy = jest.spyOn(User, 'findById').mockResolvedValue({
        ...mockUser,
        ...updateData
      });

      const result = await User.update(mockUserId, updateData);

      expect(runQuery).toHaveBeenCalledWith(
        'UPDATE users SET firstName = ?, lastName = ?, phoneNumber = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        ['Jane', 'Smith', '+0987654321', mockUserId]
      );
      expect(findByIdSpy).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({
        ...mockUser,
        ...updateData
      });
    });

    it('should ignore invalid fields', async () => {
      const updateData = {
        firstName: 'Jane',
        email: 'newemail@example.com', // Should be ignored
        password: 'newpassword', // Should be ignored
        invalidField: 'value' // Should be ignored
      };

      runQuery.mockResolvedValue();
      const findByIdSpy = jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const result = await User.update(mockUserId, updateData);

      expect(runQuery).toHaveBeenCalledWith(
        'UPDATE users SET firstName = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        ['Jane', mockUserId]
      );
      expect(findByIdSpy).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockUser);
    });

    it('should handle empty update data', async () => {
      const updateData = {};

      const findByIdSpy = jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const result = await User.update(mockUserId, updateData);

      expect(runQuery).not.toHaveBeenCalled();
      expect(findByIdSpy).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockUser);
    });

    it('should handle update data with undefined values', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: undefined,
        phoneNumber: null
      };

      runQuery.mockResolvedValue();
      const findByIdSpy = jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      const result = await User.update(mockUserId, updateData);

      expect(runQuery).toHaveBeenCalledWith(
        'UPDATE users SET firstName = ?, phoneNumber = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        ['Jane', null, mockUserId]
      );
      expect(findByIdSpy).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockUser);
    });

    it('should handle database errors during update', async () => {
      const updateData = { firstName: 'Jane' };

      runQuery.mockRejectedValue(new Error('Database error'));

      await expect(User.update(mockUserId, updateData)).rejects.toThrow('Database error');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      bcrypt.compare.mockResolvedValue(true);

      const result = await User.verifyPassword('password123', 'hashedPassword123');

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      bcrypt.compare.mockResolvedValue(false);

      const result = await User.verifyPassword('wrongPassword', 'hashedPassword123');

      expect(bcrypt.compare).toHaveBeenCalledWith('wrongPassword', 'hashedPassword123');
      expect(result).toBe(false);
    });

    it('should handle bcrypt errors', async () => {
      bcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

      await expect(User.verifyPassword('password123', 'hashedPassword123')).rejects.toThrow('Bcrypt error');
    });
  });

  describe('formatUser', () => {
    it('should format user by removing password', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const result = User.formatUser(user);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      });
      expect(result.password).toBeUndefined();
    });

    it('should handle null user', () => {
      const result = User.formatUser(null);

      expect(result).toBeNull();
    });

    it('should handle undefined user', () => {
      const result = User.formatUser(undefined);

      expect(result).toBeNull();
    });

    it('should handle user without password field', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      const result = User.formatUser(user);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      });
    });
  });
});