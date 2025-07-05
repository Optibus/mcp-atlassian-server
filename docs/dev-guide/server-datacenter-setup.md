# Server/Data Center Setup Guide for MCP Atlassian Server

This guide provides comprehensive instructions for setting up and configuring MCP Atlassian Server with Atlassian Server/Data Center deployments.

## Overview

MCP Atlassian Server automatically detects and supports both Atlassian Cloud and Server/Data Center deployments. This guide focuses specifically on Server/Data Center configurations, including authentication, SSL handling, and troubleshooting.

## Prerequisites

- Atlassian Server/Data Center instance (Jira and/or Confluence)
- Administrative or appropriate user permissions
- Node.js 16+ installed
- MCP Atlassian Server installed

## Quick Start

### 1. Environment Configuration

Create a `.env` file or set environment variables:

```bash
# Basic Server/Data Center Configuration
ATLASSIAN_SITE_NAME=https://jira.company.com
ATLASSIAN_PAT_TOKEN=your-personal-access-token

# Optional: Force deployment type (auto-detected if not specified)
ATLASSIAN_DEPLOYMENT_TYPE=server
```

### 2. Test Connection

```bash
# Test the MCP Server directly
node ./dist/index.js

# Or if installed via npm
node $(npm root -g)/@phuc-nt/mcp-atlassian-server/dist/index.js
```

## Authentication Methods

### Personal Access Token (Recommended)

Personal Access Tokens provide the most secure authentication method for Server/Data Center.

#### Creating a PAT

1. **Log into your Atlassian instance**
2. **Navigate to Profile → Personal Access Tokens**
3. **Click "Create token"**
4. **Configure the token:**
   - **Name**: `MCP Server` (or descriptive name)
   - **Expiration**: Set appropriate expiration date
   - **Permissions**: Select required scopes:
     - **Jira**: `READ`, `WRITE`, `ADMIN` (based on needs)
     - **Confluence**: `READ`, `WRITE` (based on needs)

#### Environment Configuration

```bash
ATLASSIAN_SITE_NAME=https://jira.company.com
ATLASSIAN_PAT_TOKEN=your-personal-access-token
```

### Basic Authentication (Fallback)

If PAT tokens are not available, you can use basic authentication:

```bash
ATLASSIAN_SITE_NAME=https://jira.company.com
ATLASSIAN_USER_EMAIL=your-username
ATLASSIAN_API_TOKEN=your-password
```

> **Security Note**: Basic authentication is less secure than PAT tokens. Consider creating a dedicated service account.

## URL Patterns and Detection

### Automatic Detection

The server automatically detects deployment type based on URL patterns:

| Pattern | Deployment Type |
|---------|-----------------|
| `*.atlassian.net` | Cloud |
| `api.atlassian.com` | Cloud (OAuth) |
| `localhost` | Server/Data Center |
| Private IP ranges | Server/Data Center |
| Custom domains | Server/Data Center |

### Manual Override

Force deployment type if auto-detection fails:

```bash
ATLASSIAN_DEPLOYMENT_TYPE=server
```

## SSL Configuration

### Self-Signed Certificates

Many Server/Data Center instances use self-signed certificates. Configure SSL handling:

```bash
# Disable SSL verification (for development only)
NODE_TLS_REJECT_UNAUTHORIZED=0

# Or handle in code (see troubleshooting section)
```

### Certificate Authority

For production environments, properly configure certificate authorities:

```bash
# Set custom CA bundle
NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.pem
```

## Configuration Examples

### Development Environment

```bash
# .env file for development
ATLASSIAN_SITE_NAME=https://jira-dev.company.com
ATLASSIAN_PAT_TOKEN=dev-pat-token
ATLASSIAN_DEPLOYMENT_TYPE=server
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Production Environment

```bash
# .env file for production
ATLASSIAN_SITE_NAME=https://jira.company.com
ATLASSIAN_PAT_TOKEN=prod-pat-token
ATLASSIAN_DEPLOYMENT_TYPE=server
NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-bundle.pem
```

### Multiple Instances

```bash
# Primary Jira instance
ATLASSIAN_SITE_NAME=https://jira.company.com
ATLASSIAN_PAT_TOKEN=jira-pat-token

# Note: Currently, MCP Server supports one instance at a time
# For multiple instances, run separate MCP Server processes
```

## Testing and Validation

### Authentication Test

Use the built-in authentication tester:

```bash
# Test authentication
node -e "
const { testAuthentication } = require('./dist/utils/auth-tester');
const config = require('./dist/utils/mcp-helpers').getAtlassianConfigFromEnv();
testAuthentication(config).then(result => console.log(result));
"
```

### Manual API Test

Test API connectivity manually:

```bash
# Test Jira API
curl -H "Authorization: Bearer your-pat-token" \
     -H "Accept: application/json" \
     https://jira.company.com/rest/api/2/myself

# Test Confluence API
curl -H "Authorization: Bearer your-pat-token" \
     -H "Accept: application/json" \
     https://confluence.company.com/rest/api/user/current
```

## Troubleshooting

### Common Issues

#### 1. SSL Certificate Errors

**Error**: `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or `SELF_SIGNED_CERT_IN_CHAIN`

