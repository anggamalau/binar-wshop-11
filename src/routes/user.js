const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { profileUpdateValidation } = require('../middleware/validation');

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, profileUpdateValidation, updateProfile);

module.exports = router;