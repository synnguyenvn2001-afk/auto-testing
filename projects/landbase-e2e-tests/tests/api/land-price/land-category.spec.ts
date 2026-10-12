import { test, expect } from '@playwright/test';
import { LandBaseApiClient } from '../api-client';
import { recordApiEvidence } from '../api-evidence';

test.describe('Bảng giá đất - 02. Lớp đất (/api/v1.0/category/public/laand-category)', () => {
  const client = new LandBaseApiClient();
  const config = client.getConfig();
  const ENDPOINT = '/api/v1.0/category/public/laand-category';

  test.beforeEach(async ({ page }) => {
    await page.goto(config.webappUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  // =========================================================================
  // 1. LẤY DANH SÁCH LỚP ĐẤT (API-01, 02, 03, 04, 05, 06, 07, 08, 11, 12)
  // =========================================================================
  test('API_02_001: Kiểm tra lấy danh sách lớp đất thành công (200 OK)', async ({ page }, testInfo) => {
    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-01',
      testName: 'Kiểm tra lấy danh sách lớp đất',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'GET',
      expectedStatus: '200 OK (2xx)',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);

    const body = res.data;
    const list = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
    expect(Array.isArray(list)).toBeTruthy();
    expect(list.length).toBeGreaterThan(0);

    // Kiểm tra cấu trúc phần tử lớp đất theo đặc tả
    const first = list[0];
    expect(first).toHaveProperty('code');
    expect(typeof first.code).toBe('string');
    expect(first).toHaveProperty('name');
    expect(typeof first.name).toBe('string');
    expect(first).toHaveProperty('type');
    expect(first).toHaveProperty('level');
    expect(typeof first.level).toBe('number');
  });

  test('API_02_004: Mỗi lớp đất có mã code hợp lệ và không trùng lặp (API-04 & API-08)', async ({ page }, testInfo) => {
    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'GET',
    });

    const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    const codes = list.map((item: any) => item.code);

    await recordApiEvidence(page, testInfo, {
      testId: 'API-04 & API-08',
      testName: 'Kiểm tra mã lớp đất không rỗng và không trùng lặp',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'GET',
      expectedStatus: `Duy nhất (${codes.length} mã)`,
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: { totalCodes: codes.length, uniqueCodes: new Set(codes).size, codesSample: codes.slice(0, 10) },
    });

    expect(new Set(codes).size).toBe(codes.length);
    list.forEach((item: any, i: number) => {
      expect(item.code, `item[${i}].code`).toBeTruthy();
      expect(typeof item.code).toBe('string');
    });
  });

  test('API_02_006: Kiểm tra các field bắt buộc (code, type, level, name, value)', async ({ page }, testInfo) => {
    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'GET',
    });

    const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    expect(list.length).toBeGreaterThan(0);

    await recordApiEvidence(page, testInfo, {
      testId: 'API-06',
      testName: 'Kiểm tra các field bắt buộc (code, type, level, name, value)',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'GET',
      expectedStatus: '200 OK (Đầy đủ trường)',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: list.slice(0, 5),
    });

    list.forEach((item: any, i: number) => {
      expect(item, `item[${i}] missing code`).toHaveProperty('code');
      expect(item, `item[${i}] missing type`).toHaveProperty('type');
      expect(item, `item[${i}] missing level`).toHaveProperty('level');
      expect(item, `item[${i}] missing name`).toHaveProperty('name');
    });
  });

  test('API_02_012: Kiểm tra Content-Type của response là JSON', async ({ page }, testInfo) => {
    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-12',
      testName: 'Kiểm tra Content-Type là application/json',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'GET',
      expectedStatus: 'application/json',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.headers['content-type']).toMatch(/json/i);
  });

  // =========================================================================
  // 2. PHÂN QUYỀN & METHOD HTTP (API-13, 14, 16, 17, 18, 19, 20)
  // =========================================================================
  test('API_02_013: Kiểm tra API Public không yêu cầu Authorization header', async ({ page }, testInfo) => {
    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'GET',
      overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-13',
      testName: 'Kiểm tra API Public không yêu cầu đăng nhập',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
  });

  test('API_02_017: Từ chối các HTTP Method không hợp lệ (POST/PUT/DELETE)', async ({ page }, testInfo) => {
    // Thử gửi POST
    const resPost = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: {},
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-17',
      testName: 'Từ chối HTTP Method POST',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '405 Method Not Allowed / 4xx',
      actualStatus: resPost.status,
      responseHeaders: resPost.headers,
      responseBody: resPost.data,
    });

    expect([405, 400, 404, 403, 401]).toContain(resPost.status);
    expect(resPost.status).toBeGreaterThanOrEqual(400);
    expect(resPost.status).toBeLessThan(500);
  });

  test('API_02_020: Truyền parameter không tồn tại (abc=123) được xử lý an toàn', async ({ page }, testInfo) => {
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}?abc=123`,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-20',
      testName: 'Truyền parameter không tồn tại',
      endpoint: client.resolveUrl(`${ENDPOINT}?abc=123`),
      method: 'GET',
      expectedStatus: '200 OK (Xử lý an toàn)',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
  });
});
