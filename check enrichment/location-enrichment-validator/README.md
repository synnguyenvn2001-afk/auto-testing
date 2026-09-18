# Location Enrichment Validator

Ứng dụng Streamlit để kiểm tra chất lượng dữ liệu làm giàu `location` cho listing BĐS Việt Nam.

## App kiểm tra gì?

- Giữ **ground truth theo ID** từ các case đã review thủ công.
- Dùng `extract_location` lặp lại làm **hint** cho ID mới, nhưng không tự áp kết luận cũ.
- Chấp nhận `lat=0, long=0` khi:
  - `location = NULL`; hoặc
  - địa điểm rõ ràng ngoài Hà Nội; hoặc
  - AI xác định tên địa danh quá mơ hồ/trùng nhiều tỉnh và không đủ context.
- Cảnh báo địa điểm rõ/context Hà Nội nhưng bị mất tọa độ.
- Cảnh báo **có tên đường nhưng enrichment chỉ trả phường/xã/khu vực**.
- Cảnh báo pattern lỗi `TRUNG TÂM ... -> Đường Trung Tâm`.
- So sánh case cũ để tìm **potential regression**.
- Google Geocoding là tùy chọn để lấy forward/reverse candidates.
- OpenAI là tùy chọn để xử lý case mơ hồ, có Structured Outputs và tùy chọn web search.
- Xuất Excel/CSV có status, confidence, note, evidence.
- Có `Human review` và xuất lại ground truth cho lần kiểm tra sau.

## Cột đầu vào tối thiểu

```text
id
extract_location
location
latitude
longitude
```

App tự nhận diện thêm nếu có:

```text
street_or_village
url
description
```

Schema file hiện tại của bạn (`id, extract_location, location, latitude, longitude, street_or_village, url`) được hỗ trợ trực tiếp.

## Chạy trên Windows

Cách dễ nhất: double-click:

```text
run_windows.bat
```

Hoặc chạy thủ công:

```powershell
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

Sau đó trình duyệt sẽ mở app Streamlit.

## API keys

### OpenAI

Không bắt buộc. Nếu có key, app dùng Responses API để xử lý case mơ hồ.

Có thể nhập key trực tiếp trong sidebar hoặc tạo `.env`:

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6
```

### Google Maps Geocoding

Không bắt buộc. Nếu có key, app forward-geocode `extract_location` và reverse-geocode tọa độ enrichment để đưa bằng chứng cho AI/người review.

```env
GOOGLE_MAPS_API_KEY=...
```

Bạn cần bật Geocoding API và billing trong Google Cloud nếu dùng phần này.

## Luồng xử lý

```text
Excel/CSV
   |
   v
Rule Engine + Ground Truth
   |
   +---- case chắc chắn ------> Final status
   |
   +---- case nghi ngờ
             |
             +--> Google Geocoding (optional)
             |
             +--> OpenAI validator (optional)
                       |
                       v
                Final status
                       |
                       v
                Human review
                       |
                       v
             Excel + Ground Truth mới
```

## Các status chính

- `PASS`
- `PASS_NULL`
- `PASS_OUTSIDE_HANOI`
- `PASS_AMBIGUOUS_0`
- `KNOWN_GT_PASS`
- `WRONG_LOCATION`
- `WRONG_PROVINCE`
- `WRONG_STREET`
- `MISSING_STREET`
- `REGRESSION`
- `POTENTIAL_REGRESSION`
- `KNOWN_BAD_REPEATED`
- `NEED_REVIEW`

## Chi phí / cách chạy khuyến nghị

1. Bật **AI chỉ kiểm tra case nghi ngờ**.
2. Chạy rule trước; không cần gọi AI cho case đã có ground truth chắc chắn.
3. Google Geocoding chỉ cần chạy cho nhóm nghi ngờ.
4. Bật OpenAI web search chỉ khi cần xác minh các dự án/địa danh khó.
5. Sau mỗi vòng human review, tải `ground_truth_updated.csv` và dùng nó ở lần sau.

## Test

```bash
pytest -q
```

## Lưu ý về ground truth kèm app

`data/ground_truth_seed.csv` chỉ chứa 50 case cũ được đánh dấu `Case cũ - theo đánh giá người dùng` từ bộ review hiện tại. Các case AI từng đánh giá ở vòng sau không được coi là ground truth người dùng.
