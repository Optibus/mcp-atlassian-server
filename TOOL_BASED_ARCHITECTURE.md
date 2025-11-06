# Tool-Based Architecture for MCP Atlassian Server

## Overview

This document describes the refactored architecture that prioritizes **tools over resources** for better LLM discoverability and ease of use.

### Why Tools Over Resources?

**Observation**: LLMs (including Claude/Cursor) have an easier time discovering and using **tools** compared to **resources**.

**Reasons:**

1. **Simpler Discovery**: `listTools()` returns a flat list of available commands
2. **Clear Intent**: Tool names like `getPage` are more intuitive than resource URIs like `confluence://pages/{pageId}`
3. **Better Documentation**: Tools have explicit parameter schemas that LLMs can understand
4. **No URI Construction**: LLMs don't need to figure out URI patterns or parameter encoding
5. **Consistent Interface**: All operations follow the same tool call pattern

### Architecture Decision

**Before (Resource-Based):**

```typescript
// LLM had to:
// 1. Call list_mcp_resources to discover confluence://pages/{pageId}
// 2. Understand URI template syntax
// 3. Construct URI: confluence://pages/2771255297
// 4. Call fetch_mcp_resource with the URI
```

**After (Tool-Based):**

```typescript
// LLM simply:
// 1. Call listTools() to see "getPage" tool
// 2. Call getPage({ pageId: "2771255297" })
```

## New Read-Only Tools

### Confluence Tools

#### 1. `getPage`

**Purpose**: Get a Confluence page by ID with its content

**Parameters:**

- `pageId` (required): Page ID (e.g., "2771255297")
- `bodyFormat` (optional): "storage", "atlas_doc_format", or "view" (default: "storage")

**Returns:**

- Page details: id, title, status, body content, version, created date, URL

**Example:**

```json
{
  "pageId": "2771255297",
  "bodyFormat": "storage"
}
```

#### 2. `listPages`

**Purpose**: List Confluence pages with optional filtering

**Parameters:**

- `spaceId` (optional): Filter by space ID
- `title` (optional): Filter by page title (partial match)
- `status` (optional): "current", "archived", or "deleted"
- `limit` (optional): Max results (default: 25)
- `cursor` (optional): Pagination cursor

**Returns:**

- Array of pages with id, title, status, spaceId, URL
- Total count and pagination cursor

#### 3. `getSpace`

**Purpose**: Get a Confluence space by ID

**Parameters:**

- `spaceId` (required): Space ID (e.g., "250544132")

**Returns:**

- Space details: id, key, name, type, status, description, homepage

#### 4. `listSpaces`

**Purpose**: List Confluence spaces

**Parameters:**

- `type` (optional): "global" or "personal"
- `status` (optional): "current" or "archived"
- `limit` (optional): Max results (default: 25)
- `cursor` (optional): Pagination cursor

**Returns:**

- Array of spaces with id, key, name, type, status, URL
- Total count and pagination cursor

### Jira Tools

#### 1. `listIssues`

**Purpose**: Search and list Jira issues using JQL

**Parameters:**

- `jql` (optional): JQL query string
- `project` (optional): Project key filter (e.g., "OPS")
- `status` (optional): Status filter (e.g., "Open")
- `assignee` (optional): Assignee filter
- `limit` (optional): Max results (default: 50, max: 100)
- `startAt` (optional): Starting index for pagination (default: 0)

**Returns:**

- Array of issues with key, summary, status, type, priority, assignee, dates, URL
- Total count, pagination info, and JQL query used

**Example:**

```json
{
  "project": "OPS",
  "status": "Open",
  "limit": 10
}
```

#### 2. `listProjects`

**Purpose**: List all accessible Jira projects

**Parameters:**

- `type` (optional): "software" or "business"

**Returns:**

- Array of projects with id, key, name, type, lead, URL
- Total count

#### 3. `getProject`

**Purpose**: Get detailed information about a Jira project

**Parameters:**

- `projectKey` (required): Project key (e.g., "OPS")

**Returns:**

- Project details: id, key, name, description, type, lead info, URL

## Tool Organization

The tools are organized in `src/tools/index.ts` with clear separation:

```typescript
export function registerAllTools(server: McpServer) {
  // === Read-Only Tools (Query/Retrieval) ===

  // Confluence read tools
  registerGetPageTool(server);
  registerListPagesTool(server);
  registerGetSpaceTool(server);
  registerListSpacesTool(server);

  // Jira read tools
  registerGetIssueTool(server);
  registerListIssuesTool(server);
  registerGetProjectTool(server);
  registerListProjectsTool(server);

  // === Write Tools (Modify/Create) ===

  // ... existing write tools ...
}
```

## Resource Status

**Resources are still registered** for backward compatibility and for clients that prefer the resource pattern. However, the primary interface is now **tool-based**.

### Resources vs Tools Trade-offs

