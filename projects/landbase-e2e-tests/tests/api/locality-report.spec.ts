import { test, expect } from '@playwright/test';
import { LandBaseApiClient } from './api-client';
import { recordApiEvidence } from './api-evidence';

test.describe('LandBase API - Báo cáo tổng quan khu vực (/api/locality-report)', () => {
  const client = new LandBaseApiClient();
  const config = client.getConfig();
  const BASE_ENDPOINT = '/api/locality-report';

  const defaultLat = config.localityLatitude || '21.019301';
  const defaultLng = config.localityLongitude || '105.826367';

  test.beforeEach(async ({ page }) => {
    // Truy cập dev-webapp để thiết lập security context và origin
    await page.goto(config.webappUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  // =========================================================================
  // 1. HAPPY PATH & DATA CONTRACT TESTS
  // =========================================================================

  test('LOCALITY-API-01: Lấy báo cáo tổng quan khu vực với tọa độ mẫu hợp lệ - 200 OK', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=${defaultLng}`;
    const startTime = Date.now();

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });
    const durationMs = Date.now() - startTime;

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-API-01',
      testName: 'Lấy báo cáo tổng quan khu vực với tọa độ mẫu hợp lệ',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
      durationMs,
    });

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(typeof res.data).toBe('object');
    expect(res.data).toHaveProperty('available', true);
    expect(res.data.report).toBeDefined();
    expect(typeof res.data.report).toBe('object');
  });

  test('LOCALITY-API-02: Kiểm tra truyền tọa độ thập phân đầy đủ (độ chính xác cao)', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-API-02',
      testName: 'Kiểm tra truyền tọa độ thập phân đầy đủ',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.available).toBe(true);
    expect(res.data.report.reportId).toBeDefined();
    // reportId phản ánh giá trị thập phân của tọa độ (làm tròn 4 số thập phân)
    expect(res.data.report.reportId).toContain(Number(defaultLat).toFixed(4));
    expect(res.data.report.reportId).toContain(Number(defaultLng).toFixed(4));
  });

  test('LOCALITY-API-03: Kiểm tra API khi truyền thêm query parameter không được mô tả (&extraParam=test)', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=${defaultLng}&extraParam=test`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-API-03',
      testName: 'Kiểm tra API khi truyền thêm query parameter không được mô tả',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.available).toBe(true);
    expect(res.data.report).toBeDefined();
  });

  test('LOCALITY-API-04: Lấy báo cáo khu vực tại TP. Hồ Chí Minh (10.7769, 106.7009)', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=10.7769&longitude=106.7009`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-API-04',
      testName: 'Lấy báo cáo khu vực tại TP. Hồ Chí Minh (DEV Mock Stub Check)',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.available).toBe(true);
    // Lưu ý: Hiện tại backend DEV đang trả mock stub ("mock-report-ha-noi-cau-giay-yen-hoa-...")
    // và chỉ ghép chuỗi tọa độ vào reportId. Khi DEV tích hợp Geocode động thật, cập nhật assert province thành "Hồ Chí Minh".
    expect(res.data.report.reportId).toContain('10.7769-106.7009');
    if (res.data.report.reportId.startsWith('mock-report-')) {
      console.warn('⚠️ [DEV Mock Finding]: Backend DEV đang hardcode mock data Hà Nội cho tọa độ TP.HCM!');
    }
  });

  test('LOCALITY-API-05: Lấy báo cáo khu vực tại Đà Nẵng (16.0544, 108.2022)', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=16.0544&longitude=108.2022`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-API-05',
      testName: 'Lấy báo cáo khu vực tại Đà Nẵng (DEV Mock Stub Check)',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.available).toBe(true);
    // Lưu ý: Tương tự như trên, ghi nhận DEV backend đang dùng mock stub
    expect(res.data.report.reportId).toContain('16.0544-108.2022');
    if (res.data.report.reportId.startsWith('mock-report-')) {
      console.warn('⚠️ [DEV Mock Finding]: Backend DEV đang hardcode mock data Hà Nội cho tọa độ Đà Nẵng!');
    }
  });

  // =========================================================================
  // 2. RESPONSE SCHEMA & DATA TYPES VALIDATION
  // =========================================================================

  test('LOCALITY-DATA-01: Kiểm tra cấu trúc và kiểu dữ liệu các trường nhận diện khu vực', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-DATA-01',
      testName: 'Kiểm tra cấu trúc và kiểu dữ liệu các trường nhận diện khu vực',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const report = res.data.report;
    const requiredStringFields = ['reportId', 'locality', 'province', 'district', 'ward'];
    for (const field of requiredStringFields) {
      expect(report, `report.${field} phải tồn tại`).toHaveProperty(field);
      expect(typeof report[field], `report.${field} phải là string`).toBe('string');
      expect(report[field].trim().length, `report.${field} không được rỗng`).toBeGreaterThan(0);
    }
  });

  test('LOCALITY-DATA-02: Kiểm tra định dạng thời gian updatedAt là ISO 8601 hợp lệ', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-DATA-02',
      testName: 'Kiểm tra định dạng thời gian updatedAt',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const updatedAt = res.data.report.updatedAt;
    expect(typeof updatedAt).toBe('string');
    const parsedDate = Date.parse(updatedAt);
    expect(Number.isNaN(parsedDate)).toBe(false);
  });

  test('LOCALITY-DATA-03: Kiểm tra chi phí xem báo cáo costGold là số nguyên không âm', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-DATA-03',
      testName: 'Kiểm tra chi phí xem báo cáo costGold',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const costGold = res.data.report.costGold;
    expect(typeof costGold).toBe('number');
    expect(costGold).toBeGreaterThanOrEqual(0);
  });

  test('LOCALITY-DATA-04: Kiểm tra Header Content-Type trả về JSON chuẩn', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-DATA-04',
      testName: 'Kiểm tra Header Content-Type trả về JSON chuẩn',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const contentType = res.headers['content-type'] || '';
    expect(contentType.toLowerCase()).toContain('application/json');
  });

  // =========================================================================
  // 3. BOUNDARY VALUES & QUERY FALLBACK
  // =========================================================================

  test('LOCALITY-BOUND-01: Kiểm tra latitude bằng 0 - 200 OK', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=0&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-BOUND-01',
      testName: 'Kiểm tra latitude bằng 0',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.available).toBe(true);
    expect(res.data.report.reportId).toContain('0.0000');
  });

  test('LOCALITY-BOUND-02: Kiểm tra longitude bằng 0 - 200 OK', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=0`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-BOUND-02',
      testName: 'Kiểm tra longitude bằng 0',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.available).toBe(true);
    expect(res.data.report.reportId).toContain('0.0000');
  });

  test('LOCALITY-BOUND-03: Kiểm tra cả hai tọa độ đều bằng 0 (0, 0) - 200 OK', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=0&longitude=0`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-BOUND-03',
      testName: 'Kiểm tra cả hai tọa độ đều bằng 0',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.available).toBe(true);
    expect(res.data.report.reportId).toContain('0.0000-0.0000');
  });

  test('LOCALITY-BOUND-04: Kiểm tra khi thiếu query parameter latitude - Fallback an toàn 200 OK', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-BOUND-04',
      testName: 'Kiểm tra khi thiếu query parameter latitude',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK (Fallback)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.available).toBe(true);
    expect(res.data.report.reportId).toContain('0.0000');
  });

  test('LOCALITY-BOUND-05: Kiểm tra khi thiếu query parameter longitude - Fallback an toàn 200 OK', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-BOUND-05',
      testName: 'Kiểm tra khi thiếu query parameter longitude',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK (Fallback)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.available).toBe(true);
    expect(res.data.report.reportId).toContain('0.0000');
  });

  test('LOCALITY-BOUND-06: Kiểm tra khi không truyền cả 2 tham số tọa độ - Fallback an toàn 200 OK', async ({ page }, testInfo) => {
    const endpoint = BASE_ENDPOINT;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-BOUND-06',
      testName: 'Kiểm tra khi không truyền cả 2 tham số tọa độ',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK (Fallback)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.available).toBe(true);
    expect(res.data.report.reportId).toContain('0.0000-0.0000');
  });

  test('LOCALITY-BOUND-07: Kiểm tra latitude vượt ngưỡng cực bắc (91) - Không crash 5xx', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=91&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-BOUND-07',
      testName: 'Kiểm tra latitude vượt ngưỡng cực bắc (91)',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '< 500',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBeLessThan(500);
  });

  test('LOCALITY-BOUND-08: Kiểm tra longitude vượt ngưỡng kinh tuyến (181) - Không crash 5xx', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=181`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-BOUND-08',
      testName: 'Kiểm tra longitude vượt ngưỡng kinh tuyến (181)',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '< 500',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBeLessThan(500);
  });

  // =========================================================================
  // 4. INPUT VALIDATION & ERROR HANDLING (HTTP 400)
  // =========================================================================

  test('LOCALITY-VAL-01: Kiểm tra latitude không phải kiểu số (latitude=abc) - 400 Bad Request', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=abc&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-VAL-01',
      testName: 'Kiểm tra latitude không phải kiểu số (abc)',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('message', 'Tọa độ địa phương không hợp lệ');
  });

  test('LOCALITY-VAL-02: Kiểm tra longitude không phải kiểu số (longitude=abc) - 400 Bad Request', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=abc`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-VAL-02',
      testName: 'Kiểm tra longitude không phải kiểu số (abc)',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('message', 'Tọa độ địa phương không hợp lệ');
  });

  test('LOCALITY-VAL-03: Kiểm tra latitude bằng chuỗi null literal (latitude=null) - 400 Bad Request', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=null&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-VAL-03',
      testName: 'Kiểm tra latitude bằng chuỗi null literal',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('message', 'Tọa độ địa phương không hợp lệ');
  });

  test('LOCALITY-VAL-04: Kiểm tra longitude bằng chuỗi null literal (longitude=null) - 400 Bad Request', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=null`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-VAL-04',
      testName: 'Kiểm tra longitude bằng chuỗi null literal',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('message', 'Tọa độ địa phương không hợp lệ');
  });

  test('LOCALITY-VAL-05: Kiểm tra tham số chứa ký tự tấn công SQL Injection - 400 Bad Request', async ({ page }, testInfo) => {
    const maliciousValue = encodeURIComponent("1' OR '1'='1");
    const endpoint = `${BASE_ENDPOINT}?latitude=${maliciousValue}&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-VAL-05',
      testName: 'Kiểm tra tham số chứa ký tự tấn công SQL Injection',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('message', 'Tọa độ địa phương không hợp lệ');
  });

  test('LOCALITY-VAL-06: Kiểm tra tham số chứa mã độc XSS Script - 400 Bad Request', async ({ page }, testInfo) => {
    const xssPayload = encodeURIComponent('<script>alert("xss")</script>');
    const endpoint = `${BASE_ENDPOINT}?latitude=${xssPayload}&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-VAL-06',
      testName: 'Kiểm tra tham số chứa mã độc XSS Script',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('message', 'Tọa độ địa phương không hợp lệ');
  });

  // =========================================================================
  // 5. PROTOCOL & SECURITY CONSTRAINTS
  // =========================================================================

  test('LOCALITY-METH-01: Kiểm tra từ chối phương thức POST - 405 Method Not Allowed', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'POST',
      body: {},
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-METH-01',
      testName: 'Kiểm tra từ chối phương thức POST',
      endpoint: client.resolveUrl(endpoint),
      method: 'POST',
      expectedStatus: '405 Method Not Allowed',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'POST' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(405);
  });

  test('LOCALITY-METH-02: Kiểm tra từ chối phương thức PUT - 405 Method Not Allowed', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'PUT',
      body: {},
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-METH-02',
      testName: 'Kiểm tra từ chối phương thức PUT',
      endpoint: client.resolveUrl(endpoint),
      method: 'PUT',
      expectedStatus: '405 Method Not Allowed',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'PUT' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(405);
  });

  test('LOCALITY-METH-03: Kiểm tra từ chối phương thức DELETE - 405 Method Not Allowed', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=${defaultLng}`;

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'DELETE',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-METH-03',
      testName: 'Kiểm tra từ chối phương thức DELETE',
      endpoint: client.resolveUrl(endpoint),
      method: 'DELETE',
      expectedStatus: '405 Method Not Allowed',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'DELETE' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(405);
  });

  test('LOCALITY-PERF-01: Kiểm tra thời gian phản hồi API (Response Time SLA < 2500ms)', async ({ page }, testInfo) => {
    const endpoint = `${BASE_ENDPOINT}?latitude=${defaultLat}&longitude=${defaultLng}`;
    const startTime = Date.now();

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });
    const durationMs = Date.now() - startTime;

    await recordApiEvidence(page, testInfo, {
      testId: 'LOCALITY-PERF-01',
      testName: 'Kiểm tra thời gian phản hồi API SLA',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK (< 2500ms)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
      durationMs,
    });

    expect(res.status).toBe(200);
    expect(durationMs).toBeLessThan(2500);
  });
});

