# Adding Server/Data Center Support to MCP Atlassian Server

## Overview

This guide provides step-by-step instructions to extend your existing MCP server (currently supporting Atlassian Cloud) to also support Atlassian Server/Data Center deployments. The implementation follows proven patterns from the mcp-atlassian reference project.

## Table of Contents

1. [Core Differences Analysis](#core-differences-analysis)
2. [Implementation Steps](#implementation-steps)
3. [Configuration Changes](#configuration-changes)
4. [Authentication Handling](#authentication-handling)
5. [Client Initialization](#client-initialization)
6. [API Differences](#api-differences)
7. [Testing Strategy](#testing-strategy)
8. [Migration Checklist](#migration-checklist)

---

## Core Differences Analysis

### Authentication Methods

| Deployment Type | Supported Auth Methods | Headers Used |
|-----------------|------------------------|--------------|
| **Cloud** | • API Token + Username<br>• OAuth 2.0 | `Authorization: Basic base64(email:token)`<br>`Authorization: Bearer oauth_token` |
| **Server/DC** | • Personal Access Token (PAT)<br>• Basic Auth + Username | `Authorization: Bearer pat_token`<br>`Authorization: Basic base64(user:password)` |

### URL Patterns

| Type | Jira URL | Confluence URL |
|------|----------|----------------|
| **Cloud** | `https://{tenant}.atlassian.net` | `https://{tenant}.atlassian.net/wiki` |
| **Server/DC** | `https://jira.company.com` | `https://confluence.company.com` |
| **OAuth Cloud** | `https://api.atlassian.com/ex/jira/{cloud_id}` | `https://api.atlassian.com/ex/confluence/{cloud_id}` |

### Key Differences Summary

- **URL Detection**: Auto-detect deployment type based on hostname patterns
- **Authentication**: PAT tokens for Server/DC, API tokens for Cloud
- **SSL Handling**: Server/DC may require SSL verification disable
- **User IDs**: Cloud uses `accountId`, Server/DC uses `name` or `key`
- **API Versions**: Some endpoints differ between Cloud and Server/DC

---

## Implementation Steps

### 1. URL Detection Utility

Create a utility function to detect deployment type:

```python
# utils/deployment.py
import re
from urllib.parse import urlparse

def is_atlassian_cloud_url(url: str) -> bool:
    """Determine if a URL belongs to Atlassian Cloud or Server/Data Center.
    
    Args:
        url: The URL to check
        
    Returns:
        True if the URL is for an Atlassian Cloud instance, False for Server/Data Center
    """
    if not url:
        return False
        
    parsed_url = urlparse(url)
    hostname = parsed_url.hostname or ""
    
    # Check for localhost or private IP addresses (always Server/DC)
    if (
        hostname == "localhost"
        or re.match(r"^127\.", hostname)
        or re.match(r"^192\.168\.", hostname)
        or re.match(r"^10\.", hostname)
        or re.match(r"^172\.(1[6-9]|2[0-9]|3[0-1])\.", hostname)
    ):
        return False
    
    # Check for Atlassian Cloud domains
    return (
        ".atlassian.net" in hostname
        or ".jira.com" in hostname
        or ".jira-dev.com" in hostname
        or "api.atlassian.com" in hostname
    )

def get_deployment_type(url: str) -> str:
    """Get deployment type as string."""
    return "cloud" if is_atlassian_cloud_url(url) else "server"
```

### 2. Configuration Classes

Update your configuration classes to handle both deployment types:

```python
# config/jira_config.py
from dataclasses import dataclass
from typing import Literal, Optional
from .utils.deployment import is_atlassian_cloud_url

@dataclass
class JiraConfig:
    """Jira API configuration for both Cloud and Server/Data Center."""
    
    url: str
    auth_type: Literal["basic", "pat", "oauth"]
    
    # Cloud authentication
    username: Optional[str] = None
    api_token: Optional[str] = None
    
    # Server/DC authentication  
    personal_token: Optional[str] = None
    
    # OAuth (Cloud only)
    oauth_config: Optional[dict] = None
    
    # Server/DC specific
    ssl_verify: bool = True
    
    # Filtering
    projects_filter: Optional[str] = None
    
    # Proxy settings
    http_proxy: Optional[str] = None
    https_proxy: Optional[str] = None
    no_proxy: Optional[str] = None
    
    @property
    def is_cloud(self) -> bool:
        """Check if this is a cloud instance."""
        return is_atlassian_cloud_url(self.url)
    
    @classmethod
    def from_env(cls) -> "JiraConfig":
        """Create configuration from environment variables."""
        import os
        
        url = os.getenv("JIRA_URL")
        if not url:
            raise ValueError("Missing required JIRA_URL environment variable")
        
        # Determine authentication type
        username = os.getenv("JIRA_USERNAME")
        api_token = os.getenv("JIRA_API_TOKEN") 
        personal_token = os.getenv("JIRA_PERSONAL_TOKEN")
        
        is_cloud = is_atlassian_cloud_url(url)
        
        # Authentication logic
        if is_cloud:
            if username and api_token:
                auth_type = "basic"
            else:
                raise ValueError("Cloud authentication requires JIRA_USERNAME and JIRA_API_TOKEN")
        else:  # Server/Data Center
            if personal_token:
                auth_type = "pat"
            elif username and api_token:
                auth_type = "basic"  # Allow basic auth for Server/DC
            else:
                raise ValueError("Server/Data Center authentication requires JIRA_PERSONAL_TOKEN or JIRA_USERNAME and JIRA_API_TOKEN")
        
        # SSL verification (mainly for Server/DC)
        ssl_verify = os.getenv("JIRA_SSL_VERIFY", "true").lower() != "false"
        
        return cls(
            url=url,
            auth_type=auth_type,
            username=username,
            api_token=api_token,
            personal_token=personal_token,
            ssl_verify=ssl_verify,
            projects_filter=os.getenv("JIRA_PROJECTS_FILTER"),
            http_proxy=os.getenv("JIRA_HTTP_PROXY"),
            https_proxy=os.getenv("JIRA_HTTPS_PROXY"),
            no_proxy=os.getenv("JIRA_NO_PROXY"),
        )
    
    def is_auth_configured(self) -> bool:
        """Check if authentication is properly configured."""
        if self.auth_type == "pat":
            return bool(self.personal_token)
        elif self.auth_type == "basic":
            return bool(self.username and self.api_token)
        return False
```

### 3. Client Authentication Setup

Modify your client initialization to handle different auth types:

```python
# clients/jira_client.py
import requests
from requests.auth import HTTPBasicAuth

class JiraClient:
    def __init__(self, config: JiraConfig):
        self.config = config
        self.session = requests.Session()
        
        # Configure authentication
        self._setup_authentication()
        
        # Configure SSL
        self._setup_ssl()
        
        # Configure proxies
        self._setup_proxies()
    
    def _setup_authentication(self):
        """Setup authentication based on config."""
        if self.config.auth_type == "pat":
            # Personal Access Token for Server/DC
            self.session.headers["Authorization"] = f"Bearer {self.config.personal_token}"
            
        elif self.config.auth_type == "basic":
            # Basic auth for both Cloud and Server/DC
            self.session.auth = HTTPBasicAuth(
                self.config.username, 
                self.config.api_token
            )
            
        else:
            raise ValueError(f"Unsupported auth type: {self.config.auth_type}")
    
    def _setup_ssl(self):
        """Configure SSL verification."""
        self.session.verify = self.config.ssl_verify
        
        if not self.config.ssl_verify:
            # Disable SSL warnings for Server/DC with self-signed certs
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    def _setup_proxies(self):
        """Configure proxy settings."""
        proxies = {}
        if self.config.http_proxy:
            proxies["http"] = self.config.http_proxy
        if self.config.https_proxy:
            proxies["https"] = self.config.https_proxy
        
        if proxies:
            self.session.proxies.update(proxies)
```

### 4. User ID Handling

Handle different user ID formats between Cloud and Server/DC:

```python
# utils/user_helper.py
class UserHelper:
    def __init__(self, config, client):
        self.config = config
        self.client = client
    
    def get_user_identifier(self, user_data: dict) -> str:
        """Get the appropriate user identifier based on deployment type."""
        if self.config.is_cloud:
            # Cloud uses accountId
            if "accountId" in user_data:
                return user_data["accountId"]
            raise ValueError("No accountId found in user data for Cloud instance")
        else:
            # Server/DC uses name or key
            if "name" in user_data:
                return user_data["name"]
            elif "key" in user_data:
                return user_data["key"]
            raise ValueError("No name or key found in user data for Server/DC instance")
    
    def lookup_user(self, identifier: str) -> dict:
        """Look up user by identifier, handling Cloud vs Server/DC differences."""
        if self.config.is_cloud:
            # Cloud: search by query parameter
            params = {"query": identifier}
        else:
            # Server/DC: search by username parameter
            params = {"username": identifier}
        
        # Make API call with appropriate parameters
        response = self.client.get("/rest/api/2/user/search", params=params)
        
        if response and isinstance(response, list) and len(response) > 0:
            return response[0]
        
        raise ValueError(f"User not found: {identifier}")
```

---

## Configuration Changes

### Environment Variables

Add support for Server/Data Center specific environment variables:

```bash
# Server/Data Center Configuration
JIRA_URL=https://jira.company.com
JIRA_PERSONAL_TOKEN=your_personal_access_token
JIRA_SSL_VERIFY=false  # Optional: for self-signed certificates

CONFLUENCE_URL=https://confluence.company.com  
CONFLUENCE_PERSONAL_TOKEN=your_personal_access_token
CONFLUENCE_SSL_VERIFY=false  # Optional: for self-signed certificates

# Optional: Proxy settings
JIRA_HTTP_PROXY=http://proxy.company.com:8080
JIRA_HTTPS_PROXY=https://proxy.company.com:8080
JIRA_NO_PROXY=localhost,127.0.0.1,company.local

# Optional: Project/Space filtering
JIRA_PROJECTS_FILTER=PROJ,DEV,SUPPORT
CONFLUENCE_SPACES_FILTER=DEV,TEAM,DOC
```

### Configuration Detection Logic

```python
# config/detector.py
def detect_config_type() -> dict:
    """Detect configuration type based on environment variables."""
    import os
    
    result = {
        "jira": None,
        "confluence": None
    }
    
    # Detect Jira config
    jira_url = os.getenv("JIRA_URL")
    if jira_url:
        result["jira"] = {
            "deployment_type": get_deployment_type(jira_url),
            "auth_available": {
                "api_token": bool(os.getenv("JIRA_USERNAME") and os.getenv("JIRA_API_TOKEN")),
                "personal_token": bool(os.getenv("JIRA_PERSONAL_TOKEN")),
                "oauth": bool(os.getenv("ATLASSIAN_OAUTH_CLIENT_ID"))
            }
        }
    
    # Detect Confluence config  
    confluence_url = os.getenv("CONFLUENCE_URL")
    if confluence_url:
        result["confluence"] = {
            "deployment_type": get_deployment_type(confluence_url),
            "auth_available": {
                "api_token": bool(os.getenv("CONFLUENCE_USERNAME") and os.getenv("CONFLUENCE_API_TOKEN")),
                "personal_token": bool(os.getenv("CONFLUENCE_PERSONAL_TOKEN")),
                "oauth": bool(os.getenv("ATLASSIAN_OAUTH_CLIENT_ID"))
            }
        }
    
    return result
```

---

## Authentication Handling

### Token Validation

```python
# auth/validator.py
class AuthValidator:
    @staticmethod
    def validate_cloud_auth(username: str, api_token: str) -> bool:
        """Validate Cloud API token format."""
        if not username or "@" not in username:
            return False
        if not api_token or len(api_token) < 20:
            return False
        return True
    
    @staticmethod 
    def validate_server_pat(personal_token: str) -> bool:
        """Validate Server/DC Personal Access Token format."""
        if not personal_token or len(personal_token) < 10:
            return False
        # Add more PAT-specific validations as needed
        return True
    
    @staticmethod
    def validate_config(config) -> list:
        """Validate configuration and return list of errors."""
        errors = []
        
        if config.is_cloud:
            if config.auth_type == "basic":
                if not AuthValidator.validate_cloud_auth(config.username, config.api_token):
                    errors.append("Invalid Cloud API token or username format")
        else:
            if config.auth_type == "pat":
                if not AuthValidator.validate_server_pat(config.personal_token):
                    errors.append("Invalid Personal Access Token format")
            elif config.auth_type == "basic":
                if not config.username or not config.api_token:
                    errors.append("Server/DC basic auth requires username and password")
        
        return errors
```

### Authentication Testing

```python
# auth/tester.py
class AuthTester:
    def __init__(self, client):
        self.client = client
    
    def test_authentication(self) -> dict:
        """Test authentication and return status."""
        try:
            # Try to get current user info
            response = self.client.get("/rest/api/2/myself")
            
            if response and response.get("name"):
                return {
                    "success": True,
                    "user": response.get("displayName", response.get("name")),
                    "email": response.get("emailAddress", "N/A"),
                    "account_id": response.get("accountId", response.get("name"))
                }
            else:
                return {
                    "success": False,
                    "error": "Authentication failed - empty response"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Authentication failed: {str(e)}"
            }
```

---

## API Differences

### API Version Handling

Some APIs have different versions between Cloud and Server/DC:

```python
# api/version_handler.py
class APIVersionHandler:
    def __init__(self, config):
        self.config = config
    
    def get_api_endpoint(self, base_endpoint: str, cloud_version: str = "2", server_version: str = "2") -> str:
        """Get appropriate API endpoint based on deployment type."""
        if self.config.is_cloud:
            return f"/rest/api/{cloud_version}{base_endpoint}"
        else:
            return f"/rest/api/{server_version}{base_endpoint}"
    
    def get_confluence_api_endpoint(self, base_endpoint: str) -> str:
        """Get Confluence API endpoint with version handling."""
        if self.config.is_cloud and self.config.auth_type == "oauth":
            # OAuth uses v2 API
            return f"/wiki/api/v2{base_endpoint}"
        else:
            # Token/Basic auth uses v1 API
            return f"/wiki/rest/api{base_endpoint}"
```

### Endpoint Compatibility

```python
# api/compatibility.py
class EndpointCompatibility:
    """Handle endpoint differences between Cloud and Server/DC."""
    
    CLOUD_ONLY_ENDPOINTS = [
        "/rest/api/3/application-role",
        "/rest/api/3/user/bulk/migration", 
        # Add more Cloud-only endpoints
    ]
    
    SERVER_ALTERNATIVE_ENDPOINTS = {
        "/rest/api/3/user/search": "/rest/api/2/user/search",
        # Add endpoint mappings
    }
    
    def get_compatible_endpoint(self, endpoint: str, is_cloud: bool) -> str:
        """Get compatible endpoint for the deployment type."""
        if not is_cloud:
            # Check if endpoint is Cloud-only
            if endpoint in self.CLOUD_ONLY_ENDPOINTS:
                raise ValueError(f"Endpoint {endpoint} is not available in Server/Data Center")
            
            # Check for alternative endpoints
            if endpoint in self.SERVER_ALTERNATIVE_ENDPOINTS:
                return self.SERVER_ALTERNATIVE_ENDPOINTS[endpoint]
        
        return endpoint
```

---

## Testing Strategy

### Unit Tests

```python
# tests/test_deployment_detection.py
import pytest
from utils.deployment import is_atlassian_cloud_url, get_deployment_type

class TestDeploymentDetection:
    def test_cloud_detection(self):
        """Test Cloud URL detection."""
        cloud_urls = [
            "https://company.atlassian.net",
            "https://company.atlassian.net/wiki",
            "https://api.atlassian.com/ex/jira/cloud-id"
        ]
        
        for url in cloud_urls:
            assert is_atlassian_cloud_url(url) == True
            assert get_deployment_type(url) == "cloud"
    
    def test_server_detection(self):
        """Test Server/DC URL detection."""
        server_urls = [
            "https://jira.company.com",
            "https://confluence.company.com",
            "http://localhost:8080",
            "https://192.168.1.100:8080"
        ]
        
        for url in server_urls:
            assert is_atlassian_cloud_url(url) == False
            assert get_deployment_type(url) == "server"

# tests/test_config.py
import pytest
from config.jira_config import JiraConfig

class TestJiraConfig:
    def test_cloud_config(self, monkeypatch):
        """Test Cloud configuration."""
        monkeypatch.setenv("JIRA_URL", "https://company.atlassian.net")
        monkeypatch.setenv("JIRA_USERNAME", "user@company.com")
        monkeypatch.setenv("JIRA_API_TOKEN", "api_token_here")
        
        config = JiraConfig.from_env()
        assert config.is_cloud == True
        assert config.auth_type == "basic"
        assert config.is_auth_configured() == True
    
    def test_server_config_pat(self, monkeypatch):
        """Test Server/DC PAT configuration."""
        monkeypatch.setenv("JIRA_URL", "https://jira.company.com")
        monkeypatch.setenv("JIRA_PERSONAL_TOKEN", "personal_token_here")
        
        config = JiraConfig.from_env()
        assert config.is_cloud == False
        assert config.auth_type == "pat"
        assert config.is_auth_configured() == True
```

### Integration Tests

```python
# tests/integration/test_auth.py
import pytest
from clients.jira_client import JiraClient
from config.jira_config import JiraConfig

class TestAuthentication:
    @pytest.mark.integration
    def test_cloud_auth(self):
        """Test Cloud authentication."""
        config = JiraConfig.from_env()
        if not config.is_cloud:
            pytest.skip("Cloud environment not configured")
        
        client = JiraClient(config)
        auth_result = client.test_authentication()
        assert auth_result["success"] == True
    
    @pytest.mark.integration 
    def test_server_auth(self):
        """Test Server/DC authentication."""
        config = JiraConfig.from_env()
        if config.is_cloud:
            pytest.skip("Server environment not configured")
        
        client = JiraClient(config)
        auth_result = client.test_authentication()
        assert auth_result["success"] == True
```

---

## Migration Checklist

### Pre-Implementation

- [ ] **Analyze Current Codebase**
  - [ ] Identify all hardcoded Cloud assumptions
  - [ ] List authentication points
  - [ ] Document current environment variables
  - [ ] Map API endpoints usage

- [ ] **Plan Configuration Strategy**
  - [ ] Design environment variable naming
  - [ ] Plan configuration validation
  - [ ] Design deployment detection logic

### Implementation Phase

- [ ] **Core Infrastructure**
  - [ ] Implement deployment detection utility
  - [ ] Create/update configuration classes
  - [ ] Add authentication handling
  - [ ] Implement SSL configuration

- [ ] **Client Updates**
  - [ ] Update client initialization
  - [ ] Add user ID handling logic
  - [ ] Implement API version handling
  - [ ] Add endpoint compatibility checks

- [ ] **Testing**
  - [ ] Write unit tests for new functionality
  - [ ] Create integration tests
  - [ ] Test with actual Server/DC instances
  - [ ] Validate error handling

### Post-Implementation

- [ ] **Documentation**
  - [ ] Update README with Server/DC setup
  - [ ] Document environment variables
  - [ ] Create troubleshooting guide
  - [ ] Add Server/DC examples

- [ ] **Validation**
  - [ ] Test with multiple Server/DC versions
  - [ ] Validate SSL certificate handling
  - [ ] Test proxy configurations
  - [ ] Verify user permission scenarios

### Quality Assurance

- [ ] **Code Review**
  - [ ] Review authentication security
  - [ ] Validate error handling
  - [ ] Check logging implementation
  - [ ] Verify backward compatibility

- [ ] **Performance Testing**
  - [ ] Test with large datasets
  - [ ] Validate SSL overhead
  - [ ] Check proxy performance
  - [ ] Monitor memory usage

---

## Common Pitfalls and Solutions

### 1. **SSL Certificate Issues**

**Problem**: Server/DC instances often use self-signed certificates.

**Solution**:
```python
# Allow SSL verification disable
ssl_verify = os.getenv("JIRA_SSL_VERIFY", "true").lower() != "false"

# Disable warnings when SSL verification is off
if not ssl_verify:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
```

### 2. **User ID Format Differences**

**Problem**: Cloud uses `accountId`, Server/DC uses `name` or `key`.

**Solution**:
```python
def get_user_id(user_data, is_cloud):
    if is_cloud:
        return user_data.get("accountId")
    else:
        return user_data.get("name") or user_data.get("key")
```

### 3. **API Version Compatibility**

**Problem**: Some APIs have different versions or availability.

**Solution**:
```python
def get_compatible_endpoint(base_endpoint, is_cloud, auth_type):
    if is_cloud and auth_type == "oauth":
        return f"/api/v2{base_endpoint}"  # OAuth uses v2
    else:
        return f"/rest/api{base_endpoint}"  # Token/Basic uses v1
```

### 4. **Authentication Header Format**

**Problem**: Different auth types use different header formats.

**Solution**:
```python
def set_auth_header(session, auth_type, credentials):
    if auth_type == "pat":
        session.headers["Authorization"] = f"Bearer {credentials['token']}"
    elif auth_type == "basic":
        # requests.auth.HTTPBasicAuth handles encoding
        session.auth = HTTPBasicAuth(credentials['username'], credentials['password'])
```

---

## Conclusion

This guide provides a comprehensive approach to extending your MCP server to support both Atlassian Cloud and Server/Data Center deployments. The key principles are:

1. **Detection-First**: Automatically detect deployment type
2. **Configuration-Driven**: Use environment variables to configure behavior
3. **Authentication-Aware**: Handle different auth methods appropriately
4. **API-Compatible**: Account for API differences between deployments
5. **Test-Thoroughly**: Validate with real instances

By following this guide, you'll create a robust MCP server that seamlessly works with both Cloud and Server/Data Center Atlassian instances while maintaining clean, maintainable code.
