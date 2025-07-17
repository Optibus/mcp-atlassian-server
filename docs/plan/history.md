# Lịch sử thực hiện dự án MCP Atlassian

Tài liệu này lưu trữ các giai đoạn, task đã hoàn thành và các quyết định thiết kế quan trọng trong quá trình phát triển MCP Atlassian Server.

## Phase 11: Server/Data Center Support - ✅ HOÀN THÀNH (v2.2.0 - 2025-05-18)

### 🎯 Tổng quan dự án
Đã hoàn thành thành công việc implement hỗ trợ đầy đủ cho Atlassian Server/Data Center cùng với Cloud, tạo ra một MCP server universal có thể hoạt động với mọi loại deployment của Atlassian.

### 🚀 Thành tựu chính
- **Full Server/Data Center Support**: Hoàn thành 100% hỗ trợ cho Server/DC deployments
- **Separate Configuration System**: Cấu hình riêng biệt cho Jira và Confluence - perfect cho mixed environments  
- **Advanced Authentication**: Hỗ trợ PAT tokens (Server/DC) và API tokens (Cloud) với auto-detection
- **Universal Compatibility**: Tự động phát hiện deployment type và áp dụng authentication phù hợp
- **35 Updated Components**: Toàn bộ 25 tools + 10 resources đã được cập nhật để hỗ trợ separate configurations
- **127+ Unit Tests**: Test coverage toàn diện với các scenario Cloud, Server/DC và mixed

### 🔧 Technical Implementation  
- **Core Infrastructure**: Deployment detection, enhanced configuration system, auth strategies
- **API Compatibility**: User ID handling khác biệt giữa Cloud (accountId) vs Server/DC (username/key)
- **Context-Aware Tools**: Tất cả tools được update để sử dụng context-aware configuration access
- **Resource Updates**: Toàn bộ resources hỗ trợ separate config với backward compatibility
- **Comprehensive Testing**: Auth testing utility, configuration validation, performance testing

### 📝 Configuration Evolution
```bash
# Before (v2.1.x) - Single configuration
ATLASSIAN_SITE_NAME=company.atlassian.net
ATLASSIAN_USER_EMAIL=user@company.com  
ATLASSIAN_API_TOKEN=your_token

# After (v2.2.0) - Separate configuration với backward compatibility
JIRA_URL=https://jira.company.com
JIRA_PAT_TOKEN=your_jira_pat_token
CONFLUENCE_URL=https://confluence.company.com
CONFLUENCE_PAT_TOKEN=your_confluence_pat_token
```

### 📚 Documentation & Release
- **CHANGELOG.md**: Cập nhật với detailed feature list và breaking changes
- **RELEASE_NOTES.md**: Comprehensive release notes với configuration examples
- **Installation Guide**: Updated với Server/DC setup instructions
- **Version Bump**: Package.json updated từ 2.1.1 → 2.2.0
- **Todo Lists**: Đánh dấu hoàn thành toàn bộ 7 phases của dự án

### 🎉 Impact
Phiên bản v2.2.0 đánh dấu một milestone quan trọng - MCP Atlassian Server giờ đây có thể hoạt động với mọi loại Atlassian deployment (Cloud, Server, Data Center) trong một codebase duy nhất, với configuration linh hoạt và authentication thông minh.

## Phase 9.5: Refactor & Chuẩn hóa Nhóm Tools (Hoàn thành)

### 1. Chuẩn hóa cấu trúc và đăng ký tools
- [x] Refactor lại toàn bộ nhóm Tools theo mini-plan
- [x] Chuẩn hóa lại folder structure, gom đăng ký tools tập trung, tách rõ theo domain (Jira/Confluence)
- [x] Chỉ giữ lại các tool thực hiện mutation/action, loại bỏ hoàn toàn tool chỉ đọc

### 2. Chuẩn hóa codebase và best practices
- [x] Áp dụng helper functions cho đăng ký, response, error handling
- [x] Đảm bảo tất cả tool có logging, schema validation rõ ràng
- [x] Đồng bộ naming, pattern với nhóm Resource

