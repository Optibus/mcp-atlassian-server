import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AtlassianConfig } from '../../utils/atlassian-api-base.js';
import { createIssue } from '../../utils/jira-tool-api-v3.js';
import { ApiError } from '../../utils/error-handler.js';
import { Logger } from '../../utils/logger.js';
import { Tools, Config } from '../../utils/mcp-helpers.js';
import { getDeploymentType } from '../../utils/deployment-detector.js';
import { formatUserForAssignment } from '../../utils/user-id-helper.js';

// Initialize logger
const logger = Logger.getLogger('JiraTools:createIssue');

// Input parameter schema
export const createIssueSchema = z.object({
  projectKey: z.string().describe('Project key (e.g., PROJ)'),
  summary: z.string().describe('Issue summary'),
  issueType: z.string().default('Task').describe('Issue type (e.g., Bug, Task, Story)'),
  description: z.string().optional().describe('Issue description'),
  priority: z.string().optional().describe('Priority (e.g., High, Medium, Low)'),
  assignee: z.string().optional().describe('Assignee identifier (accountId for Cloud, username for Server/DC)'),
  labels: z.array(z.string()).optional().describe('Labels for the issue')
});

type CreateIssueParams = z.infer<typeof createIssueSchema>;

async function createIssueToolImpl(params: CreateIssueParams, context: any) {
  const config: AtlassianConfig = Config.getConfigFromContextOrEnv(context);
  const deploymentType = getDeploymentType(config.baseUrl);
  
  logger.info(`Creating new issue in project: ${params.projectKey} (${deploymentType})`);
  
  const additionalFields: Record<string, any> = {};
  
  if (params.priority) {
    additionalFields.priority = { name: params.priority };
  }
  
  if (params.assignee) {
    // Format assignee based on deployment type
    additionalFields.assignee = formatUserForAssignment(params.assignee, deploymentType);
    logger.debug(`Formatted assignee for ${deploymentType}:`, additionalFields.assignee);
  }
  
  if (params.labels && params.labels.length > 0) {
    additionalFields.labels = params.labels;
  }
  
  const newIssue = await createIssue(
    config,
    params.projectKey,
    params.summary,
    params.description,
    params.issueType,
    additionalFields
  );
  
  return {
    id: newIssue.id,
    key: newIssue.key,
    self: newIssue.self,
    success: true,
    deploymentType: deploymentType
  };
}

export const registerCreateIssueTool = (server: McpServer) => {
  server.tool(
    'createIssue',
    'Create a new issue in Jira',
    createIssueSchema.shape,
    async (params: CreateIssueParams, context: Record<string, any>) => {
      try {
        const result = await createIssueToolImpl(params, context);
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