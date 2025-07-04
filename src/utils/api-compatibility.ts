/**
 * API compatibility utility for handling differences between Cloud and Server/Data Center
 * 
 * Handles:
 * - Endpoint URL mapping
 * - API version differences
 * - Feature availability
 * - Parameter mapping
 */

import { Logger } from './logger.js';

const logger = Logger.getLogger('ApiCompatibility');

/**
 * API version information
 */
export interface ApiVersionInfo {
  jira: string;
  confluence: string;
  agile?: string;
}

/**
 * Endpoint configuration
 */
export interface EndpointConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  version?: string;
  isAvailable: boolean;
  alternative?: string;
  notes?: string;
}

/**
 * API version mapping for different deployment types
 */
export const API_VERSIONS: Record<'cloud' | 'server', ApiVersionInfo> = {
  cloud: {
    jira: '3',      // Cloud typically uses v3
    confluence: '2', // Cloud uses v2 (newer API)
    agile: '1.0'    // Agile API version
  },
  server: {
    jira: '2',      // Server/DC often uses v2 (but may support v3)
    confluence: '1', // Server/DC may use v1 (legacy) or v2
    agile: '1.0'    // Agile API generally consistent
  }
};

/**
 * Jira endpoint compatibility mapping
 */
export const JIRA_ENDPOINTS: Record<string, Record<'cloud' | 'server', EndpointConfig>> = {
  // User endpoints
  'users.search': {
    cloud: {
      path: '/rest/api/3/user/search',
      method: 'GET',
      isAvailable: true
    },
    server: {
      path: '/rest/api/2/user/search',
      method: 'GET',
      isAvailable: true,
      notes: 'Uses v2 API on most Server/DC versions'
    }
  },
  
  'users.myself': {
    cloud: {
      path: '/rest/api/3/myself',
      method: 'GET',
      isAvailable: true
    },
    server: {
      path: '/rest/api/2/myself',
      method: 'GET',
      isAvailable: true
    }
  },

  // Issue endpoints
  'issues.search': {
    cloud: {
      path: '/rest/api/3/search',
      method: 'GET',
      isAvailable: true
    },
    server: {
      path: '/rest/api/2/search',
      method: 'GET',
      isAvailable: true
    }
  },

  'issues.create': {
    cloud: {
      path: '/rest/api/3/issue',
      method: 'POST',
      isAvailable: true
    },
    server: {
      path: '/rest/api/2/issue',
      method: 'POST',
      isAvailable: true
    }
  },

  'issues.get': {
    cloud: {
      path: '/rest/api/3/issue/{issueIdOrKey}',
      method: 'GET',
      isAvailable: true
    },
    server: {
      path: '/rest/api/2/issue/{issueIdOrKey}',
      method: 'GET',
      isAvailable: true
    }
  },

  'issues.update': {
    cloud: {
      path: '/rest/api/3/issue/{issueIdOrKey}',
      method: 'PUT',
      isAvailable: true
    },
    server: {
      path: '/rest/api/2/issue/{issueIdOrKey}',
      method: 'PUT',
      isAvailable: true
    }
  },

  'issues.assign': {
    cloud: {
      path: '/rest/api/3/issue/{issueIdOrKey}/assignee',
      method: 'PUT',
      isAvailable: true
    },
    server: {
      path: '/rest/api/2/issue/{issueIdOrKey}/assignee',
      method: 'PUT',
      isAvailable: true
    }
  },

  'issues.transitions': {
    cloud: {
      path: '/rest/api/3/issue/{issueIdOrKey}/transitions',
      method: 'POST',
      isAvailable: true
    },
    server: {
      path: '/rest/api/2/issue/{issueIdOrKey}/transitions',
      method: 'POST',
      isAvailable: true
    }
  },

  // Project endpoints
  'projects.all': {
    cloud: {
      path: '/rest/api/3/project',
      method: 'GET',
      isAvailable: true
    },
    server: {
      path: '/rest/api/2/project',
      method: 'GET',
      isAvailable: true
    }
  },

  'projects.get': {
    cloud: {
      path: '/rest/api/3/project/{projectIdOrKey}',
      method: 'GET',
      isAvailable: true
    },
    server: {
      path: '/rest/api/2/project/{projectIdOrKey}',
      method: 'GET',
      isAvailable: true
    }
  },

  // Agile endpoints (generally consistent)
  'agile.boards': {
    cloud: {
      path: '/rest/agile/1.0/board',
      method: 'GET',
      isAvailable: true
    },
    server: {
      path: '/rest/agile/1.0/board',
      method: 'GET',
      isAvailable: true,
      notes: 'Requires Jira Software license'
    }
  },

  'agile.sprints': {
    cloud: {
      path: '/rest/agile/1.0/board/{boardId}/sprint',
      method: 'GET',
      isAvailable: true
    },
    server: {
      path: '/rest/agile/1.0/board/{boardId}/sprint',
      method: 'GET',
      isAvailable: true,
      notes: 'Requires Jira Software license'
    }
  }
};

/**
 * Confluence endpoint compatibility mapping
 */
