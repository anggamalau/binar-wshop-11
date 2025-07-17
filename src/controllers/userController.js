const User = require('../models/User');

const errorResponse = (code, message) => ({
  success: false,
  error: { code, message }
});

const successResponse = (data, message) => ({
  success: true,
  ...(message && { message }),
  ...(data && { data })
});

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }
    
    res.json(successResponse({
      user: User.formatUser(user)
    }));
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Internal server error'));
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    
    const updatedUser = await User.update(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }
    
    res.json(successResponse({
      user: User.formatUser(updatedUser)
    }, 'Profile updated successfully'));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Internal server error'));
  }
};

module.exports = {
  getProfile,
  updateProfile
};