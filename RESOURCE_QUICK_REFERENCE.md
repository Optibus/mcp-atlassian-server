# MCP Atlassian Resources - Quick Reference

## Discovery

List all available resources:

```
list_mcp_resources --server atlassian
```

## Confluence Resources

### Spaces

```bash
# List all spaces
fetch_mcp_resource --server atlassian --uri confluence://spaces

# Get specific space details (by numeric ID)
fetch_mcp_resource --server atlassian --uri confluence://spaces/250544132

# List pages in a space (by numeric ID)
fetch_mcp_resource --server atlassian --uri confluence://spaces/250544132/pages
```

### Pages

```bash
# List all pages (recent)
fetch_mcp_resource --server atlassian --uri confluence://pages

# Get specific page content
fetch_mcp_resource --server atlassian --uri confluence://pages/2771255297

# Get page comments
fetch_mcp_resource --server atlassian --uri confluence://pages/2771255297/comments

# Get child pages
fetch_mcp_resource --server atlassian --uri confluence://pages/2771255297/children

# Get page ancestors (breadcrumb)
fetch_mcp_resource --server atlassian --uri confluence://pages/2771255297/ancestors

# Get page attachments
fetch_mcp_resource --server atlassian --uri confluence://pages/2771255297/attachments

# Get page version history
fetch_mcp_resource --server atlassian --uri confluence://pages/2771255297/versions

# Get page labels
fetch_mcp_resource --server atlassian --uri confluence://pages/2771255297/labels
```

## Jira Resources

### Projects

```bash
# List all projects
fetch_mcp_resource --server atlassian --uri jira://projects

# Get specific project details
fetch_mcp_resource --server atlassian --uri jira://projects/OPS

# Get project roles
fetch_mcp_resource --server atlassian --uri jira://projects/OPS/roles
```

### Issues

```bash
# List/search issues
fetch_mcp_resource --server atlassian --uri jira://issues

# Get specific issue
fetch_mcp_resource --server atlassian --uri jira://issues/OPS-12345

# Get issue comments
fetch_mcp_resource --server atlassian --uri jira://issues/OPS-12345/comments

# Get available transitions
fetch_mcp_resource --server atlassian --uri jira://issues/OPS-12345/transitions
```

## Common Use Cases

### 1. Find a Page and Read Its Content

```bash
# Step 1: Search for pages
fetch_mcp_resource --server atlassian --uri confluence://pages

# Step 2: Get specific page content
fetch_mcp_resource --server atlassian --uri confluence://pages/{pageId}
```

### 2. Browse Space Hierarchy

```bash
# Step 1: List all spaces
fetch_mcp_resource --server atlassian --uri confluence://spaces

# Step 2: Get pages in a space
fetch_mcp_resource --server atlassian --uri confluence://spaces/{spaceId}/pages

# Step 3: Get a specific page
fetch_mcp_resource --server atlassian --uri confluence://pages/{pageId}

# Step 4: Check page children
fetch_mcp_resource --server atlassian --uri confluence://pages/{pageId}/children
```

### 3. Track Jira Issue

```bash
# Step 1: Find issue
fetch_mcp_resource --server atlassian --uri jira://issues/OPS-12345

# Step 2: Read comments
fetch_mcp_resource --server atlassian --uri jira://issues/OPS-12345/comments

# Step 3: Check available transitions
fetch_mcp_resource --server atlassian --uri jira://issues/OPS-12345/transitions
```

### 4. Audit Project Setup

```bash
# Step 1: List all projects
fetch_mcp_resource --server atlassian --uri jira://projects

# Step 2: Get project details
fetch_mcp_resource --server atlassian --uri jira://projects/OPS

# Step 3: Check roles
fetch_mcp_resource --server atlassian --uri jira://projects/OPS/roles
```

## Tools vs Resources

### Use Resources For:

- ✅ Reading/viewing data
- ✅ Listing items
- ✅ Browsing/discovery
- ✅ Getting current state

### Use Tools For:

- ✅ Creating new items
- ✅ Updating existing items
- ✅ Deleting items
- ✅ Performing actions (transitions, assignments)

## Examples: Resources vs Tools

**Reading a page** (use resource):

```bash
fetch_mcp_resource --server atlassian --uri confluence://pages/2771255297
```

**Creating a page** (use tool):

```bash
mcp_atlassian_createPage --spaceId 250544132 --title "New Page" --content "<p>Content</p>" --parentId 2771255297
```

**Reading an issue** (use resource):

```bash
fetch_mcp_resource --server atlassian --uri jira://issues/OPS-12345
```

**Updating an issue** (use tool):

```bash
mcp_atlassian_updateIssue --issueIdOrKey OPS-12345 --summary "Updated summary"
```

## Resource Response Format

All resources return JSON with metadata:

```json
{
  "contents": [
    {
      "uri": "confluence://pages/2771255297",
      "mimeType": "application/json",
      "text": "{\"metadata\":{...}, \"page\":{...}}"
    }
  ]
}
```

The `text` field contains stringified JSON with:

- `metadata`: Pagination, counts, links
- Data field (e.g., `page`, `pages`, `issue`, `issues`)

## Finding IDs

### Space ID

```bash
# List spaces to find IDs
fetch_mcp_resource --server atlassian --uri confluence://spaces
# Look for: "id": "250544132"
```

### Page ID

```bash
# List pages to find IDs
fetch_mcp_resource --server atlassian --uri confluence://pages
# Look for: "id": "2771255297"

# Or from space pages
fetch_mcp_resource --server atlassian --uri confluence://spaces/250544132/pages
```

### Project Key

```bash
# List projects to find keys
fetch_mcp_resource --server atlassian --uri jira://projects
# Look for: "key": "OPS"
```

### Issue Key

```bash
# List issues to find keys
fetch_mcp_resource --server atlassian --uri jira://issues
# Look for: "key": "OPS-12345"
```

## Tips

1. **Always start with list endpoints** (spaces, pages, projects, issues) to discover IDs
2. **URI templates use `{}`** - replace with actual values (e.g., `{pageId}` → `2771255297`)
3. **Space IDs are numeric** - not space keys (use `250544132`, not `DAS`)
4. **Resources are read-only** - use tools for modifications
5. **Check available resources** - use `list_mcp_resources` to see all patterns

## Error Messages

If you get an error, it will include:

- Valid resource patterns
- Examples of correct URIs
- Suggestions for alternatives (tools vs resources)

Example error:

```
Resource not found: confluence://page/invalid

Valid patterns:
  - confluence://pages/{pageId}

Example: confluence://pages/2771255297
```

---

**For more details**, see `RESOURCE_IMPROVEMENTS.md`
