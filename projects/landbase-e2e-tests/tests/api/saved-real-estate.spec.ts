import { test, expect } from '@playwright/test';
import { LandBaseApiClient } from './api-client';
import { recordApiEvidence } from './api-evidence';

test.describe('LandBase API - Bất động sản đã lưu (get-list-saved)', () => {
  const client = new LandBaseApiClient();
  const config = client.getConfig();
  const ENDPOINT = '/api/v1.0/real-estate/real-estate-storage/get-list-saved';

  test.beforeEach(async ({ page }) => {
    // Navigate to dev-webapp to establish security context, origin, and cookies
    await page.goto(config.webappUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Tự động kiểm tra phiên đăng nhập và trích xuất/làm mới Token nếu có thể
    await client.ensureAuthenticated(page);
  });

  // =========================================================================
  // 1. NGHIỆP VỤ: LẤY DANH SÁCH BĐS ĐÃ LƯU (YÊU CẦU TOKEN HỢP LỆ)
  // =========================================================================
  test('API_SAVED_001: POST - Danh sách đã lưu - payload chuẩn (page=0, size=8)', async ({ page }, testInfo) => {
    test.skip(
      !client.getConfig().isConfigured,
      'Chưa có Token hợp lệ (hết hạn hoặc chưa đăng nhập). Hãy chạy "npm run token:get" hoặc cấu hình DEV_USERNAME/DEV_PASSWORD.'
    );

    const payload = {
      keySearch: '',
      ignoreLands: null,
      page: 0,
      size: 8,
      order: 'DESC',
      sort: 'createdDate',
    };

    // Execute in-page on dev-webapp.laand.vn for security compliance
    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    // Ghi nhận bằng chứng kiểm thử (JSON attachment + Visual Proof Screenshot)
    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_001',
      testName: 'POST - Danh sách đã lưu - payload chuẩn (page=0, size=8)',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (2xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    // 1. HTTP response is 2xx
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);

    // 2. Response body is valid JSON object
    expect(res.data).toBeDefined();
    expect(typeof res.data).toBe('object');
    const body = res.data;

    // 3. Response wrapper contains path and data
    expect(body).toHaveProperty('path', ENDPOINT);
    expect(body).toHaveProperty('data');
    expect(typeof body.data).toBe('object');

    const data = body.data;

    // 4. data.content is an array
    expect(data).toHaveProperty('content');
    expect(Array.isArray(data.content)).toBeTruthy();

    // 5. Pagination metadata has correct primitive types
    const numericKeys = ['number', 'size', 'numberOfElements', 'totalPages', 'totalElements'];
    for (const key of numericKeys) {
      expect(data, `data.${key}`).toHaveProperty(key);
      expect(typeof data[key], `data.${key} type`).toBe('number');
    }

    const booleanKeys = ['first', 'last', 'hasNext', 'hasPrevious', 'hasContent'];
    for (const key of booleanKeys) {
      expect(data, `data.${key}`).toHaveProperty(key);
      expect(typeof data[key], `data.${key} type`).toBe('boolean');
    }

    // 6. content length matches numberOfElements
    expect(data.content.length).toBe(data.numberOfElements);

    // 7. No duplicate property IDs within the current page
    const ids = data.content.map((item: any) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    // 8. Each returned saved property has id and isSaved=true
    data.content.forEach((item: any, i: number) => {
      expect(item, `content[${i}]`).toHaveProperty('id');
      expect(typeof item.id).toBe('string');
      expect(item.id.length).toBeGreaterThan(0);
      expect(item, `content[${i}]`).toHaveProperty('isSaved', true);
    });

    // 9. Response respects requested page size 8
    expect(data.size).toBe(8);
    expect(data.content.length).toBeLessThanOrEqual(8);
  });

  test('API_SAVED_002: POST - Trang tiếp theo (page=1)', async ({ page }, testInfo) => {
    test.skip(
      !client.getConfig().isConfigured,
      'Chưa có Token hợp lệ. Hãy chạy "npm run token:get" hoặc cấu hình DEV_USERNAME/DEV_PASSWORD.'
    );

    const payload = {
      keySearch: '',
      ignoreLands: null,
      page: 1,
      size: 8,
      order: 'DESC',
      sort: 'createdDate',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_002',
      testName: 'POST - Trang tiếp theo (page=1)',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (2xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);

    const body = res.data;
    expect(body).toHaveProperty('path', ENDPOINT);
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data.content)).toBeTruthy();

    const data = body.data;

    // Response represents requested page 1
    expect(data.number).toBe(1);
    expect(data.content.length).toBeLessThanOrEqual(data.size);

    // Response respects requested page size 8
    expect(data.size).toBe(8);
    expect(data.content.length).toBeLessThanOrEqual(8);
  });

  test('API_SAVED_003: POST - Kiểm tra Page size = 1', async ({ page }, testInfo) => {
    test.skip(
      !client.getConfig().isConfigured,
      'Chưa có Token hợp lệ. Hãy chạy "npm run token:get" hoặc cấu hình DEV_USERNAME/DEV_PASSWORD.'
    );

    const payload = {
      keySearch: '',
      ignoreLands: null,
      page: 0,
      size: 1,
      order: 'DESC',
      sort: 'createdDate',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_003',
      testName: 'POST - Kiểm tra Page size = 1',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (2xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);

    const data = res.data.data;
    // Response respects requested page size 1
    expect(data.size).toBe(1);
    expect(data.content.length).toBeLessThanOrEqual(1);
  });

  // =========================================================================
  // 2. BẢO MẬT & CONTRACT VALIDATION (CHẠY ĐƯỢC NGAY CẢ KHI CHƯA CÓ TOKEN)
  // =========================================================================
  test('API_SAVED_004: Chặn request không có Authentication Token (HTTP 401)', async ({ page }, testInfo) => {
    const payload = {
      keySearch: '',
      ignoreLands: null,
      page: 0,
      size: 8,
      order: 'DESC',
      sort: 'createdDate',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
      overrideTokens: {
        accessToken: '',
        xAuthToken: '',
        xSessionRef: '',
      },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_004',
      testName: 'Chặn request không có Authentication Token',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '401 Unauthorized',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({
        endpoint: ENDPOINT,
        body: payload,
        overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
      }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(401);
    expect(res.data).toBeDefined();
    expect(res.data.error || res.data.message).toMatch(/Unauthorized|Full authentication is required/i);
  });

  test('API_SAVED_005: Kiểm tra xác thực Token giả mạo hoặc sai định dạng (HTTP 401)', async ({ page }, testInfo) => {
    const payload = {
      keySearch: '',
      page: 0,
      size: 8,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
      overrideTokens: {
        accessToken: 'fake_jwt_token_invalid_signature_test',
        xAuthToken: 'fake_x_auth_token_99999',
        xSessionRef: 'fake_session_ref_88888',
      },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_005',
      testName: 'Kiểm tra xác thực Token giả mạo hoặc sai định dạng',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '401 Unauthorized / 403 Forbidden',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({
        endpoint: ENDPOINT,
        body: payload,
        overrideTokens: {
          accessToken: 'fake_jwt_token_invalid_signature_test',
          xAuthToken: 'fake_x_auth_token_99999',
          xSessionRef: 'fake_session_ref_88888',
        },
      }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([401, 403]).toContain(res.status);
  });

  test('API_SAVED_006: Kiểm tra Header Contract - Bắt buộc có clientmessageid và clienttime (HTTP 400)', async ({ page }, testInfo) => {
    const payload = {
      keySearch: '',
      page: 0,
      size: 8,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
      customHeaders: {
        clientmessageid: '',
        clienttime: '',
      },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_006',
      testName: 'Header Contract: Bắt buộc có clientmessageid và clienttime',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({
        endpoint: ENDPOINT,
        body: payload,
        customHeaders: { clientmessageid: '', clienttime: '' },
      }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([400, 401]).toContain(res.status);
    if (res.status === 400 && res.data) {
      expect(res.data.message).toContain('Header information is not correct');
    }
  });

  // =========================================================================
  // 3. CHI TIẾT TIN BĐS ĐÃ LƯU / TIN RAO VẶT (GET /api/v1.0/elasticsearch/public/detail/:articleId)
  // =========================================================================
  test('API_SAVED_007: GET - Chi tiết tin rao vặt đã lưu (articleId hợp lệ)', async ({ page }, testInfo) => {
    test.skip(
      config.isListingPost === false,
      'Skipped: API detail chỉ được gọi cho tin rao vặt. Đặt isListingPost=true khi fixture đúng loại.'
    );

    const articleId = config.articleId || '238622';
    const detailEndpoint = `/api/v1.0/elasticsearch/public/detail/${articleId}`;

    const res = await client.executeInPage(page, {
      endpoint: detailEndpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_007',
      testName: `GET - Chi tiết tin rao vặt đã lưu (articleId=${articleId})`,
      endpoint: client.resolveUrl(detailEndpoint),
      method: 'GET',
      expectedStatus: '200 OK (2xx)',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);

    // Kiểm tra cấu trúc dữ liệu trả về theo đặc tả
    expect(res.data).toBeDefined();
    expect(res.data).toHaveProperty('data');
    const detail = res.data.data;

    expect(detail).toHaveProperty('id', articleId);
    expect(detail).toHaveProperty('title');
    expect(typeof detail.title).toBe('string');
    expect(detail.title.length).toBeGreaterThan(0);

    expect(detail).toHaveProperty('location');
    expect(detail).toHaveProperty('conversionArea');
    expect(typeof detail.conversionArea).toBe('number');

    expect(detail).toHaveProperty('conversionPrice');
    expect(typeof detail.conversionPrice).toBe('number');

    expect(detail).toHaveProperty('locationAt');
    expect(detail.locationAt).toHaveProperty('lat');
    expect(detail.locationAt).toHaveProperty('lon');

    expect(detail).toHaveProperty('provinceCode');
  });

  test('API_SAVED_008: GET - Chi tiết động: Lấy articleId từ danh sách BĐS đã lưu để xem chi tiết', async ({ page }, testInfo) => {
    // 1. Gọi danh sách BĐS đã lưu
    const listRes = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: {
        keySearch: '',
        page: 0,
        size: 5,
        order: 'DESC',
        sort: 'createdDate',
      },
    });

    const savedItems = listRes.data?.data?.content || [];
    const targetArticleId = savedItems.length > 0 ? savedItems[0].id : (config.articleId || '238622');
    const detailEndpoint = `/api/v1.0/elasticsearch/public/detail/${targetArticleId}`;

    const res = await client.executeInPage(page, {
      endpoint: detailEndpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_008',
      testName: `GET - Chi tiết động theo ID từ danh sách đã lưu (id=${targetArticleId})`,
      endpoint: client.resolveUrl(detailEndpoint),
      method: 'GET',
      expectedStatus: '200 OK (2xx)',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.data?.data).toBeDefined();
    expect(res.data.data.id).toBe(targetArticleId);
  });

  test('API_SAVED_009: GET - Kiểm tra khi articleId không tồn tại (articleId=99999999 - HTTP 406/404)', async ({ page }, testInfo) => {
    const invalidId = '99999999';
    const detailEndpoint = `/api/v1.0/elasticsearch/public/detail/${invalidId}`;

    const res = await client.executeInPage(page, {
      endpoint: detailEndpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_009',
      testName: 'GET - Kiểm tra khi articleId không tồn tại (id=99999999)',
      endpoint: client.resolveUrl(detailEndpoint),
      method: 'GET',
      expectedStatus: '406 Not Acceptable / 404 Not Found',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([406, 404, 400]).toContain(res.status);
    if (res.data?.message) {
      expect(res.data.message).toMatch(/not\.found|không tìm thấy/i);
    }
  });

  test('API_SAVED_010: GET - Kiểm tra khi articleId sai định dạng (articleId=abc - HTTP 406/400)', async ({ page }, testInfo) => {
    const invalidId = 'abc';
    const detailEndpoint = `/api/v1.0/elasticsearch/public/detail/${invalidId}`;

    const res = await client.executeInPage(page, {
      endpoint: detailEndpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_010',
      testName: 'GET - Kiểm tra khi articleId sai định dạng (id=abc)',
      endpoint: client.resolveUrl(detailEndpoint),
      method: 'GET',
      expectedStatus: '406 Not Acceptable / 400 Bad Request',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([406, 400, 422]).toContain(res.status);
  });

  test('API_SAVED_011: GET - Kiểm tra API chi tiết là Public (không cần gửi kèm Authentication Token)', async ({ page }, testInfo) => {
    const articleId = config.articleId || '238622';
    const detailEndpoint = `/api/v1.0/elasticsearch/public/detail/${articleId}`;

    const res = await client.executeInPage(page, {
      endpoint: detailEndpoint,
      method: 'GET',
      overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_011',
      testName: 'GET - Kiểm tra API chi tiết Public không cần đăng nhập',
      endpoint: client.resolveUrl(detailEndpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data?.data?.id).toBe(articleId);
  });

  test('API_SAVED_012: POST - Từ chối HTTP Method POST trên endpoint chi tiết chỉ hỗ trợ GET (HTTP 405/4xx)', async ({ page }, testInfo) => {
    const articleId = config.articleId || '238622';
    const detailEndpoint = `/api/v1.0/elasticsearch/public/detail/${articleId}`;

    const res = await client.executeInPage(page, {
      endpoint: detailEndpoint,
      method: 'POST',
      body: {},
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_012',
      testName: 'POST - Từ chối HTTP Method POST trên endpoint chi tiết',
      endpoint: client.resolveUrl(detailEndpoint),
      method: 'POST',
      expectedStatus: '405 Method Not Allowed / 4xx',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([405, 400, 404, 403, 401]).toContain(res.status);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  // =========================================================================
  // 4. BỎ LƯU BẤT ĐỘNG SẢN ĐÃ LƯU (POST /api/v1.0/real-estate/real-estate-storage/remove/:id)
  // =========================================================================
  test('API_SAVED_013: POST - Bỏ lưu BĐS đã lưu từ Bản đồ (UUID)', async ({ page }, testInfo) => {
    test.skip(
      !config.confirmRemoveSaved || !config.runMapRemove,
      'Skipped for safety: Mặc định bỏ qua để tránh xóa trạng thái lưu ngoài ý muốn. Đặt confirmRemoveSaved=true và runMapRemove=true khi sẵn sàng xóa bản ghi test.'
    );

    const mapId = config.mapSavedId || '190a1c1e-f49a-4726-b793-454863565ecd';
    const removeEndpoint = `/api/v1.0/real-estate/real-estate-storage/remove/${mapId}`;

    const res = await client.executeInPage(page, {
      endpoint: removeEndpoint,
      method: 'POST',
      body: {},
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_013',
      testName: `POST - Bỏ lưu BĐS đã lưu từ Bản đồ (id=${mapId})`,
      endpoint: client.resolveUrl(removeEndpoint),
      method: 'POST',
      expectedStatus: '200 OK (status=1, Bỏ lưu thành công)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: removeEndpoint, body: {} }),
      requestBody: {},
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);

    const body = res.data;
    expect(body).toBeDefined();
    expect(body).toHaveProperty('status', 1);
    expect(body).toHaveProperty('data');
    expect(body.data).toBe('Bỏ lưu thành công');
  });

  test('API_SAVED_014: POST - Bỏ lưu tin rao vặt (ID số)', async ({ page }, testInfo) => {
    test.skip(
      !config.confirmRemoveSaved || !config.runListingRemove,
      'Skipped for safety: Mặc định bỏ qua để tránh xóa trạng thái lưu ngoài ý muốn. Đặt confirmRemoveSaved=true và runListingRemove=true khi sẵn sàng xóa bản ghi test.'
    );

    const listingId = config.listingSavedId || '238622';
    const removeEndpoint = `/api/v1.0/real-estate/real-estate-storage/remove/${listingId}`;

    const res = await client.executeInPage(page, {
      endpoint: removeEndpoint,
      method: 'POST',
      body: {},
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_014',
      testName: `POST - Bỏ lưu tin rao vặt (id=${listingId})`,
      endpoint: client.resolveUrl(removeEndpoint),
      method: 'POST',
      expectedStatus: '200 OK (status=1, data không rỗng)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: removeEndpoint, body: {} }),
      requestBody: {},
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);

    const body = res.data;
    expect(body).toBeDefined();
    expect(body).toHaveProperty('status', 1);
    expect(body).toHaveProperty('data');
    expect(String(body.data).length).toBeGreaterThan(0);
  });

  test('API_SAVED_015: POST - Chặn bỏ lưu khi không có Authentication Token (HTTP 401)', async ({ page }, testInfo) => {
    const listingId = config.listingSavedId || '238622';
    const removeEndpoint = `/api/v1.0/real-estate/real-estate-storage/remove/${listingId}`;

    const res = await client.executeInPage(page, {
      endpoint: removeEndpoint,
      method: 'POST',
      body: {},
      overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_015',
      testName: 'POST - Chặn bỏ lưu khi không có Token (401)',
      endpoint: client.resolveUrl(removeEndpoint),
      method: 'POST',
      expectedStatus: '401 Unauthorized',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({
        endpoint: removeEndpoint,
        body: {},
        overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
      }),
      requestBody: {},
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(401);
  });

  test('API_SAVED_016: POST - Chặn bỏ lưu khi gửi Token giả mạo hoặc sai định dạng (HTTP 401)', async ({ page }, testInfo) => {
    const listingId = config.listingSavedId || '238622';
    const removeEndpoint = `/api/v1.0/real-estate/real-estate-storage/remove/${listingId}`;

    const res = await client.executeInPage(page, {
      endpoint: removeEndpoint,
      method: 'POST',
      body: {},
      overrideTokens: {
        accessToken: 'fake_jwt_token_invalid_signature_test',
        xAuthToken: 'fake_x_auth_token_99999',
        xSessionRef: 'fake_session_ref_88888',
      },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_016',
      testName: 'POST - Chặn bỏ lưu với Token giả mạo (401)',
      endpoint: client.resolveUrl(removeEndpoint),
      method: 'POST',
      expectedStatus: '401 Unauthorized / 403 Forbidden',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({
        endpoint: removeEndpoint,
        body: {},
        overrideTokens: {
          accessToken: 'fake_jwt_token_invalid_signature_test',
          xAuthToken: 'fake_x_auth_token_99999',
          xSessionRef: 'fake_session_ref_88888',
        },
      }),
      requestBody: {},
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([401, 403]).toContain(res.status);
  });

  test('API_SAVED_017: POST - Kiểm tra Header Contract: Bắt buộc có clientmessageid và clienttime (HTTP 400)', async ({ page }, testInfo) => {
    const listingId = config.listingSavedId || '238622';
    const removeEndpoint = `/api/v1.0/real-estate/real-estate-storage/remove/${listingId}`;

    const res = await client.executeInPage(page, {
      endpoint: removeEndpoint,
      method: 'POST',
      body: {},
      customHeaders: {
        clientmessageid: '',
        clienttime: '',
      },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_017',
      testName: 'POST - Kiểm tra Header Contract thiếu messageId/clienttime',
      endpoint: client.resolveUrl(removeEndpoint),
      method: 'POST',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({
        endpoint: removeEndpoint,
        body: {},
        customHeaders: { clientmessageid: '', clienttime: '' },
      }),
      requestBody: {},
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([400, 401]).toContain(res.status);
  });

  test('API_SAVED_018: GET - Từ chối HTTP Method GET trên endpoint bỏ lưu (HTTP 405/4xx)', async ({ page }, testInfo) => {
    const listingId = config.listingSavedId || '238622';
    const removeEndpoint = `/api/v1.0/real-estate/real-estate-storage/remove/${listingId}`;

    const res = await client.executeInPage(page, {
      endpoint: removeEndpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API_SAVED_018',
      testName: 'GET - Từ chối HTTP Method GET trên endpoint remove',
      endpoint: client.resolveUrl(removeEndpoint),
      method: 'GET',
      expectedStatus: '405 Method Not Allowed / 4xx',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([405, 400, 404, 403, 401]).toContain(res.status);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
