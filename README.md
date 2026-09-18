# LandBase automation workspace

Repository được tổ chức theo mục đích để mã nguồn, dữ liệu và kết quả sinh ra không còn trộn ở thư mục gốc.

## Cấu trúc

```text
projects/
  landbase-e2e-tests/            Playwright + WebdriverIO cho web/mobile
  fb-lead-radar/                 Dự án quét lead Facebook độc lập
tools/
  facebook-redirect-checker/     Kiểm tra redirect URL Facebook
  landbase-news-source-counter/  Thống kê nguồn tin LandBase News
  landbase-user-guide/           Chụp ảnh và tạo tài liệu hướng dẫn
  location-enrichment-validator/ Kiểm tra dữ liệu enrichment vị trí
examples/
  docker-demo/                   Ứng dụng Node.js minh họa Docker
reports/
  audits/                        Báo cáo và script kiểm chứng
```

`package.json` ở gốc là bộ lệnh dùng chung cho automation JavaScript. Cài dependencies một lần bằng `npm ci`.

## Lệnh thường dùng

```powershell
npm test
npm run test:headless
npm run test:mobile
npm run typecheck
npm run guide:capture
npm run guide:generate
```

Chi tiết của từng công cụ nằm trong `README.md` tại chính thư mục đó.
