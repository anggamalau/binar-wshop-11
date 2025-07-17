const { runQuery, getOne, uuidv4 } = require('../config/database');

class Token {
  static async createRefreshToken(userId, token, expiresAt) {
    const id = uuidv4();
    const sql = `
      INSERT INTO refresh_tokens (id, userId, token, expiresAt)
      VALUES (?, ?, ?, ?)
    `;
    
    await runQuery(sql, [id, userId, token, expiresAt]);
    return { id, userId, token, expiresAt };
  }

  static async findRefreshToken(token) {
    const sql = 'SELECT * FROM refresh_tokens WHERE token = ?';
    return getOne(sql, [token]);
  }

  static async deleteRefreshToken(token) {
    const sql = 'DELETE FROM refresh_tokens WHERE token = ?';
    return runQuery(sql, [token]);
  }

  static async deleteUserRefreshTokens(userId) {
    const sql = 'DELETE FROM refresh_tokens WHERE userId = ?';
    return runQuery(sql, [userId]);
  }

  static async blacklistToken(token, expiresAt) {
    const id = uuidv4();
    const sql = `
      INSERT INTO token_blacklist (id, token, expiresAt)
      VALUES (?, ?, ?)
    `;
    
    await runQuery(sql, [id, token, expiresAt]);
    return { id, token, expiresAt };
  }

  static async isTokenBlacklisted(token) {
    const sql = 'SELECT * FROM token_blacklist WHERE token = ?';
    const result = await getOne(sql, [token]);
    return !!result;
  }

  static async cleanupExpiredTokens() {
    const queries = [
      'DELETE FROM token_blacklist WHERE expiresAt < datetime("now")',
      'DELETE FROM refresh_tokens WHERE expiresAt < datetime("now")'
    ];
    
    await Promise.all(queries.map(query => runQuery(query)));
  }
}

module.exports = Token;