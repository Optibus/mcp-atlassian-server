# API Reference: Resources & Tools

Complete reference for all Resources (read-only data access) and Tools (actions/mutations) supported by the MCP Atlassian Server, including Atlassian API endpoints and technical implementation details.

## For Developers

This document provides detailed information about:

- How Resources and Tools are implemented
- Adding new or extending existing Resources/Tools
- Handling special cases (storage format, version conflicts, error handling)
- Debugging and maintenance

## JIRA

### 1. Issue

#### Resource
| Resource | URI | Description | Atlassian API Endpoint | Returns |
|----------|-----|-------------|------------------------|---------|
| Issues | `jira://issues` | List issues | `/rest/api/3/search` | Array of Issue objects |
| Issue Details | `jira://issues/{issueKey}` | Issue details | `/rest/api/3/issue/{issueKey}` | Single Issue object |
| Issue Transitions | `jira://issues/{issueKey}/transitions` | Available issue transitions | `/rest/api/3/issue/{issueKey}/transitions` | Array of Transition objects |
| Issue Comments | `jira://issues/{issueKey}/comments` | Issue comments | `/rest/api/3/issue/{issueKey}/comment` | Array of Comment objects |

#### Tool
| Tool | Description | Key Parameters | Atlassian API Endpoint | Output |
|------|-------------|----------------|------------------------|--------|
| createIssue | Create new issue | projectKey, summary, ... | `/rest/api/3/issue` | Issue key and ID |
| updateIssue | Update issue | issueKey, summary, ... | `/rest/api/3/issue/{issueIdOrKey}` | Update status |
| transitionIssue | Change issue status | issueKey, transitionId | `/rest/api/3/issue/{issueIdOrKey}/transitions` | Transition status |
| assignIssue | Assign issue to user | issueKey, accountId | `/rest/api/3/issue/{issueIdOrKey}/assignee` | Assignment status |
| addIssuesToBacklog | Move issues to backlog | boardId, issueKeys | `/rest/agile/1.0/backlog/issue` or `/rest/agile/1.0/backlog/{boardId}/issue` | Operation status |
| addIssueToSprint | Add issues to sprint | sprintId, issueKeys | `/rest/agile/1.0/sprint/{sprintId}/issue` | Operation status |
| rankBacklogIssues | Reorder backlog issues | boardId, issueKeys, rankBeforeIssue, rankAfterIssue | `/rest/agile/1.0/backlog/rank` | Ranking status |

### 2. Project

#### Resource
| Resource | URI | Description | Atlassian API Endpoint | Returns | 
|----------|-----|-------|-----------------------|----------------|
| Projects | `jira://projects` | List of project | `/rest/api/3/project` | Array of Project objects |
| Project Details | `jira://projects/{projectKey}` | Details of project | `/rest/api/3/project/{projectKey}` | Single Project object |
| Project Roles | `jira://projects/{projectKey}/roles` | List of role of project | `/rest/api/3/project/{projectKey}/role` | Array các role (name, id) |

### 3. Board

#### Resource
| Resource | URI | Description | Atlassian API Endpoint | Returns |
|----------|-----|-------|-----------------------|----------------|
| Boards | `jira://boards` | List of board | `/rest/agile/1.0/board` | Array of Board objects |
| Board Details | `jira://boards/{boardId}` | Details of board | `/rest/agile/1.0/board/{boardId}` | Single Board object |
| Board Issues | `jira://boards/{boardId}/issues` | List of issue trên board | `/rest/agile/1.0/board/{boardId}/issue` | Array of Issue objects |
| Board Configuration | `jira://boards/{boardId}/configuration` | Cấu hình board | `/rest/agile/1.0/board/{boardId}/configuration` | Board config object |
| Board Sprints | `jira://boards/{boardId}/sprints` | List of sprint trên board | `/rest/agile/1.0/board/{boardId}/sprint` | Array of Sprint objects |

### 4. Sprint

