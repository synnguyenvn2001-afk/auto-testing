# Rà soát 6 dự án trong D:\code

Ngày: 15/09/2026. Đánh giá trên mã nguồn đang có, bao gồm thay đổi chưa commit.

## Kết luận

**Chưa tối ưu toàn diện.** Đã có các tối ưu hữu ích, nhưng cần sửa lỗi tính đúng đắn, khả năng khôi phục và bảo vệ truy cập trước khi tăng tốc hoặc chạy quy mô lớn.

| Dự án | Điểm đã làm tốt | Vấn đề ưu tiên |
|---|---|---|
| FB Lead Radar | Pool phân loại tối đa 5 bài, SQLite WAL/index/prepared statements, tái sử dụng trình duyệt, chống trùng bài | Mất thông báo khi lỗi; cấu hình UI không cập nhật daemon; API điều khiển thiếu xác thực; 10 lỗi type-check |
| Location Enrichment Validator | Rule trước AI, giới hạn số dòng AI, batch AI, cache geocoding trong phiên, 8 unit test | Tọa độ đã đổi vẫn được duyệt đúng; kết quả phiên không gắn với file đầu vào; đọc/xuất lại toàn bảng khi tương tác |
| Facebook Redirect Checker | Worker song song, chặn tài nguyên, checkpoint/resume, tùy chọn tắt Excel | Nhầm login thành xóa bài; lỗi điều hướng vẫn tính hoàn tất; launcher kéo-thả lỗi; checkpoint khóa mọi worker |
| Check tin mới nhất | Một browser nhiều context, chặn ảnh/font, retry trang, chống trùng, thay file Excel qua file tạm | Resume bỏ qua trang lỗi; chỉ lưu sau khi toàn bộ worker kết thúc |
| Docker Demo | Server nhỏ, ít dependency, Dockerfile đơn giản | Đường dẫn request có thể vượt khỏi thư mục public |
| Laand Test Suite | Tái sử dụng đăng nhập, có CI/retry/trace, tách web/mobile | Test có thể đạt mà không xác minh đúng tính năng; launcher làm mất exit code lỗi; nhiều chờ cố định |

## Phạm vi và bằng chứng

- Enrichment: `python -m pytest -q -p no:cacheprovider` → **8 passed**.
- Laand: `node node_modules/typescript/bin/tsc --noEmit --pretty false -p tsconfig.json` → **đạt** trong phạm vi cấu hình TypeScript hiện tại.
- FB Lead Radar: chạy compiler ngay trong dự án → **10 lỗi**, gồm 5 lỗi ép kiểu dữ liệu SQLite trong `db.ts` và 5 lỗi nullable trong `runtime-config.ts`. Đây là lỗi type-check; chưa đủ để kết luận app không khởi động được vì app chạy qua `tsx`.
- **13 ca kiểm chứng cục bộ xác nhận các vấn đề bên dưới**: 6 Python, 7 Node. Browser, gửi tin và API được mô phỏng; SQLite dùng database trong RAM.
- Không chạy E2E trên dịch vụ thật: bộ test có thao tác thanh toán/tài khoản, còn Radar có chức năng gửi tin/bình luận. Kết quả này không xác nhận tình trạng dịch vụ thật.
- Chưa benchmark tải, RAM, tốc độ crawl hoặc chi phí API; chưa quét CVE của dependency. Các nhận xét hiệu năng dưới đây dựa trên luồng mã và số lần xử lý, không phải tốc độ đo được.
- Mã nguồn app được giữ nguyên. Thư mục `audit/2026-09-15` chứa báo cáo, script kiểm chứng và kết quả.

## Lỗi cần ưu tiên sửa

### 1. [P1] Docker Demo cho phép đọc ngoài thư mục public

[server.js:10](D:/code/docker-demo/server.js:10) ghép thẳng `req.url` vào đường dẫn rồi đọc file, không kiểm tra đường dẫn sau chuẩn hóa còn nằm trong `public`.

- Ca kiểm chứng: request `/../server.js` được handler đổi thành `D:\code\docker-demo\server.js` và trả trạng thái 200 với filesystem mô phỏng. Không đọc nội dung nhạy cảm, không mở cổng mạng trong kiểm chứng.
- Server cấu hình nghe trên `0.0.0.0`; khi cổng truy cập được, người khác có thể yêu cầu những file ngoài thư mục web mà tiến trình có quyền đọc.
- Sửa: parse URL, chuẩn hóa/giải mã đường dẫn an toàn và kiểm tra ranh giới thư mục trước khi đọc, hoặc dùng bộ phục vụ file tĩnh có kiểm soát đường dẫn.

