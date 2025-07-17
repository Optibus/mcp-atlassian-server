import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../utils/logger.js';
import { AtlassianConfig } from '../../utils/atlassian-api-base.js';
import fetch from 'cross-fetch';
import { usersListSchema, userSchema } from '../../schemas/jira.js';
import { Config, Resources } from '../../utils/mcp-helpers.js';
import { getDeploymentType } from '../../utils/deployment-detector.js';
import { normalizeUserData } from '../../utils/user-id-helper.js';

const logger = Logger.getLogger('JiraResource:Users');

/**
 * Get the appropriate Jira configuration (separate or legacy)
 */
function getJiraConfig(): Config.EnhancedAtlassianConfig {
  // Try to get separate Jira config first
  const jiraConfig = Config.getJiraConfigFromEnv();
  if (jiraConfig) {
    return jiraConfig;
  }
  
  // Fallback to legacy config
  const legacyConfig = Config.getAtlassianConfigFromEnv();
  logger.warn('Using legacy configuration for Jira users. Consider setting JIRA_URL and JIRA_PAT_TOKEN for better security.');
  return legacyConfig;
}

/**
 * Get authentication headers based on deployment type
 */
function getAuthHeaders(config: AtlassianConfig): Record<string, string> {
  const deploymentType = getDeploymentType(config.baseUrl);
  
  // Check if we have a PAT token for Server/DC
  const patToken = (config as any).patToken;
  if (deploymentType === 'server' && patToken) {
    // Use PAT token for Server/DC if available
    return {
      'Authorization': `Bearer ${patToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'MCP-Atlassian-Server/1.0.0'
    };
  } else {
    // Use Basic Auth (works for both Cloud and Server/DC)
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'MCP-Atlassian-Server/1.0.0'
    };
  }
}

/**
 * Get appropriate API endpoint based on deployment type
 */
function getApiEndpoint(baseUrl: string, endpoint: string): string {
  const deploymentType = getDeploymentType(baseUrl);
  
  // For user search, both Cloud and Server/DC use similar endpoints
  // but with different API versions
  if (endpoint === 'userSearch') {
    return deploymentType === 'cloud' 
      ? '/rest/api/3/user/search'  // Cloud uses v3
      : '/rest/api/2/user/search'; // Server/DC uses v2
  }
  
  if (endpoint === 'user') {
    return deploymentType === 'cloud'
      ? '/rest/api/3/user'  // Cloud uses v3
      : '/rest/api/2/user'; // Server/DC uses v2
  }
  
  if (endpoint === 'userAssignable') {
    return deploymentType === 'cloud'
      ? '/rest/api/3/user/assignable/search'  // Cloud uses v3
      : '/rest/api/2/user/assignable/search'; // Server/DC uses v2
  }
  
  if (endpoint === 'projectRole') {
    return deploymentType === 'cloud'
      ? '/rest/api/3/project/{projectKeyOrId}/role/{roleId}'  // Cloud uses v3
      : '/rest/api/2/project/{projectKeyOrId}/role/{roleId}'; // Server/DC uses v2
  }
  
  return endpoint;
}

/**
 * Build user query parameters based on deployment type
 */
function buildUserQueryParams(userId: string | undefined, username: string | undefined, baseUrl: string): string {
  const deploymentType = getDeploymentType(baseUrl);
  
  if (userId && userId.trim()) {
    if (deploymentType === 'cloud') {
      // Cloud uses accountId
      return `accountId=${encodeURIComponent(userId.trim())}`;
    } else {
      // Server/DC uses username
      return `username=${encodeURIComponent(userId.trim())}`;
    }
  } else if (username && username.trim()) {
    return `username=${encodeURIComponent(username.trim())}`;
  }
  
  return '';
}

/**
 * Helper function to get the list of users from Jira (supports pagination)
 */
async function getUsers(config: AtlassianConfig, startAt = 0, maxResults = 20, accountId?: string, username?: string): Promise<any[]> {
  try {
    const headers = getAuthHeaders(config);
    
    let baseUrl = config.baseUrl;
    if (!baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // Get appropriate endpoint for deployment type
    const endpoint = getApiEndpoint(baseUrl, 'userSearch');
    
    // Build URL with query parameters
    let url = `${baseUrl}${endpoint}?startAt=${startAt}&maxResults=${maxResults}`;
    
    // Add user filtering parameters
    const userParams = buildUserQueryParams(accountId, username, baseUrl);
    if (userParams) {
      url += `&${userParams}`;
    }

    logger.debug(`Getting Jira users: ${url}`);
    const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
    
    if (!response.ok) {
      const statusCode = response.status;
      const responseText = await response.text();
      logger.error(`Jira API error (${statusCode}):`, responseText);
      throw new Error(`Jira API error: ${responseText}`);
    }
    
    const users = await response.json();
    return users;
  } catch (error) {
    logger.error(`Error getting Jira users:`, error);
    throw error;
  }
}

/**
 * Helper function to get user details from Jira
 */
async function getUser(config: AtlassianConfig, userId: string): Promise<any> {
  try {
    const headers = getAuthHeaders(config);
    const deploymentType = getDeploymentType(config.baseUrl);
    
    let baseUrl = config.baseUrl;
    if (!baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // Get appropriate endpoint for deployment type
    const endpoint = getApiEndpoint(baseUrl, 'user');
    
    // Build URL with proper user identification
    let url;
    if (deploymentType === 'cloud') {
      url = `${baseUrl}${endpoint}?accountId=${encodeURIComponent(userId)}`;
    } else {
      // For Server/DC, use username parameter
      url = `${baseUrl}${endpoint}?username=${encodeURIComponent(userId)}`;
    }

    logger.debug(`Getting Jira user: ${url}`);
    const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
    
    if (!response.ok) {
      const statusCode = response.status;
      const responseText = await response.text();
      logger.error(`Jira API error (${statusCode}):`, responseText);
      throw new Error(`Jira API error: ${responseText}`);
    }
    
    const user = await response.json();
    return user;
  } catch (error) {
    logger.error(`Error getting Jira user:`, error);
    throw error;
  }
}

/**
 * Register Jira user-related resources
 * @param server MCP Server instance
 */
export function registerUserResources(server: McpServer) {
  logger.info('Registering Jira user resources...');

  // Resource: Root users resource
  server.resource(
    'jira-users-root',
    new ResourceTemplate('jira://users', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://users',
            name: 'Jira Users',
            description: 'List and search all Jira users (use filters)',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri, _params, _extra) => {
      const uriString = typeof uri === 'string' ? uri : uri.href;
      return {
        contents: [{
          uri: uriString,
          mimeType: 'application/json',
          text: JSON.stringify({
            message: "Please use a more specific user resource. The Jira API requires parameters to search users.",
            suggestedResources: [
              "jira://users/{userId} - Get details for a specific user (accountId for Cloud, username for Server/DC)",
              "jira://users/assignable/{projectKey} - Get users who can be assigned in a project",
              "jira://users/role/{projectKey}/{roleId} - Get users with specific role in a project"
            ]
          })
        }]
      };
    }
  );

  // Resource: User details
  server.resource(
    'jira-user-details',
    new ResourceTemplate('jira://users/{userId}', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://users/{userId}',
            name: 'Jira User Details',
            description: 'Get details for a specific Jira user. Use accountId for Cloud, username for Server/DC. Replace {userId} with the user identifier.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri, params, _extra) => {
      let normalizedUserId = '';
      try {
        const config = getJiraConfig();
        const deploymentType = getDeploymentType(config.baseUrl);
        
        if (!params.userId) {
          throw new Error('Missing userId in URI');
        }
        normalizedUserId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
        logger.info(`Getting details for Jira user: ${normalizedUserId} (${deploymentType})`);
        
        const user = await getUser(config, normalizedUserId);
        
        // Normalize user data using deployment-aware helper
        const normalizedUser = normalizeUserData(user, deploymentType);
        if (!normalizedUser) {
          throw new Error('Failed to normalize user data');
        }
        
        // Format for output (keeping backward compatibility)
        const formattedUser = {
          id: normalizedUser.id,
          accountId: normalizedUser.original.accountId || normalizedUser.id, // Backward compatibility
          displayName: normalizedUser.displayName,
          emailAddress: normalizedUser.emailAddress,
          active: normalizedUser.active,
          avatarUrl: normalizedUser.avatarUrls?.['48x48'] || '',
          timeZone: normalizedUser.original.timeZone,
          locale: normalizedUser.original.locale,
          deploymentType: deploymentType
        };
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        // Chuẩn hóa metadata/schema cho resource chi tiết user
        return Resources.createStandardResource(
          uriString,
          [formattedUser],
          'user',
          userSchema,
          1,
          1,
          0,
          user.self || ''
        );
      } catch (error) {
        logger.error(`Error getting Jira user ${normalizedUserId}:`, error);
        throw error;
      }
    }
  );

  // Resource: List of assignable users for a project
  server.resource(
    'jira-users-assignable',
    new ResourceTemplate('jira://users/assignable/{projectKey}', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://users/assignable/{projectKey}',
            name: 'Jira Assignable Users',
            description: 'List assignable users for a Jira project. Replace {projectKey} with the project key.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri, params, _extra) => {
      try {
        const config = getJiraConfig();
        const deploymentType = getDeploymentType(config.baseUrl);
        const headers = getAuthHeaders(config);
        
        const projectKey = Array.isArray(params.projectKey) ? params.projectKey[0] : params.projectKey;
        if (!projectKey) throw new Error('Missing projectKey');
        
        let baseUrl = config.baseUrl;
        if (!baseUrl.startsWith('https://')) baseUrl = `https://${baseUrl}`;
        
        // Get appropriate endpoint for deployment type
        const endpoint = getApiEndpoint(baseUrl, 'userAssignable');
        const url = `${baseUrl}${endpoint}?project=${encodeURIComponent(projectKey)}`;
        
        logger.info(`Getting assignable users for project ${projectKey}: ${url}`);
        const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
        
        if (!response.ok) {
          const statusCode = response.status;
          const responseText = await response.text();
          logger.error(`Jira API error (${statusCode}):`, responseText);
          throw new Error(`Jira API error: ${responseText}`);
        }
        
        const users = await response.json();
        
        // Normalize user data for both Cloud and Server/DC
        const formattedUsers = (users || []).map((user: any) => {
          const normalizedUser = normalizeUserData(user, deploymentType);
          if (!normalizedUser) return null;
          
          return {
            id: normalizedUser.id,
            accountId: normalizedUser.original.accountId || normalizedUser.id, // Backward compatibility
            displayName: normalizedUser.displayName,
            emailAddress: normalizedUser.emailAddress,
            active: normalizedUser.active,
            avatarUrl: normalizedUser.avatarUrls?.['48x48'] || '',
            deploymentType: deploymentType
          };
        }).filter(Boolean);
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        // Chuẩn hóa metadata/schema
        return Resources.createStandardResource(
          uriString,
          formattedUsers,
          'users',
          usersListSchema,
          formattedUsers.length,
          formattedUsers.length,
          0,
          `${config.baseUrl}/jira/people`
        );
      } catch (error) {
        logger.error(`Error getting assignable users for project:`, error);
        throw error;
      }
    }
  );

  // Resource: List of users by role in a project
  server.resource(
    'jira-users-role',
    new ResourceTemplate('jira://users/role/{projectKey}/{roleId}', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://users/role/{projectKey}/{roleId}',
            name: 'Jira Users by Role',
            description: 'List users by role in a Jira project. Replace {projectKey} and {roleId} with the project key and role ID.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri, params, _extra) => {
      try {
        const config = getJiraConfig();
        const deploymentType = getDeploymentType(config.baseUrl);
        const headers = getAuthHeaders(config);
        
        const projectKey = Array.isArray(params.projectKey) ? params.projectKey[0] : params.projectKey;
        const roleId = Array.isArray(params.roleId) ? params.roleId[0] : params.roleId;
        if (!projectKey || !roleId) throw new Error('Missing projectKey or roleId');
        
        let baseUrl = config.baseUrl;
        if (!baseUrl.startsWith('https://')) baseUrl = `https://${baseUrl}`;
        
        // Get appropriate endpoint for deployment type
        const endpoint = getApiEndpoint(baseUrl, 'projectRole');
        const url = `${baseUrl}${endpoint.replace('{projectKeyOrId}', encodeURIComponent(projectKey)).replace('{roleId}', encodeURIComponent(roleId))}`;
        
        logger.info(`Getting users in role for project ${projectKey}, role ${roleId}: ${url}`);
        const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
        
        if (!response.ok) {
          const statusCode = response.status;
          const responseText = await response.text();
          logger.error(`Jira API error (${statusCode}):`, responseText);
          throw new Error(`Jira API error: ${responseText}`);
        }
        
        const roleData = await response.json();
        
        // Process actors and normalize user data
        const formattedUsers = (roleData.actors || [])
          .filter((actor: any) => actor.actorUser && (actor.actorUser.accountId || actor.actorUser.name))
          .map((actor: any) => {
            const normalizedUser = normalizeUserData(actor.actorUser, deploymentType);
            if (!normalizedUser) return null;
            
            return {
              id: normalizedUser.id,
              accountId: normalizedUser.original.accountId || normalizedUser.id, // Backward compatibility
              displayName: actor.displayName || normalizedUser.displayName,
              type: 'atlassian-user-role-actor',
              roleId: roleId,
              deploymentType: deploymentType
            };
          })
          .filter(Boolean);
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        return Resources.createStandardResource(
          uriString,
          formattedUsers,
          'users',
          usersListSchema,
          formattedUsers.length,
          formattedUsers.length,
          0,
          `${config.baseUrl}/jira/projects/${projectKey}/people`
        );
      } catch (error) {
        logger.error(`Error getting users by role:`, error);
        throw error;
      }
    }
  );

  logger.info('Jira user resources registered successfully');
}