/**
 * Unit tests for authentication strategy system
 */

import { 
  CloudAuthStrategy, 
  ServerAuthStrategy, 
  AuthStrategyFactory 
} from '../../utils/auth-strategy.js';
import { Config } from '../../utils/mcp-helpers.js';

describe('Authentication Strategy System', () => {
  describe('CloudAuthStrategy', () => {
    test('should create correct auth headers', () => {
      const strategy = new CloudAuthStrategy('user@company.com', 'token123');
      const headers = strategy.getAuthHeaders();

      expect(headers['Authorization']).toMatch(/^Basic /);
      expect(headers['Accept']).toBe('application/json');
      expect(headers['Content-Type']).toBe('application/json');
      
      // Decode and verify credentials
      const encodedCreds = headers['Authorization'].replace('Basic ', '');
      const decodedCreds = Buffer.from(encodedCreds, 'base64').toString();
      expect(decodedCreds).toBe('user@company.com:token123');
    });

    test('should return correct auth type', () => {
      const strategy = new CloudAuthStrategy('user@company.com', 'token123');
      expect(strategy.getAuthType()).toBe('Cloud Basic Auth (email:token)');
    });

    test('should validate valid configuration', () => {
      const strategy = new CloudAuthStrategy('user@company.com', 'token123');
      const result = strategy.validate();
      expect(result.isValid).toBe(true);
    });

    test('should reject missing email', () => {
      const strategy = new CloudAuthStrategy('', 'token123');
      const result = strategy.validate();
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('email and API token');
    });

    test('should reject invalid email format', () => {
      const strategy = new CloudAuthStrategy('invalid-email', 'token123');
      const result = strategy.validate();
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });
  });

  describe('ServerAuthStrategy', () => {
    test('should create PAT auth headers when no username provided', () => {
      const strategy = new ServerAuthStrategy('pat_token123');
      const headers = strategy.getAuthHeaders();

      expect(headers['Authorization']).toBe('Bearer pat_token123');
      expect(headers['Accept']).toBe('application/json');
      expect(headers['Content-Type']).toBe('application/json');
    });

    test('should create Basic auth headers when username provided', () => {
      const strategy = new ServerAuthStrategy('password123', 'admin');
      const headers = strategy.getAuthHeaders();

      expect(headers['Authorization']).toMatch(/^Basic /);
      
      // Decode and verify credentials
      const encodedCreds = headers['Authorization'].replace('Basic ', '');
      const decodedCreds = Buffer.from(encodedCreds, 'base64').toString();
      expect(decodedCreds).toBe('admin:password123');
    });

    test('should return correct auth type for PAT', () => {
      const strategy = new ServerAuthStrategy('pat_token123');
      expect(strategy.getAuthType()).toBe('Server PAT (Bearer token)');
    });

    test('should return correct auth type for Basic Auth', () => {
      const strategy = new ServerAuthStrategy('password123', 'admin');
      expect(strategy.getAuthType()).toBe('Server Basic Auth (username:password)');
    });

    test('should validate PAT configuration', () => {
      const strategy = new ServerAuthStrategy('pat_token123');
      const result = strategy.validate();
      expect(result.isValid).toBe(true);
    });

    test('should validate Basic Auth configuration', () => {
      const strategy = new ServerAuthStrategy('password123', 'admin');
      const result = strategy.validate();
      expect(result.isValid).toBe(true);
    });

    test('should reject missing token', () => {
      const strategy = new ServerAuthStrategy('');
      const result = strategy.validate();
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requires a token');
    });
  });

  describe('AuthStrategyFactory', () => {
    test('should create CloudAuthStrategy for cloud deployment', () => {
      const config: Config.EnhancedAtlassianConfig = {
        baseUrl: 'https://company.atlassian.net',
        email: 'user@company.com',
        apiToken: 'token123',
        deploymentType: 'cloud'
      };

      const strategy = AuthStrategyFactory.createFromConfig(config);
      expect(strategy).toBeInstanceOf(CloudAuthStrategy);
      expect(strategy.getAuthType()).toContain('Cloud Basic Auth');
    });

    test('should create ServerAuthStrategy for server deployment with PAT', () => {
      const config: Config.EnhancedAtlassianConfig = {
        baseUrl: 'https://jira.company.com',
        email: '',
        apiToken: 'pat_token123',
        deploymentType: 'server'
      };

      const strategy = AuthStrategyFactory.createFromConfig(config);
      expect(strategy).toBeInstanceOf(ServerAuthStrategy);
      expect(strategy.getAuthType()).toContain('Server PAT');
    });

    test('should create ServerAuthStrategy for server deployment with Basic Auth', () => {
      const config: Config.EnhancedAtlassianConfig = {
        baseUrl: 'https://jira.company.com',
        email: 'admin',
        apiToken: 'password123',
        deploymentType: 'server'
      };

      const strategy = AuthStrategyFactory.createFromConfig(config);
      expect(strategy).toBeInstanceOf(ServerAuthStrategy);
      expect(strategy.getAuthType()).toContain('Server Basic Auth');
    });

    test('should create and validate successfully', () => {
      const config: Config.EnhancedAtlassianConfig = {
        baseUrl: 'https://company.atlassian.net',
        email: 'user@company.com',
        apiToken: 'token123',
        deploymentType: 'cloud'
      };

      const result = AuthStrategyFactory.createAndValidate(config);
      expect(result.strategy).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    test('should return error for invalid configuration', () => {
      const config: Config.EnhancedAtlassianConfig = {
        baseUrl: 'https://company.atlassian.net',
        email: '', // Missing email for Cloud
        apiToken: 'token123',
        deploymentType: 'cloud'
      };

      const result = AuthStrategyFactory.createAndValidate(config);
      expect(result.strategy).toBeUndefined();
      expect(result.error).toContain('email and API token');
    });
  });
}); 