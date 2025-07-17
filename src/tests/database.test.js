const sqlite3 = require('sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Mock sqlite3 before importing the database module
jest.mock('sqlite3', () => ({
  verbose: jest.fn(() => ({
    Database: jest.fn()
  }))
}));

jest.mock('path');
jest.mock('uuid');

describe('Database Configuration', () => {
  let mockDatabase;
  let mockDb;
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };

    // Mock database instance
    mockDb = {
      serialize: jest.fn(),
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn()
    };

    // Mock Database constructor
    mockDatabase = jest.fn().mockImplementation((dbPath, callback) => {
      // Simulate successful connection
      if (callback) {
        callback(null);
      }
      return mockDb;
    });

    sqlite3.verbose.mockReturnValue({ Database: mockDatabase });
    path.join.mockReturnValue('/test/path/database.sqlite');
    uuidv4.mockReturnValue('test-uuid-123');
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    delete process.env.DB_PATH;
    
    // Clear module cache to get fresh imports
    Object.keys(require.cache).forEach(key => {
      if (key.includes('database')) {
        delete require.cache[key];
      }
    });
  });

  describe('Database initialization', () => {
    it('should create database with default path', () => {
      require('../config/database');

      expect(path.join).toHaveBeenCalledWith(expect.any(String), '../../database.sqlite');
      expect(mockDatabase).toHaveBeenCalledWith('/test/path/database.sqlite', expect.any(Function));
      expect(consoleSpy.log).toHaveBeenCalledWith('Connected to SQLite database');
    });

    it('should create database with custom path from environment', () => {
      process.env.DB_PATH = '/custom/path/database.sqlite';
      
      require('../config/database');

      expect(mockDatabase).toHaveBeenCalledWith('/custom/path/database.sqlite', expect.any(Function));
      expect(consoleSpy.log).toHaveBeenCalledWith('Connected to SQLite database');
    });

    it('should handle database connection errors', () => {
      mockDatabase.mockImplementation((dbPath, callback) => {
        if (callback) {
          callback(new Error('Connection failed'));
        }
        return mockDb;
      });

      require('../config/database');

      expect(consoleSpy.error).toHaveBeenCalledWith('Error opening database:', expect.any(Error));
    });
  });

  describe('initDatabase', () => {
    it('should create tables and indexes', () => {
      const { initDatabase } = require('../config/database');

      mockDb.serialize.mockImplementation((callback) => {
        callback();
      });

      initDatabase();

      expect(mockDb.serialize).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS users'));
      expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS token_blacklist'));
      expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS refresh_tokens'));
      expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_users_email'));
      expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_token_blacklist_token'));
      expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token'));
      expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_userId'));
    });

    it('should handle database initialization errors', () => {
      const { initDatabase } = require('../config/database');

      mockDb.serialize.mockImplementation((callback) => {
        callback();
      });

      mockDb.run.mockImplementation(() => {
        throw new Error('Table creation failed');
      });

      expect(() => initDatabase()).toThrow('Table creation failed');
    });
  });

  describe('runQuery', () => {
    it('should execute query and return result', async () => {
      const { runQuery } = require('../config/database');

      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ lastID: 1, changes: 1 }, null);
      });

      const result = await runQuery('INSERT INTO users VALUES (?, ?)', ['test', 'value']);

      expect(mockDb.run).toHaveBeenCalledWith('INSERT INTO users VALUES (?, ?)', ['test', 'value'], expect.any(Function));
      expect(result).toEqual({ id: 1, changes: 1 });
    });

    it('should handle query with no parameters', async () => {
      const { runQuery } = require('../config/database');

      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ lastID: 0, changes: 0 }, null);
      });

      const result = await runQuery('CREATE TABLE test');

      expect(mockDb.run).toHaveBeenCalledWith('CREATE TABLE test', [], expect.any(Function));
      expect(result).toEqual({ id: 0, changes: 0 });
    });

    it('should handle query errors', async () => {
      const { runQuery } = require('../config/database');

      mockDb.run.mockImplementation((sql, params, callback) => {
        callback(new Error('Query failed'));
      });

      await expect(runQuery('SELECT * FROM users')).rejects.toThrow('Query failed');
    });
  });

  describe('getOne', () => {
    it('should return single row', async () => {
      const { getOne } = require('../config/database');

      const mockRow = { id: 1, name: 'test' };
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, mockRow);
      });

      const result = await getOne('SELECT * FROM users WHERE id = ?', [1]);

      expect(mockDb.get).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1], expect.any(Function));
      expect(result).toEqual(mockRow);
    });

    it('should return null when no row found', async () => {
      const { getOne } = require('../config/database');

      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const result = await getOne('SELECT * FROM users WHERE id = ?', [999]);

      expect(result).toBeNull();
    });

    it('should handle query with no parameters', async () => {
      const { getOne } = require('../config/database');

      const mockRow = { count: 5 };
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, mockRow);
      });

      const result = await getOne('SELECT COUNT(*) as count FROM users');

      expect(mockDb.get).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM users', [], expect.any(Function));
      expect(result).toEqual(mockRow);
    });

    it('should handle query errors', async () => {
      const { getOne } = require('../config/database');

      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Query failed'));
      });

      await expect(getOne('SELECT * FROM users')).rejects.toThrow('Query failed');
    });
  });

  describe('getAll', () => {
    it('should return multiple rows', async () => {
      const { getAll } = require('../config/database');

      const mockRows = [
        { id: 1, name: 'test1' },
        { id: 2, name: 'test2' }
      ];
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows);
      });

      const result = await getAll('SELECT * FROM users');

      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM users', [], expect.any(Function));
      expect(result).toEqual(mockRows);
    });

    it('should return empty array when no rows found', async () => {
      const { getAll } = require('../config/database');

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const result = await getAll('SELECT * FROM users WHERE id > ?', [1000]);

      expect(result).toEqual([]);
    });

    it('should handle query with parameters', async () => {
      const { getAll } = require('../config/database');

      const mockRows = [{ id: 1, name: 'test' }];
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows);
      });

      const result = await getAll('SELECT * FROM users WHERE active = ?', [true]);

      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM users WHERE active = ?', [true], expect.any(Function));
      expect(result).toEqual(mockRows);
    });

    it('should handle query errors', async () => {
      const { getAll } = require('../config/database');

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Query failed'));
      });

      await expect(getAll('SELECT * FROM users')).rejects.toThrow('Query failed');
    });
  });

  describe('uuidv4 export', () => {
    it('should export uuidv4 function', () => {
      const { uuidv4: exportedUuid } = require('../config/database');

      const result = exportedUuid();

      expect(uuidv4).toHaveBeenCalled();
      expect(result).toBe('test-uuid-123');
    });
  });

  describe('db export', () => {
    it('should export database instance', () => {
      const { db } = require('../config/database');

      expect(db).toBe(mockDb);
    });
  });

  describe('Database connection callback', () => {
    it('should log success message on successful connection', () => {
      mockDatabase.mockImplementation((dbPath, callback) => {
        if (callback) {
          callback(null);
        }
        return mockDb;
      });

      require('../config/database');

      expect(consoleSpy.log).toHaveBeenCalledWith('Connected to SQLite database');
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should log error message on connection failure', () => {
      const connectionError = new Error('Connection failed');
      mockDatabase.mockImplementation((dbPath, callback) => {
        if (callback) {
          callback(connectionError);
        }
        return mockDb;
      });

      require('../config/database');

      expect(consoleSpy.error).toHaveBeenCalledWith('Error opening database:', connectionError);
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });
});