#### Resource
| Resource | URI | Description | Atlassian API Endpoint | Returns |
|----------|-----|-------|-----------------------|----------------|
| Sprints | `jira://sprints` | List of tất cả sprints | `/rest/agile/1.0/sprint` | Array of Sprint objects |
| Sprint Details | `jira://sprints/{sprintId}` | Details of sprint | `/rest/agile/1.0/sprint/{sprintId}` | Single Sprint object |
| Sprint Issues | `jira://sprints/{sprintId}/issues` | List of issue in sprint | `/rest/agile/1.0/sprint/{sprintId}/issue` | Array of Issue objects |

#### Tool
| Tool | Description | Key Parameters | Atlassian API Endpoint | Output |
|------|-------|---------------|-----------------------|----------------|
| createSprint | Create sprint new | boardId, name, ... | `/rest/agile/1.0/sprint` | Sprint ID new |
| startSprint | Bắt đầu sprint | sprintId, ... | `/rest/agile/1.0/sprint/{sprintId}/start` | Status of bắt đầu |
| closeSprint | Đóng sprint | sprintId, ... | `/rest/agile/1.0/sprint/{sprintId}/close` | Status of đóng |
| addIssueToSprint | Add issue to sprint | sprintId, issueKeys | `/rest/agile/1.0/sprint/{sprintId}/issue` | Status of add |

### 5. Filter

#### Resource
| Resource | URI | Description | Atlassian API Endpoint | Returns |
|----------|-----|-------|-----------------------|----------------|
| Filters | `jira://filters` | List of filter | `/rest/api/3/filter/search` | Array of Filter objects |
| Filter Details | `jira://filters/{filterId}` | Details of filter | `/rest/api/3/filter/{filterId}` | Single Filter object |
| My Filters | `jira://filters/my` | Filter of tôi | `/rest/api/3/filter/my` | Array of Filter objects |

#### Tool
| Tool | Description | Key Parameters | Atlassian API Endpoint | Output |
|------|-------|---------------|-----------------------|----------------|
| createFilter | Create filter new | name, jql, ... | `/rest/api/3/filter` | Filter ID new |
| updateFilter | Update filter | filterId, ... | `/rest/api/3/filter/{filterId}` | Status of update |
| deleteFilter | Delete filter | filterId | `/rest/api/3/filter/{filterId}` | Status of xoá |

### 6. Dashboard & Gadget

#### Resource
| Resource | URI | Description | Atlassian API Endpoint | Returns |
|----------|-----|-------|-----------------------|----------------|
| Dashboards | `jira://dashboards` | List of dashboard | `/rest/api/3/dashboard` | Array of Dashboard objects |
| My Dashboards | `jira://dashboards/my` | Dashboard of tôi | `/rest/api/3/dashboard?filter=my` | Array of Dashboard objects |
| Dashboard Details | `jira://dashboards/{dashboardId}` | Details of dashboard | `/rest/api/3/dashboard/{dashboardId}` | Single Dashboard object |
| Dashboard Gadgets | `jira://dashboards/{dashboardId}/gadgets` | List of gadget trên dashboard | `/rest/api/3/dashboard/{dashboardId}/gadget` | Array of Gadget objects |
| Gadgets | `jira://gadgets` | List of gadget | `/rest/api/3/dashboard/gadgets` | Array of Gadget objects |

#### Tool
| Tool | Description | Key Parameters | Atlassian API Endpoint | Output |
|------|-------|---------------|-----------------------|----------------|
| createDashboard | Create dashboard new | name, ... | `/rest/api/3/dashboard` | Dashboard ID new |
| updateDashboard | Update dashboard | dashboardId, ... | `/rest/api/3/dashboard/{dashboardId}` | Status of update |
| addGadgetToDashboard | Add gadget to dashboard | dashboardId, uri, ... | `/rest/api/3/dashboard/{dashboardId}/gadget` | Gadget ID new |
| removeGadgetFromDashboard | Delete gadget from dashboard | dashboardId, gadgetId | `/rest/api/3/dashboard/{dashboardId}/gadget/{gadgetId}` | Status of delete |

### 7. User

