# Adding Server/Data Center Support to MCP Atlassian Server

## 📊 Tiến độ hiện tại

**Ngày cập nhật:** 2024-12-30  
**Hoàn thành:** 2/7 phases (29%)  
**Phase hiện tại:** ✅ Phase 1 & 2 hoàn thành, chuẩn bị Phase 3

### ✅ **Hoàn thành**
- **Phase 1: Core Infrastructure** - Deployment detection & Enhanced configuration
- **Phase 2: Authentication Handling** - Auth strategy pattern với Cloud & Server/DC support

### 🚧 **Tiếp theo** 
- **Phase 3: API Compatibility Layer** - URL handling & endpoint mapping

---

## Tổng quan

Task này nhằm mở rộng MCP Atlassian Server hiện tại (đang chỉ hỗ trợ Atlassian Cloud) để cũng hỗ trợ Atlassian Server/Data Center deployments. Việc implementation sẽ dựa trên các patterns đã được chứng minh từ tài liệu reference.

## Phân tích Core Differences

### Authentication Methods
| Deployment Type | Supported Auth Methods | Headers Used |
|-----------------|------------------------|--------------|
| **Cloud** | • API Token + Email<br>• OAuth 2.0 | `Authorization: Basic base64(email:token)` |
| **Server/DC** | • Personal Access Token (PAT)<br>• Basic Auth + Username | `Authorization: Bearer pat_token`<br>`Authorization: Basic base64(user:password)` |

### URL Patterns
| Type | Jira URL | Confluence URL |
|------|----------|----------------|
| **Cloud** | `https://{tenant}.atlassian.net` | `https://{tenant}.atlassian.net/wiki` |
| **Server/DC** | `https://jira.company.com` | `https://confluence.company.com` |

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Tuần 1-2)

#### 1.1. Deployment Detection Utility ✅ **COMPLETED**
- [x] **Tạo `src/utils/deployment-detector.ts`**
  - [x] Function `isAtlassianCloudUrl(url: string): boolean`
  - [x] Function `getDeploymentType(url: string): 'cloud' | 'server'`
  - [x] Handle các pattern: localhost, private IPs, .atlassian.net domains
  - [x] Unit tests cho detection logic

#### 1.2. Configuration Enhancement ✅ **COMPLETED**
- [x] **Cập nhật `src/utils/mcp-helpers.ts` (enhanced config system)**
  - [x] Created `EnhancedAtlassianConfig` interface với deployment type support
  - [x] Enhanced `getAtlassianConfigFromEnv()` với auto-detection
  - [x] Support cho PAT token và Basic Auth
  - [x] Auto-detect deployment type trong config
  - [x] Validation logic cho từng auth type

#### 1.3. Environment Variables ✅ **COMPLETED**
- [x] **Thêm hỗ trợ env variables mới**
  ```bash
  # Server/Data Center Configuration
  ATLASSIAN_DEPLOYMENT_TYPE=server  # Optional: auto-detect if not provided
  ATLASSIAN_PAT_TOKEN=your_pat_token
  ATLASSIAN_USER_EMAIL=your_username  # For basic auth (reused existing)
  ATLASSIAN_API_TOKEN=your_password   # For basic auth (reused existing)
  ```
  - [x] Updated `Config.getAtlassianConfigFromEnv()` trong `mcp-helpers.ts`
  - [x] Backward compatibility với env variables hiện tại

### Phase 2: Authentication Handling (Tuần 2-3)

#### 2.1. Auth Strategy Pattern ✅ **COMPLETED**
- [x] **Tạo `src/utils/auth-strategy.ts`**
  ```typescript
  interface AuthStrategy {
    getAuthHeaders(): Record<string, string>;
    getAuthType(): string;
    validate(): { isValid: boolean; error?: string };
  }
  
  class CloudAuthStrategy implements AuthStrategy { }
  class ServerAuthStrategy implements AuthStrategy { }
  class AuthStrategyFactory { }
  ```

#### 2.2. Client Factory Pattern ✅ **COMPLETED**
- [x] **Auth strategy integration sẵn sàng cho client creation**
  - [x] AuthStrategyFactory creates appropriate strategy based on deployment type
  - [x] Headers generation với proper authentication method
  - [x] Validation logic integrated

#### 2.3. Auth Testing Utility ⚠️ **TODO FOR NEXT PHASE**
- [ ] **Tạo `src/utils/auth-tester.ts`**
  - [ ] Function test authentication cho cả Cloud và Server/DC
  - [ ] Call `/rest/api/2/myself` endpoint để validate
  - [ ] Error handling và logging chi tiết

### Phase 3: API Compatibility Layer (Tuần 3-4)

#### 3.1. User ID Handling
- [ ] **Tạo `src/utils/user-id-helper.ts`**
  - [ ] Function `getUserIdentifier(userData, deploymentType)`
  - [ ] Cloud: sử dụng `accountId`
  - [ ] Server/DC: sử dụng `name` hoặc `key`
  - [ ] User lookup functions

