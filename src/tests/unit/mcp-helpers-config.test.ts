/**
 * Unit tests for enhanced configuration system in mcp-helpers
 */

import { Config } from '../../utils/mcp-helpers.js';

describe('Config Enhanced System', () => {
  // Store original env vars to restore after tests
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env for each test
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear specific env vars that tests will set
    delete process.env.ATLASSIAN_SITE_NAME;
    delete process.env.ATLASSIAN_USER_EMAIL;
    delete process.env.ATLASSIAN_API_TOKEN;
    delete process.env.ATLASSIAN_PAT_TOKEN;
    delete process.env.ATLASSIAN_DEPLOYMENT_TYPE;
  });

  afterAll(() => {
    // Restore original env vars
    process.env = originalEnv;
  });

  describe('getAtlassianConfigFromEnv', () => {
    test('should detect Cloud deployment with proper credentials', () => {
      process.env.ATLASSIAN_SITE_NAME = 'company.atlassian.net';
      process.env.ATLASSIAN_USER_EMAIL = 'user@company.com';
      process.env.ATLASSIAN_API_TOKEN = 'token123';

      const config = Config.getAtlassianConfigFromEnv();

      expect(config.deploymentType).toBe('cloud');
      expect(config.baseUrl).toBe('https://company.atlassian.net');
      expect(config.email).toBe('user@company.com');
      expect(config.apiToken).toBe('token123');
    });

    test('should detect Server deployment with PAT token', () => {
      process.env.ATLASSIAN_SITE_NAME = 'https://jira.company.com';
      process.env.ATLASSIAN_PAT_TOKEN = 'pat_token123';

      const config = Config.getAtlassianConfigFromEnv();

      expect(config.deploymentType).toBe('server');
      expect(config.baseUrl).toBe('https://jira.company.com');
      expect(config.email).toBe('');
      expect(config.apiToken).toBe('pat_token123');
    });

    test('should detect Server deployment with Basic Auth fallback', () => {
      process.env.ATLASSIAN_SITE_NAME = 'https://jira.company.com';
      process.env.ATLASSIAN_USER_EMAIL = 'admin';
      process.env.ATLASSIAN_API_TOKEN = 'password123';

      const config = Config.getAtlassianConfigFromEnv();

      expect(config.deploymentType).toBe('server');
      expect(config.baseUrl).toBe('https://jira.company.com');
      expect(config.email).toBe('admin');
      expect(config.apiToken).toBe('password123');
    });

    test('should respect explicit deployment type', () => {
      process.env.ATLASSIAN_SITE_NAME = 'https://jira.company.com';
      process.env.ATLASSIAN_DEPLOYMENT_TYPE = 'cloud';
      process.env.ATLASSIAN_USER_EMAIL = 'user@company.com';
      process.env.ATLASSIAN_API_TOKEN = 'token123';

      const config = Config.getAtlassianConfigFromEnv();

      expect(config.deploymentType).toBe('cloud');
    });

    test('should throw error for missing site name', () => {
      process.env.ATLASSIAN_USER_EMAIL = 'user@company.com';
      process.env.ATLASSIAN_API_TOKEN = 'token123';

      expect(() => Config.getAtlassianConfigFromEnv()).toThrow('Missing ATLASSIAN_SITE_NAME');
    });

    test('should throw error for Cloud deployment with missing credentials', () => {
      process.env.ATLASSIAN_SITE_NAME = 'company.atlassian.net';
      process.env.ATLASSIAN_USER_EMAIL = 'user@company.com';
      // Missing API token

      expect(() => Config.getAtlassianConfigFromEnv()).toThrow('Missing credentials for Cloud deployment');
    });

    test('should throw error for Server deployment with missing credentials', () => {
      process.env.ATLASSIAN_SITE_NAME = 'https://jira.company.com';
      // Missing all credentials

      expect(() => Config.getAtlassianConfigFromEnv()).toThrow('Missing credentials for Server/DC deployment');
    });
  });

  describe('validateConfig', () => {
    test('should validate Cloud config correctly', () => {
      const config: Config.EnhancedAtlassianConfig = {
        baseUrl: 'https://company.atlassian.net',
        email: 'user@company.com',
        apiToken: 'token123',
        deploymentType: 'cloud'
      };

      const result = Config.validateConfig(config);
      expect(result.isValid).toBe(true);
    });

    test('should validate Server config correctly', () => {
      const config: Config.EnhancedAtlassianConfig = {
        baseUrl: 'https://jira.company.com',
        email: '',
        apiToken: 'pat_token123',
        deploymentType: 'server'
      };

      const result = Config.validateConfig(config);
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid URL', () => {
      const config: Config.EnhancedAtlassianConfig = {
        baseUrl: 'not-a-url',
        email: 'user@company.com',
        apiToken: 'token123',
        deploymentType: 'cloud'
      };

      const result = Config.validateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });

    test('should reject Cloud config without email', () => {
      const config: Config.EnhancedAtlassianConfig = {
        baseUrl: 'https://company.atlassian.net',
        email: '',
        apiToken: 'token123',
        deploymentType: 'cloud'
      };

      const result = Config.validateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cloud deployment requires email and API token');
    });

    test('should reject Server config without API token', () => {
      const config: Config.EnhancedAtlassianConfig = {
        baseUrl: 'https://jira.company.com',
        email: 'admin',
        apiToken: '',
        deploymentType: 'server'
      };

      const result = Config.validateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Server/DC deployment requires API token or PAT');
    });
  });
}); 