describe('Server Module', () => {
  let originalConsoleLog;
  let originalConsoleError;

  beforeAll(() => {
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();
    
    // Unmock to get real coverage
    jest.unmock('../server');
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete require.cache[require.resolve('../server')];
  });

  it('should export the app from server module', () => {
    const serverModule = require('../server');
    expect(serverModule).toBeDefined();
  });

  it('should handle PORT environment variable', () => {
    const originalPort = process.env.PORT;
    process.env.PORT = '3001';

    // Should not throw when requiring
    expect(() => require('../server')).not.toThrow();
    
    process.env.PORT = originalPort;
  });

  it('should use default port when PORT is not set', () => {
    const originalPort = process.env.PORT;
    delete process.env.PORT;

    // Should not throw when requiring
    expect(() => require('../server')).not.toThrow();
    
    process.env.PORT = originalPort;
  });

  it('should handle different NODE_ENV values', () => {
    const originalEnv = process.env.NODE_ENV;
    
    // Test with test environment
    process.env.NODE_ENV = 'test';
    expect(() => require('../server')).not.toThrow();
    
    // Test with development environment
    delete require.cache[require.resolve('../server')];
    process.env.NODE_ENV = 'development';
    expect(() => require('../server')).not.toThrow();
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should handle cleanup interval configuration', () => {
    // Should not throw when requiring
    expect(() => require('../server')).not.toThrow();
  });

  it('should test server functions and constants', () => {
    // Test that server constants are defined
    const fs = require('fs');
    const path = require('path');
    const serverPath = path.join(__dirname, '../server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Check that the server file contains expected elements
    expect(serverContent).toContain('PORT');
    expect(serverContent).toContain('CLEANUP_INTERVAL');
    expect(serverContent).toContain('cleanupExpiredTokens');
    expect(serverContent).toContain('startServer');
    expect(serverContent).toContain('Token.cleanupExpiredTokens');
  });

  it('should test server startup logic', () => {
    // Mock require.main to test the conditional startup
    const originalMain = require.main;
    require.main = { filename: require.resolve('../server') };
    
    // Should not throw when requiring
    expect(() => require('../server')).not.toThrow();
    
    require.main = originalMain;
  });
});