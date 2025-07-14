import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Config, Resources } from '../../utils/mcp-helpers.js';
import { AtlassianConfig } from '../../utils/atlassian-api-base.js';
import { ApiError, ApiErrorType } from '../../utils/error-handler.js';
import { Logger } from '../../utils/logger.js';
import fetch from 'cross-fetch';
import { projectsListSchema, projectSchema } from '../../schemas/jira.js';
import { getProjects as getProjectsApi, getProject as getProjectApi } from '../../utils/jira-resource-api.js';
import { getDeploymentType } from '../../utils/deployment-detector.js';
import { normalizeUserData } from '../../utils/user-id-helper.js';

const logger = Logger.getLogger('JiraResource:Projects');

/**
 * Get Jira configuration from context or environment
 */
function getJiraConfig(extra?: any): Config.EnhancedAtlassianConfig {
  if (extra?.context?.jiraConfig) {
    return extra.context.jiraConfig;
  }
  
  // Try separate config first
  const jiraConfig = Config.getJiraConfigFromEnv();
  if (jiraConfig) {
    return jiraConfig;
  }
  
  // Fallback to legacy config
  const legacyConfig = Config.getAtlassianConfigFromEnv();
  logger.warn('Using legacy configuration for Jira. Consider setting JIRA_URL and JIRA_PAT_TOKEN for better security.');
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
  
  if (endpoint === 'projectRoles') {
    return deploymentType === 'cloud'
      ? '/rest/api/3/project/{projectKey}/role'
      : '/rest/api/2/project/{projectKey}/role';
  }
  
  return endpoint;
}

/**
 * Format project data to include deployment type and normalize user data
 */
function formatProjectData(project: any, baseUrl: string): any {
  const deploymentType = getDeploymentType(baseUrl);
  
  // Normalize lead user data
  const lead = project.lead ? normalizeUserData(project.lead, deploymentType) : null;
  
  return {
    id: project.id,
    key: project.key,
    name: project.name,
    description: project.description || 'No description',
    lead: lead ? {
      id: lead.id,
      displayName: lead.displayName,
      accountId: lead.original.accountId || lead.id, // Backward compatibility
      emailAddress: lead.emailAddress
    } : { displayName: 'Unknown', id: null },
    url: `${baseUrl}/browse/${project.key}`,
    projectCategory: project.projectCategory?.name || 'Uncategorized',
    projectType: project.projectTypeKey,
    deploymentType: deploymentType
  };
}

/**
 * Create basic headers for Atlassian API with Basic Authentication
 * @deprecated Use getAuthHeaders instead
 */
function createBasicHeaders(email: string, apiToken: string) {
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'MCP-Atlassian-Server/1.0.0'
  };
}

/**
 * Helper function to get the list of projects
 */
async function getProjects(config: AtlassianConfig): Promise<any[]> {
  return await getProjectsApi(config);
}

/**
 * Helper function to get project details
 */
async function getProject(config: AtlassianConfig, projectKey: string): Promise<any> {
  return await getProjectApi(config, projectKey);
}

/**
 * Register resources related to Jira projects
 * @param server MCP Server instance
 */