### 2. [P1] API điều khiển Radar thiếu xác thực

[server.ts:52](D:/code/fb-lead-radar/src/server.ts:52), [API gửi bình luận:198](D:/code/fb-lead-radar/src/server.ts:198), [khởi động server:2135](D:/code/fb-lead-radar/src/server.ts:2135).

- Không có middleware xác thực cho API đọc dữ liệu, thay cấu hình, quản lý phiên hay gửi bình luận.
- `serve` không chỉ định hostname; adapter đã cài truyền hostname này thẳng vào `server.listen`. Chưa xác minh firewall hoặc proxy của máy.
- Khi cổng 3434 được máy khác truy cập, quyền điều khiển không được bảo vệ tại ứng dụng.
- Sửa: mặc định bind loopback cho công cụ cá nhân; nếu cần dùng qua mạng, thêm xác thực và bảo vệ request thay đổi trạng thái. Đây là phát hiện qua mã nguồn, không phải thử xâm nhập dịch vụ đang chạy.

### 3. [P1] Radar ghi đã gửi Telegram dù gửi thất bại

[runner.ts:103](D:/code/fb-lead-radar/src/runner.ts:103).

- `notifyLead` lỗi được catch, nhưng `markSeen(post, result, shouldNotify)` vẫn dùng điều kiện muốn gửi để ghi `sent_to_telegram`.
- Ca kiểm chứng: Telegram lỗi ở lần scan đầu; DB vẫn ghi `sent=true`. Scan lần hai bỏ qua bài, tổng số lần gửi vẫn là 1.
- Sửa: lưu trạng thái gửi theo kết quả thực tế và có hàng đợi retry độc lập với trạng thái đã phân loại. Chỉ đổi sang đã gửi sau khi gửi thành công.

### 4. [P1] AI lỗi bị lưu như một bài đã xử lý xong

[classifier.ts:163](D:/code/fb-lead-radar/src/classifier.ts:163), [runner.ts:83](D:/code/fb-lead-radar/src/runner.ts:83), [runner.ts:118](D:/code/fb-lead-radar/src/runner.ts:118).

- Classifier trả `isLead=false`, category `lỗi` khi lỗi API/parse. Runner vẫn đánh dấu bài đã thấy.
- Ca kiểm chứng với kết quả lỗi giống fallback của classifier: chạy scan hai lần nhưng chỉ phân loại một lần.
- Sửa: tách trạng thái thất bại có thể thử lại khỏi kết luận không phải lead; lưu số lần thử và thời điểm thử tiếp theo.

### 5. [P1] Thay cấu hình trên UI không cập nhật daemon Radar đang chạy

[runtime-config.ts:28](D:/code/fb-lead-radar/src/runtime-config.ts:28), [ecosystem.config.cjs](D:/code/fb-lead-radar/ecosystem.config.cjs).

- Cấu hình được cache vô thời hạn trong từng process, trong khi PM2 chạy UI và daemon thành hai process.
- Ca kiểm chứng hai module độc lập dùng cùng filesystem mô phỏng: UI đổi `lead_target` sang `bds`, daemon đã đọc cấu hình trước đó vẫn trả `ads`.
- Sửa: có phiên bản cấu hình và đọc lại khi thay đổi, hoặc chuyển việc đọc cấu hình và thực thi scan về một service chung.
- Cùng kiến trúc này, `isScanning` chỉ khóa trong từng process; scan từ UI có thể trùng với daemon. Cần claim công việc dùng chung nếu tiếp tục chạy hai process.

### 6. [P1] Redirect Checker nhầm trang đăng nhập thành bài đã xóa

[fb_redirect_checker.py:184](<D:/code/check redirect url/facebook_redirect_checker_no_login/fb_redirect_checker.py:184>), [phân loại:262](<D:/code/check redirect url/facebook_redirect_checker_no_login/fb_redirect_checker.py:262>).

