# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: projects\landbase-e2e-tests\tests\api\land-price\price-search.spec.ts >> Bảng giá đất - 03. Tìm kiếm giá đất (/api/v1.0/category/public/land-assess-prices/search) >> PRICE_SEARCH_005: Chặn request khi year sai kiểu dữ liệu (year="ABC" - VAL-04)
- Location: projects\landbase-e2e-tests\tests\api\land-price\price-search.spec.ts:174:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 406
Received array: [400, 422]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e5]:
      - button "Thu gọn menu" [ref=e6] [cursor=pointer]:
        - generic [ref=e7]: 
      - generic [ref=e9]:
        - link "LandBase" [ref=e10] [cursor=pointer]:
          - /url: /
          - img "LandBase" [ref=e11]
        - text: 
      - list [ref=e15]:
        - listitem [ref=e16]:
          - link "  Trang chủ" [ref=e17] [cursor=pointer]:
            - /url: /
            - generic [ref=e19]:  
            - generic [ref=e20]: Trang chủ
        - listitem [ref=e21]:
          - link "  Bản đồ" [ref=e22] [cursor=pointer]:
            - /url: /ban-do
            - generic [ref=e24]:  
            - generic [ref=e25]: Bản đồ
        - listitem [ref=e26]:
          - link "  Tin rao vặt" [ref=e27] [cursor=pointer]:
            - /url: /tin-rao-vat
            - generic [ref=e29]:  
            - generic [ref=e30]: Tin rao vặt
        - listitem [ref=e31]:
          - link "  Tin tức thị trường" [ref=e32] [cursor=pointer]:
            - /url: /tin-tuc-thi-truong
            - generic [ref=e34]:  
            - generic [ref=e35]: Tin tức thị trường
        - listitem [ref=e36]:
          - link "  Cẩm nang" [ref=e37] [cursor=pointer]:
            - /url: /cam-nang
            - generic [ref=e39]:  
            - generic [ref=e40]: Cẩm nang
        - listitem [ref=e41]:
          - link "  Bảng giá" [ref=e42] [cursor=pointer]:
            - /url: /bang-gia
            - generic [ref=e44]:  
            - generic [ref=e45]: Bảng giá
    - main [ref=e46]:
      - generic [ref=e47]:
        - text: 
        - generic [ref=e48]:
          - button "Đăng nhập " [ref=e49]:
            - generic [ref=e50]: Đăng nhập
            - generic [ref=e51]: 
          - button "Tạo tài khoản " [ref=e52]:
            - generic [ref=e53]: Tạo tài khoản
            - generic [ref=e54]: 
      - main [ref=e55]:
        - main [ref=e58]:
          - generic [ref=e59]:
            - heading "Trợ lý AI Bất Động Sản" [level=1] [ref=e60]
            - paragraph [ref=e61]: Phân tích thị trường, tra cứu quy hoạch và tìm kiếm bất động sản chưa bao giờ dễ dàng đến thế.
          - generic [ref=e65]:
            - textbox "Bạn muốn tìm hiểu về khu vực nào?..." [ref=e66]
            - generic [ref=e67]:
              - button "Tìm kiếm bằng giọng nói" [ref=e68] [cursor=pointer]:
                - generic [ref=e69]: 
              - button "Gửi câu hỏi" [disabled]:
                - generic: 
          - generic [ref=e70]:
            - button " Phân tích khu vực" [ref=e71]:
              - generic [ref=e72]: 
              - generic [ref=e73]: Phân tích khu vực
            - button " Tiện ích" [ref=e74]:
              - generic [ref=e75]: 
              - generic [ref=e76]: Tiện ích
            - button " Tin rao vặt" [ref=e77]:
              - generic [ref=e78]: 
              - generic [ref=e79]: Tin rao vặt
            - button " Tin tức BĐS" [ref=e80]:
              - generic [ref=e81]: 
              - generic [ref=e82]: Tin tức BĐS
            - button " Bản đồ" [ref=e83]:
              - generic [ref=e84]: 
              - generic [ref=e85]: Bản đồ
          - link "Promo Banner" [ref=e87] [cursor=pointer]:
            - /url: "#"
            - img "Promo Banner" [ref=e88]
          - generic [ref=e90]:
            - heading "Tiện ích mở rộng" [level=2] [ref=e91]
            - generic [ref=e92]:
              - button "Bản đồ" [ref=e93]
              - button "Tài chính" [ref=e94]
              - button "Phong thuỷ" [ref=e95]
            - generic [ref=e96]:
              - button "Ước tính chi phí xây nhà Tính toán nhanh ngân sách thi công cơ bản dựa trên diện tích và số tầng." [ref=e97]:
                - generic [ref=e99]: 
                - generic [ref=e100]: Ước tính chi phí xây nhà
                - generic [ref=e101]: Tính toán nhanh ngân sách thi công cơ bản dựa trên diện tích và số tầng.
              - button "Tính lãi vay Lên phương án trả nợ gốc, lãi hàng tháng theo các kịch bản lãi suất ngân hàng." [ref=e102]:
                - generic [ref=e104]: "%"
                - generic [ref=e105]: Tính lãi vay
                - generic [ref=e106]: Lên phương án trả nợ gốc, lãi hàng tháng theo các kịch bản lãi suất ngân hàng.
              - button "Tính lãi tiết kiệm Tính toán mức sinh lời nếu gửi ngân hàng để đối chiếu với lợi nhuận đầu tư từ nhà đất." [ref=e107]:
                - generic [ref=e109]: 
                - generic [ref=e110]: Tính lãi tiết kiệm
                - generic [ref=e111]: Tính toán mức sinh lời nếu gửi ngân hàng để đối chiếu với lợi nhuận đầu tư từ nhà đất.
              - button "Bảng giá đất Tra cứu khung giá đất Nhà nước và hệ số K để ước tính thuế phí chuyển nhượng." [ref=e112]:
                - generic [ref=e114]: 
                - generic [ref=e115]: Bảng giá đất
                - generic [ref=e116]: Tra cứu khung giá đất Nhà nước và hệ số K để ước tính thuế phí chuyển nhượng.
              - button "Định giá Phân tích giá giao dịch để đề xuất giá chào bán hoặc mua vào hợp lý." [ref=e117]:
                - generic [ref=e119]: 
                - generic [ref=e120]: Định giá
                - generic [ref=e121]: Phân tích giá giao dịch để đề xuất giá chào bán hoặc mua vào hợp lý.
              - button " Sắp ra mắt Dự toán xây dựng Bóc tách chi tiết khối lượng vật tư và nhân công cho từng hạng mục thi công, hoàn thiện." [disabled] [ref=e122]:
                - generic [ref=e123]:
                  - generic [ref=e124]: 
                  - generic [ref=e125]: Sắp ra mắt
                - generic [ref=e127]: 
                - generic [ref=e128]: Dự toán xây dựng
                - generic [ref=e129]: Bóc tách chi tiết khối lượng vật tư và nhân công cho từng hạng mục thi công, hoàn thiện.
        - generic [ref=e130]:
          - generic [ref=e131]:
            - generic [ref=e133]:
              - generic [ref=e134]:
                - generic [ref=e135]:
                  - link "LandBase" [ref=e136] [cursor=pointer]:
                    - /url: /
                    - img "LandBase" [ref=e137]
                  - paragraph [ref=e138]: CÔNG TY CỔ PHẦN GIẢI PHÁP VÀ ĐẦU TƯ AGENCY
                  - list [ref=e139]:
                    - listitem [ref=e140]: "Mã số thuế: 0109792547"
                    - listitem [ref=e141]: "Địa chỉ: Số 69, Nguyễn Hy Quang, Phường Đống Đa, TP Hà Nội, Việt Nam"
                    - listitem [ref=e142]:
                      - text: "Hotline:"
                      - link "034 249 8338" [ref=e143] [cursor=pointer]:
                        - /url: tel:0342498338
                    - listitem [ref=e144]:
                      - text: "Email:"
                      - link "info@landbase.vn" [ref=e145] [cursor=pointer]:
                        - /url: mailto:info@landbase.vn
                    - listitem [ref=e146]:
                      - text: "Website:"
                      - link "landbase.vn" [ref=e147] [cursor=pointer]:
                        - /url: https://landbase.vn
                - generic [ref=e148]:
                  - paragraph [ref=e149]: Tải ứng dụng ngay tại đây!
                  - generic [ref=e151]:
                    - paragraph [ref=e152]: Hoặc tải ứng dụng tại
                    - generic [ref=e153]:
                      - link "Download on the App Store" [ref=e154] [cursor=pointer]:
                        - /url: https://apps.apple.com/us/app/landbase/id6448577507
                        - img "Download on the App Store" [ref=e155]
                      - link "Get it on Google Play" [ref=e156] [cursor=pointer]:
                        - /url: https://play.google.com/store/apps/details?id=vn.laand
                        - img "Get it on Google Play" [ref=e157]
              - generic [ref=e159]:
                - generic [ref=e160]:
                  - heading "Sản phẩm" [level=3] [ref=e161]: Sản phẩm
                  - list [ref=e163]:
                    - listitem [ref=e164]:
                      - link "Chatbot AI" [ref=e165] [cursor=pointer]:
                        - /url: /
                    - listitem [ref=e166]:
                      - link "Bản đồ" [ref=e167] [cursor=pointer]:
                        - /url: /ban-do
                    - listitem [ref=e168]:
                      - link "Tin rao vặt" [ref=e169] [cursor=pointer]:
                        - /url: /tin-rao-vat
                - generic [ref=e170]:
                  - heading "Tin tức" [level=3] [ref=e171]: Tin tức
                  - list [ref=e173]:
                    - listitem [ref=e174]:
                      - link "Tin tức thị trường" [ref=e175] [cursor=pointer]:
                        - /url: /tin-tuc-thi-truong
                    - listitem [ref=e176]:
                      - link "Tài liệu BĐS" [ref=e177] [cursor=pointer]:
                        - /url: "#"
                    - listitem [ref=e178]:
                      - link "Cẩm nang" [ref=e179] [cursor=pointer]:
                        - /url: /cam-nang
                - generic [ref=e180]:
                  - heading "Chính sách" [level=3] [ref=e181]: Chính sách
                  - list [ref=e183]:
                    - listitem [ref=e184]:
                      - link "Quy chế hoạt động" [ref=e185] [cursor=pointer]:
                        - /url: /faq/quy-che-hoat-dong
                    - listitem [ref=e186]:
                      - link "Chính sách giá" [ref=e187] [cursor=pointer]:
                        - /url: /faq/chinh-sach-gia-dich-vu
                    - listitem [ref=e188]:
                      - link "Chính sách thanh toán và hoàn tiền" [ref=e189] [cursor=pointer]:
                        - /url: /faq/chinh-sach-thanh-toan-va-hoan-tien
                    - listitem [ref=e190]:
                      - link "Tuyên bố miễn trừ trách nhiệm dữ liệu" [ref=e191] [cursor=pointer]:
                        - /url: /faq/tuyen-bo-mien-tru-trach-nhiem-du-lieu
                    - listitem [ref=e192]:
                      - link "Hướng dẫn giao dịch" [ref=e193] [cursor=pointer]:
                        - /url: /faq/phuong-thuc-giao-dich-ho-tro-truc-tuyen
            - generic [ref=e195]:
              - generic [ref=e196]:
                - link "GIỚI THIỆU DOANH NGHIỆP" [ref=e197] [cursor=pointer]:
                  - /url: http://agency.landbase.vn
                - link "ĐIỀU KHOẢN THOẢ THUẬN" [ref=e198] [cursor=pointer]:
                  - /url: /faq/dieu-khoan-thoa-thuan
                - link "BẢO MẬT" [ref=e199] [cursor=pointer]:
                  - /url: /faq/chinh-sach-bao-mat
                - link "KHIẾU NẠI" [ref=e200] [cursor=pointer]:
                  - /url: /faq/giai-quyet-khieu-nai
              - paragraph [ref=e201]: © 2026 CÔNG TY CỔ PHẦN GIẢI PHÁP VÀ ĐẦU TƯ AGENCY. ALL RIGHTS RESERVED
          - generic [ref=e202]:
            - generic [ref=e203]:
              - generic [ref=e204]: "Hotline:"
              - link "034 249 8338" [ref=e205] [cursor=pointer]:
                - /url: tel:0342498338
            - generic [ref=e206]:
              - link "Facebook LandBase" [ref=e207] [cursor=pointer]:
                - /url: https://www.facebook.com/landbase11
                - generic [ref=e208]: 
              - link "Zalo OA" [ref=e209] [cursor=pointer]:
                - /url: https://zalo.me/965892058684946956
                - generic [ref=e210]: Zalo
              - link "Youtube LandBase" [ref=e211] [cursor=pointer]:
                - /url: https://www.youtube.com/@LandBase01
                - generic [ref=e212]: 
              - link "TikTok LandBase" [ref=e213] [cursor=pointer]:
                - /url: https://www.tiktok.com/@landbase.reviewbds
                - generic [ref=e214]: 
      - generic:
        - generic:
          - link "Fanpage Facebook LandBase":
            - /url: https://www.facebook.com/landbase11
            - generic: Fanpage Facebook
            - generic:
              - generic: 
          - link "Chat Zalo với LandBase":
            - /url: https://zalo.me/g/jjaero388
            - generic: Chat Zalo
            - generic:
              - generic: Zalo
          - link "Hotline LandBase":
            - /url: tel:0342498338
            - generic: Hotline
            - generic:
              - generic: 
          - link "Hòm thư LandBase":
            - /url: "#feedback"
            - generic: Hòm thư
            - generic:
              - generic: 
        - button "Liên hệ với LandBase" [ref=e215] [cursor=pointer]:
          - generic [ref=e217]: 
      - text:    
  - region "Notifications alt+T"
  - alert [ref=e218]
  - generic [ref=e220]:
    - generic [ref=e221]:
      - generic [ref=e222]:
        - generic [ref=e223]: POST
        - generic [ref=e224]: "VAL-04: Kiểm tra khi year=\"ABC\" (sai kiểu dữ liệu)"
      - generic [ref=e225]:
        - generic [ref=e226]: "Expected: 400 Bad Request / 422 Unprocessable Entity"
        - generic [ref=e227]: "Actual: 406"
    - generic [ref=e228]:
      - strong [ref=e229]: "URL:"
      - text: https://dev-gateway.laand.vn/api/v1.0/category/public/land-assess-prices/search
    - generic [ref=e230]:
      - generic [ref=e231]:
        - generic [ref=e232]: 📤 REQUEST PAYLOAD & HEADERS
        - generic [ref=e233]: "{ \"year\": \"ABC\", \"codeProvince\": \"01\", \"page\": 0, \"size\": 10 }"
      - generic [ref=e234]:
        - generic [ref=e235]:
          - generic [ref=e236]: 📥 ACTUAL RESPONSE (Postman Equivalent)
          - generic [ref=e237]: HTTP 406
        - generic [ref=e238]: "{ \"status\": 0, \"duration\": 4, \"path\": \"/api/v1.0/category/public/land-assess-prices/search\", \"responseTime\": \"2026-10-14T09:56:51.763Z\", \"clientTime\": \"2026-10-14T02:56:51.759+00:00\", \"clientMessageId\": \"ENAO-3de58226-d78e-4e90-beb5-c89953da087b\", \"code\": \"500\", \"message\": \"Lỗi hệ thống\", \"additionalData\": null }"
