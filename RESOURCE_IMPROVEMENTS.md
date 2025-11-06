# MCP Resource Discovery Improvements

## Summary

This update fixes the resource discovery issues in the Atlassian MCP server. Previously, `list_mcp_resources` would return empty results even though resources were available. Now it properly lists all available resource patterns.

## Changes Made

### 1. New Files Created

#### `src/utils/resource-registry.ts`

- **Purpose**: Central registry for tracking MCP resources
- **Functionality**: Provides a singleton registry to track all resource definitions
- **Usage**: Can be extended in the future for dynamic resource registration

#### `src/resources/resource-definitions.ts`

- **Purpose**: Centralized definition of ALL available resources
- **Contains**:
  - **Confluence Resources**: 11 resource patterns
    - Collection resources (static URIs): `confluence://spaces`, `confluence://pages`
    - Individual resources (URI templates): `confluence://spaces/{spaceId}`, `confluence://pages/{pageId}`, etc.
  - **Jira Resources**: 7 resource patterns
    - Collection resources: `jira://projects`, `jira://issues`
    - Individual resources: `jira://projects/{projectKey}`, `jira://issues/{issueKey}`, etc.

### 2. Modified Files

#### `src/index.ts`

**Added**:

- Import for `ListResourcesRequestSchema` from MCP SDK
- Import for `getAllResourceDefinitions` from resource-definitions
- Global `ListResourcesRequest` handler that returns all resource definitions

**Key Implementation**:

```typescript
server.server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const allResources = getAllResourceDefinitions();
  return {
    resources: allResources,
  };
});
```

**Note**: Uses `server.server` to access the underlying `Server` instance from the `McpServer` wrapper.

#### `dev_mcp-atlassian-test-client/src/list-mcp-inventory.ts`

**Fixed**: Updated hardcoded server path to use relative path resolution

## Resource URI Patterns

### Confluence Resources

#### Collections (Static URIs)

- `confluence://spaces` - List all spaces
- `confluence://pages` - List all pages

#### Individual Items (URI Templates)

- `confluence://spaces/{spaceId}` - Get space by numeric ID
  - Example: `confluence://spaces/250544132`
- `confluence://spaces/{spaceId}/pages` - List pages in a space
  - Example: `confluence://spaces/250544132/pages`
- `confluence://pages/{pageId}` - Get page details with content
  - Example: `confluence://pages/2771255297`
- `confluence://pages/{pageId}/comments` - List page comments
- `confluence://pages/{pageId}/children` - List child pages
- `confluence://pages/{pageId}/ancestors` - List ancestor pages (breadcrumb)
- `confluence://pages/{pageId}/attachments` - List attachments
- `confluence://pages/{pageId}/versions` - List page versions/history
- `confluence://pages/{pageId}/labels` - List page labels

### Jira Resources

#### Collections (Static URIs)

- `jira://projects` - List all projects
- `jira://issues` - List/search issues (supports JQL)

#### Individual Items (URI Templates)

- `jira://projects/{projectKey}` - Get project details
  - Example: `jira://projects/OPS`
- `jira://projects/{projectKey}/roles` - List project roles
  - Example: `jira://projects/OPS/roles`
- `jira://issues/{issueKey}` - Get issue details
  - Example: `jira://issues/OPS-12345`
- `jira://issues/{issueKey}/comments` - List issue comments
  - Example: `jira://issues/OPS-12345/comments`
- `jira://issues/{issueKey}/transitions` - List available transitions
  - Example: `jira://issues/OPS-12345/transitions`

## Testing

### Test 1: List Resources

**Command** (using Cursor or Claude):

```
list_mcp_resources --server atlassian
```

**Expected Result**:

```json
{
  "resources": [
    {
      "uri": "confluence://spaces",
      "name": "Confluence Spaces",
      "description": "List and search all Confluence spaces...",
      "mimeType": "application/json"
    },
    {
      "uriTemplate": "confluence://pages/{pageId}",
      "name": "Confluence Page Details",
      "description": "Get details and content for a specific Confluence page...",
      "mimeType": "application/json"
    }
    // ... (total 18 resources)
  ]
}
```

### Test 2: Fetch Individual Page

**Command**:

```
fetch_mcp_resource --server atlassian --uri confluence://pages/2771255297
```

**Expected Result**: Page content with metadata, body, version, etc.

### Test 3: Fetch Space Pages

**Command**:

```
fetch_mcp_resource --server atlassian --uri confluence://spaces/250544132/pages
```

**Expected Result**: Array of pages in the specified space

### Test 4: Fetch Jira Issue

**Command**:

```
fetch_mcp_resource --server atlassian --uri jira://issues/OPS-12345
```

**Expected Result**: Issue details including summary, description, status, assignee, etc.

## Error Handling

When an invalid URI is provided, the existing resource handlers in the MCP SDK will automatically provide helpful error messages based on the registered patterns.

## Architecture Notes

### How It Works

1. **Resource Registration**: Individual resource handlers are registered in their respective files using `server.resource()` with `ResourceTemplate` patterns
2. **Resource Discovery**: The new `ListResourcesRequest` handler aggregates all resource definitions from `resource-definitions.ts`
3. **Resource Access**: The MCP SDK automatically routes `ReadResourceRequest` to the appropriate handler based on URI pattern matching

### Why This Approach

- **Centralized Discovery**: All resources are listed in one place for easy discovery
- **Existing Handlers**: Uses the existing resource handler implementations (no changes needed)
- **MCP SDK Routing**: Leverages the SDK's built-in URI pattern matching
- **Type Safety**: Resource definitions are strongly typed

## Benefits

✅ **Resource Discovery**: `list_mcp_resources` now returns all available resources

✅ **Clear Documentation**: Each resource has a descriptive name and detailed description

✅ **URI Templates**: LLMs can understand dynamic patterns like `{pageId}` and `{issueKey}`

✅ **Better UX**: Users can discover available resources without guessing URIs

✅ **Maintainable**: Adding new resources requires updating one central file

## Backward Compatibility

✅ **Fully Compatible**: Existing resource handlers continue to work unchanged

✅ **No Breaking Changes**: All existing resource URIs still work

✅ **Tool Access**: All tools remain accessible and unchanged

## Future Improvements

Potential enhancements for future versions:

1. **Query Parameters**: Support filtering via query params (e.g., `?status=open&limit=50`)
2. **Caching**: Cache frequently accessed resources with TTL
3. **Rate Limiting**: Track and warn about API rate limits
4. **Metadata**: Include additional metadata (retrieved_at, rate_limit_remaining)
5. **Dynamic Registration**: Allow resources to self-register at runtime
6. **Space Key Support**: Support space keys in addition to space IDs for Confluence

## Build and Deploy

```bash
# Build the server
npm run build

# Test locally
node dist/index.js

# Or use the test client
cd dev_mcp-atlassian-test-client
npm run build
node dist/list-mcp-inventory.js
```

## Configuration

Ensure your `.env` file contains:

```env
ATLASSIAN_SITE_NAME=your-site.atlassian.net
ATLASSIAN_USER_EMAIL=your-email@example.com
ATLASSIAN_API_TOKEN=your-api-token
```

## Verification

After building and restarting the MCP server, you should see in the logs:

```
[INFO][MCP:Server] Handling ListResourcesRequest
[INFO][MCP:Server] Returning 18 resource definitions
```

---

**Author**: Cursor AI Assistant  
**Date**: November 6, 2025  
**Version**: 2.1.1+
