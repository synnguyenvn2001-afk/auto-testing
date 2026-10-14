import { test, expect } from '@playwright/test';
import { LandBaseApiClient } from '../api-client';
import { recordApiEvidence } from '../api-evidence';

test.describe('Bảng giá đất - 01. Danh sách tỉnh-phường (/api/v1.0/category/public/list-province)', () => {
  const client = new LandBaseApiClient();
  const config = client.getConfig();
  const ENDPOINT = '/api/v1.0/category/public/list-province';

  test.beforeEach(async ({ page }) => {
    await page.goto(config.webappUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  // =========================================================================
  // 1. LẤY DANH SÁCH PHƯỜNG/XÃ HỢP LỆ (API-01, 02, 03, 20)
  // =========================================================================
  test('API_01_001: Lấy danh sách phường/xã với version=2 và parentCode=01 (Hà Nội)', async ({ page }, testInfo) => {
    const query = '?version=2&parentCode=01';
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}${query}`,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-01',
      testName: 'Kiểm tra lấy danh sách phường/xã theo thành phố (version=2&parentCode=01)',
      endpoint: client.resolveUrl(`${ENDPOINT}${query}`),
      method: 'GET',
      expectedStatus: '200 OK (2xx)',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);

    const body = res.data;
    expect(body).toBeDefined();

    // Tìm danh sách trả về (nằm trong data hoặc mảng trực tiếp)
    const list = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : body?.data?.content);
    expect(Array.isArray(list), 'Response phải chứa danh sách mảng phường/xã').toBeTruthy();
    expect(list.length).toBeGreaterThan(0);

    // Kiểm tra cấu trúc item phường/xã đầu tiên
    const firstItem = list[0];
    expect(firstItem).toHaveProperty('code');
    expect(typeof firstItem.code).toBe('string');
    expect(firstItem).toHaveProperty('name');
    expect(typeof firstItem.name).toBe('string');
    expect(firstItem).toHaveProperty('version', 2);
  });

  test('API_01_002: Kiểm tra cấu trúc dữ liệu JSON và Content-Type', async ({ page }, testInfo) => {
    const query = '?version=2&parentCode=01';
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}${query}`,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-02 & API-28',
      testName: 'Kiểm tra response JSON hợp lệ và Content-Type',
      endpoint: client.resolveUrl(`${ENDPOINT}${query}`),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/i);
    expect(typeof res.data).toBe('object');
  });

  // =========================================================================
  // 2. KHÔNG TRUYỀN HOẶC TRUYỀN THIẾU PARENT CODE (API-04, 05, 06, 11)
  // =========================================================================
  test('API_01_004: Kiểm tra khi không truyền parentCode (trả về danh sách tỉnh/thành)', async ({ page }, testInfo) => {
    const query = '?version=2';
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}${query}`,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-04',
      testName: 'Kiểm tra khi không truyền parentCode',
      endpoint: client.resolveUrl(`${ENDPOINT}${query}`),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const list = Array.isArray(res.data?.data) ? res.data.data : res.data;
    expect(Array.isArray(list)).toBeTruthy();
  });

  test('API_01_005: Kiểm tra khi parentCode để trống (version=2&parentCode=)', async ({ page }, testInfo) => {
    const query = '?version=2&parentCode=';
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}${query}`,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-05',
      testName: 'Kiểm tra khi parentCode để trống',
      endpoint: client.resolveUrl(`${ENDPOINT}${query}`),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
  });

  test('API_01_006: Kiểm tra khi parentCode không tồn tại (parentCode=999999)', async ({ page }, testInfo) => {
    const query = '?version=2&parentCode=999999';
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}${query}`,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-06',
      testName: 'Kiểm tra khi parentCode không tồn tại',
      endpoint: client.resolveUrl(`${ENDPOINT}${query}`),
      method: 'GET',
      expectedStatus: '200 OK (Danh sách rỗng)',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    expect(list).toHaveLength(0);
  });

  // =========================================================================
  // 3. KIỂM THỬ THAM SỐ KHÔNG HỢP LỆ (API-07 -> 19: KỲ VỌNG 400 Bad Request / 4xx)
  // =========================================================================
  test('API_01_007: Kiểm tra khi parentCode là chữ (parentCode=abc - Kỳ vọng 200 rỗng hoặc 400 Bad Request)', async ({ page }, testInfo) => {
    const query = '?version=2&parentCode=abc';
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}${query}`,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-07',
      testName: 'Kiểm tra khi parentCode không hợp lệ (parentCode=abc)',
      endpoint: client.resolveUrl(`${ENDPOINT}${query}`),
      method: 'GET',
      expectedStatus: '200 OK (Danh sách rỗng) / 400 Bad Request',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([200, 400, 422]).toContain(res.status);
    if (res.status === 200) {
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      expect(list).toHaveLength(0);
    }
  });

  test('API_01_008: Kiểm tra khi parentCode có ký tự đặc biệt (@#$)', async ({ page }, testInfo) => {
    const query = '?version=2&parentCode=%40%23%24';
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}${query}`,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-08',
      testName: 'Kiểm tra khi parentCode có ký tự đặc biệt (@#$)',
      endpoint: client.resolveUrl(`${ENDPOINT}${query}`),
      method: 'GET',
      expectedStatus: '200 OK (Danh sách rỗng) / 400 Bad Request',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([200, 400, 422]).toContain(res.status);
    if (res.status === 200) {
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      expect(list).toHaveLength(0);
    }
  });

  test('API_01_010: Kiểm tra khi parentCode là số âm (-1)', async ({ page }, testInfo) => {
    const query = '?version=2&parentCode=-1';
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}${query}`,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-10',
      testName: 'Kiểm tra khi parentCode là số âm (-1)',
      endpoint: client.resolveUrl(`${ENDPOINT}${query}`),
      method: 'GET',
      expectedStatus: '200 OK (Danh sách rỗng) / 400 Bad Request',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([200, 400, 422]).toContain(res.status);
    if (res.status === 200) {
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      expect(list).toHaveLength(0);
    }
  });

  test('API_01_015: Kiểm tra khi không truyền version (Kỳ vọng 400 Bad Request)', async ({ page }, testInfo) => {
    const query = '?parentCode=01';
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}${query}`,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-15',
      testName: 'Kiểm tra khi không truyền version',
      endpoint: client.resolveUrl(`${ENDPOINT}${query}`),
      method: 'GET',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([400, 422]).toContain(res.status);
  });

  test('API_01_017: Kiểm tra khi version sai định dạng (version=abc - Kỳ vọng 400 Bad Request)', async ({ page }, testInfo) => {
    const query = '?version=abc&parentCode=01';
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}${query}`,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-17',
      testName: 'Kiểm tra khi version không hợp lệ (version=abc)',
      endpoint: client.resolveUrl(`${ENDPOINT}${query}`),
      method: 'GET',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect([400, 422]).toContain(res.status);
  });

  // =========================================================================
  // 4. KIỂM THỬ TÍNH TOÀN VẸN & BẢO MẬT (API-24, 26, 29, 30, 31)
  // =========================================================================
  test('API_01_024: Kiểm tra API là Public (không cần gửi kèm Authentication Token)', async ({ page }, testInfo) => {
    const query = '?version=2&parentCode=01';
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}${query}`,
      method: 'GET',
      overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-24',
      testName: 'Kiểm tra API Public không yêu cầu đăng nhập',
      endpoint: client.resolveUrl(`${ENDPOINT}${query}`),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
  });

  test('API_01_026: Từ chối HTTP Method POST trên endpoint chỉ hỗ trợ GET (405/4xx)', async ({ page }, testInfo) => {
    const query = '?version=2&parentCode=01';
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}${query}`,
      method: 'POST',
      body: {},
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-26',
      testName: 'Từ chối HTTP Method POST',
      endpoint: client.resolveUrl(`${ENDPOINT}${query}`),
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

  test('API_01_029: Kiểm tra danh sách không bị trùng mã phường/xã', async ({ page }, testInfo) => {
    const query = '?version=2&parentCode=01';
    const res = await client.executeInPage(page, {
      endpoint: `${ENDPOINT}${query}`,
      method: 'GET',
    });

    const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    const codes = list.map((item: any) => item.code);

    await recordApiEvidence(page, testInfo, {
      testId: 'API-29',
      testName: 'Kiểm tra không trùng code phường/xã',
      endpoint: client.resolveUrl(`${ENDPOINT}${query}`),
      method: 'GET',
      expectedStatus: `Duy nhất (${codes.length} mã không trùng)`,
      actualStatus: res.status,
      responseHeaders: res.headers,
      responseBody: { totalCodes: codes.length, uniqueCodes: new Set(codes).size },
    });

    expect(new Set(codes).size).toBe(codes.length);
  });
});
