import { z } from "zod";
import { AtlassianConfig } from "../../utils/atlassian-api-base.js";
import { Logger } from "../../utils/logger.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConfluenceSpacesV2 } from "../../utils/confluence-resource-api.js";
import { Config } from "../../utils/mcp-helpers.js";

const logger = Logger.getLogger("ConfluenceTools:listSpaces");

// Input parameter schema
export const listSpacesSchema = z.object({
  type: z
    .enum(["global", "personal"])
    .optional()
    .describe("Filter by space type"),
  status: z
    .enum(["current", "archived"])
    .optional()
    .describe("Filter by space status"),
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

type ListSpacesParams = z.infer<typeof listSpacesSchema>;

interface SpaceListItem {
  id: string;
  key: string;
  name: string;
  type: string;
  status: string;
  url: string;
}

interface ListSpacesResult {
  spaces: SpaceListItem[];
  total: number;
  cursor?: string;
}

/**
 * List Confluence spaces with optional filtering
 */
export async function listSpacesHandler(
  params: ListSpacesParams,
  config: AtlassianConfig
): Promise<ListSpacesResult> {
  try {
    logger.info(
      `Listing Confluence spaces with filters: ${JSON.stringify(params)}`
    );

    const data = await getConfluenceSpacesV2(
      config,
      params.cursor,
      params.limit
    );

    let spaces: SpaceListItem[] = (data.results || []).map((space: any) => ({
      id: space.id,
      key: space.key,
      name: space.name,
      type: space.type,
      status: space.status,
      url: `${config.baseUrl}/wiki/spaces/${space.key}`,
    }));

    // Apply filters if provided
    if (params.type) {
      spaces = spaces.filter((s) => s.type === params.type);
    }
    if (params.status) {
      spaces = spaces.filter((s) => s.status === params.status);
    }

    return {
      spaces,
      total: data.size || spaces.length,
      cursor: data._links?.next ? "has_more" : undefined,
    };
  } catch (error) {
    logger.error("Error listing spaces:", error);
    throw error;
  }
}

// Register the tool with MCP Server
export const registerListSpacesTool = (server: McpServer) => {
  server.tool(
    "listSpaces",
    "List Confluence spaces with optional filtering by type or status. Supports pagination.",
    listSpacesSchema.shape,
    async (params: ListSpacesParams, context: Record<string, any>) => {
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

        const result = await listSpacesHandler(params, config);

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
              text: `Error listing spaces: ${
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
