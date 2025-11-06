import { z } from "zod";
import { AtlassianConfig } from "../../utils/atlassian-api-base.js";
import { Logger } from "../../utils/logger.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConfluencePageV2 } from "../../utils/confluence-resource-api.js";
import { Config } from "../../utils/mcp-helpers.js";

const logger = Logger.getLogger("ConfluenceTools:getPage");

// Input parameter schema
export const getPageSchema = z.object({
  pageId: z
    .string()
    .describe("ID of the Confluence page to retrieve (e.g., 2771255297)"),
  bodyFormat: z
    .enum(["storage", "atlas_doc_format", "view"])
    .optional()
    .default("storage")
    .describe(
      'Format for the page body content. Default is "storage" (Confluence storage format)'
    ),
});

type GetPageParams = z.infer<typeof getPageSchema>;

interface GetPageResult {
  id: string;
  title: string;
  status: string;
  body: string;
  bodyType: string;
  spaceId?: string;
  version: {
    number: number;
    authorId: string;
    createdAt: string;
  };
  createdAt: string;
  url: string;
}

/**
 * Get a Confluence page by ID with its content
 */
export async function getPageHandler(
  params: GetPageParams,
  config: AtlassianConfig
): Promise<GetPageResult> {
  try {
    logger.info(`Getting Confluence page: ${params.pageId}`);

    const page = await getConfluencePageV2(
      config,
      params.pageId,
      params.bodyFormat || "storage"
    );

    // Extract body content
    let bodyValue = "";
    let bodyType = params.bodyFormat || "storage";

    if (page.body && typeof page.body === "object") {
      const format = params.bodyFormat || "storage";
      if (
        format in page.body &&
        page.body[format] &&
        typeof page.body[format] === "object"
      ) {
        bodyValue = page.body[format].value || "";
        bodyType = page.body[format].representation || format;
      }
    }

    return {
      id: page.id,
      title: page.title,
      status: page.status,
      body: bodyValue,
      bodyType: bodyType,
      spaceId: page.spaceId,
      version: {
        number: page.version?.number || 1,
        authorId: page.version?.authorId || "",
        createdAt: page.version?.createdAt || "",
      },
      createdAt: page.createdAt || "",
      url: `${config.baseUrl}/wiki/pages/${page.id}`,
    };
  } catch (error) {
    logger.error(`Error getting page ${params.pageId}:`, error);
    throw error;
  }
}

// Register the tool with MCP Server
export const registerGetPageTool = (server: McpServer) => {
  server.tool(
    "getPage",
    "Get a Confluence page by ID with its content. Returns page details including title, body content, version, and metadata.",
    getPageSchema.shape,
    async (params: GetPageParams, context: Record<string, any>) => {
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

        const result = await getPageHandler(params, config);

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
              text: `Error getting page: ${
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