| Aspect               | Resources                               | Tools                                    |
| -------------------- | --------------------------------------- | ---------------------------------------- |
| **Discovery**        | Requires understanding URI templates    | Simple `listTools()`                     |
| **Usage**            | Must construct URIs                     | Direct parameter passing                 |
| **LLM Friendliness** | ⭐⭐ Moderate                           | ⭐⭐⭐⭐⭐ Excellent                     |
| **Caching**          | ✅ Can be cached by URI                 | ❌ Less cacheable                        |
| **Semantics**        | RESTful, data-oriented                  | RPC-style, action-oriented               |
| **Best For**         | Large data retrieval, file-like content | Queries, searches, structured operations |

## Implementation Details

### File Structure

```
src/tools/
├── confluence/
│   ├── get-page.ts          # NEW: Read page
│   ├── list-pages.ts        # NEW: List pages
│   ├── get-space.ts         # NEW: Read space
│   ├── list-spaces.ts       # NEW: List spaces
│   ├── create-page.ts       # Existing write tool
│   ├── update-page.ts       # Existing write tool
│   └── ...
├── jira/
│   ├── get-issue.ts         # Existing read tool
│   ├── list-issues.ts       # NEW: List/search issues
│   ├── get-project.ts       # NEW: Get project details
│   ├── list-projects.ts     # NEW: List projects
│   ├── create-issue.ts      # Existing write tool
│   └── ...
└── index.ts                 # Tool registration
```

### Code Pattern

Each tool follows a consistent pattern:

```typescript
// 1. Schema definition
export const getPageSchema = z.object({
  pageId: z.string().describe("ID of the Confluence page"),
  // ... more parameters
});

// 2. Handler function
export async function getPageHandler(
  params: GetPageParams,
  config: AtlassianConfig
): Promise<GetPageResult> {
  // Implementation
}

// 3. Tool registration
export const registerGetPageTool = (server: McpServer) => {
  server.tool(
    "getPage",
    "Get a Confluence page by ID...",
    getPageSchema.shape,
    async (params, context) => {
      // Call handler and format response
    }
  );
};
```

## Testing

### Manual Testing with Cursor

1. **Restart the MCP server** in Cursor (reload or restart Cursor)
2. **List tools**: Type "show me available Atlassian tools"
3. **Test a read tool**:
   ```
   Use the getPage tool to get content of Confluence page 2771255297
   ```
4. **Test a search tool**:
   ```
   Use listIssues to find all open issues in project OPS
   ```

### Automated Testing

```bash
# Build
npm run build

# Run test client (if environment is configured)
cd dev_mcp-atlassian-test-client
node dist/list-mcp-inventory.js
```

## Migration Guide

### For LLMs/Clients

**Old way (Resources):**

```
1. list_mcp_resources → find confluence://pages/{pageId}
2. fetch_mcp_resource --uri confluence://pages/2771255297
```

**New way (Tools):**

```
1. List tools → find "getPage"
2. Call getPage with { pageId: "2771255297" }
```

### For Developers

**Adding a new read operation:**

1. Create tool file: `src/tools/{product}/{action}.ts`
2. Define schema with zod
3. Implement handler function
4. Register tool with MCP server
5. Import and register in `src/tools/index.ts`
6. Build and test

## Benefits

✅ **Better LLM Experience**: Tools are easier to discover and use
✅ **Clear Semantics**: Action-based naming (get, list, create, update)
✅ **Type Safety**: Zod schemas provide runtime validation
✅ **Consistency**: All operations follow the same pattern
✅ **Backward Compatible**: Resources still work for clients that need them
✅ **Maintainable**: Clear separation between read and write operations

## Future Enhancements

### Potential Additional Tools

1. **Confluence**:

   - `getPageComments` - Get comments on a page
   - `getPageChildren` - Get child pages
   - `getPageAttachments` - Get page attachments
   - `searchPages` - Full-text search across pages

2. **Jira**:

   - `getIssueComments` - Get comments on an issue
   - `getIssueTransitions` - Get available transitions
   - `listBoards` - List all boards
   - `getBoardIssues` - Get issues on a board
   - `listFilters` - List saved filters
   - `searchIssues` - Advanced JQL search with more options

3. **Cross-Product**:
   - `search` - Universal search across Confluence and Jira
   - `getRecentActivity` - Recent changes/updates
   - `getUser` - Get user information

## Performance Considerations

### Tools vs Resources

- **Tools**: Execute on-demand, fresh data every time
- **Resources**: Could be cached by clients (though current implementation doesn't cache)

### Optimization Strategies

1. **Pagination**: All list tools support pagination
2. **Filtering**: Apply filters server-side to reduce data transfer
3. **Field Selection**: Future enhancement to specify which fields to return
4. **Batch Operations**: Future enhancement for bulk reads

## Conclusion

The tool-based architecture provides a more intuitive and LLM-friendly interface while maintaining backward compatibility with the resource-based approach. This makes the MCP Atlassian server more accessible and easier to use for both AI assistants and human developers.

---

**Author**: Hinnerk (with Cursor AI)  
**Date**: November 6, 2025  
**Version**: 2.2.0
