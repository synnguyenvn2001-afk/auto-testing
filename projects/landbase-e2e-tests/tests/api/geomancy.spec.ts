import { test, expect } from '@playwright/test';
import { LandBaseApiClient } from './api-client';
import { recordApiEvidence } from './api-evidence';

test.describe('LandBase API - Phong thủy (geomancy/search)', () => {
  const client = new LandBaseApiClient();
  const config = client.getConfig();
  const ENDPOINT = '/api/v1.0/real-estate/public/geomancy/search';

  test.beforeEach(async ({ page }) => {
    // Truy cập dev-webapp để thiết lập security context, cookies và origin
    await page.goto(config.webappUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  // =========================================================================
  // 1. NGHIỆP VỤ CHÍNH: TÌM KIẾM PHONG THỦY VỚI DỮ LIỆU CHUẨN
  // =========================================================================
  test('PHONGTHUY_001: Tìm kiếm phong thủy với payload mẫu hợp lệ - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      birth: config.geomancyBirth || '2026-10-13T17:00:00.000Z',
      gender: config.geomancyGender ?? 0,
      direction: config.geomancyDirection || 'Bắc',
      categoryCode: config.geomancyCategoryCode || 'BDS00035',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'PHONGTHUY-01',
      testName: 'Tìm kiếm phong thủy với payload mẫu hợp lệ',
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

    // 3. Response wrapper chứa status, path và data
    expect(body).toHaveProperty('path', ENDPOINT);
    expect(body).toHaveProperty('status', 1);
    expect(body).toHaveProperty('data');
    expect(typeof body.data).toBe('object');

    const data = body.data;

    // 4. Kiểm tra các trường dữ liệu phong thủy chi tiết
    expect(data).toHaveProperty('id');
    expect(typeof data.id).toBe('string');
    expect(data.id.length).toBeGreaterThan(0);

    expect(data).toHaveProperty('gender');
    expect(data.gender).toBe(payload.gender);

    expect(data).toHaveProperty('yearName');
    expect(typeof data.yearName).toBe('string');
    expect(data.yearName.length).toBeGreaterThan(0);

    expect(data).toHaveProperty('destiny');
    expect(typeof data.destiny).toBe('string');

    expect(data).toHaveProperty('fiveElements');
    expect(typeof data.fiveElements).toBe('string');

    expect(data).toHaveProperty('goodDirection');
    expect(typeof data.goodDirection).toBe('string');

    expect(data).toHaveProperty('eightPalacesGood');
    expect(typeof data.eightPalacesGood).toBe('string');

    expect(data).toHaveProperty('consulting');
    expect(typeof data.consulting).toBe('string');

    expect(data).toHaveProperty('yinYang');
    expect(typeof data.yinYang).toBe('string');

    expect(data).toHaveProperty('lunarYear');
  });

  // =========================================================================
  // 2. KIỂM TRA VALIDATION & CÁC TRƯỜNG HỢP ÂM (NEGATIVE TESTS)
  // Đã chuẩn hóa toàn bộ mã lỗi HTTP (400, 422) và phát hiện chính xác bug 406 của backend
  // =========================================================================
  test('PHONGTHUY_002: Kiểm tra khi thiếu birth - [PHÁT HIỆN BUG BACKEND 406 (Kỳ vọng 400 Bad Request)]', async ({ page }, testInfo) => {
    const payload = {
      gender: config.geomancyGender ?? 0,
      direction: config.geomancyDirection || 'Bắc',
      categoryCode: config.geomancyCategoryCode || 'BDS00035',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'PHONGTHUY-02',
      testName: 'Kiểm tra khi thiếu birth [BUG 406]',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request (Không chấp nhận 406 Not Acceptable)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    // 1. Backend không được trả về mã 406 Not Acceptable kèm message 500 lỗi hệ thống
    expect(res.status, 'Backend KHÔNG ĐƯỢC trả về 406 Not Acceptable').not.toBe(406);
    // 2. Kỳ vọng chuẩn RESTful cho dữ liệu thiếu là 400 Bad Request hoặc 422
    expect([400, 422], 'Kỳ vọng mã lỗi chuẩn REST là 400 Bad Request hoặc 422').toContain(res.status);
  });

  test('PHONGTHUY_003: Kiểm tra birth sai định dạng ngày giờ - [PHÁT HIỆN BUG BACKEND 406 (Kỳ vọng 400 Bad Request)]', async ({ page }, testInfo) => {
    const payload = {
      birth: 'not-a-date',
      gender: config.geomancyGender ?? 0,
      direction: config.geomancyDirection || 'Bắc',
      categoryCode: config.geomancyCategoryCode || 'BDS00035',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'PHONGTHUY-03',
      testName: 'Kiểm tra birth sai định dạng ngày giờ [BUG 406]',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request (Không chấp nhận 406 Not Acceptable)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status, 'Backend KHÔNG ĐƯỢC trả về 406 Not Acceptable').not.toBe(406);
    expect([400, 422], 'Kỳ vọng mã lỗi chuẩn REST là 400 Bad Request hoặc 422').toContain(res.status);
  });

  test('PHONGTHUY_004: Kiểm tra gender sai kiểu dữ liệu (chuỗi "ABC") - [PHÁT HIỆN BUG BACKEND 406 (Kỳ vọng 400 Bad Request)]', async ({ page }, testInfo) => {
    const payload = {
      birth: config.geomancyBirth || '2026-10-13T17:00:00.000Z',
      gender: 'ABC',
      direction: config.geomancyDirection || 'Bắc',
      categoryCode: config.geomancyCategoryCode || 'BDS00035',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'PHONGTHUY-04',
      testName: 'Kiểm tra gender sai kiểu dữ liệu [BUG 406]',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request (Không chấp nhận 406 Not Acceptable)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status, 'Backend KHÔNG ĐƯỢC trả về 406 Not Acceptable').not.toBe(406);
    expect([400, 422], 'Kỳ vọng mã lỗi chuẩn REST là 400 Bad Request hoặc 422').toContain(res.status);
  });

  test('PHONGTHUY_005: Kiểm tra direction với giá trị không xác định - [PHÁT HIỆN BUG BACKEND 406 (Kỳ vọng 400 Bad Request)]', async ({ page }, testInfo) => {
    const payload = {
      birth: config.geomancyBirth || '2026-10-13T17:00:00.000Z',
      gender: config.geomancyGender ?? 0,
      direction: 'INVALID_DIRECTION',
      categoryCode: config.geomancyCategoryCode || 'BDS00035',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'PHONGTHUY-05',
      testName: 'Kiểm tra direction với giá trị không xác định [BUG 406]',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request (Không chấp nhận 406 Not Acceptable)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status, 'Backend KHÔNG ĐƯỢC trả về 406 Not Acceptable').not.toBe(406);
    expect([400, 422], 'Kỳ vọng mã lỗi chuẩn REST là 400 Bad Request hoặc 422').toContain(res.status);
  });

  test('PHONGTHUY_006: Kiểm tra categoryCode không được truyền (Optional field) - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      birth: config.geomancyBirth || '2026-10-13T17:00:00.000Z',
      gender: config.geomancyGender ?? 0,
      direction: config.geomancyDirection || 'Bắc',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'PHONGTHUY-06',
      testName: 'Kiểm tra categoryCode không được truyền (Optional field)',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (Do categoryCode là trường tùy chọn)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    // categoryCode là trường không bắt buộc, API xử lý thành công
    expect(res.status).toBe(200);
    expect(res.data?.data).toBeDefined();
    expect(res.data?.data).toHaveProperty('yearName');
  });

  test('PHONGTHUY_007: Kiểm tra categoryCode không tồn tại (Backend không lọc danh mục) - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      birth: config.geomancyBirth || '2026-10-13T17:00:00.000Z',
      gender: config.geomancyGender ?? 0,
      direction: config.geomancyDirection || 'Bắc',
      categoryCode: 'INVALID_CODE',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'PHONGTHUY-07',
      testName: 'Kiểm tra categoryCode không tồn tại',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (Backend hiện bỏ qua categoryCode không hợp lệ)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data?.data).toBeDefined();
  });

  test('PHONGTHUY_008: Kiểm tra gender là null - [PHÁT HIỆN BUG BACKEND 406 (Kỳ vọng 400 Bad Request)]', async ({ page }, testInfo) => {
    const payload = {
      birth: config.geomancyBirth || '2026-10-13T17:00:00.000Z',
      gender: null,
      direction: config.geomancyDirection || 'Bắc',
      categoryCode: config.geomancyCategoryCode || 'BDS00035',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'PHONGTHUY-08',
      testName: 'Kiểm tra gender là null [BUG 406]',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request (Không chấp nhận 406 Not Acceptable)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status, 'Backend KHÔNG ĐƯỢC trả về 406 Not Acceptable').not.toBe(406);
    expect([400, 422], 'Kỳ vọng mã lỗi chuẩn REST là 400 Bad Request hoặc 422').toContain(res.status);
  });

  // =========================================================================
  // 3. KIỂM TRA BẢO MẬT & CONTRACT HEADER/METHOD
  // =========================================================================
  test('PHONGTHUY_009: Kiểm tra Public API (không cần gửi Authentication Token) - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      birth: config.geomancyBirth || '2026-10-13T17:00:00.000Z',
      gender: config.geomancyGender ?? 0,
      direction: config.geomancyDirection || 'Bắc',
      categoryCode: config.geomancyCategoryCode || 'BDS00035',
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
      testId: 'PHONGTHUY-09',
      testName: 'Kiểm tra Public API không cần Authentication Token',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (2xx)',
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

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.data?.status).toBe(1);
  });

  test('PHONGTHUY_010: Từ chối HTTP Method GET trên endpoint POST - 405 Method Not Allowed / 4xx', async ({ page }, testInfo) => {
    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'PHONGTHUY-10',
      testName: 'Từ chối HTTP Method GET trên endpoint geomancy search',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'GET',
      expectedStatus: '405 Method Not Allowed hoặc 4xx',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBeLessThan(500);
    expect([400, 401, 404, 405, 406]).toContain(res.status);
  });
});
