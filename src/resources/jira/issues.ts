import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../utils/logger.js';
import { getIssue as getIssueApi, searchIssues as searchIssuesApi } from '../../utils/jira-resource-api.js';
import { issueSchema, issuesListSchema, transitionsListSchema, commentsListSchema } from '../../schemas/jira.js';
import { Config, Resources } from '../../utils/mcp-helpers.js';
import { getDeploymentType } from '../../utils/deployment-detector.js';
import { normalizeUserData } from '../../utils/user-id-helper.js';

const logger = Logger.getLogger('JiraResource:Issues');

/**
 * Get Jira configuration from context or environment
 */
function getJiraConfig(extra?: any): Config.EnhancedAtlassianConfig {
  if (extra?.context?.jiraConfig) {
    return extra.context.jiraConfig;
  }
  
  // Try separate config first
  const jiraConfig = Config.getJiraConfigFromEnv();
  if (jiraConfig) {
    return jiraConfig;
  }
  
  // Fallback to legacy config
  const legacyConfig = Config.getAtlassianConfigFromEnv();
  logger.warn('Using legacy configuration for Jira. Consider setting JIRA_URL and JIRA_PAT_TOKEN for better security.');
  return legacyConfig;
}

/**
 * Get authentication headers based on deployment type
 */
function getAuthHeaders(config: any): Record<string, string> {
  const deploymentType = getDeploymentType(config.baseUrl);
  
  // Check if we have a PAT token for Server/DC
  const patToken = (config as any).patToken;
  if (deploymentType === 'server' && patToken) {
    // Use PAT token for Server/DC if available
    return {
      'Authorization': `Bearer ${patToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'MCP-Atlassian-Server/1.0.0'
    };
  } else {
    // Use Basic Auth (works for both Cloud and Server/DC)
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
 * Get appropriate API endpoint based on deployment type
 */
function getApiEndpoint(baseUrl: string, endpoint: string): string {
  const deploymentType = getDeploymentType(baseUrl);
  
  if (endpoint === 'issueTransitions') {
    return deploymentType === 'cloud'
      ? '/rest/api/3/issue/{issueKey}/transitions'
      : '/rest/api/2/issue/{issueKey}/transitions';
  }
  
  if (endpoint === 'issueComments') {
    return deploymentType === 'cloud'
      ? '/rest/api/3/issue/{issueKey}/comment'
      : '/rest/api/2/issue/{issueKey}/comment';
  }
  
  return endpoint;
}

/**
 * Helper function to get issue details from Jira
 */
async function getIssue(config: any, issueKey: string): Promise<any> {
  return await getIssueApi(config, issueKey);
}

/**
 * Helper function to get a list of issues from Jira (supports pagination)
 */
async function getIssues(config: any, startAt = 0, maxResults = 20, jql = ''): Promise<any> {
  const jqlQuery = jql && jql.trim() ? jql.trim() : '';
  return await searchIssuesApi(config, jqlQuery, maxResults);
}

/**
 * Helper function to search issues by JQL from Jira (supports pagination)
 */
async function searchIssuesByJql(config: any, jql: string, startAt = 0, maxResults = 20): Promise<any> {
  return await searchIssuesApi(config, jql, maxResults);
}

/**
 * Helper function to get a list of transitions for an issue from Jira
 */
async function getIssueTransitions(config: any, issueKey: string): Promise<any> {
  try {
    const headers = getAuthHeaders(config);
    
    let baseUrl = config.baseUrl;
    if (!baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // Get appropriate endpoint for deployment type
    const endpoint = getApiEndpoint(baseUrl, 'issueTransitions');
    const url = `${baseUrl}${endpoint.replace('{issueKey}', issueKey)}`;
    
    logger.debug(`Getting Jira issue transitions: ${url}`);
    const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
    
    if (!response.ok) {
      const statusCode = response.status;
      const responseText = await response.text();
      logger.error(`Jira API error (${statusCode}):`, responseText);
      throw new Error(`Jira API error: ${responseText}`);
    }
    
    const data = await response.json();
    return data.transitions || [];
  } catch (error) {
    logger.error(`Error getting Jira issue transitions:`, error);
    throw error;
  }
}

/**
 * Helper function to get a list of comments for an issue from Jira
 */
async function getIssueComments(config: any, issueKey: string, startAt = 0, maxResults = 20): Promise<any> {
  try {
    const headers = getAuthHeaders(config);
    
    let baseUrl = config.baseUrl;
    if (!baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // Get appropriate endpoint for deployment type
    const endpoint = getApiEndpoint(baseUrl, 'issueComments');
    const url = `${baseUrl}${endpoint.replace('{issueKey}', issueKey)}?startAt=${startAt}&maxResults=${maxResults}`;
    
    logger.debug(`Getting Jira issue comments: ${url}`);
    const response = await fetch(url, { method: 'GET', headers, credentials: 'omit' });
    
    if (!response.ok) {
      const statusCode = response.status;
      const responseText = await response.text();
      logger.error(`Jira API error (${statusCode}):`, responseText);
      throw new Error(`Jira API error: ${responseText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error(`Error getting Jira issue comments:`, error);
    throw error;
  }
}

/**
 * Hàm chuyển ADF sang text thuần
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

/**
 * Format Jira issue data to standardized format
 */
function formatIssueData(issue: any, baseUrl: string): any {
  const deploymentType = getDeploymentType(baseUrl);
  
  // Normalize user data for assignee and reporter
  const assignee = issue.fields?.assignee ? normalizeUserData(issue.fields.assignee, deploymentType) : null;
  const reporter = issue.fields?.reporter ? normalizeUserData(issue.fields.reporter, deploymentType) : null;
  
  return {
    id: issue.id,
    key: issue.key,
    summary: issue.fields?.summary || '',
    description: extractTextFromADF(issue.fields?.description),
    rawDescription: issue.fields?.description || null,
    status: {
      name: issue.fields?.status?.name || 'Unknown',
      id: issue.fields?.status?.id || '0'
    },
    assignee: assignee ? {
      id: assignee.id,
      displayName: assignee.displayName,
      accountId: assignee.original.accountId || assignee.id, // Backward compatibility
      emailAddress: assignee.emailAddress
    } : null,
    reporter: reporter ? {
      id: reporter.id,
      displayName: reporter.displayName,
      accountId: reporter.original.accountId || reporter.id, // Backward compatibility  
      emailAddress: reporter.emailAddress
    } : null,
    priority: issue.fields?.priority ? {
      name: issue.fields.priority.name,
      id: issue.fields.priority.id
    } : null,
    labels: issue.fields?.labels || [],
    created: issue.fields?.created || null,
    updated: issue.fields?.updated || null,
    issueType: {
      name: issue.fields?.issuetype?.name || 'Unknown',
      id: issue.fields?.issuetype?.id || '0'
    },
    projectKey: issue.fields?.project?.key || '',
    projectName: issue.fields?.project?.name || '',
    url: `${baseUrl}/browse/${issue.key}`,
    deploymentType: deploymentType
  };
}

/**
 * Format Jira comment data to standardized format
 */
function formatCommentData(comment: any, deploymentType: 'cloud' | 'server'): any {
  // Normalize user data for comment author
  const author = comment.author ? normalizeUserData(comment.author, deploymentType) : null;
  
  return {
    id: comment.id,
    body: extractTextFromADF(comment.body),
    rawBody: comment.body || '',
    author: author ? {
      id: author.id,
      displayName: author.displayName,
      accountId: author.original.accountId || author.id, // Backward compatibility
      emailAddress: author.emailAddress
    } : null,
    created: comment.created || null,
    updated: comment.updated || null,
    deploymentType: deploymentType
  };
}

/**
 * Register resources related to Jira issues
 * @param server MCP Server instance
 */
export function registerIssueResources(server: McpServer) {
  logger.info('Registering Jira issue resources...');

  // Resource: Issues list (with pagination and JQL support)
  server.resource(
    'jira-issues-list',
    new ResourceTemplate('jira://issues', {
      list: async (_extra) => {
        return {
          resources: [
            {
              uri: 'jira://issues',
              name: 'Jira Issues',
              description: 'List and search all Jira issues',
              mimeType: 'application/json'
            }
          ]
        };
      }
    }),
    async (uri, params, extra) => {
      try {
        const config = getJiraConfig(extra);
        const { limit, offset } = Resources.extractPagingParams(params);
        const jql = params.jql ? Array.isArray(params.jql) ? params.jql[0] : params.jql : '';
        const project = params.project ? Array.isArray(params.project) ? params.project[0] : params.project : '';
        const status = params.status ? Array.isArray(params.status) ? params.status[0] : params.status : '';
        
        // Build JQL query based on parameters
        let jqlQuery = jql;
        if (project && !jqlQuery.includes('project=')) {
          jqlQuery = jqlQuery ? `${jqlQuery} AND project = ${project}` : `project = ${project}`;
        }
        if (status && !jqlQuery.includes('status=')) {
          jqlQuery = jqlQuery ? `${jqlQuery} AND status = "${status}"` : `status = "${status}"`;
        }
        
        logger.info(`Searching Jira issues with JQL: ${jqlQuery || 'All issues'}`);
        const response = await searchIssuesApi(config, jqlQuery, limit);
        
        // Format issues data
        const formattedIssues = response.issues.map((issue: any) => formatIssueData(issue, config.baseUrl));
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        return Resources.createStandardResource(
          uriString,
          formattedIssues,
          'issues',
          issuesListSchema,
          response.total,
          limit,
          offset,
          `${config.baseUrl}/jira/issues`
        );
      } catch (error) {
        logger.error('Error searching Jira issues:', error);
        throw error;
      }
    }
  );

  // Resource: Issue details
  server.resource(
    'jira-issue-details',
    new ResourceTemplate('jira://issues/{issueKey}', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://issues/{issueKey}',
            name: 'Jira Issue Details',
            description: 'Get details for a specific Jira issue by key. Replace {issueKey} with the issue key.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri, params, extra) => {
      try {
        const config = getJiraConfig(extra);
        const issueKey = Array.isArray(params.issueKey) ? params.issueKey[0] : params.issueKey;
        
        logger.info(`Getting details for Jira issue: ${issueKey}`);
        const issue = await getIssueApi(config, issueKey);
        const formattedIssue = formatIssueData(issue, config.baseUrl);
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        return Resources.createStandardResource(
          uriString,
          [formattedIssue],
          'issue',
          issueSchema,
          1,
          1,
          0,
          `${config.baseUrl}/browse/${issueKey}`
        );
      } catch (error) {
        logger.error(`Error getting Jira issue details for ${params.issueKey}:`, error);
        throw error;
      }
    }
  );

  // Resource: Issue transitions
  server.resource(
    'jira-issue-transitions',
    new ResourceTemplate('jira://issues/{issueKey}/transitions', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://issues/{issueKey}/transitions',
            name: 'Jira Issue Transitions',
            description: 'Get available transitions for a specific Jira issue. Replace {issueKey} with the issue key.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri, params, extra) => {
      try {
        const config = getJiraConfig(extra);
        const issueKey = Array.isArray(params.issueKey) ? params.issueKey[0] : params.issueKey;
        
        logger.info(`Getting transitions for Jira issue: ${issueKey}`);
        const headers = getAuthHeaders(config);
        const response = await fetch(`${config.baseUrl}/rest/api/2/issue/${issueKey}/transitions`, {
          method: 'GET',
          headers,
        });
        
        if (!response.ok) {
          throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
        }
        
        const data = await response.json();
        const formattedTransitions = data.transitions.map((transition: any) => ({
          id: transition.id,
          name: transition.name,
          to: transition.to,
          deploymentType: getDeploymentType(config.baseUrl)
        }));
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        return Resources.createStandardResource(
          uriString,
          formattedTransitions,
          'transitions',
          transitionsListSchema,
          formattedTransitions.length,
          formattedTransitions.length,
          0,
          `${config.baseUrl}/browse/${issueKey}`
        );
      } catch (error) {
        logger.error(`Error getting Jira issue transitions for ${params.issueKey}:`, error);
        throw error;
      }
    }
  );

  // Resource: Issue comments
  server.resource(
    'jira-issue-comments',
    new ResourceTemplate('jira://issues/{issueKey}/comments', {
      list: async (_extra) => ({
        resources: [
          {
            uri: 'jira://issues/{issueKey}/comments',
            name: 'Jira Issue Comments',
            description: 'Get comments for a specific Jira issue. Replace {issueKey} with the issue key.',
            mimeType: 'application/json'
          }
        ]
      })
    }),
    async (uri, params, extra) => {
      try {
        const config = getJiraConfig(extra);
        const issueKey = Array.isArray(params.issueKey) ? params.issueKey[0] : params.issueKey;
        
        logger.info(`Getting comments for Jira issue: ${issueKey}`);
        const headers = getAuthHeaders(config);
        const response = await fetch(`${config.baseUrl}/rest/api/2/issue/${issueKey}/comment`, {
          method: 'GET',
          headers,
        });
        
        if (!response.ok) {
          throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
        }
        
        const data = await response.json();
        const deploymentType = getDeploymentType(config.baseUrl);
        const formattedComments = data.comments.map((comment: any) => ({
          id: comment.id,
          body: comment.body,
          author: normalizeUserData(comment.author, deploymentType),
          created: comment.created,
          updated: comment.updated,
          deploymentType
        }));
        
        const uriString = typeof uri === 'string' ? uri : uri.href;
        return Resources.createStandardResource(
          uriString,
          formattedComments,
          'comments',
          commentsListSchema,
          formattedComments.length,
          formattedComments.length,
          0,
          `${config.baseUrl}/browse/${issueKey}`
        );
      } catch (error) {
        logger.error(`Error getting Jira issue comments for ${params.issueKey}:`, error);
        throw error;
      }
    }
  );

  logger.info('Jira issue resources registered successfully');
}
