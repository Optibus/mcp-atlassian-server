import { z } from "zod";
import { AtlassianConfig } from "../../utils/atlassian-api-base.js";
import { Logger } from "../../utils/logger.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchIssues } from "../../utils/jira-resource-api.js";
import { Config } from "../../utils/mcp-helpers.js";

const logger = Logger.getLogger("JiraTools:listIssues");

// Input parameter schema
export const listIssuesSchema = z.object({
  jql: z
    .string()
    .optional()
    .describe(
      'JQL (Jira Query Language) query to filter issues. Example: "project = OPS AND status = Open"'
    ),
  project: z
    .string()
    .optional()
    .describe(
      'Filter by project key (e.g., "OPS", "DEV"). Will be added to JQL if not already present.'
    ),
  status: z
    .string()
    .optional()
    .describe(
      'Filter by status (e.g., "Open", "In Progress", "Done"). Will be added to JQL if not already present.'
    ),
  assignee: z
    .string()
    .optional()
    .describe("Filter by assignee username or email"),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe("Maximum number of issues to return (default: 50, max: 100)"),
  startAt: z
    .number()
    .optional()
    .default(0)
    .describe("Starting index for pagination (default: 0)"),
});

type ListIssuesParams = z.infer<typeof listIssuesSchema>;

interface IssueListItem {
  key: string;
  id: string;
  summary: string;
  status: string;
  issueType: string;
  priority?: string;
  assignee?: string;
  reporter?: string;
  created: string;
  updated: string;
  url: string;
}

interface ListIssuesResult {
  issues: IssueListItem[];
  total: number;
  startAt: number;
  maxResults: number;
  jqlQuery: string;
}

/**
 * Search and list Jira issues with JQL
 */
export async function listIssuesHandler(
  params: ListIssuesParams,
  config: AtlassianConfig
): Promise<ListIssuesResult> {
  try {
    // Build JQL query
    let jqlQuery = params.jql || "";

    if (params.project && !jqlQuery.toLowerCase().includes("project")) {
      jqlQuery = jqlQuery
        ? `${jqlQuery} AND project = ${params.project}`
        : `project = ${params.project}`;
    }

    if (params.status && !jqlQuery.toLowerCase().includes("status")) {
      jqlQuery = jqlQuery
        ? `${jqlQuery} AND status = "${params.status}"`
        : `status = "${params.status}"`;
    }

    if (params.assignee && !jqlQuery.toLowerCase().includes("assignee")) {
      jqlQuery = jqlQuery
        ? `${jqlQuery} AND assignee = "${params.assignee}"`
        : `assignee = "${params.assignee}"`;
    }

    logger.info(`Searching Jira issues with JQL: ${jqlQuery || "All issues"}`);

    const response = await searchIssues(config, jqlQuery, params.limit);

    // Check if response has the expected structure
    if (!response || !Array.isArray(response.issues)) {
      logger.error("Unexpected response structure:", response);
      throw new Error("Invalid response from Jira API: missing issues array");
    }

    const issues: IssueListItem[] = response.issues.map((issue: any) => {
      // Handle both old and new API response formats
      const fields = issue.fields || {};
      return {
        key: issue.key || "Unknown",
        id: issue.id || "",
        summary: fields.summary || "No summary",
        status: fields.status?.name || "Unknown",
        issueType: fields.issuetype?.name || "Unknown",
        priority: fields.priority?.name,
        assignee: fields.assignee?.displayName,
        reporter: fields.reporter?.displayName,
        created: fields.created || "",
        updated: fields.updated || "",
        url: `${config.baseUrl}/browse/${issue.key}`,
      };
    });

    return {
      issues,
      total: response.total || issues.length,
      startAt: response.startAt || params.startAt || 0,
      maxResults: response.maxResults || params.limit || 50,
      jqlQuery: jqlQuery || "order by created DESC",
    };
  } catch (error) {
    logger.error("Error listing issues:", error);
    throw error;
  }
}

// Register the tool with MCP Server
export const registerListIssuesTool = (server: McpServer) => {
  server.tool(
    "listIssues",
    "Search and list Jira issues using JQL (Jira Query Language). Supports filtering by project, status, assignee, and custom JQL queries.",
    listIssuesSchema.shape,
    async (params: ListIssuesParams, context: Record<string, any>) => {
      try {
        const config =
          context?.atlassianConfig ?? Config.getAtlassianConfigFromEnv();
        if (!config) {
          return {
            content: [
              {
                type: "text",
                text: "Invalid or missing Atlassian configuration",
              },
            ],
            isError: true,
          };
        }

        const result = await listIssuesHandler(params, config);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error listing issues: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );
};
