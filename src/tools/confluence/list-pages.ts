import { z } from "zod";
import { AtlassianConfig } from "../../utils/atlassian-api-base.js";
import { Logger } from "../../utils/logger.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConfluencePagesWithFilters } from "../../utils/confluence-resource-api.js";
import { Config } from "../../utils/mcp-helpers.js";

const logger = Logger.getLogger("ConfluenceTools:listPages");

// Input parameter schema
export const listPagesSchema = z.object({
  spaceId: z.string().optional().describe("Filter by space ID (numeric ID)"),
  title: z.string().optional().describe("Filter by page title (partial match)"),
  status: z
    .enum(["current", "archived", "deleted"])
    .optional()
    .describe("Filter by page status"),
  limit: z
    .number()
    .optional()
    .default(25)
    .describe("Maximum number of results to return (default: 25)"),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor for next page of results"),
});

type ListPagesParams = z.infer<typeof listPagesSchema>;

interface PageListItem {
  id: string;
  title: string;
  status: string;
  spaceId?: string;
  url: string;
}

interface ListPagesResult {
  pages: PageListItem[];
  total: number;
  cursor?: string;
}

/**
 * List Confluence pages with optional filtering
 */
export async function listPagesHandler(
  params: ListPagesParams,
  config: AtlassianConfig
): Promise<ListPagesResult> {
  try {
    logger.info(
      `Listing Confluence pages with filters: ${JSON.stringify(params)}`
    );

    const data = await getConfluencePagesWithFilters(config, params);

    const pages: PageListItem[] = (data.results || []).map((page: any) => ({
      id: page.id,
      title: page.title,
      status: page.status,
      spaceId: page.spaceId,
      url: `${config.baseUrl}/wiki/pages/${page.id}`,
    }));

    return {
      pages,
      total: data.size || pages.length,
      cursor: data._links?.next ? "has_more" : undefined,
    };
  } catch (error) {
    logger.error("Error listing pages:", error);
    throw error;
  }
}

// Register the tool with MCP Server
export const registerListPagesTool = (server: McpServer) => {
  server.tool(
    "listPages",
    "List Confluence pages with optional filtering by space, title, or status. Supports pagination.",
    listPagesSchema.shape,
    async (params: ListPagesParams, context: Record<string, any>) => {
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

        const result = await listPagesHandler(params, config);

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
              text: `Error listing pages: ${
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
