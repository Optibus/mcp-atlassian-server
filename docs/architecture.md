# MCP Atlassian Server Architecture

## Overview

MCP Atlassian Server is a Model Context Protocol (MCP) server that connects AI agents (like Cursor, Cline, Claude Desktop) to Atlassian Jira and Confluence through a standardized interface.

## Core Concepts

### Tools vs Resources

The server exposes two types of interfaces:

#### Tools (Primary Interface)

**Tools** are action-oriented commands that perform operations or retrieve data. They are the **primary and recommended** interface for interacting with the server.

**Why Tools Are Preferred:**

- **Better LLM Discovery**: Tools appear in a simple flat list with clear names
- **Intuitive Usage**: Direct parameter passing without URI construction
- **Self-Documenting**: Parameter schemas make capabilities clear
- **Consistent Interface**: All operations follow the same pattern

**Tool Categories:**

1. **Read Tools** - Query and retrieve data

   - Confluence: `getPage`, `listPages`, `getSpace`, `listSpaces`
   - Jira: `getIssue`, `listIssues`, `getProject`, `listProjects`

2. **Write Tools** - Create, update, and delete
   - Confluence: `createPage`, `updatePage`, `updatePageTitle`, `deletePage`, `addComment`, `updateFooterComment`, `deleteFooterComment`
   - Jira: `createIssue`, `updateIssue`, `transitionIssue`, `assignIssue`, `createFilter`, `updateFilter`, `deleteFilter`, `createSprint`, `startSprint`, `closeSprint`, `addIssueToSprint`, `addIssuesToBacklog`, `rankBacklogIssues`, `createDashboard`, `updateDashboard`, `addGadgetToDashboard`, `removeGadgetFromDashboard`

#### Resources (Legacy Interface)

**Resources** are URI-based read-only data access points maintained for backward compatibility.

**Resource Pattern:**

```
confluence://pages/{pageId}
jira://issues/{issueKey}
```

Resources require understanding URI templates and construction, making them less intuitive for LLMs.

### Example: Tools vs Resources

**Getting a Confluence Page:**

Using Tools (Recommended):

```typescript
getPage({ pageId: "2771255297" });
```

Using Resources (Legacy):

```typescript
// 1. Discover: list_mcp_resources
// 2. Construct: confluence://pages/2771255297
// 3. Fetch: fetch_mcp_resource
```

## System Architecture

```
┌─────────────────┐
│   AI Agent      │
│ (Cursor/Cline)  │
└────────┬────────┘
         │ MCP Protocol (stdio/JSON-RPC)
         ↓
┌─────────────────────────────────┐
│   MCP Atlassian Server          │
│                                 │
│  ┌───────────┐   ┌───────────┐ │
│  │   Tools   │   │ Resources │ │
│  │ (Primary) │   │  (Legacy) │ │
│  └─────┬─────┘   └─────┬─────┘ │
│        └─────────┬─────────────┘│
│                  ↓               │
│     ┌────────────────────────┐  │
│     │   API Utilities        │  │
│     │ - confluence-tool-api  │  │
│     │ - jira-tool-api        │  │
│     │ - jira-tool-api-agile  │  │
│     │ - jira-tool-api-v3     │  │
│     └───────────┬────────────┘  │
└─────────────────┼────────────────┘
                  │
         ┌────────┴─────────┐
         ↓                  ↓
  ┌─────────────┐    ┌─────────────┐
  │ Confluence  │    │    Jira     │
  │  API v2     │    │   API v3    │
  └─────────────┘    └─────────────┘
```

## Project Structure

