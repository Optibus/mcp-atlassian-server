import { z } from "zod";
import { AtlassianConfig } from "../../utils/atlassian-api-base.js";
import { Logger } from "../../utils/logger.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConfluenceSpaceV2 } from "../../utils/confluence-resource-api.js";
import { Config } from "../../utils/mcp-helpers.js";

const logger = Logger.getLogger("ConfluenceTools:getSpace");

// Input parameter schema
export const getSpaceSchema = z.object({
  spaceId: z
    .string()
    .describe(
      "ID of the Confluence space to retrieve (numeric ID, e.g., 250544132)"
    ),
});

type GetSpaceParams = z.infer<typeof getSpaceSchema>;

interface GetSpaceResult {
  id: string;
  key: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  homepageId?: string;
  url: string;
}

/**
 * Get a Confluence space by ID
 */
export async function getSpaceHandler(
  params: GetSpaceParams,
  config: AtlassianConfig
): Promise<GetSpaceResult> {
  try {
    logger.info(`Getting Confluence space: ${params.spaceId}`);

    const space = await getConfluenceSpaceV2(config, params.spaceId);

    return {
      id: space.id,
      key: space.key,
      name: space.name,
      type: space.type,
      status: space.status,
      description: space.description?.plain?.value,
      homepageId: space.homepageId,
      url: `${config.baseUrl}/wiki/spaces/${space.key}`,
    };
  } catch (error) {
    logger.error(`Error getting space ${params.spaceId}:`, error);
    throw error;
  }
}

// Register the tool with MCP Server
export const registerGetSpaceTool = (server: McpServer) => {
  server.tool(
    "getSpace",
    "Get a Confluence space by ID. Returns space details including key, name, type, and homepage.",
    getSpaceSchema.shape,
    async (params: GetSpaceParams, context: Record<string, any>) => {
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

        const result = await getSpaceHandler(params, config);

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
              text: `Error getting space: ${
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
