/**
 * Central Resource Definitions
 * This file defines all available MCP resources for the Atlassian server
 */

import { ResourceDefinition } from "../utils/resource-registry.js";

/**
 * All available Confluence resources
 */
export const confluenceResourceDefinitions: ResourceDefinition[] = [
  // Collection resources (static URIs)
  {
    uri: "confluence://spaces",
    name: "Confluence Spaces",
    description:
      "List and search all Confluence spaces. Supports query parameters: ?cursor={cursor}&limit={limit}",
    mimeType: "application/json",
  },
  {
    uri: "confluence://pages",
    name: "Confluence Pages",
    description:
      "List and search all Confluence pages. Supports query parameters for filtering and pagination.",
    mimeType: "application/json",
  },

  // Individual space resources (URI templates)
  {
    uriTemplate: "confluence://spaces/{spaceId}",
    name: "Confluence Space Details",
    description:
      "Get details for a specific Confluence space by numeric ID. Replace {spaceId} with the space ID (e.g., 250544132). Example: confluence://spaces/250544132",
    mimeType: "application/json",
  },
  {
    uriTemplate: "confluence://spaces/{spaceId}/pages",
    name: "Confluence Space Pages",
    description:
      "List all pages in a specific Confluence space. Replace {spaceId} with the space ID. Example: confluence://spaces/250544132/pages",
    mimeType: "application/json",
  },

  // Individual page resources (URI templates)
  {
    uriTemplate: "confluence://pages/{pageId}",
    name: "Confluence Page Details",
    description:
      "Get details and content for a specific Confluence page by ID. Replace {pageId} with the page ID (e.g., 2771255297). Example: confluence://pages/2771255297",
    mimeType: "application/json",
  },
  {
    uriTemplate: "confluence://pages/{pageId}/comments",
    name: "Confluence Page Comments",
    description:
      "List all comments (footer and inline) for a Confluence page. Replace {pageId} with the page ID. Example: confluence://pages/2771255297/comments",
    mimeType: "application/json",
  },
  {
    uriTemplate: "confluence://pages/{pageId}/children",
    name: "Confluence Page Children",
    description:
      "List all child pages of a Confluence page. Replace {pageId} with the page ID. Example: confluence://pages/2771255297/children",
    mimeType: "application/json",
  },
  {
    uriTemplate: "confluence://pages/{pageId}/ancestors",
    name: "Confluence Page Ancestors",
    description:
      "List all ancestor pages (breadcrumb trail) for a Confluence page. Replace {pageId} with the page ID. Example: confluence://pages/2771255297/ancestors",
    mimeType: "application/json",
  },
  {
    uriTemplate: "confluence://pages/{pageId}/attachments",
    name: "Confluence Page Attachments",
    description:
      "List all attachments for a Confluence page. Replace {pageId} with the page ID. Example: confluence://pages/2771255297/attachments",
    mimeType: "application/json",
  },
  {
    uriTemplate: "confluence://pages/{pageId}/versions",
    name: "Confluence Page Versions",
    description:
      "List all versions (revision history) for a Confluence page. Replace {pageId} with the page ID. Example: confluence://pages/2771255297/versions",
    mimeType: "application/json",
  },
  {
    uriTemplate: "confluence://pages/{pageId}/labels",
    name: "Confluence Page Labels",
    description:
      "List all labels for a Confluence page. Replace {pageId} with the page ID. Example: confluence://pages/2771255297/labels",
    mimeType: "application/json",
  },
];

/**
 * All available Jira resources
 */
export const jiraResourceDefinitions: ResourceDefinition[] = [
  // Collection resources (static URIs)
  {
    uri: "jira://projects",
    name: "Jira Projects",
    description:
      "List and search all Jira projects. Returns all accessible projects.",
    mimeType: "application/json",
  },
  {
    uri: "jira://issues",
    name: "Jira Issues",
    description:
      "List and search Jira issues. Supports query parameters: ?jql={jql}&limit={limit}&offset={offset}&project={projectKey}&status={status}",
    mimeType: "application/json",
  },

  // Individual project resources (URI templates)
  {
    uriTemplate: "jira://projects/{projectKey}",
    name: "Jira Project Details",
    description:
      "Get details for a specific Jira project by key. Replace {projectKey} with the project key (e.g., OPS, DEV). Example: jira://projects/OPS",
    mimeType: "application/json",
  },
  {
    uriTemplate: "jira://projects/{projectKey}/roles",
    name: "Jira Project Roles",
    description:
      "List all roles for a specific Jira project. Replace {projectKey} with the project key. Example: jira://projects/OPS/roles",
    mimeType: "application/json",
  },

  // Individual issue resources (URI templates)
  {
    uriTemplate: "jira://issues/{issueKey}",
    name: "Jira Issue Details",
    description:
      "Get details for a specific Jira issue by key. Replace {issueKey} with the issue key (e.g., OPS-12345). Example: jira://issues/OPS-12345",
    mimeType: "application/json",
  },
  {
    uriTemplate: "jira://issues/{issueKey}/comments",
    name: "Jira Issue Comments",
    description:
      "List all comments for a Jira issue. Replace {issueKey} with the issue key. Example: jira://issues/OPS-12345/comments",
    mimeType: "application/json",
  },
  {
    uriTemplate: "jira://issues/{issueKey}/transitions",
    name: "Jira Issue Transitions",
    description:
      "List available status transitions for a Jira issue. Replace {issueKey} with the issue key. Example: jira://issues/OPS-12345/transitions",
    mimeType: "application/json",
  },
];

/**
 * Get all resource definitions
 */
export function getAllResourceDefinitions(): ResourceDefinition[] {
  return [...confluenceResourceDefinitions, ...jiraResourceDefinitions];
}
