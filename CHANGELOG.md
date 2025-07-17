# CHANGELOG

## [2.2.0] - 2025-05-18

### 🎉 Major Feature Release: Server/Data Center Support

### ✨ New Features
- **Full Server/Data Center Support**: Complete implementation of Atlassian Server and Data Center support alongside existing Cloud support
- **Separate Configuration System**: Support for independent Jira and Confluence configurations for mixed environments
- **Advanced Authentication**: Multiple authentication methods including Personal Access Tokens (PAT) for Server/DC and API tokens for Cloud
- **Automatic Deployment Detection**: Intelligent detection of Cloud vs Server/Data Center instances based on URL patterns
- **Enhanced User ID Handling**: Seamless handling of different user identifier formats between Cloud (accountId) and Server/DC (username/key)

### 🔧 Technical Improvements
- Updated all 35 resources and tools (25 tools + 10 resources) to support separate configurations
- Enhanced configuration system with backward compatibility
- Comprehensive authentication strategy pattern implementation
- Advanced API compatibility layer for Cloud vs Server/DC differences
- Extensive test coverage with 127+ unit tests

### 📝 Configuration Examples
```bash
# Separate Configuration (Recommended)
JIRA_URL=https://jira.company.com
JIRA_PAT_TOKEN=your_jira_pat_token
CONFLUENCE_URL=https://confluence.company.com  
CONFLUENCE_PAT_TOKEN=your_confluence_pat_token

# Legacy Configuration (Still Supported)
ATLASSIAN_SITE_NAME=company.atlassian.net
ATLASSIAN_USER_EMAIL=user@company.com
ATLASSIAN_API_TOKEN=your_api_token
```

### 🆕 Environment Variables
- `JIRA_URL`, `JIRA_PAT_TOKEN`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN`
- `CONFLUENCE_URL`, `CONFLUENCE_PAT_TOKEN`, `CONFLUENCE_USER_EMAIL`, `CONFLUENCE_API_TOKEN`
- Full backward compatibility with existing `ATLASSIAN_*` variables

### 📚 Documentation
- Comprehensive Server/Data Center setup guide
- Updated installation instructions with mixed environment examples
- Enhanced troubleshooting section for authentication and SSL issues

## [2.1.1] - 2025-05-17

### 📝 Patch Release
- Documentation and metadata updates only. No code changes.

## [2.1.0] - 2025-05-17

### ✨ Refactor & Standardization
- Refactored the entire codebase to standardize resource/tool structure
- Completely removed the content-metadata resource, merged metadata into the page resource
- Updated and standardized developer documentation for easier extension and maintenance
- Ensured compatibility with the latest MCP SDK, improved security, scalability, and maintainability
- Updated `docs/introduction/resources-and-tools.md` to remove all references to content-metadata

### 🔧 Bug Fixes
- Fixed duplicate resource registration issues
- Improved resource management and registration process
- Resolved issues with conflicting resource patterns

## [2.0.0] - 2025-05-11

### ✨ Improvements
- Updated all APIs to latest versions (Jira API v3, Confluence API v2)
- Improved documentation and README structure
- Reorganized resources and tools into logical groups

### 🎉 New Features
- **Jira Board & Sprint:** Management of boards, sprints, and issues for Agile/Scrum workflows
- **Jira Dashboard & Gadgets:** Create/update dashboards, add/remove gadgets
- **Jira Filters:** Create, view, update, delete search filters for issues
- **Advanced Confluence Pages:** Version management, attachments, page deletion
- **Confluence Comments:** Update and delete comments
- Expanded from 21 to 48 features, including numerous new tools for both Jira and Confluence

### 🔧 Bug Fixes
- Fixed issues with Jira dashboard and gadget tools/resources
- Resolved problems with jira://users resource
- Improved error handling and messaging
- Fixed compatibility issues between API versions

### 🔄 Code Changes
- Restructured codebase for easier future expansion
- Improved feature implementation workflow 