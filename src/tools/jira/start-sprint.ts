import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { startSprint } from '../../utils/jira-tool-api-agile.js';
import { Logger } from '../../utils/logger.js';
import { Tools, Config } from '../../utils/mcp-helpers.js';
import { getDeploymentType } from '../../utils/deployment-detector.js';

const logger = Logger.getLogger('JiraTools:startSprint');

export const startSprintSchema = z.object({
  sprintId: z.string().describe('Sprint ID'),
  startDate: z.string().describe('Start date (ISO 8601)'),
  endDate: z.string().describe('End date (ISO 8601)'),
  goal: z.string().optional().describe('Sprint goal')
});

type StartSprintParams = z.infer<typeof startSprintSchema>;

async function startSprintToolImpl(params: StartSprintParams, context: any) {
  const config = Config.getJiraConfigFromContextOrEnv(context) || Config.getConfigFromContextOrEnv(context);
  const deploymentType = getDeploymentType(config.baseUrl);
  
  logger.info(`Starting sprint ${params.sprintId} (${deploymentType})`);
  const result = await startSprint(config, params.sprintId, params.startDate, params.endDate, params.goal);
  return {
    success: true,
    sprintId: params.sprintId,
    startDate: params.startDate,
    endDate: params.endDate,
    goal: params.goal || null,
    result
  };
}

export const registerStartSprintTool = (server: McpServer) => {
  server.tool(
    'startSprint',
    'Start a Jira sprint',
    startSprintSchema.shape,
    async (params: StartSprintParams, context: Record<string, any>) => {
      try {
        const result = await startSprintToolImpl(params, context);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        logger.error('Error in startSprint:', error);
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