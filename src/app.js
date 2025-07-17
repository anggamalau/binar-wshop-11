require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initDatabase } = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const { authRateLimiter, generalRateLimiter } = require('./middleware/rateLimiter');

const app = express();
const isTestEnv = process.env.NODE_ENV === 'test';

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

if (!isTestEnv) {
  app.use(generalRateLimiter);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (!isTestEnv) {
  app.use('/api/auth', authRateLimiter, authRoutes);
} else {
  app.use('/api/auth', authRoutes);
}
app.use('/api/user', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

const errorResponse = (code, message) => ({
  success: false,
  error: { code, message }
});

app.all('*', (req, res) => {
  res.status(404).json(errorResponse('NOT_FOUND', 'Route not found'));
});

app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json(errorResponse('INVALID_JSON', 'Invalid JSON in request body'));
  }
  
  res.status(500).json(errorResponse('INTERNAL_ERROR', 'Internal server error'));
});

const initializeApp = initDatabase;

module.exports = { app, initializeApp };