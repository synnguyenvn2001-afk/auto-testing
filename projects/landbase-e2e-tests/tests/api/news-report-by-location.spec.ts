import { test, expect, TestInfo } from '@playwright/test';
import { LandBaseApiClient } from './api-client';
import { recordApiEvidence } from './api-evidence';

/**
 * Bộ kiểm thử tự động API: AI Tổng hợp Báo cáo theo Vị trí (Xem chi tiết BĐS)
 * Endpoint: POST https://dev-gateway.laand.vn/api/v1.0/real-estate/public/news/report-by-location
 *
 * Bao phủ toàn bộ 21 test cases từ Postman Collection `LandBase - AI tổng hợp báo cáo theo vị trí`
 * (ID: 840809b2-c675-439f-92e9-1c702d6c2a74) & bổ sung 9 test cases chuyên sâu (Schema, Unhappy, Security, SLA):
 *  - Nhóm 1 (01 - Happy path & Schema): REPORT-API-01, REPORT-API-02, REPORT-API-22, REPORT-API-23
 *  - Nhóm 2 (02 - Validation / Type / Boundary): REPORT-API-03 .. REPORT-API-17
 *  - Nhóm 3 (03 - Authentication / Session): REPORT-API-18 .. REPORT-API-21
 *  - Nhóm 4 (04 - Cố tình truyền sai nâng cao, Bảo mật & SLA): REPORT-API-24 .. REPORT-API-30
 */