### 3. Đảm bảo chất lượng và tài liệu hóa
- [x] Test thực tế các tool đã refactor
- [x] Lập báo cáo test đầy đủ (tham khảo: [test-report.md](./test-report.md))
- [x] Đánh giá sự trùng lặp/chồng chéo giữa Tool và Resource

## Những quyết định thiết kế quan trọng

### 1. Tổ chức Tool theo action, Resource theo entity

Sau quá trình refactor và thảo luận, chúng tôi đã quyết định tổ chức Tool theo action, còn Resource theo entity. Cụ thể:

#### Tool: Action-centric (createIssue, updatePage, ...)
- **Bản chất của Tool là thực hiện hành động**, có thể thay đổi trạng thái hệ thống, phù hợp với tên là động từ/cụm động từ
- **Model-controlled**: AI chủ động quyết định khi nào và cách nào gọi tool
- **Schema mạnh mẽ**: Định nghĩa input/output rõ ràng bằng Zod, giúp AI biết cần cung cấp thông tin gì
- **Tối ưu cho agentic workflow**: Giúp AI lập kế hoạch, reasoning và quyết định khi nào sử dụng tool

#### Resource: Entity-centric (projects, issues, ...)
- **Bản chất là dữ liệu chỉ đọc**, không tác dụng phụ, phản ánh các thực thể trong hệ thống
- **Application-controlled**: Ứng dụng quyết định dữ liệu nào được cung cấp cho AI
- **URI nhất quán**: Sử dụng pattern như `jira://projects/{projectKey}` giúp dễ truy cập và khám phá dữ liệu

Chi tiết hơn về so sánh này được lưu tại: [tool-vs-resource.md](../dev-guide/tool-vs-resource.md)

### 2. Best Practice từ quá trình refactoring

#### Về Tool:
- **Tên tool luôn là động từ hoặc cụm động từ** (createIssue, updatePage) để AI hiểu rõ mục đích
- **Schema đầy đủ, mô tả chi tiết các tham số** giúp AI dễ dàng sử dụng đúng
- **Validation rõ ràng**, thông báo lỗi cụ thể giúp người dùng hiểu vấn đề
- **Không dùng tool cho tác vụ chỉ đọc** - hãy dùng resource thay thế
- **Phản hồi đồng nhất**, luôn trả về cả thông báo thân thiện và dữ liệu cấu trúc

#### Về Resource:
- **URI pattern nhất quán**, dễ đoán và theo chuẩn RESTful
- **Cung cấp metadata đầy đủ** (giúp client hiển thị đúng)
- **Mô tả rõ ràng cấu trúc dữ liệu trả về**
- **Hỗ trợ query params** để lọc dữ liệu khi cần

#### Tổng thể:
- **Logging đầy đủ** giúp debug và theo dõi các vấn đề
- **Error handling nhất quán** giúp AI hiểu và xử lý lỗi
- **Tài liệu rõ ràng** về cách sử dụng, ví dụ thực tế

## Kết quả đạt được

Sau quá trình refactor:
- **Codebase sạch và đồng nhất hơn**, dễ bảo trì và mở rộng
- **Kết quả test đạt 95%** các trường hợp sử dụng phổ biến
- **Schema validation giúp phát hiện lỗi sớm**, tránh dữ liệu không hợp lệ
- **AI có thể dễ dàng hiểu và sử dụng các tool/resource** một cách chính xác

Chi tiết kết quả test có thể xem tại: [test-report.md](./test-report.md)

## Các vấn đề còn tồn đọng

Một số vấn đề vẫn cần tiếp tục cải thiện trong phase tiếp theo:
- **Cải thiện encode JQL** khi có ký tự đặc biệt/dấu cách
- **Nâng cấp createPage** để hỗ trợ content phức tạp và parentId
- **Bổ sung schema/metadata cho resource**

Các vấn đề này đã được chuyển vào Phase 10 để giải quyết tiếp. 