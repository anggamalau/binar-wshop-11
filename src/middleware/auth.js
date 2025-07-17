const { verifyAccessToken } = require('../utils/jwt');
const Token = require('../models/Token');
const User = require('../models/User');

const errorResponse = (code, message) => ({
  success: false,
  error: { code, message }
});

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'Access token is required'));
    }
    
    const token = authHeader.split(' ')[1];
    
    const isBlacklisted = await Token.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json(errorResponse('TOKEN_BLACKLISTED', 'Token has been revoked'));
    }
    
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return res.status(401).json(errorResponse('USER_NOT_FOUND', 'User not found'));
      }
      
      req.user = User.formatUser(user);
      req.token = token;
      next();
    } catch (jwtError) {
      const errorCode = jwtError.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      const errorMessage = jwtError.name === 'TokenExpiredError' ? 'Access token has expired' : 'Invalid access token';
      return res.status(401).json(errorResponse(errorCode, errorMessage));
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', 'Internal server error'));
  }
};

module.exports = { authenticate };