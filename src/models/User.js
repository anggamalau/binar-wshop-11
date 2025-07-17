const { runQuery, getOne, uuidv4 } = require('../config/database');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const ALLOWED_UPDATE_FIELDS = ['firstName', 'lastName', 'phoneNumber', 'dateOfBirth', 'profilePicture'];

class User {
  static async create(userData) {
    const { email, password, firstName, lastName, phoneNumber, dateOfBirth, profilePicture } = userData;
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    
    const sql = `
      INSERT INTO users (id, email, password, firstName, lastName, phoneNumber, dateOfBirth, profilePicture)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await runQuery(sql, [id, email, hashedPassword, firstName, lastName, phoneNumber, dateOfBirth, profilePicture]);
    
    return this.findById(id);
  }

  static async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    return getOne(sql, [email]);
  }

  static async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    return getOne(sql, [id]);
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];
    
    for (const key of Object.keys(updateData)) {
      if (ALLOWED_UPDATE_FIELDS.includes(key) && updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    }
    
    if (!fields.length) {
      return this.findById(id);
    }
    
    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);
    
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await runQuery(sql, values);
    
    return this.findById(id);
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static formatUser(user) {
    if (!user) return null;
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

module.exports = User;