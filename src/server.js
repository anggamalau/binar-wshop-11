require('dotenv').config();
const { app, initializeApp } = require('./app');
const Token = require('./models/Token');

const PORT = process.env.PORT || 3000;

const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

const cleanupExpiredTokens = () => {
  const cleanup = async () => {
    try {
      await Token.cleanupExpiredTokens();
      console.log('Expired tokens cleaned up');
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  };
  
  setInterval(cleanup, CLEANUP_INTERVAL);
  cleanup();
};

const startServer = () => {
  try {
    initializeApp();
    cleanupExpiredTokens();
    
    const server = app.listen(PORT, () => {
      const env = process.env.NODE_ENV || 'development';
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${env}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;