- Có post ID ban đầu nhưng URL cuối không có post ID là đủ để `check_is_deleted` trả true, trước bước nhận diện login/checkpoint.
- Ca kiểm chứng: URL bài viết chuyển đến `https://www.facebook.com/login/` → `POST_DELETED`, thay vì `LOGIN_REDIRECT`.
- Sửa: xử lý login/checkpoint/lỗi điều hướng trước; việc mất post ID hoặc nội dung không truy cập được không đủ chứng minh bài đã bị xóa.

### 7. [P1] Lỗi điều hướng được tính hoàn tất và bị bỏ qua khi resume

[fb_redirect_checker.py:224](<D:/code/check redirect url/facebook_redirect_checker_no_login/fb_redirect_checker.py:224>), [resume:497](<D:/code/check redirect url/facebook_redirect_checker_no_login/fb_redirect_checker.py:497>).

- Khi `goto` lỗi, code tiếp tục phân loại từ `page.url` hiện tại. `check_error` không ngăn dòng bị coi là hoàn tất.
- Ca kiểm chứng: lỗi điều hướng trong khi URL trang vẫn bằng URL cần kiểm tra → `SAME_URL` kèm lỗi; trạng thái này nằm trong tập bỏ qua khi resume.
- Sửa: thêm trạng thái lỗi có thể retry và chỉ coi là hoàn tất khi có bằng chứng điều hướng hợp lệ. Tránh dùng trang còn sót lại từ lần kiểm tra trước.

### 8. [P1] Launcher kéo-thả Redirect Checker truyền file hai lần

[run_checker.bat](<D:/code/check redirect url/facebook_redirect_checker_no_login/run_checker.bat>).

- Khi truyền file qua tham số/kéo-thả, `%INPUT%` lấy từ `%~1`, nhưng câu lệnh cuối vừa truyền `%INPUT%` vừa thêm `%*` chứa lại tham số đầu.
- Ca kiểm chứng parser với bộ tham số tương ứng trả mã lỗi 2 vì thừa positional argument.
- Sửa: tách đối số file khỏi danh sách tùy chọn trước khi chuyển tiếp; kiểm tra cả đường dẫn có khoảng trắng.

### 9. [P1] Enrichment duyệt đúng tọa độ đã thay đổi

[rules.py:75](<D:/code/check enrichment/location-enrichment-validator/validator/rules.py:75>).

- Nhánh `KNOWN_GT_PASS` chỉ so cùng tên location và cùng trạng thái tọa độ bằng/khác 0; không so giá trị latitude/longitude thực tế.
- Ca kiểm chứng: ground truth `21.03, 105.85`, bản mới `10.78, 106.7`, cùng ID và tên location → vẫn `KNOWN_GT_PASS`, confidence `0.99`, không cần AI.
- Sửa: so đủ dữ liệu đã duyệt và khoảng cách tọa độ với dung sai được quy định; đánh giá lại khi đầu vào/location/tọa độ thay đổi.
- 8 unit test hiện có chưa bao phủ trường hợp này.

### 10. [P1] Bộ test Laand có thể báo đạt mà không chứng minh tính năng đúng

[helpers.ts:123](D:/code/tests/helpers.ts:123), [security.spec.ts:44](D:/code/tests/security.spec.ts:44), [tools.spec.ts:137](D:/code/tests/tools.spec.ts:137).

- `verifyNoApiFailures` chỉ ghi cảnh báo khi API 500, không làm test thất bại. Đã kiểm chứng bằng event response giả.
- Test giả mạo số dư token chỉ kiểm tra `body` hiển thị. Test replay thanh toán chấp nhận nhiều mã kể cả 200/404 mà không kiểm tra giao dịch chỉ được ghi một lần.
- Test tính chi phí có thể đạt khi nút bị disabled hoặc không có kết quả, miễn modal còn hiển thị.
- Sửa: assert đúng kết quả nghiệp vụ. Với replay, kiểm tra số lượng giao dịch/tác động số dư; với công cụ tính, so kết quả với dữ liệu đã biết. Lỗi API liên quan tính năng phải làm test thất bại; API phụ có thể có allowlist rõ ràng.

### 11. [P2] Launcher test bỏ mất mã lỗi của tiến trình con

[run-tests.js:109](D:/code/run-tests.js:109), [run-tests.js:180](D:/code/run-tests.js:180).

- Handler `exit` chỉ log, không cập nhật exit code của tiến trình cha.
- Ca kiểm chứng: child exit 1, parent không đặt exitCode nên mặc định kết thúc 0.
- Sửa: chuyển tiếp mã lỗi, xử lý cả sự kiện spawn error/signal. CI hiện tại gọi Playwright trực tiếp nên lỗi này chủ yếu ảnh hưởng `npm test`/wrapper và các tác vụ tự động sử dụng launcher.

