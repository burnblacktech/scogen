/**
 * Integration Tests for Chain Execution
 */

const ChainExecutor = require('../../src/modules/chain-executor');
const ConfigManager = require('../../src/utils/config-manager');
const Logger = require('../../src/utils/logger');

describe('Chain Execution Integration', () => {
  let executor;
  let logger;
  let config;
  let mockDb;
  let mockLibrary;

  beforeAll(() => {
    config = new ConfigManager();
    logger = new Logger(config);
    mockDb = {
      saveScope: jest.fn(() => ({ success: true })),
      getAllProjects: jest.fn(() => [])
    };
    mockLibrary = {
      normalizeModuleName: (name) => name,
      config: config
    };
    executor = new ChainExecutor(config, logger, mockDb, mockLibrary);
  });

  test('should execute full chain with valid input', async () => {
    const input = 'I need a web application for managing inventory with user authentication and reporting features.';
    
    const result = await executor.execute(input, {
      generateSpecs: false,
      includeReview: false
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.sessionId).toBeDefined();
    expect(result.technical).toBeDefined();
    expect(result.technical.estimate).toBeDefined();
  }, 60000); // 60 second timeout

  test('should handle empty input gracefully', async () => {
    await expect(executor.execute('')).rejects.toThrow();
  });

  test('should handle invalid input gracefully', async () => {
    const input = 'a'; // Too short
    await expect(executor.execute(input)).rejects.toThrow();
  });
});