export const CONFLUENCE_ENDPOINTS: Record<string, Record<'cloud' | 'server', EndpointConfig>> = {
  // Space endpoints
  'spaces.all': {
    cloud: {
      path: '/api/v2/spaces',
      method: 'GET',
      isAvailable: true
    },
    server: {
      path: '/rest/api/space',
      method: 'GET',
      isAvailable: true,
      version: '1',
      notes: 'Server/DC may use v1 API'
    }
  },

  'spaces.get': {
    cloud: {
      path: '/api/v2/spaces/{spaceId}',
      method: 'GET',
      isAvailable: true
    },
    server: {
      path: '/rest/api/space/{spaceKey}',
      method: 'GET',
      isAvailable: true,
      version: '1',
      notes: 'Uses spaceKey instead of spaceId'
    }
  },

  // Page endpoints
  'pages.all': {
    cloud: {
      path: '/api/v2/pages',
      method: 'GET',
      isAvailable: true
    },
    server: {
      path: '/rest/api/content',
      method: 'GET',
      isAvailable: true,
      version: '1',
      notes: 'Uses content endpoint with type=page filter'
    }
  },

  'pages.get': {
    cloud: {
      path: '/api/v2/pages/{pageId}',
      method: 'GET',
      isAvailable: true
    },
    server: {
      path: '/rest/api/content/{pageId}',
      method: 'GET',
      isAvailable: true,
      version: '1'
    }
  },

  'pages.create': {
    cloud: {
      path: '/api/v2/pages',
      method: 'POST',
      isAvailable: true
    },
    server: {
      path: '/rest/api/content',
      method: 'POST',
      isAvailable: true,
      version: '1'
    }
  },

  'pages.update': {
    cloud: {
      path: '/api/v2/pages/{pageId}',
      method: 'PUT',
      isAvailable: true
    },
    server: {
      path: '/rest/api/content/{pageId}',
      method: 'PUT',
      isAvailable: true,
      version: '1'
    }
  }
};

/**
 * Get endpoint configuration for a specific endpoint and deployment type
 */
export function getEndpointConfig(
  service: 'jira' | 'confluence',
  endpointName: string,
  deploymentType: 'cloud' | 'server'
): EndpointConfig | null {
  const endpoints = service === 'jira' ? JIRA_ENDPOINTS : CONFLUENCE_ENDPOINTS;
  const endpoint = endpoints[endpointName];
  
  if (!endpoint) {
    logger.warn(`Unknown endpoint: ${service}.${endpointName}`);
    return null;
  }

  const config = endpoint[deploymentType];
  if (!config) {
    logger.warn(`No configuration for ${endpointName} on ${deploymentType}`);
    return null;
  }

  return config;
}

/**
 * Build full API URL for an endpoint
 */
export function buildApiUrl(
  baseUrl: string,
  service: 'jira' | 'confluence',
  endpointName: string,
  deploymentType: 'cloud' | 'server',
  pathParams?: Record<string, string>
): string | null {
  const config = getEndpointConfig(service, endpointName, deploymentType);
  if (!config || !config.isAvailable) {
    logger.error(`Endpoint ${endpointName} not available for ${deploymentType}`);
    return null;
  }

  let path = config.path;
  
  // Replace path parameters
  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      path = path.replace(`{${key}}`, encodeURIComponent(value));
    }
  }

  // Ensure baseUrl doesn't end with slash
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  
  return `${cleanBaseUrl}${path}`;
}

/**
 * Check if a feature is available on a deployment type
 */
export function isFeatureAvailable(
  service: 'jira' | 'confluence',
  endpointName: string,
  deploymentType: 'cloud' | 'server'
): boolean {
  const config = getEndpointConfig(service, endpointName, deploymentType);
  return config?.isAvailable || false;
}

/**
 * Get alternative endpoint if the primary one is not available
 */
export function getAlternativeEndpoint(
  service: 'jira' | 'confluence',
  endpointName: string,
  deploymentType: 'cloud' | 'server'
): string | null {
  const config = getEndpointConfig(service, endpointName, deploymentType);
  return config?.alternative || null;
}

/**
 * Map query parameters based on deployment type
 * Some parameters have different names between Cloud and Server/DC
 */
export function mapQueryParameters(
  service: 'jira' | 'confluence',
  endpointName: string,
  deploymentType: 'cloud' | 'server',
  params: Record<string, any>
): Record<string, any> {
  const mappedParams = { ...params };

  // Jira-specific parameter mapping
  if (service === 'jira') {
    if (endpointName === 'users.search') {
      if (deploymentType === 'server') {
        // Server/DC uses 'username' instead of 'query' in some cases
        if (mappedParams.query && !mappedParams.username) {
          mappedParams.username = mappedParams.query;
          delete mappedParams.query;
        }
      }
    }
  }

  // Confluence-specific parameter mapping
  if (service === 'confluence') {
    if (endpointName.startsWith('spaces.')) {
      if (deploymentType === 'server') {
        // Server/DC uses different parameter names for space operations
        if (mappedParams.spaceId && !mappedParams.spaceKey) {
          // Note: This would require additional lookup to convert ID to key
          logger.warn('Space ID to key conversion needed for Server/DC');
        }
      }
    }
  }

  return mappedParams;
}

/**
 * Get API version for a specific service and deployment type
 */
export function getApiVersion(
  service: keyof ApiVersionInfo,
  deploymentType: 'cloud' | 'server'
): string {
  return API_VERSIONS[deploymentType][service] || '2';
}

/**
 * Check if API version is supported
 */
export function isApiVersionSupported(
  service: 'jira' | 'confluence',
  version: string,
  deploymentType: 'cloud' | 'server'
): boolean {
  const supportedVersion = getApiVersion(service, deploymentType);
  
  // Simple version comparison (can be enhanced)
  return version === supportedVersion || 
         (deploymentType === 'server' && version === '2') || // Server usually supports v2
         (deploymentType === 'cloud' && service === 'jira' && version === '3'); // Cloud Jira supports v3
} 