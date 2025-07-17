const userController = require('../controllers/userController');
const User = require('../models/User');

// Database mocking is handled globally in jest.setup.js

jest.mock('../models/User');

describe('UserController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      user: { id: 'user123', email: 'test@example.com' },
      body: {}
    };
    
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
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

      User.findById.mockResolvedValue(mockUser);
      User.formatUser.mockReturnValue(mockFormattedUser);

      await userController.getProfile(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(User.formatUser).toHaveBeenCalledWith(mockUser);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockFormattedUser
        }
      });
    });

    it('should return 404 when user not found', async () => {
      User.findById.mockResolvedValue(null);

      await userController.getProfile(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    });

    it('should handle database errors', async () => {
      User.findById.mockRejectedValue(new Error('Database error'));

      await userController.getProfile(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    });

    it('should handle missing user in request', async () => {
      mockReq.user = null;

      await userController.getProfile(mockReq, mockRes);

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

  describe('updateProfile', () => {
    beforeEach(() => {
      mockReq.body = {
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1234567890'
      };
    });

    it('should update user profile successfully', async () => {
      const mockUpdatedUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1234567890'
      };

      const mockFormattedUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1234567890'
      };

      User.update.mockResolvedValue(mockUpdatedUser);
      User.formatUser.mockReturnValue(mockFormattedUser);

      await userController.updateProfile(mockReq, mockRes);

      expect(User.update).toHaveBeenCalledWith('user123', {
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1234567890'
      });
      expect(User.formatUser).toHaveBeenCalledWith(mockUpdatedUser);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: mockFormattedUser
        }
      });
    });

    it('should return 404 when user not found during update', async () => {
      User.update.mockResolvedValue(null);

      await userController.updateProfile(mockReq, mockRes);

      expect(User.update).toHaveBeenCalledWith('user123', {
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1234567890'
      });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    });

    it('should handle empty update data', async () => {
      mockReq.body = {};

      const mockUpdatedUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      User.update.mockResolvedValue(mockUpdatedUser);
      User.formatUser.mockReturnValue(mockUpdatedUser);

      await userController.updateProfile(mockReq, mockRes);

      expect(User.update).toHaveBeenCalledWith('user123', {});
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: mockUpdatedUser
        }
      });
    });

    it('should handle partial update data', async () => {
      mockReq.body = {
        firstName: 'Jane'
      };

      const mockUpdatedUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Doe'
      };

      User.update.mockResolvedValue(mockUpdatedUser);
      User.formatUser.mockReturnValue(mockUpdatedUser);

      await userController.updateProfile(mockReq, mockRes);

      expect(User.update).toHaveBeenCalledWith('user123', {
        firstName: 'Jane'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: mockUpdatedUser
        }
      });
    });

    it('should handle database errors during update', async () => {
      User.update.mockRejectedValue(new Error('Database error'));

      await userController.updateProfile(mockReq, mockRes);

      expect(User.update).toHaveBeenCalledWith('user123', {
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1234567890'
      });
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    });

    it('should handle missing user in request', async () => {
      mockReq.user = null;

      await userController.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    });

    it('should handle null body', async () => {
      mockReq.body = null;

      await userController.updateProfile(mockReq, mockRes);

      expect(User.update).toHaveBeenCalledWith('user123', null);
    });

    it('should handle undefined body', async () => {
      mockReq.body = undefined;

      await userController.updateProfile(mockReq, mockRes);

      expect(User.update).toHaveBeenCalledWith('user123', undefined);
    });
  });
});