import { test, expect } from '@playwright/test';
import { LandBaseApiClient } from '../api-client';
import { recordApiEvidence } from '../api-evidence';

test.describe('Bảng giá đất - 03. Tìm kiếm giá đất (/api/v1.0/category/public/land-assess-prices/search)', () => {
  const client = new LandBaseApiClient();
  const config = client.getConfig();
  const ENDPOINT = '/api/v1.0/category/public/land-assess-prices/search';

  test.beforeEach(async ({ page }) => {
    await page.goto(config.webappUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  // =========================================================================
  // 1. TÌM KIẾM PAYLOAD HỢP LỆ & NGHIỆP VỤ (VAL-01, 07, 12, 13, 18, 20, 21, 24, BUS-01, 02)
  // =========================================================================
  test('PRICE_SEARCH_001: Tìm kiếm với payload hợp lệ đầy đủ (VAL-01 & BUS-01)', async ({ page }, testInfo) => {
    const payload = {
      year: 2026,
      codeProvince: '01',
      codeWard: null,
      codeType: null,
      fullTextSearch: '',
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'VAL-01 & BUS-01',
      testName: 'Tìm kiếm với payload hợp lệ theo Tỉnh/Thành phố Hà Nội (codeProvince=01)',
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
    expect(body).toHaveProperty('data');
    const data = body.data;

    // data.content là danh sách các tuyến đường / giá đất
    expect(data).toHaveProperty('content');
    expect(Array.isArray(data.content)).toBeTruthy();
    expect(data.content.length).toBeGreaterThan(0);

    // Kiểm tra cấu trúc bản ghi giá đất
    const item = data.content[0];
    expect(item).toHaveProperty('road');
    expect(item).toHaveProperty('ward');
  });

  test('PRICE_SEARCH_002: Tìm kiếm theo Phường/Xã cụ thể (VAL-13 & BUS-02)', async ({ page }, testInfo) => {
    const wardCode = config.validWardCode || '09552';
    const payload = {
      year: 2026,
      codeProvince: '01',
      codeWard: wardCode,
      codeType: null,
      fullTextSearch: '',
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'VAL-13 & BUS-02',
      testName: `Tìm kiếm giá đất theo Phường Kiến Hưng (codeWard=${wardCode})`,
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.data?.data?.content)).toBeTruthy();
  });

  test('PRICE_SEARCH_003: Tìm kiếm theo từ khóa tên đường (fullTextSearch="Nguyễn Trãi" - VAL-20)', async ({ page }, testInfo) => {
    const keyword = config.searchKeyword || 'Nguyễn Trãi';
    const payload = {
      year: 2026,
      codeProvince: '01',
      codeWard: null,
      codeType: null,
      fullTextSearch: keyword,
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'VAL-20 & BUS-06',
      testName: `Tìm kiếm theo từ khóa "${keyword}"`,
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const content = res.data?.data?.content || [];
    expect(Array.isArray(content)).toBeTruthy();
  });

  // =========================================================================
  // 2. VALIDATION ĐẦU VÀO (VAL-02, 03, 04, 08, 09, 22, 26)
  // =========================================================================
  test('PRICE_SEARCH_004: Kiểm tra xử lý an toàn khi thiếu hoặc null trường year (VAL-02 & VAL-03)', async ({ page }, testInfo) => {
    const payload = {
      year: null,
      codeProvince: '01',
      codeWard: null,
      codeType: null,
      fullTextSearch: '',
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'VAL-02 & VAL-03',
      testName: 'Kiểm tra khi year=null hoặc thiếu year (Xử lý an toàn theo Postman contract)',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request / 200 OK (Mặc định năm/an toàn < 500)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    // Theo Postman script: pm.expect(pm.response.code).to.be.below(500)
    expect(res.status).toBeLessThan(500);
    expect([200, 400, 422, 406]).toContain(res.status);
  });

  test('PRICE_SEARCH_005: Chặn request khi year sai kiểu dữ liệu (year="ABC" - VAL-04)', async ({ page }, testInfo) => {
    const payload = {
      year: 'ABC',
      codeProvince: '01',
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'VAL-04',
      testName: 'Kiểm tra khi year="ABC" (sai kiểu dữ liệu)',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request / 4xx',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([400, 422, 406]).toContain(res.status);
  });

  test('PRICE_SEARCH_006: Kiểm tra xử lý an toàn khi thiếu hoặc null codeProvince (VAL-08 & VAL-09)', async ({ page }, testInfo) => {
    const payload = {
      year: 2026,
      codeProvince: null,
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'VAL-08 & VAL-09',
      testName: 'Kiểm tra khi codeProvince=null (Xử lý an toàn theo Postman contract)',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request / 200 OK (Toàn quốc/an toàn < 500)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    // Theo Postman script: pm.expect(pm.response.code).to.be.below(500)
    expect(res.status).toBeLessThan(500);
    expect([200, 400, 422, 406]).toContain(res.status);
  });

  // =========================================================================
  // 3. PHÂN TRANG (PAG-01, PAG-02, PAG-04)
  // =========================================================================
  test('PRICE_SEARCH_007: Kiểm tra phân trang và chuyển sang trang kế tiếp (page=1, size=10 - PAG-02)', async ({ page }, testInfo) => {
    const payload = {
      year: 2026,
      codeProvince: '01',
      codeWard: null,
      codeType: null,
      fullTextSearch: '',
      page: 1,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'PAG-02',
      testName: 'Kiểm tra chuyển sang trang tiếp theo (page=1)',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (page=1)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const d = res.data?.data;
    expect(d.number).toBe(1);
    expect(d.content.length).toBeLessThanOrEqual(10);
  });

  test('PRICE_SEARCH_008: Kiểm tra giới hạn số bản ghi theo size (size=5 - PAG-04)', async ({ page }, testInfo) => {
    const payload = {
      year: 2026,
      codeProvince: '01',
      page: 0,
      size: 5,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'PAG-04',
      testName: 'Kiểm tra thay đổi size (size=5)',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (size <= 5)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const d = res.data?.data;
    expect(d.size).toBe(5);
    expect(d.content.length).toBeLessThanOrEqual(5);
  });
});