```
src/
├── index.ts                    # Main server entry point
├── tools/                      # Tool implementations
│   ├── confluence/            # Confluence tools
│   │   ├── get-page.ts       # Read: Get page by ID
│   │   ├── list-pages.ts     # Read: List pages
│   │   ├── get-space.ts      # Read: Get space by ID
│   │   ├── list-spaces.ts    # Read: List spaces
│   │   ├── create-page.ts    # Write: Create page
│   │   ├── update-page.ts    # Write: Update page
│   │   └── ...
│   ├── jira/                  # Jira tools
│   │   ├── get-issue.ts      # Read: Get issue
│   │   ├── list-issues.ts    # Read: Search issues
│   │   ├── get-project.ts    # Read: Get project
│   │   ├── list-projects.ts  # Read: List projects
│   │   ├── create-issue.ts   # Write: Create issue
│   │   └── ...
│   └── index.ts              # Tool registration
├── resources/                 # Resource implementations (legacy)
│   ├── confluence/
│   ├── jira/
│   └── resource-definitions.ts
├── utils/                     # Shared utilities
│   ├── atlassian-api-base.ts    # Base API client
│   ├── confluence-tool-api.ts   # Confluence API wrapper
│   ├── jira-tool-api.ts         # Jira API wrapper
│   ├── jira-tool-api-agile.ts   # Jira Agile API
│   ├── jira-tool-api-v3.ts      # Jira v3 API
│   ├── logger.ts                # Logging utility
│   ├── error-handler.ts         # Error handling
│   └── mcp-core.ts              # MCP utilities
└── schemas/                   # Zod validation schemas
    ├── confluence.ts
    ├── jira.ts
    └── common.ts
```

## Tool Implementation Pattern

All tools follow a consistent pattern:

```typescript
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// 1. Define parameter schema
export const toolNameSchema = z.object({
  param1: z.string().describe("Description"),
  param2: z.number().optional().describe("Optional parameter"),
});

// 2. Infer types
type ToolParams = z.infer<typeof toolNameSchema>;

// 3. Implement handler
export async function toolNameHandler(
  params: ToolParams,
  config: AtlassianConfig
): Promise<ToolResult> {
  // Implementation using API utilities
  const data = await someApiCall(config, params);
  return formatResult(data);
}

// 4. Register with MCP server
export const registerToolNameTool = (server: McpServer) => {
  server.tool(
    "toolName",
    "Clear description of what this tool does",
    toolNameSchema.shape,
    async (params, context) => {
      const config =
        context?.atlassianConfig ?? Config.getAtlassianConfigFromEnv();
      const result = await toolNameHandler(params, config);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
};
```

## API Layer

### Confluence API (`confluence-tool-api.ts`)

- Wraps Confluence REST API v2
- Handles storage format for page content
- Manages authentication and error handling

### Jira API (`jira-tool-api.ts`, `jira-tool-api-v3.ts`, `jira-tool-api-agile.ts`)

- **v3 API**: Modern Jira operations (issues, projects, filters, dashboards)
- **Agile API**: Scrum/Kanban boards, sprints, backlogs
- **JQL**: Advanced issue searching with Jira Query Language

## Server Initialization

The server (`src/index.ts`) uses a **proxy pattern** to inject Atlassian configuration into all handlers:

1. **Load Config**: Reads `ATLASSIAN_*` environment variables
2. **Create Proxies**: Wraps `server.tool()` and `server.resource()` methods
3. **Inject Context**: Adds `atlassianConfig` to every handler's context
4. **Register**: Calls `registerAllTools()` and `registerAllResources()`
5. **Connect**: Starts stdio transport with `server.connect()`

This ensures every tool/resource handler receives authenticated API config automatically.

## Communication Protocol

### MCP over stdio

The server uses **stdio transport** for MCP communication:

- **stdout**: JSON-RPC protocol messages (MCP)
- **stderr**: Logging and debugging output
- **stdin**: Receives commands from AI agent

### Important: Logging

All logging **must** go to stderr to avoid interfering with the JSON-RPC protocol on stdout. The logger automatically:

- Writes to `process.stderr`
- Disables ANSI colors when running as MCP server (non-TTY)
- Logs to file: `logs/mcp-server.log` for debugging

## Configuration

### Environment Variables

Required:

```bash
ATLASSIAN_SITE_NAME=your-site.atlassian.net
ATLASSIAN_USER_EMAIL=your-email@example.com
ATLASSIAN_API_TOKEN=your-api-token
```

Optional:

```bash
MCP_SERVER_NAME=phuc-nt/mcp-atlassian-server  # default
MCP_SERVER_VERSION=1.0.0  # default
LOG_LEVEL=info  # debug, info, warn, error
```

