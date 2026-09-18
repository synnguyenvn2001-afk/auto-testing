# LandBase user-guide generator

Nhóm script chụp ảnh giao diện và tạo tài liệu hướng dẫn sử dụng LandBase.

## Thư mục

- `assets/images/`: ảnh đầu vào của tài liệu.
- `output/`: file Word và nội dung trích xuất được tạo ra.
- `capture-screenshots.js`: chụp bộ ảnh đầy đủ.
- `capture-missing.js`: chụp bổ sung ảnh bản đồ còn thiếu.
- `generate-docx.js`: tạo `output/HDSD_LandBase.docx`.
- `extract-docx.ps1`, `extract-images.ps1`: trích nội dung từ file Word; mặc định dùng file vừa tạo trong `output/`.

Chạy từ thư mục gốc repository:

```powershell
npm run guide:capture
npm run guide:generate
```

Có thể đổi môi trường đích bằng biến `BASE_URL`.