```

# Test source

```ts
  101 |     const keyword = config.searchKeyword || 'Nguyễn Trãi';
  102 |     const payload = {
  103 |       year: 2026,
  104 |       codeProvince: '01',
  105 |       codeWard: null,
  106 |       codeType: null,
  107 |       fullTextSearch: keyword,
  108 |       page: 0,
  109 |       size: 10,
  110 |     };
  111 | 
  112 |     const res = await client.executeInPage(page, {
  113 |       endpoint: ENDPOINT,
  114 |       method: 'POST',
  115 |       body: payload,
  116 |     });
  117 | 
  118 |     await recordApiEvidence(page, testInfo, {
  119 |       testId: 'VAL-20 & BUS-06',
  120 |       testName: `Tìm kiếm theo từ khóa "${keyword}"`,
  121 |       endpoint: client.resolveUrl(ENDPOINT),
  122 |       method: 'POST',
  123 |       expectedStatus: '200 OK',
  124 |       actualStatus: res.status,
  125 |       requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
  126 |       requestBody: payload,
  127 |       responseHeaders: res.headers,
  128 |       responseBody: res.data,
  129 |     });
  130 | 
  131 |     expect(res.status).toBe(200);
  132 |     const content = res.data?.data?.content || [];
  133 |     expect(Array.isArray(content)).toBeTruthy();
  134 |   });
  135 | 
  136 |   // =========================================================================
  137 |   // 2. VALIDATION ĐẦU VÀO (VAL-02, 03, 04, 08, 09, 22, 26)
  138 |   // =========================================================================
  139 |   test('PRICE_SEARCH_004: Kiểm tra xử lý an toàn khi thiếu hoặc null trường year (VAL-02 & VAL-03)', async ({ page }, testInfo) => {
  140 |     const payload = {
  141 |       year: null,
  142 |       codeProvince: '01',
  143 |       codeWard: null,
  144 |       codeType: null,
  145 |       fullTextSearch: '',
  146 |       page: 0,
  147 |       size: 10,
  148 |     };
  149 | 
  150 |     const res = await client.executeInPage(page, {
  151 |       endpoint: ENDPOINT,
  152 |       method: 'POST',
  153 |       body: payload,
  154 |     });
  155 | 
  156 |     await recordApiEvidence(page, testInfo, {
  157 |       testId: 'VAL-02 & VAL-03',
  158 |       testName: 'Kiểm tra khi year=null hoặc thiếu year (Xử lý an toàn theo Postman contract)',
  159 |       endpoint: client.resolveUrl(ENDPOINT),
  160 |       method: 'POST',
  161 |       expectedStatus: '400 Bad Request / 200 OK (Mặc định năm/an toàn < 500)',
  162 |       actualStatus: res.status,
  163 |       requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
  164 |       requestBody: payload,
  165 |       responseHeaders: res.headers,
  166 |       responseBody: res.data,
  167 |     });
  168 | 
  169 |     // Theo Postman script: pm.expect(pm.response.code).to.be.below(500)
  170 |     expect(res.status).toBeLessThan(500);
  171 |     expect([200, 400, 422]).toContain(res.status);
  172 |   });
  173 | 
  174 |   test('PRICE_SEARCH_005: Chặn request khi year sai kiểu dữ liệu (year="ABC" - VAL-04)', async ({ page }, testInfo) => {
  175 |     const payload = {
  176 |       year: 'ABC',
  177 |       codeProvince: '01',
  178 |       page: 0,
  179 |       size: 10,
  180 |     };
  181 | 
  182 |     const res = await client.executeInPage(page, {
  183 |       endpoint: ENDPOINT,
  184 |       method: 'POST',
  185 |       body: payload,
  186 |     });
  187 | 
  188 |     await recordApiEvidence(page, testInfo, {
  189 |       testId: 'VAL-04',
  190 |       testName: 'Kiểm tra khi year="ABC" (sai kiểu dữ liệu)',
  191 |       endpoint: client.resolveUrl(ENDPOINT),
  192 |       method: 'POST',
  193 |       expectedStatus: '400 Bad Request / 422 Unprocessable Entity',
  194 |       actualStatus: res.status,
  195 |       requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
  196 |       requestBody: payload,
  197 |       responseHeaders: res.headers,
  198 |       responseBody: res.data,
  199 |     });
  200 | 
> 201 |     expect([400, 422]).toContain(res.status);
      |                        ^ Error: expect(received).toContain(expected) // indexOf
  202 |   });
  203 | 
  204 |   test('PRICE_SEARCH_006: Kiểm tra xử lý an toàn khi thiếu hoặc null codeProvince (VAL-08 & VAL-09)', async ({ page }, testInfo) => {
  205 |     const payload = {
  206 |       year: 2026,
  207 |       codeProvince: null,
  208 |       page: 0,
  209 |       size: 10,
  210 |     };
  211 | 
  212 |     const res = await client.executeInPage(page, {
  213 |       endpoint: ENDPOINT,
  214 |       method: 'POST',
  215 |       body: payload,
  216 |     });
  217 | 
  218 |     await recordApiEvidence(page, testInfo, {
  219 |       testId: 'VAL-08 & VAL-09',
  220 |       testName: 'Kiểm tra khi codeProvince=null (Xử lý an toàn theo Postman contract)',
  221 |       endpoint: client.resolveUrl(ENDPOINT),
  222 |       method: 'POST',
  223 |       expectedStatus: '400 Bad Request / 200 OK (Toàn quốc/an toàn < 500)',
  224 |       actualStatus: res.status,
  225 |       requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
  226 |       requestBody: payload,
  227 |       responseHeaders: res.headers,
  228 |       responseBody: res.data,
  229 |     });
  230 | 
  231 |     // Theo Postman script: pm.expect(pm.response.code).to.be.below(500)
  232 |     expect(res.status).toBeLessThan(500);
  233 |     expect([200, 400, 422]).toContain(res.status);
  234 |   });
  235 | 
  236 |   // =========================================================================
  237 |   // 3. PHÂN TRANG (PAG-01, PAG-02, PAG-04)
  238 |   // =========================================================================
  239 |   test('PRICE_SEARCH_007: Kiểm tra phân trang và chuyển sang trang kế tiếp (page=1, size=10 - PAG-02)', async ({ page }, testInfo) => {
  240 |     const payload = {
  241 |       year: 2026,
  242 |       codeProvince: '01',
  243 |       codeWard: null,
  244 |       codeType: null,
  245 |       fullTextSearch: '',
  246 |       page: 1,
  247 |       size: 10,
  248 |     };
  249 | 
  250 |     const res = await client.executeInPage(page, {
  251 |       endpoint: ENDPOINT,
  252 |       method: 'POST',
  253 |       body: payload,
  254 |     });
  255 | 
  256 |     await recordApiEvidence(page, testInfo, {
  257 |       testId: 'PAG-02',
  258 |       testName: 'Kiểm tra chuyển sang trang tiếp theo (page=1)',
  259 |       endpoint: client.resolveUrl(ENDPOINT),
  260 |       method: 'POST',
  261 |       expectedStatus: '200 OK (page=1)',
  262 |       actualStatus: res.status,
  263 |       requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
  264 |       requestBody: payload,
  265 |       responseHeaders: res.headers,
  266 |       responseBody: res.data,
  267 |     });
  268 | 
  269 |     expect(res.status).toBe(200);
  270 |     const d = res.data?.data;
  271 |     expect(d.number).toBe(1);
  272 |     expect(d.content.length).toBeLessThanOrEqual(10);
  273 |   });
  274 | 
  275 |   test('PRICE_SEARCH_008: Kiểm tra giới hạn số bản ghi theo size (size=5 - PAG-04)', async ({ page }, testInfo) => {
  276 |     const payload = {
  277 |       year: 2026,
  278 |       codeProvince: '01',
  279 |       page: 0,
  280 |       size: 5,
  281 |     };
  282 | 
  283 |     const res = await client.executeInPage(page, {
  284 |       endpoint: ENDPOINT,
  285 |       method: 'POST',
  286 |       body: payload,
  287 |     });
  288 | 
  289 |     await recordApiEvidence(page, testInfo, {
  290 |       testId: 'PAG-04',
  291 |       testName: 'Kiểm tra thay đổi size (size=5)',
  292 |       endpoint: client.resolveUrl(ENDPOINT),
  293 |       method: 'POST',
  294 |       expectedStatus: '200 OK (size <= 5)',
  295 |       actualStatus: res.status,
  296 |       requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
  297 |       requestBody: payload,
  298 |       responseHeaders: res.headers,
  299 |       responseBody: res.data,
  300 |     });
  301 | 
```