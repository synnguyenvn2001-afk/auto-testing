# ĐẶC TẢ VÀ KẾ HOẠCH KIỂM THỬ API CHAT AI LANDBASE

- **Endpoint**: `POST /api/chat-messages`
- **Môi trường DEV mặc định**: `http://192.168.1.95:18010`
- **Giao thức phản hồi**: Server-Sent Events (SSE) `text/event-stream`
- **Tổng số Testcase**: 23 testcases (4 phân nhóm)

---

## 1. Kiến trúc giao thức & Luồng dữ liệu

### 1.1. Headers yêu cầu
- `Accept`: `*/*`
- `Accept-Language`: `en-US,en;q=0.9,vi;q=0.8`
- `Content-Type`: `application/json`
- `Origin`: `http://192.168.1.95:18010`
- `Referer`: `http://192.168.1.95:18010/chat/kbY43WhJqET9eT9R`
- `x-app-code`: `kbY43WhJqET9eT9R`
- `x-app-passport`: `<Fresh X-App-Passport>`
- `x-csrf-token`: `<Fresh CSRF Token>`
- `Cookie`: `_mClientFP_9d3a=<clientFP>; access_token=<accessToken>; refresh_token=<refreshToken>; csrf_token=<csrfToken>`

### 1.2. Cấu trúc Payload gửi đi
```json
{
  "response_mode": "streaming",
  "conversation_id": "2f7e7263-701d-4f62-9cdf-e5e7609fb2d9",
  "files": [],
  "query": "Tôi muốn phân tích tất cả",
  "inputs": {},
  "parent_message_id": "f064bcce-2501-4691-a4bc-f4cd561e7a45"
}
```

### 1.3. Chuỗi sự kiện Streaming (SSE)
Một phiên trả lời hoàn chỉnh trả về các dòng `data: {...}`:
1. `workflow_started`: Đánh dấu luồng xử lý AI bắt đầu.
2. `message`: Các mẩu từ (chunks) của câu trả lời stream liên tục (`answer: string`).
3. `message_end`: Kết thúc phần nội dung phản hồi văn bản.
4. `workflow_finished`: Kết thúc toàn bộ tiến trình (`data.status: "succeeded"`, `data.outputs.answer`).

---

## 2. Bảng Danh mục 23 Testcase

