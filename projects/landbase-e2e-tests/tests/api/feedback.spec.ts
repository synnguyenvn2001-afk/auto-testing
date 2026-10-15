import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { LandBaseApiClient } from './api-client';
import { recordApiEvidence } from './api-evidence';

test.describe('LandBase API - Hòm thư Feedback (/api/feedback)', () => {
  const client = new LandBaseApiClient();
  const config = client.getConfig();
  const ENDPOINT = '/api/feedback';

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T.*Z$/;

  const defaultName = config.feedbackName || 'user';
  const defaultEmail = config.feedbackEmail || 'tamoco6090@nab4.com';
  const defaultErrorType = config.feedbackErrorType || 'Dữ liệu';

  test.beforeEach(async ({ page }) => {
    // Truy cập dev-webapp để thiết lập security context, cookies và origin
    const domain = new URL(config.webappUrl).hostname;
    const fpValue = crypto.randomUUID();
    await page.context().addCookies([
      { name: '_v2_mClientFP', value: fpValue, domain, path: '/' },
      { name: '_v2_sig', value: fpValue, domain, path: '/' },
    ]);
    await page.goto(config.webappUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  function assertSuccessFeedbackResponse(body: any) {
    expect(body, 'Response body phải là object').toBeDefined();
    expect(typeof body).toBe('object');
    expect(body).toHaveProperty('status', 1);
    expect(body).toHaveProperty('message', 'Gửi phản hồi thành công');
    expect(body).toHaveProperty('data');
    expect(typeof body.data).toBe('object');

    expect(body.data).toHaveProperty('id');
    expect(typeof body.data.id).toBe('string');
    expect(body.data.id).toMatch(UUID_REGEX);

    expect(body.data).toHaveProperty('created_date');
    expect(typeof body.data.created_date).toBe('string');
    expect(Number.isNaN(Date.parse(body.data.created_date))).toBeFalsy();
    expect(body.data.created_date).toMatch(ISO_DATE_REGEX);
  }

  // =========================================================================
  // 1. HAPPY PATH & SUCCESS CONTRACT TESTS
  // =========================================================================

  test('API-FEEDBACK-01: Gửi feedback với payload mẫu - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      name: defaultName,
      email: defaultEmail,
      error_type: defaultErrorType,
      content: 'Nội dung phản hồi kiểm thử mẫu',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-01',
      testName: 'Gửi feedback với payload mẫu',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (2xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    // 1. HTTP status thuộc nhóm 2xx
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);

    // 2. Response contract thành công
    assertSuccessFeedbackResponse(res.data);
  });

  test('API-FEEDBACK-10: Xác nhận content=null được kiểm tra theo schema backend', async ({ page }, testInfo) => {
    const payload = {
      name: defaultName,
      email: defaultEmail,
      error_type: defaultErrorType,
      content: null,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-10',
      testName: 'Xác nhận content=null được kiểm tra theo schema backend',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK hoặc 400 Validation Error',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    // Đối chiếu theo contract thực tế: nếu backend hỗ trợ null -> 2xx, nếu bắt buộc chuỗi -> 400 INVALID_REQUEST
    if (res.status >= 200 && res.status < 300) {
      assertSuccessFeedbackResponse(res.data);
    } else {
      expect(res.status, 'Backend trả về mã lỗi 400 khi content=null').toBe(400);
      expect(res.data).toHaveProperty('code', 'INVALID_REQUEST');
      expect(res.data?.errors?.fieldErrors?.content?.[0]).toContain('expected string, received null');
    }
  });

  test('API-FEEDBACK-11: Kiểm tra content là chuỗi có nội dung - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      name: defaultName,
      email: defaultEmail,
      error_type: defaultErrorType,
      content: 'Mô tả vấn đề cần hỗ trợ',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-11',
      testName: 'Kiểm tra content là chuỗi có nội dung',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (2xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);

    if (res.data && typeof res.data === 'object' && res.data.status !== undefined) {
      assertSuccessFeedbackResponse(res.data);
    } else {
      expect(res.data).toBeDefined();
    }
  });

  test('API-FEEDBACK-16: Kiểm tra response khi gửi request với email hợp lệ và content tiếng Việt - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      name: 'Người dùng kiểm thử',
      email: 'qa.feedback@example.com',
      error_type: defaultErrorType,
      content: 'Tôi gặp lỗi hiển thị dữ liệu.',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-16',
      testName: 'Kiểm tra response khi gửi request với email hợp lệ và content tiếng Việt',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (2xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);

    if (res.data && typeof res.data === 'object' && res.data.status !== undefined) {
      assertSuccessFeedbackResponse(res.data);
    } else {
      expect(res.data).toBeDefined();
    }
  });

  test('API-FEEDBACK-17: Kiểm tra response contract thành công - 200 OK', async ({ page }, testInfo) => {
    const payload = {
      name: defaultName,
      email: defaultEmail,
      error_type: defaultErrorType,
      content: 'Kiểm tra response contract thành công',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-17',
      testName: 'Kiểm tra response contract thành công',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK (2xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    assertSuccessFeedbackResponse(res.data);
  });

  // =========================================================================
  // 2. VALIDATION & BOUNDARY TESTS (EXPLORATORY - NO SERVER 5xx)
  // =========================================================================

  test('API-FEEDBACK-02: Kiểm tra khi thiếu trường name', async ({ page }, testInfo) => {
    const payload = {
      email: defaultEmail,
      error_type: defaultErrorType,
      content: null,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-02',
      testName: 'Kiểm tra khi thiếu trường name',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '< 500 (Validation / Not 5xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status, 'Không được phát sinh lỗi máy chủ 5xx ngoài dự kiến').toBeLessThan(500);
  });

  test('API-FEEDBACK-03: Kiểm tra name bằng null', async ({ page }, testInfo) => {
    const payload = {
      name: null,
      email: defaultEmail,
      error_type: defaultErrorType,
      content: null,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-03',
      testName: 'Kiểm tra name bằng null',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '< 500 (Validation / Not 5xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status, 'Không được phát sinh lỗi máy chủ 5xx ngoài dự kiến').toBeLessThan(500);
  });

  test('API-FEEDBACK-04: Kiểm tra name là chuỗi rỗng', async ({ page }, testInfo) => {
    const payload = {
      name: '',
      email: defaultEmail,
      error_type: defaultErrorType,
      content: null,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-04',
      testName: 'Kiểm tra name là chuỗi rỗng',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '< 500 (Validation / Not 5xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status, 'Không được phát sinh lỗi máy chủ 5xx ngoài dự kiến').toBeLessThan(500);
  });

  test('API-FEEDBACK-05: Kiểm tra khi thiếu trường email', async ({ page }, testInfo) => {
    const payload = {
      name: defaultName,
      error_type: defaultErrorType,
      content: null,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-05',
      testName: 'Kiểm tra khi thiếu trường email',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '< 500 (Validation / Not 5xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status, 'Không được phát sinh lỗi máy chủ 5xx ngoài dự kiến').toBeLessThan(500);
  });

  test('API-FEEDBACK-06: Kiểm tra email sai định dạng', async ({ page }, testInfo) => {
    const payload = {
      name: defaultName,
      email: 'not-an-email',
      error_type: defaultErrorType,
      content: null,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-06',
      testName: 'Kiểm tra email sai định dạng',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '< 500 (Validation / Not 5xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status, 'Không được phát sinh lỗi máy chủ 5xx ngoài dự kiến').toBeLessThan(500);
  });

  test('API-FEEDBACK-07: Kiểm tra email bằng null', async ({ page }, testInfo) => {
    const payload = {
      name: defaultName,
      email: null,
      error_type: defaultErrorType,
      content: null,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-07',
      testName: 'Kiểm tra email bằng null',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '< 500 (Validation / Not 5xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status, 'Không được phát sinh lỗi máy chủ 5xx ngoài dự kiến').toBeLessThan(500);
  });

  test('API-FEEDBACK-08: Kiểm tra khi thiếu trường error_type', async ({ page }, testInfo) => {
    const payload = {
      name: defaultName,
      email: defaultEmail,
      content: null,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-08',
      testName: 'Kiểm tra khi thiếu trường error_type',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '< 500 (Validation / Not 5xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status, 'Không được phát sinh lỗi máy chủ 5xx ngoài dự kiến').toBeLessThan(500);
  });

  test('API-FEEDBACK-09: Kiểm tra error_type không nằm trong danh mục', async ({ page }, testInfo) => {
    const payload = {
      name: defaultName,
      email: defaultEmail,
      error_type: 'INVALID_TYPE',
      content: null,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-09',
      testName: 'Kiểm tra error_type không nằm trong danh mục',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '< 500 (Validation / Not 5xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status, 'Không được phát sinh lỗi máy chủ 5xx ngoài dự kiến').toBeLessThan(500);
  });

  test('API-FEEDBACK-12: Kiểm tra content là chuỗi rỗng', async ({ page }, testInfo) => {
    const payload = {
      name: defaultName,
      email: defaultEmail,
      error_type: defaultErrorType,
      content: '',
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-12',
      testName: 'Kiểm tra content là chuỗi rỗng',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '< 500 (Validation / Not 5xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status, 'Không được phát sinh lỗi máy chủ 5xx ngoài dự kiến').toBeLessThan(500);
  });

  test('API-FEEDBACK-13: Kiểm tra content sai kiểu dữ liệu dạng số', async ({ page }, testInfo) => {
    const payload = {
      name: defaultName,
      email: defaultEmail,
      error_type: defaultErrorType,
      content: 123,
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-13',
      testName: 'Kiểm tra content sai kiểu dữ liệu dạng số',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '< 500 (Validation / Not 5xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status, 'Không được phát sinh lỗi máy chủ 5xx ngoài dự kiến').toBeLessThan(500);
  });

  test('API-FEEDBACK-14: Kiểm tra content sai kiểu dữ liệu dạng object', async ({ page }, testInfo) => {
    const payload = {
      name: defaultName,
      email: defaultEmail,
      error_type: defaultErrorType,
      content: {
        text: 'sample',
      },
    };

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-14',
      testName: 'Kiểm tra content sai kiểu dữ liệu dạng object',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '< 500 (Validation / Not 5xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status, 'Không được phát sinh lỗi máy chủ 5xx ngoài dự kiến').toBeLessThan(500);
  });

  test('API-FEEDBACK-15: Gửi body JSON rỗng', async ({ page }, testInfo) => {
    const payload = {};

    const res = await client.executeInPage(page, {
      endpoint: ENDPOINT,
      method: 'POST',
      body: payload,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'API-FEEDBACK-15',
      testName: 'Gửi body JSON rỗng',
      endpoint: client.resolveUrl(ENDPOINT),
      method: 'POST',
      expectedStatus: '< 500 (Validation / Not 5xx)',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
      requestBody: payload,
      responseHeaders: res.headers,
      responseBody: res.data ?? res.rawText,
    });

    expect(res.status, 'Không được phát sinh lỗi máy chủ 5xx ngoài dự kiến').toBeLessThan(500);
  });
});
