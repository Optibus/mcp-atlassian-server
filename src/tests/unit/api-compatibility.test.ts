/**
 * Unit tests for API compatibility utility
 */

import {
  getEndpointConfig,
  buildApiUrl,
  isFeatureAvailable,
  getAlternativeEndpoint,
  mapQueryParameters,
  getApiVersion,
  isApiVersionSupported,
  API_VERSIONS,
  JIRA_ENDPOINTS,
  CONFLUENCE_ENDPOINTS
} from '../../utils/api-compatibility.js';

describe('ApiCompatibility', () => {
  describe('API_VERSIONS', () => {
    test('should have correct version mappings', () => {
      expect(API_VERSIONS.cloud.jira).toBe('3');
      expect(API_VERSIONS.cloud.confluence).toBe('2');
      expect(API_VERSIONS.server.jira).toBe('2');
      expect(API_VERSIONS.server.confluence).toBe('1');
    });
  });

  describe('getEndpointConfig', () => {
    test('should get Jira endpoint config for Cloud', () => {
      const config = getEndpointConfig('jira', 'users.search', 'cloud');
      
      expect(config).toBeDefined();
      expect(config?.path).toBe('/rest/api/3/user/search');
      expect(config?.method).toBe('GET');
      expect(config?.isAvailable).toBe(true);
    });

    test('should get Jira endpoint config for Server', () => {
      const config = getEndpointConfig('jira', 'users.search', 'server');
      
      expect(config).toBeDefined();
      expect(config?.path).toBe('/rest/api/2/user/search');
      expect(config?.method).toBe('GET');
      expect(config?.isAvailable).toBe(true);
    });

    test('should get Confluence endpoint config for Cloud', () => {
      const config = getEndpointConfig('confluence', 'spaces.all', 'cloud');
      
      expect(config).toBeDefined();
      expect(config?.path).toBe('/api/v2/spaces');
      expect(config?.method).toBe('GET');
      expect(config?.isAvailable).toBe(true);
    });

    test('should get Confluence endpoint config for Server', () => {
      const config = getEndpointConfig('confluence', 'spaces.all', 'server');
      
      expect(config).toBeDefined();
      expect(config?.path).toBe('/rest/api/space');
      expect(config?.method).toBe('GET');
      expect(config?.isAvailable).toBe(true);
    });

    test('should return null for unknown endpoint', () => {
      const config = getEndpointConfig('jira', 'unknown.endpoint', 'cloud');
      expect(config).toBeNull();
    });
  });

  describe('buildApiUrl', () => {
    test('should build Cloud Jira URL correctly', () => {
      const url = buildApiUrl(
        'https://company.atlassian.net',
        'jira',
        'users.search',
        'cloud'
      );
      
      expect(url).toBe('https://company.atlassian.net/rest/api/3/user/search');
    });

    test('should build Server Jira URL correctly', () => {
      const url = buildApiUrl(
        'https://jira.company.com',
        'jira',
        'users.search',
        'server'
      );
      
      expect(url).toBe('https://jira.company.com/rest/api/2/user/search');
    });

    test('should build URL with path parameters', () => {
      const url = buildApiUrl(
        'https://company.atlassian.net',
        'jira',
        'issues.get',
        'cloud',
        { issueIdOrKey: 'PROJ-123' }
      );
      
      expect(url).toBe('https://company.atlassian.net/rest/api/3/issue/PROJ-123');
    });

    test('should handle baseUrl with trailing slash', () => {
      const url = buildApiUrl(
        'https://company.atlassian.net/',
        'jira',
        'users.search',
        'cloud'
      );
      
      expect(url).toBe('https://company.atlassian.net/rest/api/3/user/search');
    });

    test('should URL encode path parameters', () => {
      const url = buildApiUrl(
        'https://company.atlassian.net',
        'jira',
        'issues.get',
        'cloud',
        { issueIdOrKey: 'PROJ-123 with spaces' }
      );
      
      expect(url).toBe('https://company.atlassian.net/rest/api/3/issue/PROJ-123%20with%20spaces');
    });

    test('should return null for unavailable endpoint', () => {
      const url = buildApiUrl(
        'https://company.atlassian.net',
        'jira',
        'unknown.endpoint',
        'cloud'
      );
      
      expect(url).toBeNull();
    });
  });

  describe('isFeatureAvailable', () => {
    test('should return true for available features', () => {
      expect(isFeatureAvailable('jira', 'users.search', 'cloud')).toBe(true);
      expect(isFeatureAvailable('jira', 'users.search', 'server')).toBe(true);
      expect(isFeatureAvailable('confluence', 'spaces.all', 'cloud')).toBe(true);
    });

    test('should return false for unknown features', () => {
      expect(isFeatureAvailable('jira', 'unknown.endpoint', 'cloud')).toBe(false);
    });
  });

  describe('getAlternativeEndpoint', () => {
    test('should return null when no alternative specified', () => {
      const alternative = getAlternativeEndpoint('jira', 'users.search', 'cloud');
      expect(alternative).toBeNull();
    });
  });

  describe('mapQueryParameters', () => {
    test('should map Jira user search parameters for Server', () => {
      const params = { query: 'john' };
      const mapped = mapQueryParameters('jira', 'users.search', 'server', params);
      
      expect(mapped).toEqual({ username: 'john' });
    });

    test('should not map parameters for Cloud', () => {
      const params = { query: 'john' };
      const mapped = mapQueryParameters('jira', 'users.search', 'cloud', params);
      
      expect(mapped).toEqual({ query: 'john' });
    });

    test('should preserve other parameters', () => {
      const params = { query: 'john', maxResults: 50 };
      const mapped = mapQueryParameters('jira', 'users.search', 'server', params);
      
      expect(mapped).toEqual({ username: 'john', maxResults: 50 });
    });

    test('should not override existing mapped parameter', () => {
      const params = { query: 'john', username: 'existing' };
      const mapped = mapQueryParameters('jira', 'users.search', 'server', params);
      
      expect(mapped).toEqual({ query: 'john', username: 'existing' });
    });
  });

  describe('getApiVersion', () => {
    test('should return correct API versions', () => {
      expect(getApiVersion('jira', 'cloud')).toBe('3');
      expect(getApiVersion('jira', 'server')).toBe('2');
      expect(getApiVersion('confluence', 'cloud')).toBe('2');
      expect(getApiVersion('confluence', 'server')).toBe('1');
    });

    test('should return default version for unknown service', () => {
      expect(getApiVersion('unknown' as any, 'cloud')).toBe('2');
    });
  });

  describe('isApiVersionSupported', () => {
    test('should support exact version matches', () => {
      expect(isApiVersionSupported('jira', '3', 'cloud')).toBe(true);
      expect(isApiVersionSupported('jira', '2', 'server')).toBe(true);
      expect(isApiVersionSupported('confluence', '2', 'cloud')).toBe(true);
      expect(isApiVersionSupported('confluence', '1', 'server')).toBe(true);
    });

    test('should support v2 on Server regardless of service', () => {
      expect(isApiVersionSupported('jira', '2', 'server')).toBe(true);
      expect(isApiVersionSupported('confluence', '2', 'server')).toBe(true);
    });

    test('should support v3 for Jira on Cloud', () => {
      expect(isApiVersionSupported('jira', '3', 'cloud')).toBe(true);
    });

    test('should not support unsupported versions', () => {
      expect(isApiVersionSupported('jira', '1', 'cloud')).toBe(false);
      expect(isApiVersionSupported('confluence', '3', 'server')).toBe(false);
    });
  });

  describe('Endpoint Mappings', () => {
    test('should have consistent structure for Jira endpoints', () => {
      Object.entries(JIRA_ENDPOINTS).forEach(([endpointName, configs]) => {
        expect(configs.cloud).toBeDefined();
        expect(configs.server).toBeDefined();
        
        // Each config should have required fields
        expect(configs.cloud.path).toBeDefined();
        expect(configs.cloud.method).toBeDefined();
        expect(configs.cloud.isAvailable).toBeDefined();
        
        expect(configs.server.path).toBeDefined();
        expect(configs.server.method).toBeDefined();
        expect(configs.server.isAvailable).toBeDefined();
      });
    });

    test('should have consistent structure for Confluence endpoints', () => {
      Object.entries(CONFLUENCE_ENDPOINTS).forEach(([endpointName, configs]) => {
        expect(configs.cloud).toBeDefined();
        expect(configs.server).toBeDefined();
        
        expect(configs.cloud.path).toBeDefined();
        expect(configs.cloud.method).toBeDefined();
        expect(configs.cloud.isAvailable).toBeDefined();
        
        expect(configs.server.path).toBeDefined();
        expect(configs.server.method).toBeDefined();
        expect(configs.server.isAvailable).toBeDefined();
      });
    });

    test('should use correct API versions in paths', () => {
      // Cloud Jira should use v3
      expect(JIRA_ENDPOINTS['users.search'].cloud.path).toContain('/rest/api/3/');
      expect(JIRA_ENDPOINTS['issues.create'].cloud.path).toContain('/rest/api/3/');
      
      // Server Jira should use v2
      expect(JIRA_ENDPOINTS['users.search'].server.path).toContain('/rest/api/2/');
      expect(JIRA_ENDPOINTS['issues.create'].server.path).toContain('/rest/api/2/');
      
      // Cloud Confluence should use v2
      expect(CONFLUENCE_ENDPOINTS['spaces.all'].cloud.path).toContain('/api/v2/');
      
      // Server Confluence should use v1
      expect(CONFLUENCE_ENDPOINTS['spaces.all'].server.path).toContain('/rest/api/');
    });
  });
}); 