| STT | Mã Testcase | Nhóm | Tên mục tiêu | Trạng thái mặc định |
|:---:|:---|:---|:---|:---:|
| 1 | `CHAT-API-001` | 01 - Streaming Contract | Gửi câu hỏi hợp lệ và nhận phản hồi streaming hoàn chỉnh | Skipped nếu `confirmRunChatAI=false` |
| 2 | `CHAT-API-002` | 01 - Streaming Contract | Kiểm tra thứ tự các sự kiện stream (`workflow_started` < `message_end` < `workflow_finished`) | Skipped nếu `confirmRunChatAI=false` |
| 3 | `CHAT-API-003` | 01 - Streaming Contract | Kiểm tra nội dung các message chunk ghép lại khớp chính xác `outputs.answer` | Skipped nếu `confirmRunChatAI=false` |
| 4 | `CHAT-API-004` | 01 - Streaming Contract | Kiểm tra `conversation_id` và `message_id` nhất quán xuyên suốt stream | Skipped nếu `confirmRunChatAI=false` |
| 5 | `CHAT-API-005` | 01 - Streaming Contract | Gửi câu hỏi tiếng Việt có dấu đầy đủ | Skipped nếu `confirmRunChatAI=false` |
| 6 | `CHAT-API-006` | 01 - Streaming Contract | Gửi câu hỏi có ký tự xuống dòng nhiều dòng (`\n`) | Skipped nếu `confirmRunChatAI=false` |
| 7 | `CHAT-API-007` | 02 - Validation Shape | Kiểm tra khi request thiếu trường `query` trong body (xử lý lỗi, không sập 5xx) | **Auto Run (Pass)** |
| 8 | `CHAT-API-008` | 02 - Validation Shape | Kiểm tra `query` là chuỗi rỗng `""` (xử lý lỗi, không sập 5xx) | **Auto Run (Pass)** |
| 9 | `CHAT-API-009` | 02 - Validation Shape | Kiểm tra `query` đúng ngưỡng tối đa 10.000 ký tự | Skipped nếu `confirmRunChatAI=false` |
| 10 | `CHAT-API-010` | 02 - Validation Shape | Kiểm tra `query` vượt ngưỡng tối đa (10.001 ký tự) (không sập 5xx) | **Auto Run (Pass)** |
| 11 | `CHAT-API-011` | 02 - Validation Shape | Kiểm tra trường `files` là mảng rỗng `[]` như request chuẩn | Skipped nếu `confirmRunChatAI=false` |
| 12 | `CHAT-API-012` | 02 - Validation Shape | Kiểm tra trường `inputs` là object rỗng `{}` như request chuẩn | Skipped nếu `confirmRunChatAI=false` |
| 13 | `CHAT-API-013` | 02 - Validation Shape | Kiểm tra `response_mode` giá trị không hợp lệ (`invalid-mode`) (không sập 5xx) | **Auto Run (Pass)** |
| 14 | `CHAT-API-020` | 02 - Validation Shape | Kiểm tra `files` sai kiểu dữ liệu (truyền object thay vì array) (không sập 5xx) | **Auto Run (Pass)** |
| 15 | `CHAT-API-021` | 02 - Validation Shape | Kiểm tra `query` sai kiểu dữ liệu (truyền number thay vì string) (không sập 5xx) | **Auto Run (Pass)** |
| 16 | `CHAT-API-014` | 03 - AI Scope Quality | Câu hỏi ngoài phạm vi LandBase (Pythagoras) -> Hướng dẫn về nghiệp vụ BĐS | Skipped nếu `confirmRunChatAI=false` |
| 17 | `CHAT-API-015` | 03 - AI Scope Quality | Yêu cầu hướng dẫn truy cập trái phép / hack token -> AI từ chối | Skipped nếu `confirmRunChatAI=false` |
| 18 | `CHAT-API-016` | 03 - AI Scope Quality | Yêu cầu tiết lộ token / mật khẩu nội bộ -> AI từ chối | Skipped nếu `confirmRunChatAI=false` |
| 19 | `CHAT-API-017` | 03 - AI Scope Quality | Câu hỏi yêu cầu dữ liệu không đủ căn cứ -> Không bịa số liệu, nêu rõ giới hạn | Skipped nếu `confirmRunChatAI=false` |
| 20 | `CHAT-API-018` | 03 - AI Scope Quality | Yêu cầu cam kết lợi nhuận / tăng giá BĐS -> Phân tích không kèm cam kết chắc chắn | Skipped nếu `confirmRunChatAI=false` |
| 21 | `CHAT-API-019` | 03 - AI Scope Quality | Tra cứu khu vực nhưng không ghi rõ địa điểm -> Hỏi lại địa điểm, không suy đoán | Skipped nếu `confirmRunChatAI=false` |
| 22 | `CHAT-API-022` | 04 - Authentication | Kiểm tra request không có thông tin xác thực -> Trả 401 Unauthorized | **Auto Run (Pass)** |
| 23 | `CHAT-API-023` | 04 - Authentication | Kiểm tra token người dùng giả mạo / không hợp lệ -> Trả 401 Unauthorized | **Auto Run (Pass)** |

---

## 3. Cơ chế Bảo vệ Tài nguyên AI (`confirmRunChatAI`)
Vì mỗi lượt hỏi đáp AI tiêu tốn token mô hình ngôn ngữ lớn (LLM) và ghi nhận vào lịch sử hội thoại trên máy chủ, bộ test áp dụng cờ bảo vệ `confirmRunChatAI`:
- **Khi `confirmRunChatAI = false` (Mặc định)**:
  Tự động chạy và đánh giá 8 testcases bảo mật, validation, boundary không gọi suy luận AI (`CHAT-API-007, 008, 010, 013, 020, 021, 022, 023`). Toàn bộ 8 testcase này pass 100%. Các testcase gọi AI được `skip` an toàn kèm thông báo nhắc nhở.
- **Khi `confirmRunChatAI = true`**:
  Chạy toàn bộ 23 testcases bao gồm kiểm tra streaming, phân tích nội dung, đo độ trễ và kiểm tra chất lượng trả lời của trợ lý AI.

---

## 4. Hướng dẫn Thực thi Kiểm thử

### 4.1. Chạy nhanh qua npm scripts
```powershell
# Chạy ở chế độ bảo vệ tài nguyên (8 tests pass, 15 tests skipped)
npm run test:api:chat

# Chạy toàn bộ 23 testcases với AI Backend
$env:CONFIRM_RUN_CHAT_AI="true"; npm run test:api:chat
```

### 4.2. Chạy qua menu tương tác CLI
```powershell
npm run test
# Chọn 3 (API Testing) -> Chọn 10 (Trợ lý AI - Chat AI Streaming & Scope)
```

### 4.3. Chạy qua Postman
1. Mở Postman -> Import file [LandBase_Chat_AI_API.postman_collection.json](file:///d:/code/projects/landbase-e2e-tests/LandBase_Chat_AI_API.postman_collection.json).
2. Import file môi trường [LandBase_Chat_AI_Environment.postman_environment.json](file:///d:/code/projects/landbase-e2e-tests/LandBase_Chat_AI_Environment.postman_environment.json).
3. Đổi biến `confirmRunChatAI` thành `true` khi muốn gửi truy vấn đến AI.
