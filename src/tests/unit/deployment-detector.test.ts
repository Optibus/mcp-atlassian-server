/**
 * Unit tests for deployment detection utility
 */

import { 
  isAtlassianCloudUrl, 
  getDeploymentType, 
  validateAtlassianUrl, 
  normalizeAtlassianUrl 
} from '../../utils/deployment-detector.js';

describe('DeploymentDetector', () => {
  describe('isAtlassianCloudUrl', () => {
    test('should detect Cloud URLs correctly', () => {
      const cloudUrls = [
        'https://company.atlassian.net',
        'https://company.atlassian.net/wiki',
        'https://test.jira.com',
        'https://api.atlassian.com'
      ];

      cloudUrls.forEach((url) => {
        expect(isAtlassianCloudUrl(url)).toBe(true);
      });
    });

    test('should detect Server/DC URLs correctly', () => {
      const serverUrls = [
        'https://jira.company.com',
        'https://confluence.company.com',
        'http://localhost:8080',
        'https://192.168.1.100:8080',
        'https://jira.internal'
      ];

      serverUrls.forEach((url) => {
        expect(isAtlassianCloudUrl(url)).toBe(false);
      });
    });

    test('should handle invalid URLs', () => {
      const invalidInputs = ['', null, undefined, 'not-a-url'];

      invalidInputs.forEach((input) => {
        expect(isAtlassianCloudUrl(input as any)).toBe(false);
      });
    });
  });

  describe('getDeploymentType', () => {
    test('should return correct deployment types', () => {
      expect(getDeploymentType('https://company.atlassian.net')).toBe('cloud');
      expect(getDeploymentType('https://jira.company.com')).toBe('server');
      expect(getDeploymentType('http://localhost:8080')).toBe('server');
    });
  });

  describe('validateAtlassianUrl', () => {
    test('should validate correct URLs', () => {
      const cloudResult = validateAtlassianUrl('https://company.atlassian.net');
      expect(cloudResult.isValid).toBe(true);
      expect(cloudResult.deploymentType).toBe('cloud');

      const serverResult = validateAtlassianUrl('https://jira.company.com');
      expect(serverResult.isValid).toBe(true);
      expect(serverResult.deploymentType).toBe('server');
    });

    test('should reject invalid URLs', () => {
      const result = validateAtlassianUrl('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });
  });

  describe('normalizeAtlassianUrl', () => {
    test('should normalize URLs correctly', () => {
      expect(normalizeAtlassianUrl('https://company.atlassian.net/')).toBe('https://company.atlassian.net');
      expect(normalizeAtlassianUrl('http://localhost:8080')).toBe('http://localhost:8080');
    });

    test('should throw error for invalid URLs', () => {
      expect(() => normalizeAtlassianUrl('not-a-url')).toThrow('Invalid Atlassian URL');
    });
  });
}); 