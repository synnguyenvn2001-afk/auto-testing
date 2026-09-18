# LandBase E2E tests

Bộ kiểm thử web bằng Playwright và mobile Android bằng WebdriverIO/Appium.

## Cấu trúc

- `tests/`: mã nguồn test tự động.
- `test-data/testcases/`: testcase thủ công, payload bảo mật và dữ liệu tham khảo.
- `scratch/`: script chẩn đoán tạm thời.
- `artifacts/`: ảnh debug và báo cáo sinh ra.
- `playwright/.auth/`: trạng thái đăng nhập cục bộ, không commit.
- `scripts/`: lệnh hỗ trợ như khởi động Appium.

Các lệnh chính được khai báo trong `package.json` ở gốc repository. Chúng có thể chạy từ thư mục gốc mà không phụ thuộc đường dẫn tuyệt đối trên máy.
