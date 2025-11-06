import { z } from "zod";
import { AtlassianConfig } from "../../utils/atlassian-api-base.js";
import { Logger } from "../../utils/logger.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProject as getProjectApi } from "../../utils/jira-resource-api.js";
import { Config } from "../../utils/mcp-helpers.js";

const logger = Logger.getLogger("JiraTools:getProject");

// Input parameter schema
export const getProjectSchema = z.object({
  projectKey: z.string().describe('Project key (e.g., "OPS", "DEV", "PROJ")'),
});

type GetProjectParams = z.infer<typeof getProjectSchema>;

interface GetProjectResult {
  id: string;
  key: string;
  name: string;
  description?: string;
  projectType: string;
  lead: {
    accountId: string;
    displayName: string;
    emailAddress?: string;
  };
  url: string;
}

/**
 * Get detailed information about a Jira project
 */
export async function getProjectHandler(
  params: GetProjectParams,
  config: AtlassianConfig
): Promise<GetProjectResult> {
  try {
    logger.info(`Getting Jira project: ${params.projectKey}`);

    const project = await getProjectApi(config, params.projectKey);

    return {
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description,
      projectType: project.projectTypeKey,
      lead: {
        accountId: project.lead?.accountId || "",
        displayName: project.lead?.displayName || "Unknown",
        emailAddress: project.lead?.emailAddress,
      },
      url: `${config.baseUrl}/browse/${project.key}`,
    };
  } catch (error) {
    logger.error(`Error getting project ${params.projectKey}:`, error);
    throw error;
  }
}

// Register the tool with MCP Server
export const registerGetProjectTool = (server: McpServer) => {
  server.tool(
    "getProject",
    "Get detailed information about a Jira project by key. Returns project details including name, description, type, and lead.",
    getProjectSchema.shape,
    async (params: GetProjectParams, context: Record<string, any>) => {
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

        const result = await getProjectHandler(params, config);

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
              text: `Error getting project: ${
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
