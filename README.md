# MCP Atlassian Server

A Model Context Protocol (MCP) server that provides seamless integration with Atlassian Jira and Confluence. This server supports both Atlassian Cloud and Server/Data Center deployments with automatic detection and appropriate authentication methods.

## Features

- **Universal Deployment Support**: Works with both Atlassian Cloud and Server/Data Center
- **Automatic Detection**: Automatically detects deployment type based on URL patterns
- **Secure Authentication**: Multiple authentication methods (API tokens, PAT tokens, Basic Auth)
- **Separate Service Configuration**: Configure Jira and Confluence independently with separate URLs and credentials
- **Comprehensive Access**: Full access to Jira and Confluence resources and operations
- **MCP Protocol**: Built on the Model Context Protocol for seamless integration with AI tools

## Supported Atlassian Deployments

| Deployment Type | URL Pattern | Authentication | Configuration |
|-----------------|-------------|----------------|---------------|
| **Atlassian Cloud** | `*.atlassian.net` | API Token + Email | Single or separate configs |
| **Server/Data Center** | Custom domains, localhost, private IPs | PAT Token (recommended) or Basic Auth | Separate configs recommended |

## Installation

### Option 1: Install from npm (Recommended)

```bash
npm install -g @phuc-nt/mcp-atlassian-server
```

### Option 2: Install from source

```bash
git clone https://github.com/phuc-nt/mcp-atlassian-server.git
cd mcp-atlassian-server
npm install
npm run build
```

## Configuration

### Environment Variables

The server supports both legacy single-service configuration and modern separate-service configuration:

#### Separate Service Configuration (Recommended for Server/Data Center)

```bash
# Jira Configuration
JIRA_URL=https://jira.company.com
JIRA_PAT_TOKEN=your-jira-personal-access-token

# Confluence Configuration  
CONFLUENCE_URL=https://confluence.company.com
CONFLUENCE_PAT_TOKEN=your-confluence-personal-access-token

# Optional: Override deployment type detection
JIRA_DEPLOYMENT_TYPE=server
CONFLUENCE_DEPLOYMENT_TYPE=server
```

#### Legacy Single Configuration (Still Supported)

```bash
# Works for both Jira and Confluence (Cloud or Server/DC)
ATLASSIAN_SITE_NAME=your-site.atlassian.net
ATLASSIAN_USER_EMAIL=your-email@example.com
ATLASSIAN_API_TOKEN=your-api-token

# For Server/Data Center with PAT token
ATLASSIAN_SITE_NAME=https://jira.company.com
ATLASSIAN_PAT_TOKEN=your-personal-access-token
```

#### Cloud Configuration Examples

```bash
# Atlassian Cloud - Single Configuration
ATLASSIAN_SITE_NAME=company.atlassian.net
ATLASSIAN_USER_EMAIL=user@company.com
ATLASSIAN_API_TOKEN=your-cloud-api-token

# Atlassian Cloud - Separate Configuration
JIRA_URL=company.atlassian.net
JIRA_USER_EMAIL=user@company.com
JIRA_API_TOKEN=your-jira-api-token

CONFLUENCE_URL=company.atlassian.net
CONFLUENCE_USER_EMAIL=user@company.com
CONFLUENCE_API_TOKEN=your-confluence-api-token
```

#### Server/Data Center Configuration Examples

```bash
# Server/Data Center - PAT Token (Recommended)
JIRA_URL=https://jira.company.com
JIRA_PAT_TOKEN=your-jira-personal-access-token

CONFLUENCE_URL=https://confluence.company.com
CONFLUENCE_PAT_TOKEN=your-confluence-personal-access-token

# Server/Data Center - Basic Auth (Fallback)
JIRA_URL=https://jira.company.com
JIRA_USER_EMAIL=your-username
JIRA_API_TOKEN=your-password

CONFLUENCE_URL=https://confluence.company.com
CONFLUENCE_USER_EMAIL=your-username
CONFLUENCE_API_TOKEN=your-password

# Optional: Deployment type override (auto-detected if not specified)
JIRA_DEPLOYMENT_TYPE=server
CONFLUENCE_DEPLOYMENT_TYPE=server
```

### Authentication Methods

| Deployment | Method | Environment Variables | Security Level |
|------------|--------|----------------------|----------------|
| **Cloud** | API Token | `*_USER_EMAIL` + `*_API_TOKEN` | High |
| **Server/DC** | PAT Token | `*_PAT_TOKEN` | High (Recommended) |
| **Server/DC** | Basic Auth | `*_USER_EMAIL` + `*_API_TOKEN` | Medium (Fallback) |

### Security Notes

- **Server/Data Center**: PAT tokens are recommended over basic authentication
- **Cloud**: API tokens are the only supported method
- **Separate Configuration**: Use separate URLs and tokens for Jira and Confluence in Server/Data Center environments
- **SSL**: For self-signed certificates, you may need to set `NODE_TLS_REJECT_UNAUTHORIZED=0` (development only)

> **Note**: The server automatically detects your deployment type based on the URL pattern. You only need to set `*_DEPLOYMENT_TYPE` if auto-detection fails.

## Contribute & Support

- Contribute by opening Pull Requests or Issues on GitHub.
- Join the MCP/Cline community for additional support.