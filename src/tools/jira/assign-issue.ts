import { z } from 'zod';
import { AtlassianConfig } from '../../utils/atlassian-api-base.js';
import { assignIssue } from '../../utils/jira-tool-api-v3.js';
import { ApiError } from '../../utils/error-handler.js';
import { Logger } from '../../utils/logger.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Tools, Config } from '../../utils/mcp-helpers.js';
import { getDeploymentType } from '../../utils/deployment-detector.js';
import { formatUserForAssignment } from '../../utils/user-id-helper.js';

// Initialize logger
const logger = Logger.getLogger('JiraTools:assignIssue');

// Input parameter schema
export const assignIssueSchema = z.object({
  issueIdOrKey: z.string().describe('ID or key of the issue (e.g., PROJ-123)'),
  accountId: z.string().optional().describe('Account ID of the assignee (leave blank to unassign) - for Cloud deployment'),
  username: z.string().optional().describe('Username of the assignee (leave blank to unassign) - for Server/DC deployment'),
  assignee: z.string().optional().describe('User identifier (accountId for Cloud, username for Server/DC) - auto-detected')
});

type AssignIssueParams = z.infer<typeof assignIssueSchema>;

async function assignIssueToolImpl(params: AssignIssueParams, context: any) {
  const config: AtlassianConfig = Config.getJiraConfigFromContextOrEnv(context) || Config.getConfigFromContextOrEnv(context);
  const deploymentType = getDeploymentType(config.baseUrl);
  
  // Format assignee based on deployment type
  const formattedAssignee = params.assignee ? formatUserForAssignment(params.assignee, deploymentType) : null;
  
  logger.info(`Assigning issue ${params.issueIdOrKey} to ${params.assignee ? params.assignee : 'unassigned'} (${deploymentType})`);
  
  // Extract accountId from formatted assignee
  const accountId = formattedAssignee?.accountId || null;
  
  const result = await assignIssue(config, params.issueIdOrKey, accountId);
  
  return {
    issueIdOrKey: params.issueIdOrKey,
    success: true,
    assignee: params.assignee || 'unassigned',
    message: `Issue ${params.assignee ? 'assigned successfully' : 'unassigned successfully'}`
  };
}

export const registerAssignIssueTool = (server: McpServer) => {
  server.tool(
    'assignIssue',
    'Assign a Jira issue to a user',
    assignIssueSchema.shape,
    async (params: any, context: Record<string, any>) => {
      try {
        // Parse and validate params
        const validatedParams = assignIssueSchema.parse(params);
        const result = await assignIssueToolImpl(validatedParams, context);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
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