#### 3.2. API Endpoint Compatibility
- [ ] **Tạo `src/utils/api-compatibility.ts`**
  - [ ] Map Cloud-only endpoints
  - [ ] Alternative endpoints cho Server/DC
  - [ ] Version handling (v2 vs v3 APIs)

#### 3.3. Response Data Normalization
- [ ] **Cập nhật response formatters**
  - [ ] Normalize user data structure
  - [ ] Handle different field names between Cloud/Server
  - [ ] Consistent error messaging

### Phase 4: Resource Updates (Tuần 4-5)

#### 4.1. Jira Resources
- [ ] **Cập nhật `src/resources/jira/`**
  - [ ] `issues.ts`: Handle user fields (assignee, reporter)
  - [ ] `users.ts`: Update user search logic
  - [ ] `projects.ts`: Handle project roles differently
  - [ ] Test với Server/DC instance

#### 4.2. Confluence Resources  
- [ ] **Cập nhật `src/resources/confluence/`**
  - [ ] `pages.ts`: Handle user data in page info
  - [ ] `spaces.ts`: Handle space permissions
  - [ ] Test với Server/DC instance

### Phase 5: Tool Updates (Tuần 5-6)

#### 5.1. Jira Tools
- [ ] **Cập nhật `src/tools/jira/`**
  - [ ] `create-issue.ts`: Handle assignee field format
  - [ ] `assign-issue.ts`: Use correct user identifier
  - [ ] `transition-issue.ts`: Test với Server/DC
  - [ ] All tools: Handle auth differences

#### 5.2. Confluence Tools
- [ ] **Cập nhật `src/tools/confluence/`**
  - [ ] `create-page.ts`: Handle author/creator fields
  - [ ] `add-comment.ts`: User identification
  - [ ] Test tất cả tools với Server/DC

### Phase 6: Testing & Validation (Tuần 6-7)

#### 6.1. Unit Tests
- [ ] **Tests cho new utilities**
  - [ ] `deployment-detector.test.ts`
  - [ ] `auth-strategies.test.ts`
  - [ ] `user-id-helper.test.ts`
  - [ ] `api-compatibility.test.ts`

#### 6.2. Integration Tests
- [ ] **Test với Server/DC instances**
  - [ ] Setup test environment (Docker hoặc real instance)
  - [ ] Test authentication flows
  - [ ] Test all resources và tools
  - [ ] Performance testing

#### 6.3. Test Client Updates
- [ ] **Cập nhật `dev_mcp-atlassian-test-client/`**
  - [ ] Add Server/DC test scenarios
  - [ ] Test scripts cho different auth methods
  - [ ] Validation scripts

### Phase 7: Documentation & Deployment (Tuần 7-8)

#### 7.1. Documentation
- [ ] **Cập nhật README.md**
  - [ ] Server/DC setup instructions
  - [ ] Environment variables documentation
  - [ ] Authentication methods explanation
  - [ ] Troubleshooting guide

#### 7.2. Installation Guide
- [ ] **Cập nhật `llms-install.md`**
  - [ ] Server/DC specific setup steps
  - [ ] PAT token generation guide
  - [ ] SSL certificate handling
  - [ ] Common issues và solutions

#### 7.3. Developer Guide
- [ ] **Tạo `docs/dev-guide/server-datacenter-setup.md`**
  - [ ] Development environment setup
  - [ ] Testing với local Server/DC
  - [ ] Debugging tips
  - [ ] API differences reference

---

## ✅ Technical Implementation Details (Completed)

### Files Created/Modified

**✅ Phase 1 - Core Infrastructure:**
- `src/utils/deployment-detector.ts` - Deployment type detection utility
- `src/utils/mcp-helpers.ts` - Enhanced configuration system
- `src/tests/unit/deployment-detector.test.ts` - Unit tests
- `src/tests/unit/mcp-helpers-config.test.ts` - Configuration tests

**✅ Phase 2 - Authentication Handling:**
- `src/utils/auth-strategy.ts` - Authentication strategy pattern
- `src/tests/unit/auth-strategy.test.ts` - Auth strategy tests

### Environment Variables Support
```bash
# Cloud Configuration (existing)
ATLASSIAN_SITE_NAME=company.atlassian.net
ATLASSIAN_USER_EMAIL=user@company.com
ATLASSIAN_API_TOKEN=cloud_api_token

# Server/Data Center Configuration (new)
ATLASSIAN_SITE_NAME=https://jira.company.com
ATLASSIAN_DEPLOYMENT_TYPE=server  # Optional: auto-detected
ATLASSIAN_PAT_TOKEN=server_pat_token  # Preferred for Server/DC
# OR Basic Auth fallback:
ATLASSIAN_USER_EMAIL=admin
ATLASSIAN_API_TOKEN=admin_password
```

