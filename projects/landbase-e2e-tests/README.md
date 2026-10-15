# LandBase E2E tests

Bộ kiểm thử web bằng Playwright và mobile Android bằng WebdriverIO/Appium.

## Cấu trúc

- `tests/`: mã nguồn test tự động.
- `test-data/testcases/`: testcase thủ công, payload bảo mật và dữ liệu tham khảo.
- `scratch/`: script chẩn đoán tạm thời.
- `artifacts/`: ảnh debug và báo cáo sinh ra.
- `playwright/.auth/`: trạng thái đăng nhập cục bộ, không commit.
- `scripts/`: lệnh hỗ trợ như khởi động Appium.

- `tests/api/`: kiểm thử API tự động toàn diện (78 test cases) gồm Bảng giá đất, BĐS đã lưu, Phong thủy và Hòm thư Feedback.

Các lệnh chính được khai báo trong `package.json` ở gốc repository:
- `npm run test`: Menu tương tác chọn module (chọn Platform 3 để kiểm thử API).
- `npm run test:api`: Chạy kiểm thử API tương tác qua CLI.
- `npm run test:api:all`: Chạy tất cả 78 API test cases.
- `npm run test:api:feedback`: Chạy riêng 17 test cases của API Feedback.
- `npm run postman:export`: Đồng bộ và xuất ra các file Postman Collection & Environment mới nhất.

## Cấu hình Token Test API
Tạo file `api-environment.json` hoặc `.env` trong `projects/landbase-e2e-tests/`:
```json
{
  "baseUrl": "https://dev-gateway.laand.vn",
  "webappUrl": "https://dev-webapp.laand.vn",
  "accessToken": "DÁN_BEARER_TOKEN_VÀO_ĐÂY",
  "xAuthToken": "DÁN_X_AUTH_TOKEN_VÀO_ĐÂY",
  "xSessionRef": "DÁN_X_SESSION_REF_VÀO_ĐÂY"
}
```
Hoặc paste trực tiếp file xuất môi trường Postman JSON vào `projects/landbase-e2e-tests/api-environment.json`.
