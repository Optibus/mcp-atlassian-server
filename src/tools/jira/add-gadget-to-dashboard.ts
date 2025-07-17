import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { addGadgetToDashboard } from '../../utils/jira-tool-api-v3.js';
import { Logger } from '../../utils/logger.js';
import { Tools, Config } from '../../utils/mcp-helpers.js';
import { getDeploymentType } from '../../utils/deployment-detector.js';

const logger = Logger.getLogger('JiraTools:addGadgetToDashboard');

const colorEnum = z.enum(['blue', 'red', 'yellow', 'green', 'cyan', 'purple', 'gray', 'white']);

const addGadgetToDashboardBaseSchema = z.object({
  dashboardId: z.string().describe('Dashboard ID'),
  moduleKey: z.string().optional().describe('Gadget moduleKey (recommended, e.g. "com.atlassian.plugins.atlassian-connect-plugin:sample-dashboard-item"). Only one of moduleKey or uri should be provided.'),
  uri: z.string().optional().describe('Gadget URI (legacy, e.g. "/rest/gadgets/1.0/g/com.atlassian.jira.gadgets:filter-results-gadget/gadgets/filter-results-gadget.xml"). Only one of moduleKey or uri should be provided.'),
  title: z.string().optional().describe('Gadget title (optional)'),
  color: colorEnum.describe('Gadget color. Must be one of: blue, red, yellow, green, cyan, purple, gray, white.'),
  position: z.object({
    column: z.number().describe('Column index (0-based)'),
    row: z.number().describe('Row index (0-based)')
  }).optional().describe('Position of the gadget on the dashboard (optional)')
});

export const addGadgetToDashboardSchema = addGadgetToDashboardBaseSchema.refine(
  (data) => !!data.moduleKey !== !!data.uri,
  { message: 'You must provide either moduleKey or uri, but not both.' }
);

type AddGadgetToDashboardParams = z.infer<typeof addGadgetToDashboardBaseSchema>;

async function addGadgetToDashboardToolImpl(params: AddGadgetToDashboardParams, context: any) {
  const config = Config.getJiraConfigFromContextOrEnv(context) || Config.getConfigFromContextOrEnv(context);
  const deploymentType = getDeploymentType(config.baseUrl);
  
  logger.info(`Adding gadget to dashboard ${params.dashboardId} (${deploymentType})`);
  
  // Build gadget data object
  const gadgetData: any = {
    color: params.color,
    position: params.position
  };
  
  if (params.moduleKey) {
    gadgetData.moduleKey = params.moduleKey;
  } else if (params.uri) {
    gadgetData.uri = params.uri;
  }
  
  if (params.title) {
    gadgetData.title = params.title;
  }
  
  const result = await addGadgetToDashboard(config, params.dashboardId, gadgetData);
  
  return {
    success: true,
    dashboardId: params.dashboardId,
    gadgetId: result.id,
    title: result.title,
    color: params.color,
    position: params.position
  };
}

export const registerAddGadgetToDashboardTool = (server: McpServer) => {
  server.tool(
    'addGadgetToDashboard',
    'Add gadget to Jira dashboard (POST /rest/api/3/dashboard/{dashboardId}/gadget)',
    addGadgetToDashboardBaseSchema.shape,
    async (params: AddGadgetToDashboardParams, context: Record<string, any>) => {
      try {
        const result = await addGadgetToDashboardToolImpl(params, context);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        logger.error('Error in addGadgetToDashboard:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) })
            }
          ],
          isError: true
        };
      }
    }
  );
}; 