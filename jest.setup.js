// Jest setup file for test environment configuration
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.DB_PATH = ':memory:';

// Suppress console output during tests to reduce noise
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

console.error = jest.fn();
console.log = jest.fn();

// Mock the database module globally
jest.mock('./src/config/database', () => ({
  db: {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    prepare: jest.fn().mockReturnValue({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
      finalize: jest.fn()
    }),
    close: jest.fn(),
    configure: jest.fn()
  },
  initDatabase: jest.fn().mockResolvedValue(undefined),
  runQuery: jest.fn().mockResolvedValue({}),
  getOne: jest.fn().mockResolvedValue(null),
  getAll: jest.fn().mockResolvedValue([]),
  uuidv4: jest.fn(() => 'mock-uuid-123')
}));

// Global test setup
beforeAll(() => {
  // Additional global setup if needed
});

afterAll(() => {
  // Restore console functions
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

// Clear all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});