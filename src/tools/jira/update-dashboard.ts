import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { updateDashboard } from '../../utils/jira-tool-api-v3.js';
import { Logger } from '../../utils/logger.js';
import { Tools, Config } from '../../utils/mcp-helpers.js';
import { getDeploymentType } from '../../utils/deployment-detector.js';

const logger = Logger.getLogger('JiraTools:updateDashboard');

export const updateDashboardSchema = z.object({
  dashboardId: z.string().describe('Dashboard ID'),
  name: z.string().optional().describe('Dashboard name'),
  description: z.string().optional().describe('Dashboard description'),
  sharePermissions: z.array(z.any()).optional().describe('Share permissions array')
});

type UpdateDashboardParams = z.infer<typeof updateDashboardSchema>;

async function updateDashboardToolImpl(params: UpdateDashboardParams, context: any) {
  const config = Config.getJiraConfigFromContextOrEnv(context) || Config.getConfigFromContextOrEnv(context);
  const deploymentType = getDeploymentType(config.baseUrl);
  
  logger.info(`Updating dashboard ${params.dashboardId} (${deploymentType})`);
  
  // Build update data object
  const updateData: Record<string, any> = {};
  if (params.name) updateData.name = params.name;
  if (params.description) updateData.description = params.description;
  if (params.sharePermissions) updateData.sharePermissions = params.sharePermissions;
  
  // Check if we have any fields to update
  if (Object.keys(updateData).length === 0) {
    return {
      success: false,
      message: 'No fields provided to update'
    };
  }
  
  const result = await updateDashboard(config, params.dashboardId, updateData);
  
  return {
    success: true,
    message: 'Dashboard updated successfully',
    id: result.id,
    name: result.name
  };
}

export const registerUpdateDashboardTool = (server: McpServer) => {
  server.tool(
    'updateDashboard',
    'Update a Jira dashboard',
    updateDashboardSchema.shape,
    async (params: UpdateDashboardParams, context: Record<string, any>) => {
      try {
        const result = await updateDashboardToolImpl(params, context);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        logger.error('Error in updateDashboard:', error);
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