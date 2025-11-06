import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AtlassianConfig } from '../../utils/atlassian-api-base.js';
import { getIssue } from '../../utils/jira-resource-api.js';
import { Logger } from '../../utils/logger.js';
import { Tools, Config } from '../../utils/mcp-helpers.js';

// Initialize logger
const logger = Logger.getLogger('JiraTools:getIssue');

// Input parameter schema
export const getIssueSchema = z.object({
  issueIdOrKey: z.string().describe('ID or key of the issue to fetch (e.g., OPS-14085)')
});

type GetIssueParams = z.infer<typeof getIssueSchema>;

/**
 * Helper function to extract text from ADF (Atlassian Document Format)
 */
function extractTextFromADF(adf: any): string {
  if (!adf || typeof adf === 'string') return adf || '';
  let text = '';
  if (adf.content) {
    adf.content.forEach((node: any) => {
      if (node.type === 'paragraph' && node.content) {
        node.content.forEach((inline: any) => {
          if (inline.type === 'text') {
            text += inline.text;
          }
        });
        text += '\n';
      }
    });
  }
  return text.trim();
}

async function getIssueToolImpl(params: GetIssueParams, context: any) {
  const config: AtlassianConfig = Config.getConfigFromContextOrEnv(context);
  logger.info(`Fetching issue: ${params.issueIdOrKey}`);
  
  const issue = await getIssue(config, params.issueIdOrKey);
  
  // Format the issue data for better readability
  const formattedIssue = {
    key: issue.key,
    id: issue.id,
    url: `${config.baseUrl}/browse/${issue.key}`,
    summary: issue.fields?.summary || '',
    description: extractTextFromADF(issue.fields?.description),
    issueType: issue.fields?.issuetype?.name || 'Unknown',
    status: {
      name: issue.fields?.status?.name || 'Unknown',
      id: issue.fields?.status?.id || '0',
      statusCategory: issue.fields?.status?.statusCategory?.name || 'Unknown'
    },
    priority: issue.fields?.priority ? {
      name: issue.fields.priority.name,
      id: issue.fields.priority.id
    } : null,
    assignee: issue.fields?.assignee ? {
      displayName: issue.fields.assignee.displayName,
      accountId: issue.fields.assignee.accountId,
      emailAddress: issue.fields.assignee.emailAddress
    } : null,
    reporter: issue.fields?.reporter ? {
      displayName: issue.fields.reporter.displayName,
      accountId: issue.fields.reporter.accountId,
      emailAddress: issue.fields.reporter.emailAddress
    } : null,
    labels: issue.fields?.labels || [],
    created: issue.fields?.created || null,
    updated: issue.fields?.updated || null,
    project: {
      key: issue.fields?.project?.key || '',
      name: issue.fields?.project?.name || ''
    },
    // Include custom fields (they start with customfield_)
    customFields: Object.keys(issue.fields || {})
      .filter(key => key.startsWith('customfield_'))
      .reduce((acc, key) => {
        const value = issue.fields[key];
        if (value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>)
  };
  
  return {
    success: true,
    issue: formattedIssue
  };
}

export const registerGetIssueTool = (server: McpServer) => {
  server.tool(
    'getIssue',
    'Get details of a Jira issue by its key or ID',
    getIssueSchema.shape,
    async (params: GetIssueParams, context: Record<string, any>) => {
      try {
        const result = await getIssueToolImpl(params, context);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ 
                success: false, 
                error: error instanceof Error ? error.message : String(error) 
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }
  );
};









