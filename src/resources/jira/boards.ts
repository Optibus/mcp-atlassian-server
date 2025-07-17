/**
 * Jira Board Resources
 * 
 * These resources provide access to Jira boards through MCP.
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { boardListSchema, boardSchema, issuesListSchema } from '../../schemas/jira.js';
import { getBoards, getBoardById, getBoardIssues } from '../../utils/jira-resource-api.js';
import { Logger } from '../../utils/logger.js';
import { Config, Resources } from '../../utils/mcp-helpers.js';
import { getDeploymentType } from '../../utils/deployment-detector.js';

const logger = Logger.getLogger('JiraResources:boards');

/**
 * Get authentication headers based on deployment type
 */
function getAuthHeaders(config: any): Record<string, string> {
  const deploymentType = getDeploymentType(config.baseUrl);
  
  // Check if we have a PAT token for Server/DC
  const patToken = config.patToken;
  if (deploymentType === 'server' && patToken) {
    return {
      'Authorization': `Bearer ${patToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'MCP-Atlassian-Server/1.0.0'
    };
  } else {
    // Use Basic Auth
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
 * Format board data to include deployment type
 */
function formatBoardData(board: any, baseUrl: string): any {
  const deploymentType = getDeploymentType(baseUrl);
  
  return {
    ...board,
    deploymentType: deploymentType
  };
}

/**
 * Format board list data to include deployment type
 */
function formatBoardListData(boards: any[], baseUrl: string): any[] {
  const deploymentType = getDeploymentType(baseUrl);
  
  return boards.map(board => ({
    ...board,
    deploymentType: deploymentType
  }));
}

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
  logger.warn('Using legacy configuration for Jira boards. Consider setting JIRA_URL and JIRA_PAT_TOKEN for better security.');
  return legacyConfig;
}

/**
 * Register all Jira board resources with MCP Server
 * @param server MCP Server instance
 */
export function registerBoardResources(server: McpServer) {
  logger.info('Registering Jira board resources...');
  
  // Resource: Board list
  server.resource(
    'jira-boards',
    new ResourceTemplate('jira://boards', {
      list: async (_extra) => {
        return {
          resources: [
            {
              uri: 'jira://boards',
              name: 'Jira Boards',
              description: 'List and search all Jira boards',
              mimeType: 'application/json'
            }
          ]
        };
      }
    }),
    async (uri, params, _extra) => {
      try {
        const config = getJiraConfig();
        const { limit, offset } = Resources.extractPagingParams(params);
        const response = await getBoards(config, offset, limit);
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        return Resources.createStandardResource(
          uriString,
          formatBoardListData(response.values, config.baseUrl),
          'boards',
          boardListSchema,
          response.total || response.values.length,
          limit,
          offset,
          `${config.baseUrl}/jira/boards`
        );
      } catch (error) {
        logger.error('Error getting board list:', error);
        throw error;
      }
    }
  );

  // Resource: Board details
  server.resource(
    'jira-board-details',
    new ResourceTemplate('jira://boards/{boardId}', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://boards/{boardId}',
            name: 'Jira Board Details',
            description: 'Get details for a specific Jira board by ID. Replace {boardId} with the board ID.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri, params, _extra) => {
      try {
        const config = getJiraConfig();
        const boardId = Array.isArray(params.boardId) ? params.boardId[0] : params.boardId;
        const board = await getBoardById(config, boardId);
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        return Resources.createStandardResource(
          uriString,
          [formatBoardData(board, config.baseUrl)],
          'board',
          boardSchema,
          1,
          1,
          0,
          `${config.baseUrl}/jira/software/projects/${board.location?.projectKey || 'browse'}/boards/${boardId}`
        );
      } catch (error) {
        logger.error(`Error getting board details for board ${params.boardId}:`, error);
        throw error;
      }
    }
  );

  // Resource: Issues in board
  server.resource(
    'jira-board-issues',
    new ResourceTemplate('jira://boards/{boardId}/issues', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://boards/{boardId}/issues',
            name: 'Jira Board Issues',
            description: 'List issues in a Jira board. Replace {boardId} with the board ID.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri, params, _extra) => {
      try {
        const config = getJiraConfig();
        const boardId = Array.isArray(params.boardId) ? params.boardId[0] : params.boardId;
        const { limit, offset } = Resources.extractPagingParams(params);
        const response = await getBoardIssues(config, boardId, offset, limit);
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        return Resources.createStandardResource(
          uriString,
          response.issues,
          'issues',
          issuesListSchema,
          response.total || response.issues.length,
          limit,
          offset,
          `${config.baseUrl}/jira/software/projects/browse/boards/${boardId}`
        );
      } catch (error) {
        logger.error(`Error getting issues for board ${params.boardId}:`, error);
        throw error;
      }
    }
  );

  // Resource: Board configuration
  server.resource(
    'jira-board-configuration',
    new ResourceTemplate('jira://boards/{boardId}/configuration', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://boards/{boardId}/configuration',
            name: 'Jira Board Configuration',
            description: 'Get configuration of a specific Jira board. Replace {boardId} with the board ID.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri, params, _extra) => {
      try {
        const config = getJiraConfig();
        const boardId = Array.isArray(params.boardId) ? params.boardId[0] : params.boardId;
        // Gọi API lấy cấu hình board
        const headers = getAuthHeaders(config);
        const response = await fetch(`${config.baseUrl}/rest/agile/1.0/board/${boardId}/configuration`, {
          method: 'GET',
          headers,
        });
        if (!response.ok) throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
        const configData = await response.json();
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        // Inline schema (mô tả cơ bản, không validate sâu)
        const boardConfigurationSchema = {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            type: { type: 'string' },
            self: { type: 'string' },
            location: { type: 'object' },
            filter: { type: 'object' },
            subQuery: { type: 'object' },
            columnConfig: { type: 'object' },
            estimation: { type: 'object' },
            ranking: { type: 'object' }
          },
          required: ['id', 'name', 'type', 'self', 'columnConfig']
        };
        return {
          contents: [{
            uri: uriString,
            mimeType: 'application/json',
            text: JSON.stringify(configData),
            schema: boardConfigurationSchema
          }]
        };
      } catch (error) {
        logger.error(`Error getting board configuration for board ${params.boardId}:`, error);
        throw error;
      }
    }
  );
  
  logger.info('Jira board resources registered successfully');
}