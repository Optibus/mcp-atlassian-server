# MCP Atlassian Server (by phuc-nt) Installation Guide for AI

> **Important Note:** MCP Atlassian Server (by phuc-nt) is primarily developed and optimized for use with the Cline AI assistant. While it follows the MCP standard and can work with other compatible MCP clients, the best performance and experience are achieved with Cline.

> **Version Note:** This guide is for MCP Atlassian Server v2.0.1. For detailed documentation on architecture, development, and usage, refer to the new documentation series in the `/docs/knowledge/` directory.

## System Requirements
- macOS 10.15+ or Windows 10+
- Atlassian Cloud account and API token **OR** Atlassian Server/Data Center access
- Cline AI assistant (main supported client)

## Supported Atlassian Deployments

MCP Atlassian Server supports both **Atlassian Cloud** and **Server/Data Center** deployments:

| Deployment Type | URL Pattern | Authentication Method |
|-----------------|-------------|----------------------|
| **Atlassian Cloud** | `https://your-site.atlassian.net` | API Token + Email |
| **Server/Data Center** | `https://jira.company.com` | Personal Access Token (PAT) or Basic Auth |

The server automatically detects your deployment type based on the URL pattern and configures the appropriate authentication method.

## Installation Options

You have two ways to install MCP Atlassian Server:

