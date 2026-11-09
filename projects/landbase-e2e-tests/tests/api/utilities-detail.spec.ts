import { test, expect } from '@playwright/test';
import { LandBaseApiClient } from './api-client';
import { recordApiEvidence } from './api-evidence';

test.describe('LandBase API Gateway - Tiện ích và dịch vụ quanh khu vực (/utilities-detail)', () => {
  const client = new LandBaseApiClient();
  const config = client.getConfig();
  const ENDPOINT = '/api/v1.0/elasticsearch/public/service-facilities-user/utilities-detail';

  // Tọa độ tham chiếu chuẩn (Khu vực trung tâm Hà Nội có đầy đủ tiện ích)
  const defaultLat = 21.0112385;
  const defaultLng = 105.822485;

  test.beforeEach(async ({ page }) => {
    // Truy cập dev-webapp để thiết lập security context và origin
    await page.goto(config.webappUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  // =========================================================================
  // 1. NGHIỆP VỤ DANH MỤC TIỆN ÍCH (CATEGORIES HAPPY PATH)
  // =========================================================================

  test('UTILITY-CAT-01: Tra cứu tiện ích "Khu thương mại, giải trí" (BDS00057) - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
      page: 0,
      size: 10,
      realEstateId: null,
      tags: null,
    };
    const startTime = Date.now();

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });
    const durationMs = Date.now() - startTime;

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-CAT-01',
      testName: 'Tra cứu tiện ích Khu thương mại, giải trí',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
      durationMs,
    });

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.status).toBe(1);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.content).toBeInstanceOf(Array);
    expect(res.data.data.content.length).toBeGreaterThan(0);
    expect(res.data.data.content[0].categoryName).toBe('Khu thương mại, giải trí');
    expect(res.data.data.content[0].categoryCode).toBe('BDS00057');
  });

  test('UTILITY-CAT-02: Tra cứu tiện ích "Đường phố" (BDS00063) - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00063',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-CAT-02',
      testName: 'Tra cứu tiện ích Đường phố',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.status).toBe(1);
    expect(res.data.data.content.length).toBeGreaterThan(0);
    expect(res.data.data.content[0].categoryName).toBe('Đường phố');
  });

  test('UTILITY-CAT-03: Tra cứu tiện ích "Trường học" (BDS00052) - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00052',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-CAT-03',
      testName: 'Tra cứu tiện ích Trường học',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.status).toBe(1);
    expect(res.data.data.content.length).toBeGreaterThan(0);
    expect(res.data.data.content[0].categoryName).toBe('Trường học');
  });

  test('UTILITY-CAT-04: Tra cứu tiện ích "Cơ sở y tế" (BDS00054) - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00054',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-CAT-04',
      testName: 'Tra cứu tiện ích Cơ sở y tế',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.status).toBe(1);
    expect(res.data.data.content.length).toBeGreaterThan(0);
    expect(res.data.data.content[0].categoryName).toBe('Cơ sở y tế');
  });

  test('UTILITY-CAT-05: Tra cứu tiện ích "Ngân hàng" (BDS00060) - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00060',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-CAT-05',
      testName: 'Tra cứu tiện ích Ngân hàng',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.status).toBe(1);
    expect(res.data.data.content.length).toBeGreaterThan(0);
    expect(res.data.data.content[0].categoryName).toBe('Ngân hàng');
  });

  test('UTILITY-CAT-06: Tra cứu tiện ích "Cơ sở lưu trú" (BDS00058) - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00058',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-CAT-06',
      testName: 'Tra cứu tiện ích Cơ sở lưu trú',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.status).toBe(1);
    expect(res.data.data.content.length).toBeGreaterThan(0);
    expect(res.data.data.content[0].categoryName).toBe('Cơ sở lưu trú');
  });

  // =========================================================================
  // 2. BỘ LỌC BÁN KÍNH (RADIUS FILTERING)
  // =========================================================================

  test('UTILITY-RAD-01: Lọc tiện ích bán kính 1 km (radius: 1) - Tọa độ <= 1.0 km', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 1,
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-RAD-01',
      testName: 'Lọc tiện ích bán kính 1 km',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const content = res.data.data.content;
    expect(content.length).toBeGreaterThan(0);
    // Kiểm tra tất cả địa điểm đều nằm trong phạm vi bán kính 1km
    for (const item of content) {
      expect(item.serviceFacilitiesUserDetailVo.distance).toBeLessThanOrEqual(1.0);
    }
  });

  test('UTILITY-RAD-02: Lọc tiện ích bán kính 3 km (radius: 3) - Khớp UI mặc định', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-RAD-02',
      testName: 'Lọc tiện ích bán kính 3 km',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const content = res.data.data.content;
    expect(content.length).toBeGreaterThan(0);
    for (const item of content) {
      expect(item.serviceFacilitiesUserDetailVo.distance).toBeLessThanOrEqual(3.0);
    }
  });

  test('UTILITY-RAD-03: Mở rộng bán kính lên 5 km (radius: 5) - Tổng số lượng tăng dần', async ({ page }, testInfo) => {
    const payload1 = { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 1, page: 0, size: 1 };
    const payload5 = { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 5, page: 0, size: 1 };

    const res1 = await client.executeInPage(page, { endpoint: ENDPOINT, method: 'POST', body: payload1 });
    const res5 = await client.executeInPage(page, { endpoint: ENDPOINT, method: 'POST', body: payload5 });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-RAD-03',
      testName: 'Mở rộng bán kính lên 5 km',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (Elements 5km >= 1km)',
      actualStatus: res5.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload5 }),
      requestBody: payload5,
      responseHeaders: res5.headers,
      responseBody: res5.data,
    });

    expect(res5.status).toBe(200);
    expect(res5.data.data.totalElements).toBeGreaterThanOrEqual(res1.data.data.totalElements);
  });

  // =========================================================================
  // 3. SẮP XẾP & CẤU TRÚC CHI TIẾT POI (SORTING & DATA CONTRACT)
  // =========================================================================

  test('UTILITY-DATA-01: Kiểm tra danh sách được sắp xếp từ gần đến xa (distance tăng dần)', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-DATA-01',
      testName: 'Kiểm tra danh sách sắp xếp khoảng cách từ gần đến xa',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const content = res.data.data.content;
    expect(content.length).toBeGreaterThan(1);

    for (let i = 0; i < content.length - 1; i++) {
      const d1 = content[i].serviceFacilitiesUserDetailVo.distance;
      const d2 = content[i + 1].serviceFacilitiesUserDetailVo.distance;
      expect(d1, `Khoảng cách vị trí ${i} (${d1}km) phải <= vị trí ${i + 1} (${d2}km)`).toBeLessThanOrEqual(d2);
    }
  });

  test('UTILITY-DATA-02: Kiểm tra cấu trúc trường chi tiết serviceFacilitiesUserDetailVo', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
      page: 0,
      size: 5,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-DATA-02',
      testName: 'Kiểm tra cấu trúc trường chi tiết serviceFacilitiesUserDetailVo',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const firstItem = res.data.data.content[0];
    expect(firstItem).toHaveProperty('id');
    expect(firstItem).toHaveProperty('categoryName');
    expect(firstItem).toHaveProperty('categoryCode');

    const vo = firstItem.serviceFacilitiesUserDetailVo;
    expect(vo).toBeDefined();
    expect(vo).toHaveProperty('name');
    expect(typeof vo.name).toBe('string');
    expect(vo.name.trim().length).toBeGreaterThan(0);
    expect(vo).toHaveProperty('distance');
    expect(typeof vo.distance).toBe('number');
    expect(vo.distance).toBeGreaterThanOrEqual(0);
    expect(vo).toHaveProperty('travelTime');
    expect(typeof vo.travelTime).toBe('number');
    expect(vo).toHaveProperty('latitude');
    expect(typeof vo.latitude).toBe('number');
    expect(vo).toHaveProperty('longitude');
    expect(typeof vo.longitude).toBe('number');
  });

  // =========================================================================
  // 4. PHÂN TRANG (PAGINATION)
  // =========================================================================

  test('UTILITY-PAGE-01: Kiểm tra phân trang trang đầu (page: 0, size: 6) - Cấu trúc phân trang chuẩn', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
      page: 0,
      size: 6,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-PAGE-01',
      testName: 'Kiểm tra phân trang trang đầu',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    const data = res.data.data;
    expect(data.number).toBe(0);
    expect(data.size).toBe(6);
    expect(data.first).toBe(true);
    expect(data.hasContent).toBe(true);
    expect(data.numberOfElements).toBeLessThanOrEqual(6);
  });

  test('UTILITY-PAGE-02: Kiểm tra chuyển sang trang kế tiếp (page: 1) - Không trùng lặp id trang trước', async ({ page }, testInfo) => {
    const payload0 = { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 5 };
    const payload1 = { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 1, size: 5 };

    const res0 = await client.executeInPage(page, { endpoint: ENDPOINT, method: 'POST', body: payload0 });
    const res1 = await client.executeInPage(page, { endpoint: ENDPOINT, method: 'POST', body: payload1 });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-PAGE-02',
      testName: 'Kiểm tra chuyển sang trang kế tiếp',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res1.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload1 }),
      requestBody: payload1,
      responseHeaders: res1.headers,
      responseBody: res1.data,
    });

    expect(res1.status).toBe(200);
    expect(res1.data.data.number).toBe(1);

    const ids0 = res0.data.data.content.map((i: any) => i.id);
    const ids1 = res1.data.data.content.map((i: any) => i.id);
    const intersection = ids0.filter((id: string) => ids1.includes(id));
    expect(intersection.length, 'Không được có phần tử trùng lặp giữa 2 trang').toBe(0);
  });

  // =========================================================================
  // 5. VALIDATION & ERROR HANDLING (HTTP 400 / 401)
  // =========================================================================

  test('UTILITY-VAL-01: Kiểm tra khi thiếu trường categoryCode - 400 Bad Request', async ({ page }, testInfo) => {
    const payload = {
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-VAL-01',
      testName: 'Kiểm tra khi thiếu trường categoryCode',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('message');
    expect(res.data.message).toContain('Danh mục không được bỏ trống');
  });

  test('UTILITY-VAL-02: Kiểm tra khi body rỗng {} - 400 Bad Request', async ({ page }, testInfo) => {
    const payload = {};

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-VAL-02',
      testName: 'Kiểm tra khi body rỗng {}',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data.message).toContain('Danh mục không được bỏ trống');
  });

  test('UTILITY-VAL-03: Kiểm tra với categoryCode rỗng ("") - 400 Bad Request', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: '',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-VAL-03',
      testName: 'Kiểm tra với categoryCode rỗng',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data.message).toContain('Danh mục không được bỏ trống');
  });

  test('UTILITY-VAL-04: Kiểm tra với categoryCode không tồn tại - Trả về mảng rỗng không lỗi', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS99999',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
      page: 0,
      size: 10,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-VAL-04',
      testName: 'Kiểm tra với categoryCode không tồn tại',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (Empty list)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.data.content).toEqual([]);
    expect(res.data.data.totalElements).toBe(0);
  });

  // =========================================================================
  // 6. CÁC CASE CỐ TÌNH SAI (NEGATIVE, FAULT INJECTION & SECURITY)
  // =========================================================================

  test('UTILITY-NEG-01: Cố tình truyền categoryCode là null - 400 Bad Request', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: null,
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-NEG-01',
      testName: 'Cố tình truyền categoryCode là null',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data.message).toContain('Danh mục không được bỏ trống');
  });

  test('UTILITY-NEG-02: Cố tình truyền categoryCode chỉ gồm khoảng trắng ("   ") - 400 Bad Request', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: '   ',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-NEG-02',
      testName: 'Cố tình truyền categoryCode chỉ gồm khoảng trắng',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data.message).toContain('Danh mục không được bỏ trống');
  });

  test('UTILITY-NEG-03: Cố tình truyền kích thước trang size: 101 (vượt giới hạn 100) - 400 Bad Request', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
      page: 0,
      size: 101,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-NEG-03',
      testName: 'Cố tình truyền size: 101 vượt giới hạn tối đa của hệ thống',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data.message).toContain('max.size.of.page.is.100');
  });

  test('UTILITY-NEG-04: Cố tình truyền latitude là chuỗi chữ cái (latitude: "abc") - 406 Not Acceptable', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: 'abc',
      longitude: defaultLng,
      radius: 3,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-NEG-04',
      testName: 'Cố tình truyền latitude là chuỗi chữ cái',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '406 Not Acceptable',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(406);
    expect(res.data.status).toBe(0);
  });

  test('UTILITY-NEG-05: Cố tình truyền longitude là chuỗi chữ cái (longitude: "xyz") - 406 Not Acceptable', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: defaultLat,
      longitude: 'xyz',
      radius: 3,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-NEG-05',
      testName: 'Cố tình truyền longitude là chuỗi chữ cái',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '406 Not Acceptable',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(406);
    expect(res.data.status).toBe(0);
  });

  test('UTILITY-NEG-06: Cố tình truyền latitude vượt miền tọa độ địa lý (latitude: 999) - 406 Not Acceptable', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: 999,
      longitude: defaultLng,
      radius: 3,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-NEG-06',
      testName: 'Cố tình truyền latitude vượt miền địa lý',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '406 Not Acceptable',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(406);
  });

  test('UTILITY-NEG-07: Cố tình truyền longitude vượt miền tọa độ địa lý (longitude: 999) - 406 Not Acceptable', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: defaultLat,
      longitude: 999,
      radius: 3,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-NEG-07',
      testName: 'Cố tình truyền longitude vượt miền địa lý',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '406 Not Acceptable',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(406);
  });

  test('UTILITY-NEG-08: Cố tình truyền bán kính âm (radius: -5) - 406 Not Acceptable', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: -5,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-NEG-08',
      testName: 'Cố tình truyền bán kính âm',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '406 Not Acceptable',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(406);
  });

  test('UTILITY-NEG-09: Cố tình truyền bán kính bằng 0 (radius: 0) - 406 Not Acceptable', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 0,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-NEG-09',
      testName: 'Cố tình truyền bán kính bằng 0',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '406 Not Acceptable',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(406);
  });

  test('UTILITY-NEG-10: Cố tình truyền radius là chuỗi chữ cái (radius: "abc") - 406 Not Acceptable', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 'abc',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-NEG-10',
      testName: 'Cố tình truyền radius là chuỗi chữ cái',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '406 Not Acceptable',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(406);
  });

  test('UTILITY-SEC-01: Cố tình tấn công SQL Injection vào categoryCode - Hệ thống an toàn không bị lỗi DB', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: "BDS00057' OR '1'='1",
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-SEC-01',
      testName: 'Cố tình tấn công SQL Injection vào categoryCode',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (Safe no SQL error)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.status).toBe(1);
    expect(res.data.data).toBeDefined();
  });

  test('UTILITY-SEC-02: Cố tình chèn mã độc XSS Script vào categoryCode - Không bị phản xạ/thực thi', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: '<script>alert("xss")</script>',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-SEC-02',
      testName: 'Cố tình chèn mã độc XSS Script vào categoryCode',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (Safe empty content)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(200);
    expect(res.data.data.content).toEqual([]);
  });

  test('UTILITY-SEC-03: Cố tình gửi Body dạng mảng JSON [{...}] thay vì Object - 406 Not Acceptable', async ({ page }, testInfo) => {
    const payload = [
      {
        categoryCode: 'BDS00057',
        latitude: defaultLat,
        longitude: defaultLng,
        radius: 3,
      },
    ];

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-SEC-03',
      testName: 'Cố tình gửi Body dạng mảng JSON',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '406 Not Acceptable',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    expect(res.status).toBe(406);
  });

  test('UTILITY-METH-01: Cố tình gọi phương thức GET vào endpoint POST - Từ chối không cho phép', async ({ page }, testInfo) => {
    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-METH-01',
      testName: 'Cố tình gọi phương thức GET',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'GET',
      expectedStatus: '401 hoặc 405',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'GET' }),
      responseHeaders: res.headers,
      responseBody: res.data,
    });

    // Endpoint POST từ chối GET với 401 hoặc 405
    expect([401, 405]).toContain(res.status);
  });

  test('UTILITY-PERF-01: Kiểm tra thời gian phản hồi API Elasticsearch SLA (< 3500ms)', async ({ page }, testInfo) => {
    const payload = {
      categoryCode: 'BDS00057',
      latitude: defaultLat,
      longitude: defaultLng,
      radius: 3,
      page: 0,
      size: 10,
    };
    const startTime = Date.now();

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });
    const durationMs = Date.now() - startTime;

    await recordApiEvidence(page, testInfo, {
      testId: 'UTILITY-PERF-01',
      testName: 'Kiểm tra thời gian phản hồi API Elasticsearch SLA',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (< 3500ms)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, method: 'POST', body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data,
      durationMs,
    });

    expect(res.status).toBe(200);
    expect(durationMs).toBeLessThan(3500);
    expect(res.data.duration).toBeLessThan(1000);
  });
});
