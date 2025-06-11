/**
 * Jest Setup File
 * 
 * This file runs before each test file to set up the testing environment.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Increase timeout for async operations
jest.setTimeout(10000);

// Suppress console output during tests
// Comment these out if you want to see console output during tests
global.console.log = jest.fn();
global.console.info = jest.fn();
global.console.warn = jest.fn();
// Keep error logging enabled for debugging
// global.console.error = jest.fn();

// Mock implementations for browser-specific globals
if (typeof window === 'undefined') {
  global.window = {};
}

// Clean up after all tests
afterAll(() => {
  // Add any cleanup operations here
  jest.clearAllMocks();
});