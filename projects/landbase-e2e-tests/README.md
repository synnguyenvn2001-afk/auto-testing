# LandBase E2E tests

Bộ kiểm thử web bằng Playwright và mobile Android bằng WebdriverIO/Appium.

## Cấu trúc

- `tests/`: mã nguồn test tự động.
- `test-data/testcases/`: testcase thủ công, payload bảo mật và dữ liệu tham khảo.
- `scratch/`: script chẩn đoán tạm thời.
- `artifacts/`: ảnh debug và báo cáo sinh ra.
- `playwright/.auth/`: trạng thái đăng nhập cục bộ, không commit.
- `scripts/`: lệnh hỗ trợ như khởi động Appium.

- `tests/api/`: kiểm thử API tự động toàn diện (130 test cases) gồm Bảng giá đất, BĐS đã lưu, Phong thủy, Hòm thư Feedback, Trợ lý AI (Chat AI) và Đơn hàng & Hủy đơn Subscription (/subscription/order & /cancel).

## Tùy chọn Môi trường Kiểm thử (Environment Selection)
Bộ test tự động hỗ trợ linh hoạt chạy trên cả 2 môi trường:
- 🚀 **Production (Môi trường Thật)**: `https://landbase.vn` (Tài khoản test: `user` / `Enao@1234`)
- 🛠️ **Development (Môi trường DEV)**: `https://dev-webapp.laand.vn` (Tài khoản test: `usert1` / `Enao@123`)

Khi khởi chạy `npm run test`, hệ thống sẽ tự động hiển thị menu tương tác để bạn chọn môi trường:
```
--- BƯỚC 2: CHỌN MÔI TRƯỜNG KIỂM THỬ (ENVIRONMENT) ---
  1. 🚀 Production  - https://landbase.vn (Môi trường Thật)
  2. 🛠️ Development - https://dev-webapp.laand.vn (Môi trường DEV)
👉 Nhập lựa chọn Môi trường (1-2) [Mặc định: 1 - Production]: 
```

Bạn cũng có thể chỉ định môi trường trực tiếp qua lệnh hoặc cờ CLI:
- `npm run test:prod`: Chạy kiểm thử Web trên môi trường Production (`landbase.vn`).
- `npm run test:dev`: Chạy kiểm thử Web trên môi trường Development (`dev-webapp.laand.vn`).
- `npm run test:api:dev`: Chạy kiểm thử API trên môi trường Development.
- `npm run test:api:prod`: Chạy kiểm thử API trên môi trường Production.
- Hoặc truyền tham số dòng lệnh:
  ```bash
  node projects/landbase-e2e-tests/run-tests.js --platform=1 --env=prod
  node projects/landbase-e2e-tests/run-tests.js --platform=1 --env=dev
  node projects/landbase-e2e-tests/run-tests.js --url=https://your-custom-domain.vn
  ```

Các lệnh chính được khai báo trong `package.json` ở gốc repository:
- `npm run test`: Menu tương tác toàn diện chọn Nền tảng, Môi trường và Module.
- `npm run test:api`: Chạy kiểm thử API tương tác qua CLI.
- `npm run test:api:all`: Chạy tất cả các API test cases.
- `npm run test:api:feedback`: Chạy riêng 17 test cases của API Feedback.
- `npm run test:api:chat`: Chạy 23 test cases của API Chat AI (/api/chat).
- `npm run test:api:order`: Chạy 38 test cases của API Đơn hàng & Giỏ hàng Gói Pro (/cart, /order & /cancel).
- `npm run test:chat:ui`: Chạy bộ test tự động thao tác người dùng E2E cho chức năng Chat AI (UI kết hợp API SSE stream).
- `npm run postman:export`: Đồng bộ và xuất ra các file Postman Collection & Environment mới nhất.

## Kiểm thử Đơn hàng & Thanh toán Gói Pro Subscription (/cart, /order & /cancel)
- **File test Playwright**: `tests/api/subscription-order.spec.ts` (38 test cases)
- **File Postman Collection tổng**: `LandBase_API_Tests.postman_collection.json` (Folder `08. Đơn hàng & Thanh toán Subscription` - 39 requests)
- **File Postman Environment tổng**: `LandBase_Environment.postman_environment.json`
- **Khắc phục lỗi "Giỏ hàng trống"**: Khi chọn gói Basic, hệ thống DEV không hỗ trợ tạo đơn hàng (trả về lỗi giỏ hàng trống). Bộ test tự động kích hoạt API chọn **Gói Pro** (`POST /api/v1.0/subscription/cart/confirm` payload `{"packageCode": "PRO"}`), đảm bảo giỏ hàng có gói Pro (2.465đ) trước khi gọi API tạo đơn hàng `/order` (trả về `200 OK` kèm link thanh toán PayOS).
- **Chế độ kiểm thử**: Mặc định chạy tự động toàn bộ 38 test cases trên môi trường DEV (`dev-gateway.laand.vn`). Khóa an toàn chỉ tự động kích hoạt bảo vệ khi trỏ vào Production (`landbase.vn`), hoặc người dùng có thể chủ động tắt chạy bằng biến:
  ```powershell
  $env:CONFIRM_CREATE_SUBSCRIPTION_ORDER="false"; npm run test:api:order
  ```
- **Lệnh chạy kiểm thử trực tiếp**:
  ```powershell
  npm run test:api:order
  ```
- **Hỗ trợ chu trình tạo nhiều đơn**: Tích hợp API Hủy đơn hàng (`POST /api/v1.0/subscription/order/cancel`) và tra cứu đơn hàng (`POST /api/v1.0/subscription/order/getAllListOrder`) để hủy đơn đang chờ hiện tại, giải phóng ràng buộc tối đa 1 đơn pending để tài khoản sẵn sàng tạo đơn tiếp theo.

## Kiểm thử Chat AI API (/api/chat-messages)
- **File test Playwright**: `tests/api/chat-ai.spec.ts`
- **File Postman Collection tổng**: `LandBase_API_Tests.postman_collection.json` (Folder `07. Trợ lý AI - Chat AI Streaming`)
- **File Postman Environment tổng**: `LandBase_Environment.postman_environment.json`
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
Hoặc paste trực tiếp file xuất môi trường Postman JSON vào `projects/landbase-e2e-tests/LandBase_Environment.postman_environment.json`.
