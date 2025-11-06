import { z } from "zod";
import { AtlassianConfig } from "../../utils/atlassian-api-base.js";
import { Logger } from "../../utils/logger.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProjects } from "../../utils/jira-resource-api.js";
import { Config } from "../../utils/mcp-helpers.js";

const logger = Logger.getLogger("JiraTools:listProjects");

// Input parameter schema
export const listProjectsSchema = z.object({
  type: z
    .enum(["software", "business"])
    .optional()
    .describe("Filter by project type"),
});

type ListProjectsParams = z.infer<typeof listProjectsSchema>;

interface ProjectListItem {
  id: string;
  key: string;
  name: string;
  projectType: string;
  lead: string;
  url: string;
}

interface ListProjectsResult {
  projects: ProjectListItem[];
  total: number;
}

/**
 * List all accessible Jira projects
 */
export async function listProjectsHandler(
  params: ListProjectsParams,
  config: AtlassianConfig
): Promise<ListProjectsResult> {
  try {
    logger.info("Listing Jira projects");

    const projects = await getProjects(config);

    let filteredProjects = projects.map((project: any) => ({
      id: project.id,
      key: project.key,
      name: project.name,
      projectType: project.projectTypeKey,
      lead: project.lead?.displayName || "Unknown",
      url: `${config.baseUrl}/browse/${project.key}`,
    }));

    // Apply type filter if provided
    if (params.type) {
      filteredProjects = filteredProjects.filter((p: ProjectListItem) =>
        p.projectType.includes(params.type!)
      );
    }

    return {
      projects: filteredProjects,
      total: filteredProjects.length,
    };
  } catch (error) {
    logger.error("Error listing projects:", error);
    throw error;
  }
}

// Register the tool with MCP Server
export const registerListProjectsTool = (server: McpServer) => {
  server.tool(
    "listProjects",
    "List all accessible Jira projects. Returns project keys, names, types, and leads.",
    listProjectsSchema.shape,
    async (params: ListProjectsParams, context: Record<string, any>) => {
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

        const result = await listProjectsHandler(params, config);

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
              text: `Error listing projects: ${
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
