const User = require('../models/User');
const Token = require('../models/Token');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration 
} = require('../utils/jwt');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }
    
    const isPasswordValid = await User.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }
    
    const tokenPayload = {
      userId: user.id,
      email: user.email
    };
    
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    
    const refreshTokenExpiration = getTokenExpiration(process.env.JWT_REFRESH_EXPIRE_TIME || '7d');
    await Token.createRefreshToken(user.id, refreshToken, refreshTokenExpiration.toISOString());
    
    const accessTokenDecoded = decodeToken(accessToken);
    const expiresIn = accessTokenDecoded.exp - Math.floor(Date.now() / 1000);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: User.formatUser(user),
        tokens: {
          accessToken,
          refreshToken,
          expiresIn
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const accessToken = req.token;
    
    const accessTokenDecoded = decodeToken(accessToken);
    const accessTokenExpiration = new Date(accessTokenDecoded.exp * 1000);
    await Token.blacklistToken(accessToken, accessTokenExpiration.toISOString());
    
    if (refreshToken) {
      const refreshTokenData = await Token.findRefreshToken(refreshToken);
      if (refreshTokenData && refreshTokenData.userId === req.user.id) {
        await Token.deleteRefreshToken(refreshToken);
        
        try {
          const refreshTokenDecoded = verifyRefreshToken(refreshToken);
          const refreshTokenExpiration = new Date(refreshTokenDecoded.exp * 1000);
          await Token.blacklistToken(refreshToken, refreshTokenExpiration.toISOString());
        } catch (error) {
          console.log('Refresh token already expired or invalid');
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    const isBlacklisted = await Token.isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_BLACKLISTED',
          message: 'Refresh token has been revoked'
        }
      });
    }
    
    const storedToken = await Token.findRefreshToken(refreshToken);
    if (!storedToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token'
        }
      });
    }
    
    try {
      const decoded = verifyRefreshToken(refreshToken);
      
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }
      
      const tokenPayload = {
        userId: user.id,
        email: user.email
      };
      
      const newAccessToken = generateAccessToken(tokenPayload);
      const accessTokenDecoded = decodeToken(newAccessToken);
      const expiresIn = accessTokenDecoded.exp - Math.floor(Date.now() / 1000);
      
      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          expiresIn
        }
      });
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        await Token.deleteRefreshToken(refreshToken);
        return res.status(401).json({
          success: false,
          error: {
            code: 'REFRESH_TOKEN_EXPIRED',
            message: 'Refresh token has expired'
          }
        });
      }
      
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token'
        }
      });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

module.exports = {
  login,
  logout,
  refreshAccessToken
};