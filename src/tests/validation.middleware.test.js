const { passwordValidation } = require('../middleware/validation');

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
  });
});