### 12. [P2] Resume của crawler tin bỏ qua trang từng lỗi

[landbase_news_source_counter_v4.py:398](<D:/code/check tin mới nhất/landbase_news_source_counter_v4.py:398>), [resume:821](<D:/code/check tin mới nhất/landbase_news_source_counter_v4.py:821>).

- Trang tiếp theo lấy theo số trang lớn nhất trong log/raw + 1, kể cả có trang lỗi ở giữa.
- Ca kiểm chứng log trang 1 thành công, 2 timeout, 3 thành công → resume bắt đầu trang 4, không tự bù trang 2.
- Sửa: resume theo tập trang thành công và xếp lại trang lỗi/thiếu trước khi đi tiếp.

### 13. [P2] Crawler tin chưa có checkpoint trong lúc crawl

[worker ghi vào RAM:307](<D:/code/check tin mới nhất/landbase_news_source_counter_v4.py:307>), [đợi worker:859](<D:/code/check tin mới nhất/landbase_news_source_counter_v4.py:859>), [ghi báo cáo:901](<D:/code/check tin mới nhất/landbase_news_source_counter_v4.py:901>).

- Mỗi trang chỉ thêm vào list trong RAM. `make_report` chạy sau khi tất cả worker kết thúc.
- Dừng đột ngột/lỗi ngoài dự kiến trước bước này làm mất phần thu thập chưa lưu của phiên. Cơ chế ghi Excel qua file tạm chỉ bảo vệ bước xuất cuối.
- Sửa: lưu theo trang/batch vào SQLite hoặc JSONL, rồi tạo Excel từ dữ liệu đã lưu.

### 14. [P2] Thống kê 24 giờ Radar so sánh chuỗi khác định dạng

[db.ts:112](D:/code/fb-lead-radar/src/db.ts:112), [db.ts:317](D:/code/fb-lead-radar/src/db.ts:317).

- Dữ liệu lưu bằng ISO `YYYY-MM-DDTHH:mm:ss.sssZ`, còn `datetime('now', '-1 day')` trả chuỗi có khoảng trắng thay `T`. So sánh TEXT không phản ánh đúng thời điểm trên ngày ranh giới.
- Chạy nguyên câu SQL thống kê trên SQLite trong RAM: bài khoảng 27.79 giờ trước vẫn được tính vào `scanned_24h`.
- Sửa: thống nhất timestamp số hoặc định dạng UTC ở cả dữ liệu và tham số cắt; thêm kiểm chứng quanh mốc 24 giờ. Các truy vấn đếm bình luận/tin nhắn cũng dùng mẫu này.

## Các tối ưu tiếp theo

### Redirect Checker

- [Checkpoint:371](<D:/code/check redirect url/facebook_redirect_checker_no_login/fb_redirect_checker.py:371>) ghi toàn bộ CSV/Excel ngay trong `df_lock`. Các worker khác phải chờ ghi file xong. Nên có writer riêng ghi thêm dữ liệu/checkpoint nhỏ và chỉ xuất Excel cuối lượt.
- Mặc định checkpoint mỗi 200 dòng; nhánh tự tăng lên 5000 chỉ kích hoạt khi `save_every == 10`, nên không áp dụng với mặc định hiện tại ([dòng 448](<D:/code/check redirect url/facebook_redirect_checker_no_login/fb_redirect_checker.py:448>)).
- Ví dụ theo số phép ghi: 100.000 dòng, checkpoint mỗi 200 → 500 lần tuần tự hóa toàn bảng, khoảng 50 triệu lượt dòng chỉ riêng CSV, chưa tính Excel. Đây là ước tính từ code, không phải benchmark thời gian.
- Mỗi worker khởi chạy một Chromium. Đo RAM trước khi tăng worker; có thể chuyển sang async và một browser nhiều context để giảm chi phí tiến trình.
- `FULL_RESULT_COLUMNS` không có `final_url` dù checker tính ra giá trị này ([dòng 57](<D:/code/check redirect url/facebook_redirect_checker_no_login/fb_redirect_checker.py:57>)); đã kiểm chứng. Nên lưu URL cuối để người dùng đối soát kết luận.
- Ghi CSV hiện tại trực tiếp lên file đích. Nên dùng file tạm và thay thế khi ghi hoàn tất để giảm nguy cơ hỏng checkpoint.

