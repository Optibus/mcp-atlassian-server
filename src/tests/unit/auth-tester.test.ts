/**
 * Unit tests for Authentication Tester utility
 */

import { 
  testAuthentication, 
  testMultipleConfigs, 
  validateConfig, 
  createTestConfigs, 
  generateAuthReport,
  AuthTestResult
} from '../../utils/auth-tester.js';
import { AtlassianConfig } from '../../utils/atlassian-api-base.js';

// Mock fetch to avoid real network calls
global.fetch = jest.fn();

describe('Authentication Tester', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('validateConfig', () => {
    it('should validate valid Cloud configuration', () => {
      const config: AtlassianConfig = {
        baseUrl: 'https://company.atlassian.net',
        email: 'user@company.com',
        apiToken: 'cloud_token'
      };

      const result = validateConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid Server configuration', () => {
      const config: AtlassianConfig = {
        baseUrl: 'https://jira.company.com',
        email: 'admin',
        apiToken: 'server_token'
      };

      const result = validateConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid base URL', () => {
      const config: AtlassianConfig = {
        baseUrl: 'not-a-url',
        email: 'user@company.com',
        apiToken: 'token'
      };

      const result = validateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid base URL format');
    });

    it('should reject missing Cloud credentials', () => {
      const config: AtlassianConfig = {
        baseUrl: 'https://company.atlassian.net',
        email: '',
        apiToken: 'token'
      };

      const result = validateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cloud deployment requires email and API token');
    });

    it('should reject invalid email format for Cloud', () => {
      const config: AtlassianConfig = {
        baseUrl: 'https://company.atlassian.net',
        email: 'invalid-email',
        apiToken: 'token'
      };

      const result = validateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format for Cloud deployment');
    });

    it('should reject missing Server credentials', () => {
      const config: AtlassianConfig = {
        baseUrl: 'https://jira.company.com',
        email: '',
        apiToken: ''
      };

      const result = validateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Server/DC deployment requires email and API token (or username+password)');
    });
  });

  describe('createTestConfigs', () => {
    it('should create test configurations for all deployment types', () => {
      const configs = createTestConfigs();
      
      expect(configs.cloud).toEqual({
        baseUrl: 'https://company.atlassian.net',
        email: 'user@company.com',
        apiToken: 'cloud_api_token'
      });

      expect(configs.serverPAT).toEqual({
        baseUrl: 'https://jira.company.com',
        email: 'admin',
        apiToken: 'server_pat_token'
      });

      expect(configs.serverBasic).toEqual({
        baseUrl: 'https://jira.company.com',
        email: 'admin',
        apiToken: 'admin_password'
      });
    });
  });

  describe('testAuthentication', () => {
    it('should return success for valid authentication', async () => {
      const config: AtlassianConfig = {
        baseUrl: 'https://company.atlassian.net',
        email: 'user@company.com',
        apiToken: 'valid_token'
      };

      const mockUserData = {
        accountId: 'account123',
        displayName: 'Test User',
        emailAddress: 'user@company.com',
        active: true
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData
      });

      const result = await testAuthentication(config);

      expect(result.success).toBe(true);
      expect(result.deploymentType).toBe('cloud');
      expect(result.authType).toBe('Cloud Basic Auth (email:token)');
      expect(result.user).toEqual({
        accountId: 'account123',
        username: undefined,
        displayName: 'Test User',
        emailAddress: 'user@company.com',
        active: true
      });
    });

    it('should return failure for invalid authentication', async () => {
      const config: AtlassianConfig = {
        baseUrl: 'https://company.atlassian.net',
        email: 'user@company.com',
        apiToken: 'invalid_token'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid credentials'
      });

      const result = await testAuthentication(config);

      expect(result.success).toBe(false);
      expect(result.deploymentType).toBe('cloud');
      expect(result.error).toBe('HTTP 401: Unauthorized');
      expect(result.statusCode).toBe(401);
    });

    it('should handle network errors', async () => {
      const config: AtlassianConfig = {
        baseUrl: 'https://company.atlassian.net',
        email: 'user@company.com',
        apiToken: 'token'
      };

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await testAuthentication(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle Server deployment with username', async () => {
      const config: AtlassianConfig = {
        baseUrl: 'https://jira.company.com',
        email: 'admin',
        apiToken: 'password'
      };

      const mockUserData = {
        name: 'admin',
        displayName: 'Administrator',
        emailAddress: 'admin@company.com',
        active: true
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData
      });

      const result = await testAuthentication(config);

      expect(result.success).toBe(true);
      expect(result.deploymentType).toBe('server');
      expect(result.authType).toBe('Server Basic Auth (username:password)');
      expect(result.user).toEqual({
        accountId: undefined,
        username: 'admin',
        displayName: 'Administrator',
        emailAddress: 'admin@company.com',
        active: true
      });
    });
  });

  describe('testMultipleConfigs', () => {
    it('should test multiple configurations', async () => {
      const configs: AtlassianConfig[] = [
        {
          baseUrl: 'https://company.atlassian.net',
          email: 'user@company.com',
          apiToken: 'token1'
        },
        {
          baseUrl: 'https://jira.company.com',
          email: 'admin',
          apiToken: 'token2'
        }
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accountId: 'account123', displayName: 'User 1' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ name: 'admin', displayName: 'Admin' })
        });

      const results = await testMultipleConfigs(configs);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].deploymentType).toBe('cloud');
      expect(results[1].success).toBe(true);
      expect(results[1].deploymentType).toBe('server');
    });

    it('should handle mixed success/failure results', async () => {
      const configs: AtlassianConfig[] = [
        {
          baseUrl: 'https://company.atlassian.net',
          email: 'user@company.com',
          apiToken: 'valid_token'
        },
        {
          baseUrl: 'https://jira.company.com',
          email: 'admin',
          apiToken: 'invalid_token'
        }
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accountId: 'account123', displayName: 'User 1' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: async () => 'Invalid credentials'
        });

      const results = await testMultipleConfigs(configs);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('HTTP 401: Unauthorized');
    });
  });

  describe('generateAuthReport', () => {
    it('should generate report for successful authentications', () => {
      const results: AuthTestResult[] = [
        {
          success: true,
          deploymentType: 'cloud',
          authType: 'Cloud Basic Auth',
          user: {
            accountId: 'account123',
            displayName: 'Test User',
            emailAddress: 'user@company.com'
          }
        },
        {
          success: true,
          deploymentType: 'server',
          authType: 'Server Basic Auth',
          user: {
            username: 'admin',
            displayName: 'Administrator',
            emailAddress: 'admin@company.com'
          }
        }
      ];

      const report = generateAuthReport(results);

      expect(report).toContain('🔐 Authentication Test Report');
      expect(report).toContain('✅ Successful: 2');
      expect(report).toContain('❌ Failed: 0');
      expect(report).toContain('📈 Success Rate: 100%');
      expect(report).toContain('CLOUD (Cloud Basic Auth)');
      expect(report).toContain('SERVER (Server Basic Auth)');
      expect(report).toContain('User: Test User');
      expect(report).toContain('User: Administrator');
    });

    it('should generate report for failed authentications', () => {
      const results: AuthTestResult[] = [
        {
          success: false,
          deploymentType: 'cloud',
          authType: 'Cloud Basic Auth',
          error: 'Invalid credentials',
          statusCode: 401
        },
        {
          success: false,
          deploymentType: 'server',
          authType: 'Server Basic Auth',
          error: 'Connection timeout'
        }
      ];

      const report = generateAuthReport(results);

      expect(report).toContain('✅ Successful: 0');
      expect(report).toContain('❌ Failed: 2');
      expect(report).toContain('📈 Success Rate: 0%');
      expect(report).toContain('❌ Failed Authentications:');
      expect(report).toContain('Error: Invalid credentials');
      expect(report).toContain('Status: 401');
      expect(report).toContain('Error: Connection timeout');
    });

    it('should generate report for mixed results', () => {
      const results: AuthTestResult[] = [
        {
          success: true,
          deploymentType: 'cloud',
          authType: 'Cloud Basic Auth',
          user: { displayName: 'Success User' }
        },
        {
          success: false,
          deploymentType: 'server',
          authType: 'Server Basic Auth',
          error: 'Authentication failed'
        }
      ];

      const report = generateAuthReport(results);

      expect(report).toContain('✅ Successful: 1');
      expect(report).toContain('❌ Failed: 1');
      expect(report).toContain('📈 Success Rate: 50%');
      expect(report).toContain('✅ Successful Authentications:');
      expect(report).toContain('❌ Failed Authentications:');
    });
  });
}); 