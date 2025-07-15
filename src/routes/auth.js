const express = require('express');
const router = express.Router();
const { login, logout, refreshAccessToken } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginValidation, refreshTokenValidation } = require('../middleware/validation');

router.post('/login', loginValidation, login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refreshTokenValidation, refreshAccessToken);

module.exports = router;