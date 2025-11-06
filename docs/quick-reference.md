# Quick Reference Guide

## Using MCP Atlassian Server

### Tool-First Approach (Recommended)

The server provides **32 tools** for comprehensive Atlassian access. Tools are the primary and recommended interface.

## Confluence Tools

### Read Operations

| Tool         | Description                 | Key Parameters                        |
| ------------ | --------------------------- | ------------------------------------- |
| `getPage`    | Get page by ID with content | `pageId`, `bodyFormat`                |
| `listPages`  | List pages with filtering   | `spaceId`, `title`, `status`, `limit` |
| `getSpace`   | Get space by ID             | `spaceId`                             |
| `listSpaces` | List all spaces             | `type`, `status`, `limit`             |

### Write Operations

| Tool                  | Description         | Key Parameters                            |
| --------------------- | ------------------- | ----------------------------------------- |
| `createPage`          | Create new page     | `spaceId`, `title`, `content`, `parentId` |
| `updatePage`          | Update page content | `pageId`, `version`, `content`, `title`   |
| `updatePageTitle`     | Update page title   | `pageId`, `title`, `version`              |
| `deletePage`          | Delete page         | `pageId`                                  |
| `addComment`          | Add comment to page | `pageId`, `content`                       |
| `updateFooterComment` | Update comment      | `commentId`, `version`, `value`           |
| `deleteFooterComment` | Delete comment      | `commentId`                               |

## Jira Tools

### Read Operations

| Tool           | Description            | Key Parameters                                  |
| -------------- | ---------------------- | ----------------------------------------------- |
| `getIssue`     | Get issue details      | `issueIdOrKey`                                  |
| `listIssues`   | Search issues with JQL | `jql`, `project`, `status`, `assignee`, `limit` |
| `getProject`   | Get project details    | `projectKey`                                    |
| `listProjects` | List all projects      | `type`                                          |

### Issue Management

| Tool              | Description          | Key Parameters                                      |
| ----------------- | -------------------- | --------------------------------------------------- |
| `createIssue`     | Create new issue     | `projectKey`, `summary`, `issueType`, `description` |
| `updateIssue`     | Update issue         | `issueIdOrKey`, `summary`, `description`            |
| `transitionIssue` | Change issue status  | `issueIdOrKey`, `transitionId`                      |
| `assignIssue`     | Assign issue to user | `issueIdOrKey`, `accountId`                         |

### Sprint Management

| Tool               | Description          | Key Parameters                            |
| ------------------ | -------------------- | ----------------------------------------- |
| `createSprint`     | Create sprint        | `boardId`, `name`, `startDate`, `endDate` |
| `startSprint`      | Start sprint         | `sprintId`, `startDate`, `endDate`        |
| `closeSprint`      | Close sprint         | `sprintId`                                |
| `addIssueToSprint` | Add issues to sprint | `sprintId`, `issueKeys`                   |

### Backlog Management

| Tool                 | Description            | Key Parameters                            |
| -------------------- | ---------------------- | ----------------------------------------- |
| `addIssuesToBacklog` | Move issues to backlog | `issueKeys`, `boardId`                    |
| `rankBacklogIssues`  | Reorder backlog issues | `boardId`, `issueKeys`, `rankBeforeIssue` |

### Filter Management

| Tool           | Description       | Key Parameters               |
| -------------- | ----------------- | ---------------------------- |
| `createFilter` | Create JQL filter | `name`, `jql`, `description` |
| `updateFilter` | Update filter     | `filterId`, `name`, `jql`    |
| `deleteFilter` | Delete filter     | `filterId`                   |

### Dashboard Management

| Tool                        | Description             | Key Parameters                      |
| --------------------------- | ----------------------- | ----------------------------------- |
| `createDashboard`           | Create dashboard        | `name`, `description`               |
| `updateDashboard`           | Update dashboard        | `dashboardId`, `name`               |
| `addGadgetToDashboard`      | Add gadget to dashboard | `dashboardId`, `moduleKey`, `color` |
| `removeGadgetFromDashboard` | Remove gadget           | `dashboardId`, `gadgetId`           |

## Common Usage Patterns

### Get Confluence Page Content

```typescript
getPage({
  pageId: "2771255297",
  bodyFormat: "storage", // default
});
```

### Search Jira Issues

```typescript
listIssues({
  project: "OPS",
  status: "Open",
  limit: 10,
});
```

Or with custom JQL:

```typescript
listIssues({
  jql: "project = OPS AND assignee = currentUser() ORDER BY updated DESC",
  limit: 20,
});
```

### Create Jira Issue

```typescript
createIssue({
  projectKey: "OPS",
  summary: "Fix login bug",
  issueType: "Bug",
  description: "Users cannot log in",
  priority: "High",
});
```

### Create Confluence Page

```typescript
createPage({
  spaceId: "250544132",
  title: "New Documentation",
  content: "<p>Page content in storage format</p>",
  parentId: "2771255297",
});
```

## Tips

1. **Tool Discovery**: Use your MCP client's tool list feature to see all available tools
2. **Parameters**: All tool parameters are validated with clear error messages
3. **Confluence Content**: Must use storage format (XML-like HTML), not plain text
4. **JQL Queries**: Use the `jql` parameter for advanced Jira searches
5. **Pagination**: List operations support `limit` and `cursor`/`startAt` parameters

## Getting Help

- **Architecture**: See [docs/architecture.md](./architecture.md)
- **Full Reference**: See [docs/introduction/resources-and-tools.md](./introduction/resources-and-tools.md)
- **Installation**: See [llms-install.md](../llms-install.md)

## Legacy: Resources

Resources are still available for backward compatibility but tools are preferred:

```
confluence://pages/{pageId}
confluence://spaces/{spaceId}
jira://issues/{issueKey}
jira://projects/{projectKey}
```

Use `list_mcp_resources` to discover available resource URIs.
