/**
 * Jira Dashboard Resources
 * 
 * These resources provide access to Jira dashboards through MCP.
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { dashboardListSchema, dashboardSchema, gadgetListSchema } from '../../schemas/jira.js';
import { getDashboards, getMyDashboards, getDashboardById, getDashboardGadgets } from '../../utils/jira-resource-api.js';
import { Logger } from '../../utils/logger.js';
import { Config, Resources } from '../../utils/mcp-helpers.js';
import { getDeploymentType } from '../../utils/deployment-detector.js';

const logger = Logger.getLogger('JiraResources:dashboards');

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
  logger.warn('Using legacy configuration for Jira dashboards. Consider setting JIRA_URL and JIRA_PAT_TOKEN for better security.');
  return legacyConfig;
}

/**
 * Format dashboard data to include deployment type
 */
function formatDashboardData(dashboard: any, baseUrl: string): any {
  const deploymentType = getDeploymentType(baseUrl);
  
  return {
    ...dashboard,
    deploymentType: deploymentType
  };
}

/**
 * Format dashboard list data to include deployment type
 */
function formatDashboardListData(dashboards: any[], baseUrl: string): any[] {
  const deploymentType = getDeploymentType(baseUrl);
  
  return dashboards.map(dashboard => ({
    ...dashboard,
    deploymentType: deploymentType
  }));
}

// (Có thể bổ sung schema dashboardSchema, gadgetsSchema nếu cần)

export function registerDashboardResources(server: McpServer) {
  logger.info('Registering Jira dashboard resources...');

  // List all dashboards
  server.resource(
    'jira-dashboards',
    new ResourceTemplate('jira://dashboards', {
      list: async (_extra) => {
        return {
          resources: [
            {
              uri: 'jira://dashboards',
              name: 'Jira Dashboards',
              description: 'List and search all Jira dashboards',
              mimeType: 'application/json'
            }
          ]
        };
      }
    }),
    async (uri: string | URL, params: Record<string, any>, _extra: any) => {
      try {
        // Get config from context or environment
        const config = getJiraConfig();
        const uriStr = typeof uri === 'string' ? uri : uri.href;
        
        const { limit, offset } = Resources.extractPagingParams(params);
        const data = await getDashboards(config, offset, limit);
        const formattedData = formatDashboardListData(data.dashboards || [], config.baseUrl);
        return Resources.createStandardResource(
          uriStr,
          formattedData,
          'dashboards',
          dashboardListSchema,
          data.total || (data.dashboards ? data.dashboards.length : 0),
          limit,
          offset,
          `${config.baseUrl}/jira/dashboards` // UI URL
        );
      } catch (error) {
        logger.error(`Error handling resource request for jira-dashboards:`, error);
        throw error;
      }
    }
  );

  // List my dashboards
  server.resource(
    'jira-my-dashboards',
    new ResourceTemplate('jira://dashboards/my', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://dashboards/my',
            name: 'Jira My Dashboards',
            description: 'List dashboards owned by or shared with the current user.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri: string | URL, params: Record<string, any>, _extra: any) => {
      try {
        // Get config from context or environment
        const config = getJiraConfig();
        const uriStr = typeof uri === 'string' ? uri : uri.href;
        
        const { limit, offset } = Resources.extractPagingParams(params);
        const data = await getMyDashboards(config, offset, limit);
        const formattedData = formatDashboardListData(data.dashboards || [], config.baseUrl);
        return Resources.createStandardResource(
          uriStr,
          formattedData,
          'dashboards',
          dashboardListSchema,
          data.total || (data.dashboards ? data.dashboards.length : 0),
          limit,
          offset,
          `${config.baseUrl}/jira/dashboards?filter=my`
        );
      } catch (error) {
        logger.error(`Error handling resource request for jira-my-dashboards:`, error);
        throw error;
      }
    }
  );

  // Dashboard details
  server.resource(
    'jira-dashboard-details',
    new ResourceTemplate('jira://dashboards/{dashboardId}', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://dashboards/{dashboardId}',
            name: 'Jira Dashboard Details',
            description: 'Get details of a specific Jira dashboard.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri: string | URL, params: Record<string, any>, _extra: any) => {
      try {
        // Get config from context or environment
        const config = getJiraConfig();
        const uriStr = typeof uri === 'string' ? uri : uri.href;
        
        const dashboardId = params.dashboardId || (uriStr.split('/').pop());
        const dashboard = await getDashboardById(config, dashboardId);
        const formattedDashboard = formatDashboardData(dashboard, config.baseUrl);
        return Resources.createStandardResource(
          uriStr,
          [formattedDashboard],
          'dashboard',
          dashboardSchema,
          1,
          1,
          0,
          `${config.baseUrl}/jira/dashboards/${dashboardId}`
        );
      } catch (error) {
        logger.error(`Error handling resource request for jira-dashboard-details:`, error);
        throw error;
      }
    }
  );

  // Dashboard gadgets
  server.resource(
    'jira-dashboard-gadgets',
    new ResourceTemplate('jira://dashboards/{dashboardId}/gadgets', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://dashboards/{dashboardId}/gadgets',
            name: 'Jira Dashboard Gadgets',
            description: 'List gadgets of a specific Jira dashboard.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri: string | URL, params: Record<string, any>, _extra: any) => {
      try {
        // Get config from context or environment
        const config = getJiraConfig();
        const uriStr = typeof uri === 'string' ? uri : uri.href;
        
        const dashboardId = params.dashboardId || (uriStr.split('/')[uriStr.split('/').length - 2]);
        const gadgets = await getDashboardGadgets(config, dashboardId);
        const formattedGadgets = formatDashboardListData(gadgets, config.baseUrl);
        return Resources.createStandardResource(
          uriStr,
          formattedGadgets,
          'gadgets',
          gadgetListSchema,
          gadgets.length,
          gadgets.length,
          0,
          `${config.baseUrl}/jira/dashboards/${dashboardId}`
        );
      } catch (error) {
        logger.error(`Error handling resource request for jira-dashboard-gadgets:`, error);
        throw error;
      }
    }
  );

  logger.info('Jira dashboard resources registered successfully');
}