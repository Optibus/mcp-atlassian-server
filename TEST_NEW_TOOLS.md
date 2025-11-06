# Testing New Read Tools

## Quick Test Guide

### Test 1: List Available Tools

**Action**: In Cursor, ask:

```
Show me all available Atlassian MCP tools
```

**Expected**: Should see the new tools:

- `getPage` - Get a Confluence page by ID with its content
- `listPages` - List Confluence pages with optional filtering
- `getSpace` - Get a Confluence space by ID
- `listSpaces` - List Confluence spaces
- `listIssues` - Search and list Jira issues using JQL
- `listProjects` - List all accessible Jira projects
- `getProject` - Get detailed information about a Jira project

### Test 2: Get Confluence Page (From Our Earlier Test)

**Action**:

```
Use the getPage tool to fetch Confluence page 2771255297
```

**Expected**: Should return page content including:

- Title: "How to..."
- Body content with page tree macros
- Version information
- Space ID: 250544132

### Test 3: List Confluence Spaces

**Action**:

```
Use listSpaces to show all Confluence spaces in the Optibus instance
```

**Expected**: List of spaces with names, keys, and types

### Test 4: List Jira Issues

**Action**:

```
Use listIssues to find all open issues in the OPS project
```

**Expected**: List of issues with:

- Issue keys (e.g., OPS-12345)
- Summaries
- Status: "Open"
- Assignees
- Creation/update dates

**Alternative test**:

```
Use listIssues with JQL: "project = OPS AND assignee = currentUser() ORDER BY updated DESC" and limit 5
```

### Test 5: List Jira Projects

**Action**:

```
Use listProjects to show all accessible Jira projects
```

**Expected**: List of projects with keys, names, and project leads

### Test 6: Get Specific Project

**Action**:

```
Use getProject to get details about the OPS project
```

**Expected**: Detailed project information including description and lead

## Verification Checklist

After MCP server restart:

- [ ] All 7 new read tools appear in tool list
- [ ] `getPage` works with valid page ID
- [ ] `listPages` returns results (with/without filters)
- [ ] `getSpace` works with valid space ID
- [ ] `listSpaces` returns spaces
- [ ] `listIssues` works with/without JQL
- [ ] `listProjects` returns projects
- [ ] `getProject` works with valid project key
- [ ] Error messages are clear for invalid inputs
- [ ] All tools return properly formatted JSON

## Common Issues

### Issue: "Tool not found"

**Solution**: Rebuild and restart MCP server

```bash
npm run build
# Then restart Cursor or reload MCP server
```

### Issue: "Invalid or missing Atlassian configuration"

**Solution**: Check environment variables in Cursor settings

- `ATLASSIAN_SITE_NAME`
- `ATLASSIAN_USER_EMAIL`
- `ATLASSIAN_API_TOKEN`

### Issue: "Page/Project not found"

**Solution**: Verify the ID/key exists and you have permission

## Performance Notes

- `listIssues` with no filters may be slow on large instances (use project filter)
- `listPages` without spaceId filter may return many results (use limit parameter)
- All list operations support pagination for large result sets

## Next Steps

After successful testing:

1. Document any issues encountered
2. Consider adding more specialized read tools
3. Add batch operations if needed
4. Implement caching for frequently accessed data