### MCP Client Configuration

For Cursor, add to MCP settings (`~/.cursor/config.json`):

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "node",
      "args": ["/path/to/mcp-atlassian-server/dist/index.js"],
      "env": {
        "ATLASSIAN_SITE_NAME": "your-site.atlassian.net",
        "ATLASSIAN_USER_EMAIL": "your@email.com",
        "ATLASSIAN_API_TOKEN": "your-token"
      }
    }
  }
}
```

## Error Handling

The server provides structured error responses:

```typescript
{
  error: "Description of what went wrong",
  details: {
    statusCode: 404,
    endpoint: "/rest/api/3/issue/XXX-123",
    // Additional context
  }
}
```

Common error scenarios:

- **401 Unauthorized**: Invalid API token or expired credentials
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource doesn't exist or user lacks access
- **410 Gone**: API endpoint deprecated (check docs for replacement)

## Security

1. **API Tokens**: Store securely, never commit to version control
2. **Permissions**: Server inherits permissions of the API token owner
3. **Data Access**: Only accesses data the token owner can access
4. **Local-First**: Designed for personal/development use, not multi-tenant

## Performance Considerations

### Pagination

List operations support pagination:

- Confluence: `limit` and `cursor` parameters
- Jira: `limit` and `startAt` parameters

### Field Selection

Jira APIs support field selection to reduce payload:

```typescript
listIssues({
  project: "OPS",
  // Internally requests only needed fields
});
```

### Rate Limiting

Atlassian Cloud APIs have rate limits:

- Standard: ~5 requests/second per user
- The server doesn't implement client-side rate limiting
- Monitor your usage in Atlassian admin console

## Testing

### Manual Testing

```bash
# Build
npm run build

# Run server directly
node dist/index.js

# Test with MCP client (Cursor/Cline)
# Reload MCP server in client
```

### Automated Testing

```bash
# Unit tests
npm test

# E2E tests (requires .env configuration)
npm run test:e2e
```

## Extending the Server

### Adding a New Read Tool

1. Create file: `src/tools/{product}/{action}.ts`
2. Define schema and handler
3. Export registration function
4. Register in `src/tools/index.ts`
5. Build and test

Example:

```typescript
// src/tools/confluence/get-page-comments.ts
export const getPageCommentsSchema = z.object({
  pageId: z.string().describe("Page ID"),
});

export async function getPageCommentsHandler(
  params: z.infer<typeof getPageCommentsSchema>,
  config: AtlassianConfig
) {
  // Implementation
}

export const registerGetPageCommentsTool = (server: McpServer) => {
  server.tool(
    "getPageComments",
    "Get comments on a Confluence page",
    getPageCommentsSchema.shape,
    async (params, context) => {
      /* ... */
    }
  );
};
```

### Adding a New Write Tool

Same pattern as read tools, but ensure:

- Clear documentation of side effects
- Proper error handling for conflicts
- Return meaningful success/failure messages

## Best Practices

1. **Use Tools**: Prefer tools over resources for new implementations
2. **Validate Inputs**: Use Zod schemas for all parameters
3. **Handle Errors**: Provide clear, actionable error messages
4. **Log Appropriately**: Use logger with appropriate levels
5. **Document Parameters**: Add `.describe()` to all schema fields
6. **Test Changes**: Build and test with real MCP client before committing

## Troubleshooting

### "Tool not found"

- Rebuild: `npm run build`
- Restart MCP server in client
- Check tool is registered in `src/tools/index.ts`

### "Invalid configuration"

- Verify environment variables
- Check API token is valid
- Ensure site name doesn't include `https://`

### JSON parsing errors

- Check logger only writes to stderr
- Verify no console.log in production code
- Check `process.stdout` not used for logging

### API 410 Gone errors

- API endpoint deprecated
- Check Atlassian changelog for replacement
- Update to new endpoint in API utility files

## Resources

- [Atlassian REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Confluence REST API v2](https://developer.atlassian.com/cloud/confluence/rest/v2/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Project Repository](https://github.com/phuc-nt/mcp-atlassian-server)
