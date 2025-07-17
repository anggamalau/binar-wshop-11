const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else if (process.env.NODE_ENV !== 'test') {
    console.log('Connected to SQLite database');
  }
});

db.configure('busyTimeout', 5000);

const initDatabase = () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      phoneNumber TEXT,
      dateOfBirth TEXT,
      profilePicture TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS token_blacklist (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      token TEXT NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_token_blacklist_token ON token_blacklist(token)`,
    `CREATE INDEX IF NOT EXISTS idx_token_blacklist_expiresAt ON token_blacklist(expiresAt)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_userId ON refresh_tokens(userId)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiresAt ON refresh_tokens(expiresAt)`
  ];
  
  db.serialize(() => {
    queries.forEach(query => db.run(query));
  });
};

const promisifyDbMethod = (method) => (sql, params = []) => 
  new Promise((resolve, reject) => {
    const callback = method === 'run' 
      ? function(err) {
          err ? reject(err) : resolve({ id: this.lastID, changes: this.changes });
        }
      : (err, result) => {
          err ? reject(err) : resolve(result);
        };
    
    db[method](sql, params, callback);
  });

const runQuery = promisifyDbMethod('run');
const getOne = promisifyDbMethod('get');
const getAll = promisifyDbMethod('all');

module.exports = {
  db,
  initDatabase,
  runQuery,
  getOne,
  getAll,
  uuidv4
};