### Location Enrichment Validator

- [app.py:126](<D:/code/check enrichment/location-enrichment-validator/app.py:126>) giữ một `session_state['reviewed']` không gắn với hash/file đầu vào. Đổi file có thể vẫn thấy kết quả file trước cho đến khi chạy lại. Nên gắn kết quả và editor state với phiên bản dữ liệu.
- [app.py:45](<D:/code/check enrichment/location-enrichment-validator/app.py:45>) đọc lại upload và [app.py:187](<D:/code/check enrichment/location-enrichment-validator/app.py:187>) tạo lại toàn bộ Excel trên mỗi lần script rerun, gồm khi lọc/sửa review. Cache theo nội dung đầu vào và phiên bản kết quả; tạo export theo yêu cầu.
- [pipeline.py](<D:/code/check enrichment/location-enrichment-validator/validator/pipeline.py>) gọi geocoder tuần tự. Dùng HTTP session tái sử dụng kết nối, concurrency giới hạn, retry có backoff và cache bền theo query/tọa độ để giảm thời gian và gọi lại API.
- [run_windows.bat](<D:/code/check enrichment/location-enrichment-validator/run_windows.bat>) chạy `pip install` mỗi lần mở; requirements chỉ có cận dưới. Tách setup khỏi khởi động và khóa bộ phiên bản đã kiểm tra để tăng khả năng tái lập.

### FB Lead Radar

- Sửa 10 lỗi type-check và thêm lệnh type-check vào CI. Chuẩn hóa mapping dữ liệu SQLite thay vì chỉ bỏ qua cảnh báo ép kiểu.
- Thêm kiểm chứng cho retry AI/Telegram, đồng bộ cấu hình, scan đồng thời và recovery trạng thái `sending` sau khi process dừng.
- Phân biệt lỗi có thể phục hồi với lỗi tiến trình nghiêm trọng; [server.ts:47](D:/code/fb-lead-radar/src/server.ts:47) hiện chỉ log `uncaughtException` và giữ process chạy.

### Laand Test Suite

- Có **276 chỗ gọi `waitForTimeout` trong source test**. Đây là số vị trí trong code, không phải số lần thực thi; nên thay dần bằng chờ response/trạng thái UI cụ thể.
- `workers: 1` và screenshot mọi test làm lượt chạy dài, nhưng chỉ tăng worker sau khi cô lập tài khoản/dữ liệu/storageState và sửa assertion. Dùng screenshot theo lỗi nếu không cần ảnh từng case.
- Có thông tin đăng nhập được ghi trực tiếp trong helper test. Nên chuyển sang biến môi trường/secret của CI; không đưa các giá trị này vào báo cáo.

## Thứ tự thực hiện đề xuất

1. Chặn truy cập file ngoài public; bảo vệ API điều khiển Radar nếu có dùng qua mạng.
2. Sửa mất thông báo/AI retry và đồng bộ cấu hình Radar.
3. Sửa phân loại redirect, launcher kéo-thả và ground truth tọa độ.
4. Sửa assertion/mã thoát để kết quả test có ý nghĩa.
5. Bổ sung checkpoint/resume và retry cho crawler.
6. Đo một bộ dữ liệu mẫu cố định: thời gian, RAM đỉnh, số request/API, số bản ghi đúng; sau đó điều chỉnh concurrency, cache và xuất file theo kết quả đo.

## Chạy lại các ca kiểm chứng

Từ PowerShell tại `D:\code`:

```powershell
& '.\check enrichment\location-enrichment-validator\.venv\Scripts\python.exe' -X utf8 'audit\2026-09-15\reproduce_python.py'
node --experimental-sqlite audit/2026-09-15/reproduce_node.cjs
```

Các script assert lại hành vi lỗi hiện tại, không phải test hồi quy mong muốn của phiên bản đã sửa. Sau khi sửa, cần chuyển assertion sang hành vi đúng.

- [Script Python](D:/code/audit/2026-09-15/reproduce_python.py) · [Kết quả Python](D:/code/audit/2026-09-15/python-results.json)
- [Script Node](D:/code/audit/2026-09-15/reproduce_node.cjs) · [Kết quả Node](D:/code/audit/2026-09-15/node-results.json)
