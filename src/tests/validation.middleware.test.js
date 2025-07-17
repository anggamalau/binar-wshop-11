const request = require('supertest');
const express = require('express');
const { 
  passwordValidation, 
  loginValidation, 
  refreshTokenValidation, 
  profileUpdateValidation 
} = require('../middleware/validation');

const app = express();
app.use(express.json());

describe('Validation Middleware', () => {
  describe('passwordValidation', () => {
    it('should return true for valid password', () => {
      const validPassword = 'Password123';
      const result = passwordValidation(validPassword);
      expect(result).toBe(true);
    });

    it('should return false for password without uppercase', () => {
      const invalidPassword = 'password123';
      const result = passwordValidation(invalidPassword);
      expect(result).toBe(false);
    });

    it('should return false for password without lowercase', () => {
      const invalidPassword = 'PASSWORD123';
      const result = passwordValidation(invalidPassword);
      expect(result).toBe(false);
    });

    it('should return false for password without numbers', () => {
      const invalidPassword = 'PasswordABC';
      const result = passwordValidation(invalidPassword);
      expect(result).toBe(false);
    });

    it('should return false for password too short', () => {
      const invalidPassword = 'Pass1';
      const result = passwordValidation(invalidPassword);
      expect(result).toBe(false);
    });

    it('should return false for empty password', () => {
      const invalidPassword = '';
      const result = passwordValidation(invalidPassword);
      expect(result).toBe(false);
    });

    it('should return false for null password', () => {
      const invalidPassword = null;
      const result = passwordValidation(invalidPassword);
      expect(result).toBe(false);
    });

    it('should return false for undefined password', () => {
      const invalidPassword = undefined;
      const result = passwordValidation(invalidPassword);
      expect(result).toBe(false);
    });

    it('should return true for password with minimum requirements', () => {
      const validPassword = 'Abcdef1g'; // 8 chars, has upper, lower, number
      const result = passwordValidation(validPassword);
      expect(result).toBe(true);
    });

    it('should return true for long password with special characters', () => {
      const validPassword = 'MyVeryLongPassword123!@#';
      const result = passwordValidation(validPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-string password', () => {
      const invalidPassword = 123;
      const result = passwordValidation(invalidPassword);
      expect(result).toBe(false);
    });
  });

  describe('loginValidation', () => {
    beforeEach(() => {
      // Reset the app for each test
      app.post('/test', loginValidation, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should pass validation for valid login data', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          email: 'test@example.com',
          password: 'validpassword'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail validation for invalid email', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          email: 'invalid-email',
          password: 'validpassword'
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail validation for missing password', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });

    it('should fail validation for too long email', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const response = await request(app)
        .post('/test')
        .send({
          email: longEmail,
          password: 'validpassword'
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });

  describe('refreshTokenValidation', () => {
    beforeEach(() => {
      app.post('/refresh', refreshTokenValidation, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should pass validation for valid refresh token', async () => {
      const response = await request(app)
        .post('/refresh')
        .send({
          refreshToken: 'valid-refresh-token'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail validation for missing refresh token', async () => {
      const response = await request(app)
        .post('/refresh')
        .send({});

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail validation for empty refresh token', async () => {
      const response = await request(app)
        .post('/refresh')
        .send({
          refreshToken: ''
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });

  describe('profileUpdateValidation', () => {
    beforeEach(() => {
      app.put('/profile', profileUpdateValidation, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should pass validation for valid profile update', async () => {
      const response = await request(app)
        .put('/profile')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '+1234567890',
          dateOfBirth: '1990-01-15'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail validation for invalid firstName', async () => {
      const response = await request(app)
        .put('/profile')
        .send({
          firstName: 'A', // Too short
          lastName: 'Doe'
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });

    it('should fail validation for firstName with numbers', async () => {
      const response = await request(app)
        .put('/profile')
        .send({
          firstName: 'John123',
          lastName: 'Doe'
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });

    it('should fail validation for invalid phone number', async () => {
      const response = await request(app)
        .put('/profile')
        .send({
          phoneNumber: 'invalid-phone'
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });

    it('should fail validation for future date of birth', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const response = await request(app)
        .put('/profile')
        .send({
          dateOfBirth: futureDate.toISOString().split('T')[0]
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });

    it('should fail validation for invalid date format', async () => {
      const response = await request(app)
        .put('/profile')
        .send({
          dateOfBirth: 'invalid-date'
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });

    it('should pass validation with optional fields omitted', async () => {
      const response = await request(app)
        .put('/profile')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail validation for lastName too long', async () => {
      const response = await request(app)
        .put('/profile')
        .send({
          lastName: 'A'.repeat(51) // Too long
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });
});