1. **[Install from npm](#option-1-install-from-npm)** (recommended, easier) - Install directly from npm registry
2. **[Clone & Build from source](#option-2-clone-and-build-from-source)** - Clone the GitHub repository and build locally

## Option 1: Install from npm

This is the recommended method as it's simpler and lets you easily update to new versions.

### Install the package globally

```bash
npm install -g @phuc-nt/mcp-atlassian-server
```

Or install in your project:

```bash
npm install @phuc-nt/mcp-atlassian-server
```

### Find the installation path

After installation, you'll need to know the path to the package for Cline configuration:

```bash
# For global installation, find the global node_modules directory
npm root -g
# Output will be something like: /usr/local/lib/node_modules

# For local installation, the path will be in your project directory
# e.g., /your/project/node_modules/@phuc-nt/mcp-atlassian-server
```

The full path to the executable will be: `<npm_modules_path>/@phuc-nt/mcp-atlassian-server/dist/index.js`

Skip to [Configure Cline section](#configure-cline) after installing from npm.

## Option 2: Clone and Build from Source

### Prerequisite Tools Check & Installation

### Check Installed Tools

Verify that Git, Node.js, and npm are installed:

```bash
git --version
node --version
npm --version
```

If the above commands show version numbers, you have the required tools. If not, follow the steps below:

### Install Git

#### macOS
**Method 1**: Using Homebrew (recommended)
```bash
# Install Homebrew if not available
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Git
brew install git
```

**Method 2**: Install Xcode Command Line Tools
```bash
xcode-select --install
```

#### Windows
1. Download the Git installer from [git-scm.com](https://git-scm.com/download/win)
2. Run the installer with default options
3. After installation, open Command Prompt or PowerShell and check: `git --version`

### Install Node.js and npm

#### macOS
**Method 1**: Using Homebrew (recommended)
```bash
brew install node
```

**Method 2**: Using nvm (Node Version Manager)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Install Node.js LTS
nvm install --lts
```

#### Windows
1. Download Node.js installer from [nodejs.org](https://nodejs.org/) (choose LTS version)
2. Run the installer with default options
3. After installation, open Command Prompt or PowerShell and check:
   ```
   node --version
   npm --version
   ```

### Step 1: Clone the Repository
```bash
# macOS/Linux
git clone https://github.com/phuc-nt/mcp-atlassian-server.git
cd mcp-atlassian-server

# Windows
git clone https://github.com/phuc-nt/mcp-atlassian-server.git
cd mcp-atlassian-server
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build the Project
```bash
npm run build
```

## Configure Cline

MCP Atlassian Server is specifically designed for seamless integration with Cline. Below is the guide to configure Cline to connect to the server:

### Determine the Full Path

#### For npm installation
If you installed the package via npm, you need the path to the installed package:

```bash
# For global npm installation
echo "$(npm root -g)/@phuc-nt/mcp-atlassian-server/dist/index.js"

# For local npm installation (run from your project directory)
echo "$(pwd)/node_modules/@phuc-nt/mcp-atlassian-server/dist/index.js"
```

#### For source code installation

First, determine the full path to your project directory:

```bash
# macOS/Linux
pwd

# Windows (PowerShell)
(Get-Location).Path

# Windows (Command Prompt)
cd
```

Then, add the following configuration to your `cline_mcp_settings.json` file:

```json
{
  "mcpServers": {
    "phuc-nt/mcp-atlassian-server": {
      "disabled": false,
      "timeout": 60,
      "command": "node",
      "args": [
        "/path/to/mcp-atlassian-server/dist/index.js"
      ],
      "env": {
        "ATLASSIAN_SITE_NAME": "your-site.atlassian.net",
        "ATLASSIAN_USER_EMAIL": "your-email@example.com",
        "ATLASSIAN_API_TOKEN": "your-api-token"
      },
      "transportType": "stdio"
    }
  }
}
```

Replace:
- For **npm installation**: Use the path to the npm package: 
  - Global install: `/path/to/global/node_modules/@phuc-nt/mcp-atlassian-server/dist/index.js` 
  - Local install: `/path/to/your/project/node_modules/@phuc-nt/mcp-atlassian-server/dist/index.js`
- For **source installation**: Use the path you just obtained with `pwd` command
- Configure environment variables based on your deployment type (see below)

## Environment Variables Configuration

### For Atlassian Cloud
```bash
ATLASSIAN_SITE_NAME=your-site.atlassian.net
ATLASSIAN_USER_EMAIL=your-email@example.com
ATLASSIAN_API_TOKEN=your-cloud-api-token
```

### For Server/Data Center
```bash
# Option 1: Personal Access Token (Recommended)
ATLASSIAN_SITE_NAME=https://jira.company.com
ATLASSIAN_PAT_TOKEN=your-personal-access-token

# Option 2: Basic Authentication (Fallback)
ATLASSIAN_SITE_NAME=https://jira.company.com
ATLASSIAN_USER_EMAIL=your-username
ATLASSIAN_API_TOKEN=your-password

# Optional: Force deployment type (auto-detected if not specified)
ATLASSIAN_DEPLOYMENT_TYPE=server
```

> **Note**: The server automatically detects your deployment type based on the URL pattern. You only need to set `ATLASSIAN_DEPLOYMENT_TYPE` if auto-detection fails.

> **Note for global npm installs**: You can find the global node_modules path by running: `npm root -g`

> **Note for Windows**: The path on Windows may look like `C:\\Users\\YourName\\AppData\\Roaming\\npm\\node_modules\\@phuc-nt\\mcp-atlassian-server\\dist\\index.js` (use `\\` instead of `/`).

## Authentication Credentials

### Deployment Type Detection

MCP Atlassian Server automatically detects your deployment type based on URL patterns:

| Pattern | Deployment Type | Example |
|---------|-----------------|---------|
| `*.atlassian.net` | Cloud | `company.atlassian.net` |
| `api.atlassian.com` | Cloud (OAuth) | `api.atlassian.com/ex/jira/cloud-id` |
| Custom domains | Server/Data Center | `jira.company.com` |
| localhost | Server/Data Center | `localhost:8080` |
| Private IPs | Server/Data Center | `192.168.1.100` |

### Configuration Options

You can configure the server using either:
1. **Separate Service Configuration** (Recommended for Server/Data Center)
2. **Legacy Single Configuration** (Still supported)

#### Option 1: Separate Service Configuration

Configure Jira and Confluence independently with separate URLs and credentials:

```bash
# Jira Configuration
JIRA_URL=https://jira.company.com
JIRA_PAT_TOKEN=your-jira-personal-access-token

# Confluence Configuration
CONFLUENCE_URL=https://confluence.company.com
CONFLUENCE_PAT_TOKEN=your-confluence-personal-access-token
```

#### Option 2: Legacy Single Configuration

Use the same credentials for both Jira and Confluence:

```bash
# Works for both services (Cloud or Server/DC)
ATLASSIAN_SITE_NAME=your-site.atlassian.net
ATLASSIAN_USER_EMAIL=your-email@example.com
ATLASSIAN_API_TOKEN=your-api-token
```

### Cloud Authentication

For **Atlassian Cloud** deployments, you need an API token:

1. **Go to Atlassian Account Settings**: https://id.atlassian.com/manage-profile/security/api-tokens
2. **Create API Token**: Click "Create API token"
3. **Copy the token**: Save it securely (you won't see it again)

**Environment Variables:**
```bash
# Single configuration
ATLASSIAN_SITE_NAME=your-site.atlassian.net
ATLASSIAN_USER_EMAIL=your-email@company.com
ATLASSIAN_API_TOKEN=your-api-token

# Or separate configuration
JIRA_URL=your-site.atlassian.net
JIRA_USER_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token

CONFLUENCE_URL=your-site.atlassian.net
CONFLUENCE_USER_EMAIL=your-email@company.com
CONFLUENCE_API_TOKEN=your-api-token
```

### Server/Data Center Authentication

For **Server/Data Center** deployments, you have two options:

#### Option A: Personal Access Token (Recommended)

1. **Log into your Atlassian instance**
2. **Go to Profile → Personal Access Tokens**
3. **Create token** with appropriate permissions
4. **Copy the token** and configure:

```bash
# Separate configuration (recommended)
JIRA_URL=https://jira.company.com
JIRA_PAT_TOKEN=your-jira-personal-access-token

CONFLUENCE_URL=https://confluence.company.com
CONFLUENCE_PAT_TOKEN=your-confluence-personal-access-token

# Or single configuration
ATLASSIAN_SITE_NAME=https://jira.company.com
ATLASSIAN_PAT_TOKEN=your-personal-access-token
```

#### Option B: Basic Authentication (Fallback)

If PAT tokens are not available:

```bash
# Separate configuration
JIRA_URL=https://jira.company.com
JIRA_USER_EMAIL=your-username
JIRA_API_TOKEN=your-password

CONFLUENCE_URL=https://confluence.company.com
CONFLUENCE_USER_EMAIL=your-username
CONFLUENCE_API_TOKEN=your-password

# Or single configuration
ATLASSIAN_SITE_NAME=https://jira.company.com
ATLASSIAN_USER_EMAIL=your-username
ATLASSIAN_API_TOKEN=your-password
```

### Configuration Examples

#### Example 1: Cloud with Single Configuration
```json
{
  "mcpServers": {
    "phuc-nt/mcp-atlassian-server": {
      "disabled": false,
      "timeout": 60,
      "command": "node",
      "args": [
        "/path/to/mcp-atlassian-server/dist/index.js"
      ],
      "env": {
        "ATLASSIAN_SITE_NAME": "company.atlassian.net",
        "ATLASSIAN_USER_EMAIL": "user@company.com",
        "ATLASSIAN_API_TOKEN": "your-cloud-api-token"
      },
      "transportType": "stdio"
    }
  }
}
```

#### Example 2: Server/Data Center with Separate Configuration
```json
{
  "mcpServers": {
    "phuc-nt/mcp-atlassian-server": {
      "disabled": false,
      "timeout": 60,
      "command": "node",
      "args": [
        "/path/to/mcp-atlassian-server/dist/index.js"
      ],
      "env": {
        "JIRA_URL": "https://jira.company.com",
        "JIRA_PAT_TOKEN": "your-jira-pat-token",
        "CONFLUENCE_URL": "https://confluence.company.com",
        "CONFLUENCE_PAT_TOKEN": "your-confluence-pat-token"
      },
      "transportType": "stdio"
    }
  }
}
```

#### Example 3: Mixed Environment (Cloud Jira + Server Confluence)
```json
{
  "mcpServers": {
    "phuc-nt/mcp-atlassian-server": {
      "disabled": false,
      "timeout": 60,
      "command": "node",
      "args": [
        "/path/to/mcp-atlassian-server/dist/index.js"
      ],
      "env": {
        "JIRA_URL": "company.atlassian.net",
        "JIRA_USER_EMAIL": "user@company.com",
        "JIRA_API_TOKEN": "your-cloud-api-token",
        "CONFLUENCE_URL": "https://confluence.company.com",
        "CONFLUENCE_PAT_TOKEN": "your-server-pat-token"
      },
      "transportType": "stdio"
    }
  }
}
```

### Security Recommendations

1. **Use PAT tokens** for Server/Data Center deployments when possible
2. **Separate configurations** provide better security isolation
3. **Rotate tokens regularly** and use tokens with minimal required permissions
4. **For development only**: Set `NODE_TLS_REJECT_UNAUTHORIZED=0` for self-signed certificates
5. **Never commit tokens** to version control

## Documentation Resources

MCP Atlassian Server (by phuc-nt) now includes a comprehensive documentation series:

1. [MCP Overview & Architecture](./docs/knowledge/01-mcp-overview-architecture.md): Core concepts, architecture, and design principles
2. [MCP Tools & Resources Development](./docs/knowledge/02-mcp-tools-resources.md): How to develop and extend MCP resources and tools
3. [MCP Prompts & Sampling](./docs/knowledge/03-mcp-prompts-sampling.md): Guide for prompt engineering and sampling with MCP

These documents provide deeper insights into the server's functionality and are valuable for both users and developers.

## Verify Installation

### Test the MCP Server directly

You can test that the MCP Server runs correctly by executing it directly:

```bash
# For npm global install
node $(npm root -g)/@phuc-nt/mcp-atlassian-server/dist/index.js

# For npm local install
node ./node_modules/@phuc-nt/mcp-atlassian-server/dist/index.js

# For source code install
node ./dist/index.js
```

You should see output indicating that the server has started and registered resources and tools.

### Test with Cline

After configuration, test the connection by asking Cline a question related to Jira or Confluence, for example:
- "List all projects in Jira"
- "Search for Confluence pages about [topic]"
- "Create a new issue in project DEMO"

Cline is optimized to work with this MCP Atlassian Server (by phuc-nt) and will automatically use the most appropriate resources and tools for your queries.

## Troubleshooting Server/Data Center Issues

### Common Server/Data Center Problems

#### 1. SSL Certificate Issues

**Problem**: SSL certificate errors when connecting to Server/Data Center instances.

**Error Messages**:
- `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
- `SELF_SIGNED_CERT_IN_CHAIN`
- `CERT_HAS_EXPIRED`

**Solutions**:
```bash
# For development/testing (temporary)
export NODE_TLS_REJECT_UNAUTHORIZED=0

# For production (recommended)
export NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.pem
```

#### 2. Personal Access Token Issues

**Problem**: PAT authentication failures.

**Check**:
- Token is not expired
- Token has appropriate scopes/permissions
- Token was created correctly

**Test PAT manually**:
```bash
curl -H "Authorization: Bearer your-pat-token" \
     -H "Accept: application/json" \
     https://jira.company.com/rest/api/2/myself
```

#### 3. Network Connectivity

**Problem**: Cannot reach Server/Data Center instance.

**Check**:
- VPN connection (if required)
- Firewall settings
- DNS resolution
- Proxy configuration

**Test connectivity**:
```bash
# Test basic connectivity
ping jira.company.com

# Test HTTPS connectivity
curl -I https://jira.company.com
```

#### 4. API Version Compatibility

**Problem**: Some features don't work with older Server/Data Center versions.

**Solutions**:
- Check your Atlassian version
- Consult API documentation for version compatibility
- Some Cloud-specific features may not be available

#### 5. Permission Errors

**Problem**: 403 Forbidden errors when accessing resources.

**Solutions**:
- Verify user permissions on projects/spaces
- Check PAT token scopes
- Contact your Atlassian administrator

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
# Enable debug mode
DEBUG=mcp-atlassian-server:* node ./dist/index.js

# Or set log level
LOG_LEVEL=debug node ./dist/index.js
```

### Getting Help

1. **Check the troubleshooting guide** above
2. **Review existing GitHub issues**: https://github.com/phuc-nt/mcp-atlassian-server/issues
3. **Enable debug logging** and gather error details
4. **Create a new GitHub issue** with:
   - Your Server/Data Center version
   - Error messages and logs
   - Configuration details (without sensitive information)
   - Steps to reproduce the issue

For comprehensive Server/Data Center setup instructions, see: [docs/dev-guide/server-datacenter-setup.md](./docs/dev-guide/server-datacenter-setup.md)