test.describe('LandBase API - AI Tổng hợp Báo cáo theo Vị trí (/api/v1.0/real-estate/public/news/report-by-location)', () => {
  const client = new LandBaseApiClient();
  const config = client.getConfig();
  const ENDPOINT = '/api/v1.0/real-estate/public/news/report-by-location';

  const baselineLat = config.aiReportLat ?? 20.983173;
  const baselineLon = config.aiReportLon ?? 105.828624;

  const isProd =
    (config.gatewayUrl.includes('landbase.vn') && !config.gatewayUrl.includes('dev-')) ||
    process.env.TEST_ENV === 'prod';

  const confirmRunAIReport = config.confirmRunAIReport ?? !isProd;

  function verifySafetyGuard(testInfo: TestInfo) {
    if (process.env.CONFIRM_RUN_AI_REPORT === 'false') {
      testInfo.skip(
        true,
        'Request skipped: CONFIRM_RUN_AI_REPORT=false được thiết lập qua biến môi trường.'
      );
    }
    if (isProd && !confirmRunAIReport) {
      testInfo.skip(
        true,
        'Request skipped on PROD. Set CONFIRM_RUN_AI_REPORT=true only on an authorized test environment.'
      );
    }
  }

  function assertStandardGatewayResponse(res: any, testcaseId: string) {
    expect(res.status, `${testcaseId}: Response không phát sinh lỗi máy chủ 5xx`).toBeLessThan(500);
    expect(typeof res.rawText, `${testcaseId}: Response body phải là string`).toBe('string');

    const contentType = (res.headers['content-type'] || '').toLowerCase();
    if (contentType.includes('json') && res.rawText.length > 0) {
      expect(() => {
        if (typeof res.data === 'object' && res.data !== null) return res.data;
        return JSON.parse(res.rawText);
      }, `${testcaseId}: Nếu response khai báo JSON thì body phải parse được`).not.toThrow();
    }
  }

  test.beforeEach(async ({ page }) => {
    if (process.env.CONFIRM_RUN_AI_REPORT !== 'false') {
      await client.ensureAuthenticated(page);
    }
  });

  // ============================================================================
  // NHÓM 1: 01 - HAPPY PATH & DATA SCHEMA CONTRACT
  // ============================================================================
  test.describe('Nhóm 1: 01 - Happy Path & Cấu trúc dữ liệu Báo cáo AI', () => {
    test('REPORT-API-01: Gửi yêu cầu xem báo cáo AI tổng hợp với tọa độ mẫu hợp lệ (lat: 20.983173, lon: 105.828624)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        lat: baselineLat,
        lon: baselineLon,
      };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-01',
        testName: 'Gửi yêu cầu xem báo cáo AI tổng hợp với tọa độ mẫu hợp lệ',
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

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      expect(res.rawText.length).toBeGreaterThan(0);
      expect(res.data).toHaveProperty('status', 1);
      expect(res.data).toHaveProperty('path', ENDPOINT);
      expect(res.data.data).toBeTruthy();
    });

    test('REPORT-API-02: Kiểm tra gửi tọa độ thập phân đầy đủ và giữ nguyên độ chính xác', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        lat: 20.983173,
        lon: 105.828624,
      };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-02',
        testName: 'Kiểm tra gửi tọa độ thập phân đầy đủ',
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
      expect(res.data).toHaveProperty('status', 1);
      const report = res.data?.data;
      expect(report).toBeTruthy();
      expect(report.provinceCode).toBe('01');
      expect(typeof report.title).toBe('string');
      expect(report.title.length).toBeGreaterThan(0);
    });

    test('REPORT-API-22: Kiểm tra chi tiết Schema nội dung Báo cáo AI (id, slug, title, content, pdfUrl, provinceCode, wardCode, reportYear, reportQuarter)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        lat: baselineLat,
        lon: baselineLon,
      };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-22',
        testName: 'Kiểm tra chi tiết Schema nội dung Báo cáo AI',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const report = res.data?.data;
      expect(report).toBeTruthy();

      const expectedKeys = [
        'id',
        'slug',
        'title',
        'description',
        'content',
        'imageUrl',
        'pdfUrl',
        'provinceCode',
        'wardCode',
        'reportYear',
        'reportQuarter',
        'postDate',
        'isLoginRequired',
      ];
      for (const k of expectedKeys) {
        expect(report, `Báo cáo AI phải có trường '${k}'`).toHaveProperty(k);
      }

      expect(typeof report.id).toBe('string');
      expect(typeof report.slug).toBe('string');
      expect(typeof report.title).toBe('string');
      expect(typeof report.description).toBe('string');
      expect(typeof report.content).toBe('string');
      expect(report.content.length).toBeGreaterThan(100);
      expect(typeof report.provinceCode).toBe('string');
      expect(typeof report.reportYear).toBe('number');
      expect(typeof report.reportQuarter).toBe('number');
      expect(typeof report.isLoginRequired).toBe('boolean');
    });

    test('REPORT-API-23: Kiểm tra cấu trúc Response Wrapper chuẩn của Gateway LandBase', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        lat: baselineLat,
        lon: baselineLon,
      };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-23',
        testName: 'Kiểm tra cấu trúc Response Wrapper chuẩn của Gateway',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const body = res.data;
      expect(body).toHaveProperty('status', 1);
      expect(typeof body.duration).toBe('number');
      expect(body).toHaveProperty('path', ENDPOINT);
      expect(body).toHaveProperty('responseTime');
      expect(Number.isNaN(Date.parse(body.responseTime))).toBe(false);
      expect(body).toHaveProperty('clientTime');
      expect(body).toHaveProperty('clientMessageId');
      expect(body).toHaveProperty('data');
    });
  });

  // ============================================================================
  // NHÓM 2: 02 - VALIDATION / TYPE / BOUNDARY (REPORT-API-03 .. REPORT-API-17)
  // ============================================================================
  test.describe('Nhóm 2: 02 - Validation / Type / Boundary', () => {
    test('REPORT-API-03: Kiểm tra khi thiếu trường lat (400 Bad Request)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lon: baselineLon };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-03',
        testName: 'Kiểm tra khi thiếu trường lat',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '400 Bad Request',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-03');
      expect(res.status).toBe(400);
      expect(res.data?.status).toBe(0);
      expect(res.data?.message).toContain('Lat không được để null');
    });

    test('REPORT-API-04: Kiểm tra khi thiếu trường lon (400 Bad Request)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: baselineLat };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-04',
        testName: 'Kiểm tra khi thiếu trường lon',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '400 Bad Request',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-04');
      expect(res.status).toBe(400);
      expect(res.data?.status).toBe(0);
      expect(res.data?.message).toContain('Lon không được để null');
    });

    test('REPORT-API-05: Kiểm tra khi thiếu cả lat và lon - Body rỗng {} (400 Bad Request)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {};
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-05',
        testName: 'Kiểm tra khi thiếu cả lat và lon',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '400 Bad Request',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-05');
      expect(res.status).toBe(400);
      expect(res.data?.status).toBe(0);
      expect(res.data?.message).toContain('Lat không được để null');
      expect(res.data?.message).toContain('Lon không được để null');
    });

    test('REPORT-API-06: Kiểm tra lat bằng null (400 Bad Request)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: null, lon: baselineLon };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-06',
        testName: 'Kiểm tra lat bằng null',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '400 Bad Request',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-06');
      expect(res.status).toBe(400);
      expect(res.data?.status).toBe(0);
      expect(res.data?.message).toContain('Lat không được để null');
    });

    test('REPORT-API-07: Kiểm tra lon bằng null (400 Bad Request)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: baselineLat, lon: null };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-07',
        testName: 'Kiểm tra lon bằng null',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '400 Bad Request',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-07');
      expect(res.status).toBe(400);
      expect(res.data?.status).toBe(0);
      expect(res.data?.message).toContain('Lon không được để null');
    });

    test('REPORT-API-08: Kiểm tra lat là chuỗi rỗng "" (400 Bad Request)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: '', lon: baselineLon };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-08',
        testName: 'Kiểm tra lat là chuỗi rỗng',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '400 Bad Request',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-08');
      expect(res.status).toBe(400);
      expect(res.data?.status).toBe(0);
      expect(res.data?.message).toContain('Lat không được để null');
    });

    test('REPORT-API-09: Kiểm tra lon là chuỗi rỗng "" (400 Bad Request)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: baselineLat, lon: '' };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-09',
        testName: 'Kiểm tra lon là chuỗi rỗng',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '400 Bad Request',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-09');
      expect(res.status).toBe(400);
      expect(res.data?.status).toBe(0);
      expect(res.data?.message).toContain('Lon không được để null');
    });

    test('REPORT-API-10: Kiểm tra lat sai kiểu dữ liệu ("north") - 406 Not Acceptable', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: 'north', lon: baselineLon };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-10',
        testName: 'Kiểm tra lat sai kiểu dữ liệu ("north")',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '406 Not Acceptable',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-10');
      expect(res.status).toBe(406);
      expect(res.data?.status).toBe(0);
    });

    test('REPORT-API-11: Kiểm tra lon sai kiểu dữ liệu ("east") - 406 Not Acceptable', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: baselineLat, lon: 'east' };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-11',
        testName: 'Kiểm tra lon sai kiểu dữ liệu ("east")',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '406 Not Acceptable',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-11');
      expect(res.status).toBe(406);
      expect(res.data?.status).toBe(0);
    });

    test('REPORT-API-12: Kiểm tra lat vượt miền tọa độ địa lý thông dụng (lat: 91)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: 91, lon: baselineLon };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-12',
        testName: 'Kiểm tra lat vượt miền tọa độ địa lý thông dụng (lat: 91)',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK (data: null)',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-12');
      expect(res.status).toBe(200);
      expect(res.data?.data).toBeNull();
    });

    test('REPORT-API-13: Kiểm tra lon vượt miền tọa độ địa lý thông dụng (lon: 181)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: baselineLat, lon: 181 };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-13',
        testName: 'Kiểm tra lon vượt miền tọa độ địa lý thông dụng (lon: 181)',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK (data: null)',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-13');
      expect(res.status).toBe(200);
      expect(res.data?.data).toBeNull();
    });

    test('REPORT-API-14: Kiểm tra lat và lon bằng 0 (0, 0)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: 0, lon: 0 };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-14',
        testName: 'Kiểm tra lat và lon bằng 0',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK (data: null)',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-14');
      expect(res.status).toBe(200);
      expect(res.data?.data).toBeNull();
    });

    test('REPORT-API-15: Kiểm tra tọa độ âm (-20.983173, -105.828624)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: -20.983173, lon: -105.828624 };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-15',
        testName: 'Kiểm tra tọa độ âm',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK (data: null)',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-15');
      expect(res.status).toBe(200);
      expect(res.data?.data).toBeNull();
    });

    test('REPORT-API-16: Kiểm tra thêm field ngoài payload mẫu (unexpectedField)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        lat: baselineLat,
        lon: baselineLon,
        unexpectedField: 'test-value',
      };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-16',
        testName: 'Kiểm tra thêm field ngoài payload mẫu',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-16');
      expect(res.status).toBe(200);
      expect(res.data?.status).toBe(1);
      expect(res.data?.data).toBeTruthy();
    });

    test('REPORT-API-17: Kiểm tra body JSON sai cú pháp (Malformed JSON)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const malformedBody = '{"lat":20.983173,"lon":';
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: malformedBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-17',
        testName: 'Kiểm tra body JSON sai cú pháp',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '400 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: malformedBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-17');
      expect([400, 406]).toContain(res.status);
      expect(res.data?.status).toBe(0);
    });
  });

  // ============================================================================
  // NHÓM 3: 03 - AUTHENTICATION / SESSION (REPORT-API-18 .. REPORT-API-21)
  // ============================================================================
  test.describe('Nhóm 3: 03 - Authentication / Session Headers', () => {
    test('REPORT-API-18: Gọi API khi thiếu Authorization và X-Auth-Token', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: baselineLat, lon: baselineLon };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
        overrideTokens: { accessToken: '', xAuthToken: '' },
        customHeaders: {
          Authorization: undefined as any,
          'x-auth-token': undefined as any,
        },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-18',
        testName: 'Gọi API khi thiếu Authorization và X-Auth-Token',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK (Public Endpoint)',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-18');
      expect(res.status).toBe(200);
      expect(res.data?.status).toBe(1);
    });

    test('REPORT-API-19: Gọi API với Authorization Bearer không hợp lệ', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: baselineLat, lon: baselineLon };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
        overrideTokens: {
          accessToken: 'INVALID_TOKEN_FOR_AUTH_TEST',
        },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-19',
        testName: 'Gọi API với Authorization Bearer không hợp lệ',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 / 401 (No 5xx)',
        actualStatus: res.status,
        requestBody: { ...payload, Authorization: 'Bearer INVALID_TOKEN_FOR_AUTH_TEST' },
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-19');
    });

    test('REPORT-API-20: Gọi API khi thiếu X-Auth-Token nhưng còn Authorization', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: baselineLat, lon: baselineLon };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
        overrideTokens: { xAuthToken: '' },
        customHeaders: { 'x-auth-token': undefined as any },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-20',
        testName: 'Gọi API khi thiếu X-Auth-Token nhưng còn Authorization',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-20');
      expect(res.status).toBe(200);
      expect(res.data?.status).toBe(1);
    });

    test('REPORT-API-21: Gọi API khi thiếu X-Session-Ref', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: baselineLat, lon: baselineLon };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
        overrideTokens: { xSessionRef: '' },
        customHeaders: { 'x-session-ref': undefined as any },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-21',
        testName: 'Gọi API khi thiếu X-Session-Ref',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-21');
      expect(res.status).toBe(200);
      expect(res.data?.status).toBe(1);
    });
  });

  // ============================================================================
  // NHÓM 4: CỐ TÌNH TRUYỀN SAI NÂNG CAO (UNHAPPY / SECURITY / SLA)
  // ============================================================================
  test.describe('Nhóm 4: Cố tình truyền sai nâng cao, Bảo mật & Hiệu năng', () => {
    test('REPORT-API-24: Cố tình truyền kiểu boolean cho lat và lon (lat: true, lon: false)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: true, lon: false };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-24',
        testName: 'Cố tình truyền kiểu boolean cho lat và lon',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '400 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-24');
      expect(res.data?.status).toBe(0);
    });

    test('REPORT-API-25: Cố tình truyền kiểu Array và Object cho lat và lon', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: [20.983173], lon: { value: 105.828624 } };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-25',
        testName: 'Cố tình truyền kiểu Array và Object cho lat và lon',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '406 Not Acceptable',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-25');
      expect(res.status).toBe(406);
      expect(res.data?.status).toBe(0);
    });

    test('REPORT-API-26: Cố tình truyền JSON Root là Array [] thay vì Object {}', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = [{ lat: baselineLat, lon: baselineLon }];
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-26',
        testName: 'Cố tình truyền JSON Root là Array [] thay vì Object {}',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '406 Not Acceptable',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-26');
      expect(res.status).toBe(406);
      expect(res.data?.status).toBe(0);
    });

    test('REPORT-API-27: Cố tình truyền chuỗi khoảng trắng ("   ") cho lat và lon', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: '   ', lon: '   ' };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-27',
        testName: 'Cố tình truyền chuỗi khoảng trắng cho lat và lon',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '400 Bad Request',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-27');
      expect([400, 406]).toContain(res.status);
      expect(res.data?.status).toBe(0);
    });

    test('REPORT-API-28: Kiểm tra an toàn SQL Injection & XSS trong tham số lat/lon', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        lat: "20.983173' OR '1'='1",
        lon: '<script>alert("xss")</script>',
      };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-28',
        testName: 'Kiểm tra an toàn SQL Injection & XSS trong tham số lat/lon',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '406 Not Acceptable (Safe)',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-28');
      expect(res.status).toBe(406);
      expect(res.data?.status).toBe(0);
      expect(res.rawText.toLowerCase()).not.toContain('syntax error');
      expect(res.rawText.toLowerCase()).not.toContain('sqlstate');
    });

    test('REPORT-API-29: Gọi sai phương thức HTTP (DELETE thay vì POST)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'DELETE',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-29',
        testName: 'Gọi sai phương thức HTTP (DELETE thay vì POST)',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'DELETE',
        expectedStatus: '401 / 405 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertStandardGatewayResponse(res, 'REPORT-API-29');
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    test('REPORT-API-30: Kiểm tra SLA thời gian phản hồi API Báo cáo AI (< 3500ms)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { lat: baselineLat, lon: baselineLon };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'REPORT-API-30',
        testName: `Kiểm tra SLA thời gian phản hồi (${durationMs}ms < 3500ms)`,
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK (< 3500ms)',
        actualStatus: res.status,
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      expect(durationMs).toBeLessThan(3500);
      if (typeof res.data?.duration === 'number') {
        expect(res.data.duration).toBeLessThan(1500);
      }
    });
  });
});
