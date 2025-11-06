# Hotfix: Resource Handler Conflict

## Issue

The initial implementation added a custom `ListResourcesRequestSchema` handler that conflicted with the MCP SDK's built-in resource management, causing the error:

```
Error: Server does not support resources (required for resources/list)
```

## Root Cause

The `McpServer` class from the MCP SDK already manages resource listing automatically through the `list` callbacks in `ResourceTemplate` objects. By adding a custom handler on `server.server.setRequestHandler()`, we were overriding the SDK's internal resource management.

## Fix Applied

**Removed** the custom `ListResourcesRequestSchema` handler from `src/index.ts`.

The SDK will now automatically:

1. Collect all `list` callbacks from registered `ResourceTemplate` objects
2. Call them when `list_mcp_resources` is invoked
3. Aggregate the results and return them

## Files Modified

- `src/index.ts` - Removed custom `ListResourcesRequestSchema` handler and unused imports

## How Resources Work Now

The existing resource registration code already has proper `list` callbacks:

```typescript
server.resource(
  "confluence-page-details-v2",
  new ResourceTemplate("confluence://pages/{pageId}", {
    list: async (_extra) => ({
      resources: [
        {
          uri: "confluence://pages/{pageId}",
          name: "Confluence Page Details",
          description: "Get details for a specific Confluence page...",
          mimeType: "application/json",
        },
      ],
    }),
  }),
  async (uri, { pageId }, extra) => {
    // Handler implementation
  }
);
```

The MCP SDK automatically:

- Collects all these `list` callbacks
- Invokes them when the client calls `list_mcp_resources`
- Returns the aggregated list of all resources

## Testing

After rebuilding and restarting the MCP server:

```bash
# Rebuild
npm run build

# Restart the MCP server in Cursor/Claude Desktop
# Then test:
list_mcp_resources --server atlassian
```

**Expected**: Should return a list of all registered resources from all the `ResourceTemplate` `list` callbacks.

## Status

✅ Build succeeds  
⏳ Requires MCP server restart in Cursor/Claude Desktop to take effect

## Notes

- The `src/resources/resource-definitions.ts` file is still useful for documentation
- The `src/utils/resource-registry.ts` can be used for future enhancements
- The SDK handles resource discovery automatically - no custom handler needed

---

**Date**: November 6, 2025  
**Status**: Fixed - Ready for testing after server restart
