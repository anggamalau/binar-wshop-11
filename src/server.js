require('dotenv').config();
const { app, initializeApp } = require('./app');
const Token = require('./models/Token');

const PORT = process.env.PORT || 3000;

const cleanupExpiredTokens = () => {
  setInterval(async () => {
    try {
      await Token.cleanupExpiredTokens();
      console.log('Expired tokens cleaned up');
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }, 24 * 60 * 60 * 1000);
};

const startServer = async () => {
  try {
    initializeApp();
    cleanupExpiredTokens();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;