### Config Detection Logic
```typescript
// src/utils/deployment-detector.ts
export function isAtlassianCloudUrl(url: string): boolean {
  if (!url) return false;
  
  const hostname = new URL(url).hostname;
  
  // Check for localhost/private IPs (always Server/DC)
  if (hostname === 'localhost' || 
      hostname.match(/^127\./) ||
      hostname.match(/^192\.168\./) ||
      hostname.match(/^10\./) ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
    return false;
  }
  
  // Check for Atlassian Cloud domains
  return hostname.includes('.atlassian.net') ||
         hostname.includes('.jira.com') ||
         hostname.includes('api.atlassian.com');
}
```

### Enhanced AtlassianConfig
```typescript
// src/utils/atlassian-api-base.ts
export interface AtlassianConfig {
  baseUrl: string;
  deploymentType: 'cloud' | 'server';
  authType: 'basic' | 'pat';
  
  // Cloud auth
  email?: string;
  apiToken?: string;
  
  // Server/DC auth
  personalToken?: string;
  username?: string;
  password?: string;
  
  // Server/DC specific
  sslVerify?: boolean;
}
```

### Auth Strategy Implementation
```typescript
// src/utils/auth-strategies.ts
export class AuthStrategyFactory {
  static create(config: AtlassianConfig): AuthStrategy {
    if (config.deploymentType === 'cloud') {
      return new CloudBasicAuthStrategy();
    } else {
      if (config.authType === 'pat') {
        return new ServerPATAuthStrategy();
      } else {
        return new ServerBasicAuthStrategy();
      }
    }
  }
}
```

---

## Risks & Mitigation

### 1. **Backward Compatibility**
- **Risk**: Breaking existing Cloud configurations
- **Mitigation**: 
  - Keep all existing env variables working
  - Auto-detect deployment type as fallback
  - Extensive testing với existing setups

### 2. **SSL Certificate Issues**
- **Risk**: Server/DC với self-signed certificates
- **Mitigation**:
  - Add `sslVerify` config option
  - Clear documentation về SSL setup
  - Error messages hướng dẫn fix SSL issues

### 3. **API Differences**
- **Risk**: Subtle differences between Cloud và Server APIs
- **Mitigation**:
  - Comprehensive compatibility layer
  - Extensive testing với real instances
  - Clear error messages cho unsupported features

### 4. **Authentication Complexity**
- **Risk**: Multiple auth methods có thể confuse users
- **Mitigation**:
  - Clear documentation và examples
  - Auto-detection logic
  - Validation và helpful error messages

---

## Success Criteria

### Functional Requirements
- [ ] Support both Atlassian Cloud và Server/Data Center
- [ ] Auto-detect deployment type from URL
- [ ] Handle multiple authentication methods
- [ ] All existing resources/tools work with Server/DC
- [ ] Backward compatibility với existing configurations

### Non-Functional Requirements
- [ ] Performance không bị impact đáng kể
- [ ] Clear error messages và debugging info
- [ ] Comprehensive documentation
- [ ] Extensive test coverage (>90%)
- [ ] No breaking changes cho existing users

### Quality Metrics
- [ ] All unit tests pass
- [ ] Integration tests với real Server/DC instances
- [ ] Performance benchmarks
- [ ] Security review của auth implementations
- [ ] Documentation review và user feedback

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | Tuần 1-2 | Core infrastructure, config updates |
| Phase 2 | Tuần 2-3 | Authentication handling |
| Phase 3 | Tuần 3-4 | API compatibility layer |
| Phase 4 | Tuần 4-5 | Resource updates |
| Phase 5 | Tuần 5-6 | Tool updates |
| Phase 6 | Tuần 6-7 | Testing & validation |
| Phase 7 | Tuần 7-8 | Documentation & deployment |

**Total Estimated Time**: 8 tuần

---

## Priority Order

### High Priority (Must Have)
1. Deployment detection utility
2. Enhanced configuration system
3. Authentication strategies
4. Core resource/tool compatibility

### Medium Priority (Should Have)
1. Advanced error handling
2. Performance optimizations
3. Comprehensive testing
4. Detailed documentation

### Low Priority (Nice to Have)
1. Advanced SSL handling
2. Proxy support
3. OAuth support cho Server/DC
4. Migration utilities

---

## Dependencies

### External Dependencies
- Access to Atlassian Server/Data Center instance for testing
- Personal Access Tokens for authentication testing
- SSL certificates (có thể self-signed) for testing

### Internal Dependencies
- Current codebase must be stable
- No breaking changes to existing MCP helpers
- Maintain compatibility với MCP SDK v1.11.0+

---

## Notes

- Việc implementation này sẽ làm cho MCP Atlassian Server trở thành một solution comprehensive cho cả Cloud và Server/DC deployments
- Cần đặc biệt chú ý đến security aspects của authentication handling
- Documentation phải rất clear vì complexity sẽ tăng lên đáng kể
- Testing strategy phải robust để đảm bảo không break existing functionality 