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
});
