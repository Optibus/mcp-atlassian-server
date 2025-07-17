import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { rankBacklogIssues } from '../../utils/jira-tool-api-agile.js';
import { Logger } from '../../utils/logger.js';
import { Tools, Config } from '../../utils/mcp-helpers.js';
import { getDeploymentType } from '../../utils/deployment-detector.js';

const logger = Logger.getLogger('JiraTools:rankBacklogIssues');

export const rankBacklogIssuesSchema = z.object({
  boardId: z.string().describe('Board ID'),
  issueKeys: z.array(z.string()).describe('List of issue keys to rank'),
  rankBeforeIssue: z.string().optional().describe('Rank before this issue key'),
  rankAfterIssue: z.string().optional().describe('Rank after this issue key')
});

type RankBacklogIssuesParams = z.infer<typeof rankBacklogIssuesSchema>;

async function rankBacklogIssuesToolImpl(params: RankBacklogIssuesParams, context: any) {
  const config = Config.getJiraConfigFromContextOrEnv(context) || Config.getConfigFromContextOrEnv(context);
  const deploymentType = getDeploymentType(config.baseUrl);
  
  logger.info(`Ranking ${params.issueKeys.length} issues in backlog for board ${params.boardId} (${deploymentType})`);
  const result = await rankBacklogIssues(config, params.boardId, params.issueKeys, { 
    rankBeforeIssue: params.rankBeforeIssue, 
    rankAfterIssue: params.rankAfterIssue 
  });
  return {
    success: true,
    boardId: params.boardId,
    issueKeys: params.issueKeys,
    rankBeforeIssue: params.rankBeforeIssue || null,
    rankAfterIssue: params.rankAfterIssue || null,
    result
  };
}

export const registerRankBacklogIssuesTool = (server: McpServer) => {
  server.tool(
    'rankBacklogIssues',
    'Rank issues in Jira backlog',
    rankBacklogIssuesSchema.shape,
    async (params: RankBacklogIssuesParams, context: Record<string, any>) => {
      try {
        const result = await rankBacklogIssuesToolImpl(params, context);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        logger.error('Error in rankBacklogIssues:', error);
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