**Solutions**:
```bash
# Temporary (development only)
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Production solution
export NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.pem
```

#### 2. Authentication Failures

**Error**: `401 Unauthorized`

**Check**:
- PAT token is valid and not expired
- User has appropriate permissions
- Correct base URL

**Test**:
```bash
# Verify token manually
curl -H "Authorization: Bearer your-pat-token" \
     https://jira.company.com/rest/api/2/myself
```

#### 3. Permission Denied

**Error**: `403 Forbidden`

**Solutions**:
- Check user permissions on projects/spaces
- Verify PAT token scopes
- Contact Atlassian administrator

#### 4. Network Connectivity

**Error**: `ECONNREFUSED` or `ETIMEDOUT`

**Check**:
- VPN connection (if required)
- Firewall settings
- Proxy configuration
- DNS resolution

#### 5. API Version Compatibility

**Error**: `404 Not Found` on API endpoints

**Solutions**:
- Check Atlassian version compatibility
- Some features may not be available in older versions
- Consult API documentation for your version

### Debug Mode

Enable debug logging:

```bash
# Enable debug mode
DEBUG=mcp-atlassian-server:* node ./dist/index.js

# Or set log level
LOG_LEVEL=debug node ./dist/index.js
```

### Health Check

Create a health check script:

```javascript
// health-check.js
const { getAtlassianConfigFromEnv } = require('./dist/utils/mcp-helpers');
const { testAuthentication } = require('./dist/utils/auth-tester');

async function healthCheck() {
  try {
    const config = getAtlassianConfigFromEnv();
    console.log('Configuration:', {
      baseUrl: config.baseUrl,
      deploymentType: config.deploymentType,
      authType: config.authType
    });
    
    const authResult = await testAuthentication(config);
    console.log('Authentication:', authResult);
    
    if (authResult.success) {
      console.log('✅ Health check passed');
    } else {
      console.log('❌ Health check failed');
    }
  } catch (error) {
    console.error('❌ Health check error:', error.message);
  }
}

healthCheck();
```

## Advanced Configuration

### Proxy Settings

Configure proxy for corporate environments:

```bash
# HTTP proxy
HTTP_PROXY=http://proxy.company.com:8080

# HTTPS proxy
HTTPS_PROXY=https://proxy.company.com:8080

# No proxy for specific domains
NO_PROXY=localhost,127.0.0.1,.company.com
```

### Custom Headers

Add custom headers for specific environments:

```bash
# Custom headers (if needed)
ATLASSIAN_CUSTOM_HEADERS='{"X-Custom-Header": "value"}'
```

### Timeout Configuration

Configure request timeouts:

```bash
# Request timeout in milliseconds
ATLASSIAN_REQUEST_TIMEOUT=30000
```

## Best Practices

### Security

1. **Use PAT tokens** instead of basic authentication
2. **Set appropriate token expiration** dates
3. **Create dedicated service accounts** for MCP Server
4. **Regularly rotate tokens**
5. **Use environment variables** for sensitive data
6. **Enable SSL verification** in production

### Performance

1. **Configure appropriate timeouts**
2. **Monitor API rate limits**
3. **Use connection pooling** for high-volume usage
4. **Cache frequently accessed data**

### Monitoring

1. **Set up health checks**
2. **Monitor authentication status**
3. **Track API usage and errors**
4. **Set up alerts for failures**

## Version Compatibility

### Supported Versions

| Product | Minimum Version | Recommended Version |
|---------|-----------------|-------------------|
| Jira Server/Data Center | 8.0+ | 9.0+ |
| Confluence Server/Data Center | 7.0+ | 8.0+ |

### API Compatibility

- **Jira**: Uses REST API v2 and v3
- **Confluence**: Uses REST API v1 and v2
- **Features**: Some features may not be available in older versions

## Support and Resources

### Documentation

- [Atlassian REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [MCP Atlassian Server GitHub Repository](https://github.com/phuc-nt/mcp-atlassian-server)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)

### Community

- [GitHub Issues](https://github.com/phuc-nt/mcp-atlassian-server/issues)
- [MCP Community](https://github.com/modelcontextprotocol)

### Getting Help

1. **Check this troubleshooting guide**
2. **Review GitHub issues** for similar problems
3. **Enable debug logging** to gather more information
4. **Create a GitHub issue** with detailed information

## Migration from Cloud

If migrating from Cloud to Server/Data Center:

1. **Update environment variables**:
   ```bash
   # From Cloud
   ATLASSIAN_SITE_NAME=company.atlassian.net
   ATLASSIAN_USER_EMAIL=user@company.com
   ATLASSIAN_API_TOKEN=cloud-api-token
   
   # To Server/Data Center
   ATLASSIAN_SITE_NAME=https://jira.company.com
   ATLASSIAN_PAT_TOKEN=server-pat-token
   ```

2. **Test authentication** with new credentials
3. **Verify API compatibility** for your use cases
4. **Update any hardcoded assumptions** about data formats

## Conclusion

MCP Atlassian Server provides seamless support for Server/Data Center deployments with automatic detection and appropriate authentication handling. Follow this guide to ensure proper setup and configuration for your environment.

For additional support, refer to the troubleshooting section or create an issue on the GitHub repository. 