export function registerProjectResources(server: McpServer) {
  // Resource: List all projects
  server.resource(
    'jira-projects-list',
    new ResourceTemplate('jira://projects', {
      list: async (_extra) => {
        return {
          resources: [
            {
              uri: 'jira://projects',
              name: 'Jira Projects',
              description: 'List and search all Jira projects',
              mimeType: 'application/json'
            }
          ]
        };
      }
    }),
    async (uri, _params, extra) => {
      logger.info('Getting list of Jira projects');
      try {
        // Get config from context or environment
        const config = getJiraConfig(extra);
        
        // Get the list of projects from Jira API
        const projects = await getProjects(config);
        // Convert response to a more friendly format with normalized user data
        const formattedProjects = projects.map((project: any) => {
          const formatted = formatProjectData(project, config.baseUrl);
          return {
            id: formatted.id,
            key: formatted.key,
            name: formatted.name,
            projectType: formatted.projectType,
            url: formatted.url,
            lead: formatted.lead.displayName,
            deploymentType: formatted.deploymentType
          };
        });
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        // Return standardized resource with metadata and schema
        return Resources.createStandardResource(
          uriString,
          formattedProjects,
          'projects',
          projectsListSchema,
          formattedProjects.length,
          formattedProjects.length,
          0,
          `${config.baseUrl}/jira/projects`
        );
      } catch (error) {
        logger.error('Error getting Jira projects:', error);
        throw error;
      }
    }
  );
  
  // Resource: Project details
  server.resource(
    'jira-project-details',
    new ResourceTemplate('jira://projects/{projectKey}', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://projects/{projectKey}',
            name: 'Jira Project Details',
            description: 'Get details for a specific Jira project by key. Replace {projectKey} with the project key.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri, params, extra) => {
      try {
        // Get config from context or environment
        const config = getJiraConfig(extra);
        
        // Get projectKey from URI pattern
        let normalizedProjectKey = '';
        if (params && 'projectKey' in params) {
          normalizedProjectKey = Array.isArray(params.projectKey) ? params.projectKey[0] : params.projectKey;
        }
        
        if (!normalizedProjectKey) {
          throw new ApiError(
            ApiErrorType.VALIDATION_ERROR,
            'Project key not provided',
            400,
            new Error('Missing project key parameter')
          );
        }
        logger.info(`Getting details for Jira project: ${normalizedProjectKey}`);
        
        // Get project info from Jira API
        const project = await getProject(config, normalizedProjectKey);
        // Convert response to a more friendly format
        const formattedProject = formatProjectData(project, config.baseUrl);
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        // Chuẩn hóa metadata/schema
        return Resources.createStandardResource(
          uriString,
          [formattedProject],
          'project',
          projectSchema,
          1,
          1,
          0,
          `${config.baseUrl}/browse/${project.key}`
        );
      } catch (error) {
        logger.error(`Error getting Jira project details:`, error);
        throw error;
      }
    }
  );

  // Resource: List roles of a project
  server.resource(
    'jira-project-roles',
    new ResourceTemplate('jira://projects/{projectKey}/roles', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://projects/{projectKey}/roles',
            name: 'Jira Project Roles',
            description: 'List roles for a Jira project. Replace {projectKey} with the project key.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri, params, extra) => {
      try {
        // Get config from context or environment
        const config = getJiraConfig(extra);
        
        let normalizedProjectKey = '';
        if (params && 'projectKey' in params) {
          normalizedProjectKey = Array.isArray(params.projectKey) ? params.projectKey[0] : params.projectKey;
        }
        
        if (!normalizedProjectKey) {
          throw new Error('Missing projectKey');
        }
        logger.info(`Getting roles for Jira project: ${normalizedProjectKey}`);
        
                 const headers = getAuthHeaders(config);
         let baseUrl = config.baseUrl;
         if (!baseUrl.startsWith('https://')) baseUrl = `https://${baseUrl}`;
         const endpoint = getApiEndpoint(baseUrl, 'projectRoles');
         const url = `${baseUrl}${endpoint.replace('{projectKey}', encodeURIComponent(normalizedProjectKey))}`;
        logger.debug(`Calling Jira API: ${url}`);
                 const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
        if (!response.ok) {
          const statusCode = response.status;
          const responseText = await response.text();
          logger.error(`Jira API error (${statusCode}):`, responseText);
          throw new Error(`Jira API error: ${responseText}`);
        }
        const data = await response.json();
        // data is an object: key is roleName, value is URL containing roleId
        const roles = Object.entries(data).map(([roleName, url]) => {
          const urlStr = String(url);
          const match = urlStr.match(/\/role\/(\d+)$/);
          return {
            roleName,
            roleId: match ? match[1] : '',
            url: urlStr
          };
        });
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        // Chuẩn hóa metadata/schema (dùng array of role object, schema tự tạo inline)
        const rolesListSchema = {
          type: "array",
          items: {
            type: "object",
            properties: {
              roleName: { type: "string" },
              roleId: { type: "string" },
              url: { type: "string" }
            },
            required: ["roleName", "roleId", "url"]
          }
        };
        return Resources.createStandardResource(
          uriString,
          roles,
          'roles',
          rolesListSchema,
          roles.length,
          roles.length,
          0,
          `${config.baseUrl}/browse/${normalizedProjectKey}/project-roles`
        );
      } catch (error) {
        logger.error(`Error getting roles for Jira project:`, error);
        throw error;
      }
    }
  );
  
  logger.info('Jira project resources registered successfully');
}
