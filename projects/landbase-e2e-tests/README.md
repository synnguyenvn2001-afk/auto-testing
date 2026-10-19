# LandBase E2E tests

Bộ kiểm thử web bằng Playwright và mobile Android bằng WebdriverIO/Appium.

## Cấu trúc

- `tests/`: mã nguồn test tự động.
- `test-data/testcases/`: testcase thủ công, payload bảo mật và dữ liệu tham khảo.
- `scratch/`: script chẩn đoán tạm thời.
- `artifacts/`: ảnh debug và báo cáo sinh ra.
- `playwright/.auth/`: trạng thái đăng nhập cục bộ, không commit.
- `scripts/`: lệnh hỗ trợ như khởi động Appium.

- `tests/api/`: kiểm thử API tự động toàn diện (101 test cases) gồm Bảng giá đất, BĐS đã lưu, Phong thủy, Hòm thư Feedback và Trợ lý AI (Chat AI).

Các lệnh chính được khai báo trong `package.json` ở gốc repository:
- `npm run test`: Menu tương tác chọn module (chọn Platform 3 để kiểm thử API).
- `npm run test:api`: Chạy kiểm thử API tương tác qua CLI.
- `npm run test:api:all`: Chạy tất cả các API test cases.
- `npm run test:api:feedback`: Chạy riêng 17 test cases của API Feedback.
- `npm run test:api:chat`: Chạy 23 test cases của API Chat AI (/api/chat-messages).
- `npm run postman:export`: Đồng bộ và xuất ra các file Postman Collection & Environment mới nhất.

## Kiểm thử Chat AI API (/api/chat-messages)
- **File test Playwright**: `tests/api/chat-ai.spec.ts`
- **File Postman Collection**: `LandBase_Chat_AI_API.postman_collection.json`
- **File Postman Environment**: `LandBase_Chat_AI_Environment.postman_environment.json`
- **Bảo vệ tài nguyên AI**: Mặc định biến `confirmRunChatAI=false` để tránh tiêu hao token AI. Các testcase kiểm tra xác thực và validation input không gọi LLM sẽ chạy bình thường (8/23 tests pass). Để kích hoạt toàn bộ 23 testcases (gồm gọi AI streaming), thiết lập:
  ```powershell
  $env:CONFIRM_RUN_CHAT_AI="true"; npm run test:api:chat
  ```

## Cấu hình Token Test API
Tạo file `api-environment.json` hoặc `.env` trong `projects/landbase-e2e-tests/`:
```json
{
  "baseUrl": "https://dev-gateway.laand.vn",
  "webappUrl": "https://dev-webapp.laand.vn",
  "accessToken": "DÁN_BEARER_TOKEN_VÀO_ĐÂY",
  "xAuthToken": "DÁN_X_AUTH_TOKEN_VÀO_ĐÂY",
  "xSessionRef": "DÁN_X_SESSION_REF_VÀO_ĐÂY",
  "chatBaseUrl": "http://192.168.1.95:18010",
  "chatAppCode": "kbY43WhJqET9eT9R",
  "chatAppPassport": "DÁN_X_APP_PASSPORT_VÀO_ĐÂY",
  "confirmRunChatAI": false
}
```
Hoặc paste trực tiếp file xuất môi trường Postman JSON vào `projects/landbase-e2e-tests/LandBase_Chat_AI_Environment.postman_environment.json`.
