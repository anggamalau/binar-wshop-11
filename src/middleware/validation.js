const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  next();
};

const NAME_REGEX = /^[a-zA-Z\s]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const MIN_PASSWORD_LENGTH = 8;

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
  handleValidationErrors
];

const profileUpdateValidation = [
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(NAME_REGEX)
    .withMessage('First name must contain only letters'),
  body('lastName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(NAME_REGEX)
    .withMessage('Last name must contain only letters'),
  body('phoneNumber')
    .optional()
    .matches(PHONE_REGEX)
    .withMessage('Phone number must be in E.164 format'),
  body('dateOfBirth')
    .optional()
    .isDate()
    .withMessage('Date of birth must be in YYYY-MM-DD format')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      return date < today;
    })
    .withMessage('Date of birth must be in the past'),
  handleValidationErrors
];

const passwordValidation = (password) => {
  if (!password || typeof password !== 'string') {
    return false;
  }
  
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
};

module.exports = {
  loginValidation,
  refreshTokenValidation,
  profileUpdateValidation,
  passwordValidation
};