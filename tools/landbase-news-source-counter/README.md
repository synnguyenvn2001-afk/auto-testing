# LandBase news source counter

Thu thập danh sách tin từ LandBase News, thống kê theo nguồn/ngày và xuất Excel cùng các file CSV tổng hợp.

## Cấu trúc

- `src/`: mã nguồn crawler.
- `data/`: dữ liệu tham khảo.
- `output/`: báo cáo hiện tại và dữ liệu lịch sử.

## Chạy

Từ thư mục công cụ:

```powershell
python -m pip install -r requirements.txt
python -m playwright install chromium
python src/landbase_news_source_counter.py --workers 4 --max-pages 120
```

Mặc định báo cáo được ghi vào `output/landbase_news_report.xlsx`, không phụ thuộc thư mục hiện hành của terminal.
