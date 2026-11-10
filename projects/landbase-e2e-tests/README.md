# LandBase E2E tests

Bộ kiểm thử web bằng Playwright và mobile Android bằng WebdriverIO/Appium.

## Cấu trúc

- `tests/`: mã nguồn test tự động.
- `test-data/testcases/`: testcase thủ công, payload bảo mật và dữ liệu tham khảo.
- `scratch/`: script chẩn đoán tạm thời.
- `artifacts/`: ảnh debug và báo cáo sinh ra.
- `playwright/.auth/`: trạng thái đăng nhập cục bộ, không commit.
- `scripts/`: lệnh hỗ trợ như khởi động Appium.

- `tests/api/`: kiểm thử API tự động toàn diện (274 test cases) gồm Bảng giá đất, BĐS đã lưu, Phong thủy, Hòm thư Feedback, Trợ lý AI (Chat AI), Đơn hàng & Hủy đơn Subscription (/subscription/order & /cancel), Báo cáo tổng quan khu vực (/api/locality-report), AI tổng hợp báo cáo theo vị trí (/news/report-by-location), Tiện ích & Dịch vụ quanh khu vực (/utilities-detail) và Onboarding & Nhận thưởng tân thủ (/rewards/onboarding & /users/*).

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
- `npm run test:api:locality`: Chạy 27 test cases của API Báo cáo tổng quan khu vực (/api/locality-report).
- `npm run test:api:news-loc`: Chạy 30 test cases của API AI tổng hợp báo cáo theo vị trí - Xem chi tiết BĐS (/news/report-by-location).
- `npm run test:api:utility`: Chạy 32 test cases của API Tiện ích & Dịch vụ quanh khu vực (/utilities-detail).
- `npm run test:api:onboarding`: Chạy 46 test cases của API Onboarding & Nhận thưởng tân thủ (/api/v1.0/auth/rewards/onboarding & /users/*).
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

## Kiểm thử Báo cáo tổng quan khu vực API (/api/locality-report)
- **File test Playwright**: `tests/api/locality-report.spec.ts` (27 test cases)
- **File Postman Collection**: `LandBase_API_Tests.postman_collection.json` (Folder `09. Báo cáo tổng quan khu vực (/api/locality-report)`)
- **File Postman Environment**: `LandBase_Environment.postman_environment.json`
- **Đặc điểm API**: Endpoint Public thuộc WebApp Next.js (`https://dev-webapp.laand.vn/api/locality-report`), không bắt buộc header xác thực, phục vụ truy vấn báo cáo theo tọa độ (`latitude`, `longitude`).
- **Các nhóm testcase chính**:
  1. **Happy Path & Response Contract**: 200 OK với tọa độ mẫu (`latitude=21.019301`, `longitude=105.826367`), tọa độ thập phân cao, query phụ, tọa độ thực tế TP.HCM & Đà Nẵng.
  2. **Data Schema & Types**: Kiểm tra các trường nhận diện (`reportId`, `locality`, `province`, `district`, `ward`), `updatedAt` (ISO 8601), `costGold` (number >= 0), Content-Type `application/json`.
  3. **Boundary Values & Query Fallback**: Giá trị tọa độ bằng 0, fallback an toàn khi thiếu latitude/longitude/cả hai, tọa độ ngoài miền thông thường không gây crash server 5xx.
  4. **Input Validation (HTTP 400)**: Kiểm tra chữ cái `abc`, chuỗi `null`, chống tấn công SQL Injection và XSS (`{"message":"Tọa độ địa phương không hợp lệ"}`).
  5. **Protocol & Security (HTTP 405)**: Từ chối POST, PUT, DELETE (`405 Method Not Allowed`), truy cập Public không cần token, kiểm tra Response SLA (< 2500ms).
- **Lệnh chạy kiểm thử trực tiếp**:
  ```powershell
  npm run test:api:locality
  ```

## Kiểm thử AI tổng hợp báo cáo theo vị trí - Xem chi tiết BĐS (/api/v1.0/real-estate/public/news/report-by-location)
- **File test Playwright**: `tests/api/news-report-by-location.spec.ts` (30 test cases)
- **File Postman Collection**: `LandBase_API_Tests.postman_collection.json` (Folder `12. AI tổng hợp báo cáo theo vị trí`)
- **File Postman Environment**: `LandBase_Environment.postman_environment.json`
- **Đặc điểm API**: Endpoint Gateway Backend (`POST https://dev-gateway.laand.vn/api/v1.0/real-estate/public/news/report-by-location`), payload JSON chuẩn nhận `{"lat": 20.983173, "lon": 105.828624}`.
- **Các nhóm testcase chính**:
  1. **Happy Path & Schema Báo cáo AI (`REPORT-API-01..02`, `22..23`)**: Kiểm tra phản hồi 200 OK với tọa độ thực tế Hà Nội (`20.983173, 105.828624`), kiểm tra đủ 13 trường của đối tượng báo cáo (`id`, `slug`, `title`, `description`, `content` Markdown, `imageUrl`, `pdfUrl`, `provinceCode`, `wardCode`, `reportYear`, `reportQuarter`, `postDate`, `isLoginRequired`) và Gateway Wrapper.
  2. **Validation / Type / Boundary (`REPORT-API-03..17`)**: Thiếu `lat`, thiếu `lon`, body rỗng `{}` (`HTTP 400 - [Lat/Lon không được để null]`), `lat`/`lon` bằng `null` hoặc chuỗi rỗng `""` (`HTTP 400`), sai kiểu dữ liệu (`"north"`, `"east"` -> `HTTP 406`), tọa độ vượt biên (`lat: 91`, `lon: 181`), tọa độ `(0, 0)`, tọa độ âm, thêm `unexpectedField`, và JSON sai cú pháp (`Malformed JSON` -> `HTTP 406`).
  3. **Authentication / Session (`REPORT-API-18..21`)**: Kiểm tra gọi API khi thiếu `Authorization` + `X-Auth-Token`, truyền Bearer token không hợp lệ, thiếu `X-Auth-Token` hoặc thiếu `X-Session-Ref`.
  4. **Cố tình truyền sai nâng cao, Bảo mật & SLA (`REPORT-API-24..30`)**: Truyền kiểu boolean/Array/Object cho `lat`/`lon`, truyền mảng `[]` làm root body, truyền chuỗi khoảng trắng `"   "`, chống SQL Injection & XSS, gọi sai HTTP Method (`GET`), và kiểm tra SLA (< 3500ms).
- **Lệnh chạy kiểm thử trực tiếp**:
  ```powershell
  npm run test:api:news-loc
  ```

## Kiểm thử Tiện ích và Dịch vụ quanh khu vực (/utilities-detail)
- **File test Playwright**: `tests/api/utilities-detail.spec.ts` (32 test cases)
- **Endpoint**: `POST https://dev-gateway.laand.vn/api/v1.0/elasticsearch/public/service-facilities-user/utilities-detail`
- **Các nhóm danh mục tiện ích**:
  - `BDS00057`: Khu thương mại, giải trí
  - `BDS00063`: Đường phố
  - `BDS00052`: Trường học
  - `BDS00054`: Cơ sở y tế
  - `BDS00060`: Ngân hàng
  - `BDS00058`: Cơ sở lưu trú
  - `BDS00053`: Công trình tâm linh
  - `BDS00056`: Công trình công cộng
  - `BDS00059`: Dịch vụ công
- **Các nhóm testcase chính**:
  1. **Danh mục tiện ích**: Kiểm tra tra cứu POI theo từng categoryCode, trả về đúng `categoryName`.
  2. **Bộ lọc bán kính (Radius)**: Lọc bán kính 1km, 3km, 5km, xác thực `distance <= radius`.
  3. **Sắp xếp & POI Detail**: Kiểm tra kết quả được sắp xếp từ gần đến xa (`distance` tăng dần), cấu trúc `serviceFacilitiesUserDetailVo` (tên, khoảng cách, thời gian di chuyển `travelTime`, tọa độ).
  4. **Phân trang (Pagination)**: Kiểm tra `page`, `size`, `first`, `numberOfElements`, đảm bảo không trùng lặp POI giữa các trang.
  5. **Validation & Errors**: Thiếu `categoryCode` (HTTP 400 - `[Danh mục không được bỏ trống]`), categoryCode rỗng, categoryCode không tồn tại, SLA (< 3500ms).
  6. **Cố tình sai (Negative & Fault Injection)**: `categoryCode` null/khoảng trắng (HTTP 400), `size > 100` (HTTP 400 - `[max.size.of.page.is.100]`), `latitude`/`longitude` chuỗi hoặc ngoài miền địa lý (HTTP 406), `radius` âm hoặc bằng 0 (HTTP 406), SQL Injection & XSS (an toàn không bị rò rỉ), body mảng (HTTP 406), từ chối method GET (HTTP 401/405).
- **Lệnh chạy kiểm thử trực tiếp**:
  ```powershell
  npm run test:api:utility
  ```

## Kiểm thử Onboarding & Nhận thưởng tân thủ (/api/v1.0/auth/rewards/onboarding & /users/*)
- **File test Playwright**: `tests/api/onboarding-reward.spec.ts` (46 test cases)
- **File Postman Collection**: `LandBase_API_Tests.postman_collection.json` (Folder `11. Onboarding & Nhận thưởng`)
- **File Postman Environment**: `LandBase_Environment.postman_environment.json`
- **Các nhóm endpoint & testcase chính**:
  1. **Public Onboarding (`GET /api/v1.0/auth/public/rewards/onboarding` - `PUB-ONB-01..05`)**: Kiểm tra danh sách nhiệm vụ khi chưa đăng nhập (`wallet = null`, `tourCompleted = false`, tất cả nhiệm vụ có `status = "NOT_STARTED"`).
  2. **Onboarding Đăng nhập (`GET /api/v1.0/auth/rewards/onboarding` - `ONB-API-01..10`)**: Kiểm tra cấu trúc `campaign`, số lượng nhiệm vụ khám phá khớp `progress.total`, enum `status` (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `CLAIMED`), tiến độ nhiệm vụ, cấu trúc lồng `subTasks` và `steps`, enum `action`/`placement`, tổng tiến độ `progress`, ví Vàng `wallet.gold` và bảo vệ khi thiếu xác thực.
  3. **Claim Nhiệm vụ (`POST /api/v1.0/auth/rewards/onboarding/tasks/{taskCode}/claim` - `CLAIM-API-01..06`)**: Nhận thưởng nhiệm vụ đủ điều kiện (`EXPLORE_MAP`), tính chất Idempotent khi gọi lặp (không cộng Vàng lần hai), kiểm tra `taskCode` không tồn tại, nhiệm vụ chưa hoàn thành (`READ_NEWS`) và thiếu Authorization.
  4. **Lưu Progress (`POST /api/v1.0/auth/rewards/onboarding/tasks/{taskCode}/progress` - `PROGRESS-API-01..06`)**: Lưu bước hướng dẫn đang thực hiện theo `stepNo` (`currentStep: 2`), kiểm tra cấu trúc task trả về, kiểm tra thiếu `currentStep`, `currentStep` không tồn tại (`999999`) và `taskCode` không tồn tại.
  5. **Vị trí Quan tâm (`POST /api/v1.0/auth/users/interest-location` - `LOCATION-API-01..10`)**: Lưu vị trí quan tâm theo 4 vai trò (`BUYER`, `RENTER`, `INVESTOR`, `BROKER`), kiểm tra thiếu `role`, `role` ngoài enum (`ADMIN`), thiếu `provinceCode`, `provinceCode` vượt quá 50 ký tự, `provinceCode` không tồn tại và thử thay đổi vị trí.
  6. **Đánh dấu Tour (`POST /api/v1.0/auth/users/seen-guide/ONBOARDING_TOUR` - `TOUR-API-01..03`)**: Đánh dấu đã xem tour (`data: true`), xác minh `tourCompleted = true` và kiểm tra gọi lặp Idempotent.
  7. **Cố tình sai, Bảo mật & Hiệu năng (`ONB-NEG-01..04`, `ONB-SEC-01`, `ONB-PERF-01`)**: JWT giả mạo, `currentStep` âm, thiếu Authorization trên `/users/*`, chống SQL Injection / XSS và SLA (< 3500ms).
- **Lệnh chạy kiểm thử trực tiếp**:
  ```powershell
  npm run test:api:onboarding
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
