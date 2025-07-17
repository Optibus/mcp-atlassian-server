import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../utils/logger.js';
import { updateFilter } from '../../utils/jira-tool-api-v3.js';
import { Tools, Config } from '../../utils/mcp-helpers.js';
import { getDeploymentType } from '../../utils/deployment-detector.js';

// Initialize logger
const logger = Logger.getLogger('JiraTools:updateFilter');

// Input parameter schema
export const updateFilterSchema = z.object({
  filterId: z.string().describe('Filter ID to update'),
  name: z.string().optional().describe('New filter name'),
  jql: z.string().optional().describe('New JQL query'),
  description: z.string().optional().describe('New description'),
  favourite: z.boolean().optional().describe('Mark as favourite')
});

type UpdateFilterParams = z.infer<typeof updateFilterSchema>;

async function updateFilterToolImpl(params: UpdateFilterParams, context: any) {
  const config = Config.getJiraConfigFromContextOrEnv(context) || Config.getConfigFromContextOrEnv(context);
  const deploymentType = getDeploymentType(config.baseUrl);
  
  logger.info(`Updating filter ${params.filterId} (${deploymentType})`);
  
  // Build update data object
  const updateData: Record<string, any> = {};
  if (params.name) updateData.name = params.name;
  if (params.jql) updateData.jql = params.jql;
  if (params.description) updateData.description = params.description;
  if (params.favourite !== undefined) updateData.favourite = params.favourite;
  
  // Check if we have any fields to update
  if (Object.keys(updateData).length === 0) {
    return {
      success: false,
      message: 'No fields provided to update'
    };
  }
  
  const result = await updateFilter(config, params.filterId, updateData);
  
  return {
    success: true,
    message: 'Filter updated successfully',
    id: result.id,
    name: result.name,
    jql: result.jql
  };
}

// Register the tool with MCP Server
export const registerUpdateFilterTool = (server: McpServer) => {
  server.tool(
    'updateFilter',
    'Update an existing filter in Jira',
    updateFilterSchema.shape,
    async (params: UpdateFilterParams, context: Record<string, any>) => {
      try {
        const result = await updateFilterToolImpl(params, context);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        logger.error('Error in updateFilter:', error);
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