#### Resource
| Resource | URI | Description | Atlassian API Endpoint | Returns |
|----------|-----|-------|-----------------------|----------------|
| Users | `jira://users` | List of tất cả user | `/rest/api/3/users/search` | Array of User objects |
| User Details | `jira://users/{accountId}` | Thông tin user | `/rest/api/3/user?accountId=...` | Single User object |
| Assignable Users | `jira://users/assignable/{projectKey}` | User có thể gán for project | `/rest/api/3/user/assignable/search?project=...` | Array of User objects |
| Users by Role | `jira://users/role/{projectKey}/{roleId}` | User by role in project | `/rest/api/3/project/{projectKey}/role/{roleId}` | Array of User objects |

---

## CONFLUENCE

### 1. Space

#### Resource
| Resource | URI | Description | Atlassian API Endpoint | Returns |
|----------|-----|-------|-----------------------|----------------|
| Spaces | `confluence://spaces` | List of space | `/wiki/api/v2/spaces` | Array of Space objects (v2) |
| Space Details | `confluence://spaces/{spaceKey}` | Details of space | `/wiki/api/v2/spaces/{spaceKey}` | Single Space object (v2) |
| Space Pages | `confluence://spaces/{spaceKey}/pages` | List of page in space | `/wiki/api/v2/pages?space-id=...` | Array of Page objects (v2) |

### 2. Page

#### Resource
| Resource | URI | Description | Atlassian API Endpoint | Returns |
|----------|-----|-------|-----------------------|----------------|
| Pages | `confluence://pages` | Search page by filter | `/wiki/api/v2/pages` | Array of Page objects (v2) |
| Page Details | `confluence://pages/{pageId}` | Details of page (v2) | `/wiki/api/v2/pages/{pageId}` + `/wiki/api/v2/pages/{pageId}/body` | Single Page object (v2) |
| Page Children | `confluence://pages/{pageId}/children` | List of page con | `/wiki/api/v2/pages/{pageId}/children` | Array of Page objects (v2) |
| Page Ancestors | `confluence://pages/{pageId}/ancestors` | List of ancestor of page | `/wiki/api/v2/pages/{pageId}/ancestors` | Array of Page objects (v2) |
| Page Attachments | `confluence://pages/{pageId}/attachments` | List of file đính kèm | `/wiki/api/v2/pages/{pageId}/attachments` | Array of Attachment objects (v2) |
| Page Versions | `confluence://pages/{pageId}/versions` | Lịch sử version of page | `/wiki/api/v2/pages/{pageId}/versions` | Array of Version objects (v2) |
| Page Labels | `confluence://pages/{pageId}/labels` | List of nhãn of page | `/wiki/api/v2/pages/{pageId}/labels` | Array of Label objects (v2) |

#### Tool
| Tool | Description | Key Parameters | Atlassian API Endpoint | Output |
|------|-------|---------------|-----------------------|----------------|
| createPage | Create page new | spaceId, title, content, parentId | `/wiki/api/v2/pages` | Page ID new |
| updatePage | Update nội dung page | pageId, title, content, version | `/wiki/api/v2/pages/{pageId}` (PUT) | Status of update |
| updatePageTitle | Đổi tiêu đề page | pageId, title, version | `/wiki/api/v2/pages/{pageId}/title` (PUT) | Status of update |
| deletePage | Delete page | pageId, draft, purge | `/wiki/api/v2/pages/{pageId}` (DELETE) | Status of delete |

### 3. Comment

#### Resource
| Resource | URI | Description | Atlassian API Endpoint | Returns |
|----------|-----|-------|-----------------------|----------------|
| Page Comments | `confluence://pages/{pageId}/comments` | List of comment of page | `/wiki/api/v2/pages/{pageId}/footer-comments`, `/wiki/api/v2/pages/{pageId}/inline-comments` | Array of Comment objects (v2) |

#### Tool
| Tool | Description | Key Parameters | Atlassian API Endpoint | Output |
|------|-------|---------------|-----------------------|----------------|
| addComment | Add comment to page | pageId, content | `/wiki/api/v2/footer-comments` | New comment |
| updateFooterComment | Update footer comment | commentId, version, value, ... | `/wiki/api/v2/footer-comments/{commentId}` (PUT) | Update status |
| deleteFooterComment | Delete footer comment | commentId | `/wiki/api/v2/footer-comments/{commentId}` (DELETE) | Delete status |

---
