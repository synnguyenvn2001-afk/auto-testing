import { test, expect, TestInfo } from '@playwright/test';
import crypto from 'node:crypto';
import { LandBaseApiClient } from './api-client';
import { recordApiEvidence } from './api-evidence';

test.describe('LandBase API - Thanh toán & Tạo Đơn hàng Subscription (/api/v1.0/subscription/order)', () => {
  const client = new LandBaseApiClient();
  const config = client.getConfig();
  const ENDPOINT = '/api/v1.0/subscription/order';

  const isProd =
    (config.gatewayUrl.includes('landbase.vn') && !config.gatewayUrl.includes('dev-')) ||
    process.env.TEST_ENV === 'prod';

  const confirmCreateSubscriptionOrder = config.confirmCreateSubscriptionOrder ?? !isProd;
  const shouldRun = !isProd || Boolean(confirmCreateSubscriptionOrder);

  // Helper áp dụng khóa an toàn trên môi trường Production hoặc khi người dùng chủ động tắt
  function verifySafetyGuard(testInfo: TestInfo) {
    if (process.env.CONFIRM_CREATE_SUBSCRIPTION_ORDER === 'false') {
      testInfo.skip(
        true,
        'Request skipped do thiết lập biến môi trường CONFIRM_CREATE_SUBSCRIPTION_ORDER=false.'
      );
    }
    if (isProd && !confirmCreateSubscriptionOrder) {
      testInfo.skip(
        true,
        'Request skipped for safety on PROD. Set CONFIRM_CREATE_SUBSCRIPTION_ORDER=true only when using authorized test data; this API may create an order or trigger payment workflow.'
      );
    }
  }

  // Helper thực thi các assertion tiêu chuẩn của bộ test API Order
  function assertStandardOrderResponse(res: any, testcaseId: string) {
    console.log(`[${testcaseId}] HTTP status:`, res.status);
    console.log(`[${testcaseId}] Content-Type:`, res.headers['content-type'] || '(chưa có)');
    console.log(`[${testcaseId}] Response preview:`, (res.rawText || '').slice(0, 3000));

    // 1. Response không được phát sinh lỗi máy chủ 5xx
    expect(res.status, `${testcaseId}: Response không được phát sinh lỗi máy chủ 5xx`).toBeLessThan(500);

    // 2. Response body có thể được ghi nhận
    expect(typeof res.rawText, `${testcaseId}: Response body phải là chuỗi ký tự`).toBe('string');

    // 3. Nếu Content-Type khai báo JSON thì body parse được
    const contentType = (res.headers['content-type'] || '').toLowerCase();
    if (contentType.includes('json') && res.rawText.length > 0) {
      expect(() => {
        if (typeof res.data === 'object' && res.data !== null) return res.data;
        return JSON.parse(res.rawText);
      }, `${testcaseId}: Nếu Content-Type khai báo JSON thì body phải parse được`).not.toThrow();
    }
  }

  // Helper đảm bảo trong giỏ hàng có Gói PRO (thay vì Gói Basic hoặc giỏ hàng trống)
  async function ensureProPackageInCart(page: any) {
    try {
      const cartRes = await client.executeInPage(page, {
        endpoint: '/api/v1.0/subscription/cart/confirm?voucherCode=',
        method: 'GET',
      });
      const items = cartRes.data?.data?.items || [];
      const hasPro = items.some((item: any) => item.packageCode === 'PRO');
      if (!hasPro) {
        await client.executeInPage(page, {
          endpoint: '/api/v1.0/subscription/cart/confirm',
          method: 'POST',
          body: { packageCode: 'PRO' },
        });
      }
    } catch (e: any) {
      console.warn('⚠️ Lỗi khi nạp gói PRO vào giỏ hàng:', e.message);
    }
  }

  // Helper lấy mã đơn hàng PENDING gần nhất (nếu có)
  async function getPendingOrderCode(page: any): Promise<number | null> {
    try {
      const res = await client.executeInPage(page, {
        endpoint: '/api/v1.0/subscription/order/getAllListOrder',
        method: 'POST',
        body: { page: 0, size: 10 },
      });
      const orders = res.data?.data?.content || [];
      const pending = orders.find((o: any) => o.status === 'PENDING');
      return pending ? pending.orderCode : null;
    } catch {
      return null;
    }
  }

  // Helper hủy đơn hàng PENDING (nếu có) để giải phóng slot đơn hàng
  async function cancelPendingOrderIfAny(page: any): Promise<number | null> {
    try {
      const code = await getPendingOrderCode(page);
      if (code) {
        console.log(`🔄 [AUTO-CANCEL] Đang tự động hủy đơn hàng PENDING cũ: ${code}...`);
        const cancelRes = await client.executeInPage(page, {
          endpoint: '/api/v1.0/subscription/order/cancel',
          method: 'POST',
          body: { orderCode: code },
        });
        console.log(`✅ [AUTO-CANCEL] Kết quả hủy đơn hàng ${code}: Status ${cancelRes.status}`);
        return code;
      }
    } catch (e: any) {
      console.warn('⚠️ Lỗi khi hủy đơn hàng pending:', e.message);
    }
    return null;
  }

  test.beforeEach(async ({ page }) => {
    // Chỉ kích hoạt làm mới phiên duyệt web khi suite được phép chạy
    if (shouldRun && process.env.CONFIRM_CREATE_SUBSCRIPTION_ORDER !== 'false') {
      await client.ensureAuthenticated(page);
      // Tự động giải phóng đơn hàng PENDING của case trước (nếu có) để không bị lỗi tối đa 1 đơn chờ
      await cancelPendingOrderIfAny(page);
    }
  });

  test.afterEach(async ({ page }) => {
    // Dọn dẹp sạch sẽ: Tự động hủy đơn hàng vừa tạo trong test case (nếu có) để các case tiếp theo chạy trơn tru
    if (shouldRun && process.env.CONFIRM_CREATE_SUBSCRIPTION_ORDER !== 'false') {
      await cancelPendingOrderIfAny(page);
    }
  });

  // =========================================================================
  // FOLDER 01: REQUEST BASELINE / PROTOCOL
  // =========================================================================
  test.describe('01 - Request baseline / Protocol', () => {
    test('ORDER-API-01: Gửi request tạo order với payload theo cURL mẫu (Gói Pro)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      // 1. Tự động hủy đơn hàng PENDING cũ của case trước (nếu có)
      await cancelPendingOrderIfAny(page);

      // 2. Đảm bảo giỏ hàng đã có Gói PRO (thay vì Gói Basic hoặc giỏ trống)
      await ensureProPackageInCart(page);

      const payload = {
        voucherCode: '',
        gcif: '',
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-01',
        testName: 'Gửi request tạo order với payload theo cURL mẫu (Gói Pro)',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK (Thành công kèm link PayOS)',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-01');

      // 3. Tự động hủy đơn hàng vừa tạo ngay lập tức để các case tiếp theo không bị lỗi tối đa 1 đơn chờ
      await cancelPendingOrderIfAny(page);
    });

    test('ORDER-API-13: Gửi JSON sai cú pháp', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const rawMalformedJson = '{"voucherCode":"","gcif":';

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: rawMalformedJson,
        customHeaders: {
          'Content-Type': 'application/json',
        },
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-13',
        testName: 'Gửi JSON sai cú pháp',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500 (Xử lý lỗi cú pháp có kiểm soát)',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT }),
        requestBody: rawMalformedJson,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-13');
    });

    test('ORDER-API-18: Kiểm tra request có clientmessageid và clienttime mới', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: '',
        gcif: '',
      };
      const customClientMessageId = crypto.randomUUID();
      const customClientTime = new Date().toISOString();

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
        customHeaders: {
          clientmessageid: customClientMessageId,
          clienttime: customClientTime,
        },
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-18',
        testName: 'Kiểm tra request có clientmessageid và clienttime mới',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500 (Ghi nhận request với idempotency headers mới)',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({
          endpoint: ENDPOINT,
          body: payload,
          customHeaders: {
            clientmessageid: customClientMessageId,
            clienttime: customClientTime,
          },
        }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-18');
    });
  });

  // =========================================================================
  // FOLDER 02: BODY VALIDATION
  // =========================================================================
  test.describe('02 - Body validation', () => {
    test('ORDER-API-02: Kiểm tra khi không truyền voucherCode', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        gcif: '',
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-02',
        testName: 'Kiểm tra khi không truyền voucherCode',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-02');
    });

    test('ORDER-API-03: Kiểm tra voucherCode bằng null', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: null,
        gcif: '',
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-03',
        testName: 'Kiểm tra voucherCode bằng null',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-03');
    });

    test('ORDER-API-04: Kiểm tra voucherCode chỉ chứa khoảng trắng', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: '   ',
        gcif: '',
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-04',
        testName: 'Kiểm tra voucherCode chỉ chứa khoảng trắng',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-04');
    });

    test('ORDER-API-05: Kiểm tra voucherCode không tồn tại', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: 'INVALID_VOUCHER_FOR_TEST',
        gcif: '',
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-05',
        testName: 'Kiểm tra voucherCode không tồn tại',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-05');
    });

    test('ORDER-API-06: Kiểm tra voucherCode sai kiểu dữ liệu', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: 12345,
        gcif: '',
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-06',
        testName: 'Kiểm tra voucherCode sai kiểu dữ liệu',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-06');
    });

    test('ORDER-API-07: Kiểm tra khi không truyền gcif', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: '',
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-07',
        testName: 'Kiểm tra khi không truyền gcif',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-07');
    });

    test('ORDER-API-08: Kiểm tra gcif bằng null', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: '',
        gcif: null,
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-08',
        testName: 'Kiểm tra gcif bằng null',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-08');
    });

    test('ORDER-API-09: Kiểm tra gcif chỉ chứa khoảng trắng', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: '',
        gcif: '   ',
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-09',
        testName: 'Kiểm tra gcif chỉ chứa khoảng trắng',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-09');
    });

    test('ORDER-API-10: Kiểm tra gcif sai kiểu dữ liệu', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: '',
        gcif: 12345,
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-10',
        testName: 'Kiểm tra gcif sai kiểu dữ liệu',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-10');
    });

    test('ORDER-API-11: Gửi body JSON rỗng', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {};

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-11',
        testName: 'Gửi body JSON rỗng',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-11');
    });

    test('ORDER-API-12: Gửi thêm field không được mô tả trong request mẫu', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: '',
        gcif: '',
        unexpectedField: 'test-value',
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-12',
        testName: 'Gửi thêm field không được mô tả trong request mẫu',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-12');
    });
  });

  // =========================================================================
  // FOLDER 03: AUTHENTICATION / SESSION
  // =========================================================================
  test.describe('03 - Authentication / Session', () => {
    test('ORDER-API-14: Gọi API khi thiếu Authorization và các header xác thực liên quan', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: '',
        gcif: '',
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
        overrideTokens: {
          accessToken: '',
          xAuthToken: '',
        },
        customHeaders: {
          Authorization: null,
          'x-auth-token': null,
          Cookie: null,
        },
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-14',
        testName: 'Gọi API khi thiếu Authorization và các header xác thực liên quan',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500 (Từ chối xác thực 401/403 hoặc theo contract)',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({
          endpoint: ENDPOINT,
          body: payload,
          overrideTokens: { accessToken: '', xAuthToken: '' },
          customHeaders: { Authorization: null, 'x-auth-token': null, Cookie: null },
        }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-14');
    });

    test('ORDER-API-15: Gọi API với access token không hợp lệ', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: '',
        gcif: '',
      };
      const invalidToken = config.subscriptionInvalidAccessToken || 'INVALID_TOKEN_FOR_AUTH_TEST';
      const invalidXToken = config.subscriptionInvalidXAuthToken || 'INVALID_X_AUTH_TOKEN_FOR_TEST';

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
        overrideTokens: {
          accessToken: invalidToken,
          xAuthToken: invalidXToken,
        },
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-15',
        testName: 'Gọi API với access token không hợp lệ',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500 (Từ chối token không hợp lệ 401/403)',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({
          endpoint: ENDPOINT,
          body: payload,
          overrideTokens: { accessToken: invalidToken, xAuthToken: invalidXToken },
        }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-15');
    });

    test('ORDER-API-16: Gọi API khi thiếu x-auth-token', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: '',
        gcif: '',
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
        overrideTokens: {
          xAuthToken: '',
        },
        customHeaders: {
          'x-auth-token': null,
        },
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-16',
        testName: 'Gọi API khi thiếu x-auth-token',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({
          endpoint: ENDPOINT,
          body: payload,
          overrideTokens: { xAuthToken: '' },
          customHeaders: { 'x-auth-token': null },
        }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-16');
    });

    test('ORDER-API-17: Gọi API khi thiếu cookie phiên', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        voucherCode: '',
        gcif: '',
      };

      const res = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: payload,
        customHeaders: {
          Cookie: null,
        },
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-API-17',
        testName: 'Gọi API khi thiếu cookie phiên',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({
          endpoint: ENDPOINT,
          body: payload,
          customHeaders: { Cookie: null },
        }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-API-17');
    });
  });

  // =========================================================================
  // FOLDER 04: CANCEL ORDER (/api/v1.0/subscription/order/cancel)
  // =========================================================================
  test.describe('04 - Cancel Order (/api/v1.0/subscription/order/cancel)', () => {
    const CANCEL_ENDPOINT = '/api/v1.0/subscription/order/cancel';

    test('ORDER-CANCEL-01: Gửi request hủy đơn hàng với orderCode mẫu', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        orderCode: Number(config.subscriptionOrderCode) || 1792730478,
      };

      const res = await client.executeInPage(page, {
        endpoint: CANCEL_ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CANCEL-01',
        testName: 'Gửi request hủy đơn hàng với orderCode mẫu',
        endpoint: client.resolveUrl(CANCEL_ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: CANCEL_ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CANCEL-01');
    });

    test('ORDER-CANCEL-02: Hủy đơn hàng với orderCode không tồn tại', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        orderCode: 9999999999,
      };

      const res = await client.executeInPage(page, {
        endpoint: CANCEL_ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CANCEL-02',
        testName: 'Hủy đơn hàng với orderCode không tồn tại',
        endpoint: client.resolveUrl(CANCEL_ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500 (404/406: Không tìm thấy)',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: CANCEL_ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CANCEL-02');
    });

    test('ORDER-CANCEL-03: Hủy đơn hàng khi không truyền orderCode', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {};

      const res = await client.executeInPage(page, {
        endpoint: CANCEL_ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CANCEL-03',
        testName: 'Hủy đơn hàng khi không truyền orderCode',
        endpoint: client.resolveUrl(CANCEL_ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: CANCEL_ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CANCEL-03');
    });

    test('ORDER-CANCEL-04: Hủy đơn hàng với orderCode bằng null', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        orderCode: null,
      };

      const res = await client.executeInPage(page, {
        endpoint: CANCEL_ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CANCEL-04',
        testName: 'Hủy đơn hàng với orderCode bằng null',
        endpoint: client.resolveUrl(CANCEL_ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: CANCEL_ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CANCEL-04');
    });

    test('ORDER-CANCEL-05: Hủy đơn hàng với orderCode sai kiểu dữ liệu', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        orderCode: 'invalid_string_code',
      };

      const res = await client.executeInPage(page, {
        endpoint: CANCEL_ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CANCEL-05',
        testName: 'Hủy đơn hàng với orderCode sai kiểu dữ liệu',
        endpoint: client.resolveUrl(CANCEL_ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: CANCEL_ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CANCEL-05');
    });

    test('ORDER-CANCEL-06: Hủy đơn hàng với JSON sai cú pháp', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const rawMalformedJson = '{"orderCode":';

      const res = await client.executeInPage(page, {
        endpoint: CANCEL_ENDPOINT,
        method: 'POST',
        body: rawMalformedJson,
        customHeaders: {
          'Content-Type': 'application/json',
        },
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CANCEL-06',
        testName: 'Hủy đơn hàng với JSON sai cú pháp',
        endpoint: client.resolveUrl(CANCEL_ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500 (Xử lý lỗi cú pháp có kiểm soát)',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: CANCEL_ENDPOINT }),
        requestBody: rawMalformedJson,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CANCEL-06');
    });

    test('ORDER-CANCEL-07: Hủy đơn hàng khi thiếu Authorization', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        orderCode: Number(config.subscriptionOrderCode) || 1792730478,
      };

      const res = await client.executeInPage(page, {
        endpoint: CANCEL_ENDPOINT,
        method: 'POST',
        body: payload,
        overrideTokens: {
          accessToken: '',
          xAuthToken: '',
        },
        customHeaders: {
          Authorization: null,
          'x-auth-token': null,
          Cookie: null,
        },
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CANCEL-07',
        testName: 'Hủy đơn hàng khi thiếu Authorization',
        endpoint: client.resolveUrl(CANCEL_ENDPOINT),
        method: 'POST',
        expectedStatus: '401 Unauthorized',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({
          endpoint: CANCEL_ENDPOINT,
          body: payload,
          overrideTokens: { accessToken: '', xAuthToken: '' },
          customHeaders: { Authorization: null, 'x-auth-token': null, Cookie: null },
        }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      expect(res.status, 'ORDER-CANCEL-07: Phải từ chối truy cập không có token 401').toBe(401);
      assertStandardOrderResponse(res, 'ORDER-CANCEL-07');
    });

    test('ORDER-CANCEL-08: Hủy đơn hàng với access token không hợp lệ', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        orderCode: Number(config.subscriptionOrderCode) || 1792730478,
      };
      const invalidToken = config.subscriptionInvalidAccessToken || 'INVALID_TOKEN_FOR_AUTH_TEST';
      const invalidXToken = config.subscriptionInvalidXAuthToken || 'INVALID_X_AUTH_TOKEN_FOR_TEST';

      const res = await client.executeInPage(page, {
        endpoint: CANCEL_ENDPOINT,
        method: 'POST',
        body: payload,
        overrideTokens: {
          accessToken: invalidToken,
          xAuthToken: invalidXToken,
        },
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CANCEL-08',
        testName: 'Hủy đơn hàng với access token không hợp lệ',
        endpoint: client.resolveUrl(CANCEL_ENDPOINT),
        method: 'POST',
        expectedStatus: '401 Unauthorized',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({
          endpoint: CANCEL_ENDPOINT,
          body: payload,
          overrideTokens: { accessToken: invalidToken, xAuthToken: invalidXToken },
        }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      expect(res.status, 'ORDER-CANCEL-08: Phải từ chối token không hợp lệ 401').toBe(401);
      assertStandardOrderResponse(res, 'ORDER-CANCEL-08');
    });

    test('ORDER-CANCEL-09: Hủy đơn hàng khi thiếu x-auth-token', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        orderCode: Number(config.subscriptionOrderCode) || 1792730478,
      };

      const res = await client.executeInPage(page, {
        endpoint: CANCEL_ENDPOINT,
        method: 'POST',
        body: payload,
        overrideTokens: {
          xAuthToken: '',
        },
        customHeaders: {
          'x-auth-token': null,
        },
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CANCEL-09',
        testName: 'Hủy đơn hàng khi thiếu x-auth-token',
        endpoint: client.resolveUrl(CANCEL_ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({
          endpoint: CANCEL_ENDPOINT,
          body: payload,
          overrideTokens: { xAuthToken: '' },
          customHeaders: { 'x-auth-token': null },
        }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CANCEL-09');
    });

    test('ORDER-CANCEL-10: Hủy đơn hàng khi thiếu cookie phiên', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {
        orderCode: Number(config.subscriptionOrderCode) || 1792730478,
      };

      const res = await client.executeInPage(page, {
        endpoint: CANCEL_ENDPOINT,
        method: 'POST',
        body: payload,
        customHeaders: {
          Cookie: null,
        },
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CANCEL-10',
        testName: 'Hủy đơn hàng khi thiếu cookie phiên',
        endpoint: client.resolveUrl(CANCEL_ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({
          endpoint: CANCEL_ENDPOINT,
          body: payload,
          customHeaders: { Cookie: null },
        }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CANCEL-10');
    });
  });

  // =========================================================================
  // FOLDER 05: CART & PACKAGE CONFIRMATION
  // =========================================================================
  test.describe('05 - Cart & Package Selection (/api/v1.0/subscription/cart)', () => {
    const CART_CONFIRM_ENDPOINT = '/api/v1.0/subscription/cart/confirm';

    test('ORDER-CART-01: Gửi request chọn gói PRO vào giỏ hàng theo cURL mẫu', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { packageCode: 'PRO' };
      const res = await client.executeInPage(page, {
        endpoint: CART_CONFIRM_ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CART-01',
        testName: 'Gửi request chọn gói PRO vào giỏ hàng theo cURL mẫu',
        endpoint: client.resolveUrl(CART_CONFIRM_ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500 (200 OK thành công hoặc 400 nếu gói đã tồn tại trong giỏ)',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: CART_CONFIRM_ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CART-01');
    });

    test('ORDER-CART-02: Chọn gói khi body rỗng không truyền packageCode', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = {};
      const res = await client.executeInPage(page, {
        endpoint: CART_CONFIRM_ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CART-02',
        testName: 'Chọn gói khi body rỗng không truyền packageCode',
        endpoint: client.resolveUrl(CART_CONFIRM_ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500 (4xx lỗi nghiệp vụ)',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: CART_CONFIRM_ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CART-02');
    });

    test('ORDER-CART-03: Chọn gói khi packageCode bằng null', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { packageCode: null };
      const res = await client.executeInPage(page, {
        endpoint: CART_CONFIRM_ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CART-03',
        testName: 'Chọn gói khi packageCode bằng null',
        endpoint: client.resolveUrl(CART_CONFIRM_ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500 (4xx lỗi nghiệp vụ)',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: CART_CONFIRM_ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CART-03');
    });

    test('ORDER-CART-04: Chọn gói khi packageCode không tồn tại', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { packageCode: 'NON_EXISTENT_PACKAGE_XYZ' };
      const res = await client.executeInPage(page, {
        endpoint: CART_CONFIRM_ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CART-04',
        testName: 'Chọn gói khi packageCode không tồn tại',
        endpoint: client.resolveUrl(CART_CONFIRM_ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500 (4xx không tìm thấy gói)',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: CART_CONFIRM_ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CART-04');
    });

    test('ORDER-CART-05: Chọn gói khi packageCode sai kiểu dữ liệu (số thay vì chuỗi)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { packageCode: 123456 };
      const res = await client.executeInPage(page, {
        endpoint: CART_CONFIRM_ENDPOINT,
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CART-05',
        testName: 'Chọn gói khi packageCode sai kiểu dữ liệu (số thay vì chuỗi)',
        endpoint: client.resolveUrl(CART_CONFIRM_ENDPOINT),
        method: 'POST',
        expectedStatus: '< 500 (4xx lỗi định dạng)',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: CART_CONFIRM_ENDPOINT, body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CART-05');
    });

    test('ORDER-CART-06: Chọn gói khi thiếu Authorization', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { packageCode: 'PRO' };
      const res = await client.executeInPage(page, {
        endpoint: CART_CONFIRM_ENDPOINT,
        method: 'POST',
        body: payload,
        customHeaders: { Authorization: null },
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CART-06',
        testName: 'Chọn gói khi thiếu Authorization',
        endpoint: client.resolveUrl(CART_CONFIRM_ENDPOINT),
        method: 'POST',
        expectedStatus: '401 Unauthorized',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: CART_CONFIRM_ENDPOINT, body: payload, customHeaders: { Authorization: null } }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CART-06');
    });

    test('ORDER-CART-07: Chọn gói với access token không hợp lệ', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const invalidToken = config.subscriptionInvalidAccessToken || 'INVALID_TOKEN_FOR_AUTH_TEST';
      const payload = { packageCode: 'PRO' };
      const res = await client.executeInPage(page, {
        endpoint: CART_CONFIRM_ENDPOINT,
        method: 'POST',
        body: payload,
        customHeaders: { Authorization: `Bearer ${invalidToken}` },
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CART-07',
        testName: 'Chọn gói với access token không hợp lệ',
        endpoint: client.resolveUrl(CART_CONFIRM_ENDPOINT),
        method: 'POST',
        expectedStatus: '401 Unauthorized',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: CART_CONFIRM_ENDPOINT, body: payload, customHeaders: { Authorization: `Bearer ${invalidToken}` } }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CART-07');
    });

    test('ORDER-CART-08: Xem chi tiết giỏ hàng hiện tại (/subscription/cart/confirm?voucherCode=)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const res = await client.executeInPage(page, {
        endpoint: '/api/v1.0/subscription/cart/confirm?voucherCode=',
        method: 'GET',
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CART-08',
        testName: 'Xem chi tiết giỏ hàng hiện tại (/subscription/cart/confirm?voucherCode=)',
        endpoint: client.resolveUrl('/api/v1.0/subscription/cart/confirm?voucherCode='),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: '/api/v1.0/subscription/cart/confirm?voucherCode=' }),
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CART-08');
    });

    test('ORDER-CART-09: Lấy danh sách lịch sử đơn hàng (/subscription/order/getAllListOrder)', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      const payload = { page: 0, size: 10 };
      const res = await client.executeInPage(page, {
        endpoint: '/api/v1.0/subscription/order/getAllListOrder',
        method: 'POST',
        body: payload,
      });

      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-CART-09',
        testName: 'Lấy danh sách lịch sử đơn hàng (/subscription/order/getAllListOrder)',
        endpoint: client.resolveUrl('/api/v1.0/subscription/order/getAllListOrder'),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestHeaders: client.buildHeaders({ endpoint: '/api/v1.0/subscription/order/getAllListOrder', body: payload }),
        requestBody: payload,
        responseHeaders: res.headers,
        responseBody: res.data ?? res.rawText,
      });

      assertStandardOrderResponse(res, 'ORDER-CART-09');
    });
  });

  // =========================================================================
  // FOLDER 06: LIFECYCLE FLOW (CHỌN GÓI PRO -> TẠO ĐƠN -> HỦY ĐƠN)
  // =========================================================================
  test.describe('06 - Order Lifecycle Flow', () => {
    test('ORDER-LIFECYCLE-01: Vòng đời Hủy đơn cũ -> Chọn gói Pro -> Tạo đơn hàng -> Hủy đơn sạch sẽ', async ({ page }, testInfo) => {
      verifySafetyGuard(testInfo);

      // BƯỚC 1: Hủy đơn hàng đang chờ cũ (nếu có) để giải phóng slot PENDING
      await cancelPendingOrderIfAny(page);

      // BƯỚC 2: Thêm Gói PRO vào giỏ hàng
      const cartConfirmRes = await client.executeInPage(page, {
        endpoint: '/api/v1.0/subscription/cart/confirm',
        method: 'POST',
        body: { packageCode: 'PRO' },
      });
      console.log('🔄 [LIFECYCLE BƯỚC 2 - CONFIRM CART PRO] Status:', cartConfirmRes.status);
      expect(cartConfirmRes.status).toBeLessThan(500);

      // BƯỚC 3: Xác thực giỏ hàng đã có gói PRO
      const cartDetailRes = await client.executeInPage(page, {
        endpoint: '/api/v1.0/subscription/cart/confirm?voucherCode=',
        method: 'GET',
      });
      console.log('🔄 [LIFECYCLE BƯỚC 3 - GET CART DETAIL] Status:', cartDetailRes.status);
      expect(cartDetailRes.status).toBe(200);

      // BƯỚC 4: Tạo đơn hàng thanh toán cho Gói PRO
      const createPayload = {
        voucherCode: '',
        gcif: '',
      };
      const createRes = await client.executeInPage(page, {
        endpoint: ENDPOINT,
        method: 'POST',
        body: createPayload,
      });

      console.log('🔄 [LIFECYCLE BƯỚC 4 - CREATE ORDER PRO] Status:', createRes.status, createRes.rawText);
      expect(createRes.status).toBeLessThan(500);

      // BƯỚC 5: Hủy đơn hàng vừa tạo để reset trạng thái sạch sẽ cho các lần test sau
      const newPendingCode = await getPendingOrderCode(page);
      let cancelNewRes: any = null;
      if (newPendingCode) {
        cancelNewRes = await client.executeInPage(page, {
          endpoint: '/api/v1.0/subscription/order/cancel',
          method: 'POST',
          body: { orderCode: newPendingCode },
        });
        console.log('🔄 [LIFECYCLE BƯỚC 5 - CANCEL CLEANUP] Status:', cancelNewRes.status);
      }

      // BƯỚC 6: Ghi nhận bằng chứng toàn bộ chu trình
      await recordApiEvidence(page, testInfo, {
        testId: 'ORDER-LIFECYCLE-01',
        testName: 'Vòng đời Hủy đơn cũ -> Chọn gói Pro -> Tạo đơn hàng -> Hủy đơn sạch sẽ',
        endpoint: client.resolveUrl(ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK (Thành công kèm link PayOS)',
        actualStatus: createRes.status,
        requestHeaders: client.buildHeaders({ endpoint: ENDPOINT, body: createPayload }),
        requestBody: {
          step2_cart: { packageCode: 'PRO' },
          step4_createOrder: createPayload,
          step5_cancelOrderCode: newPendingCode,
        },
        responseHeaders: createRes.headers,
        responseBody: {
          cartDetail: cartDetailRes.data,
          createOrderResponse: createRes.data ?? createRes.rawText,
          cancelResponse: cancelNewRes ? (cancelNewRes.data ?? cancelNewRes.rawText) : null,
        },
      });

      assertStandardOrderResponse(createRes, 'ORDER-LIFECYCLE-01');
    });
  });
});
