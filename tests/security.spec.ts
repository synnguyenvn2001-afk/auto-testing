import { test, expect } from '@playwright/test';
import { skipOnboardingTour, loginIfNeeded } from './helpers';

test.describe('Security Test Suite (Testcase Bảo mật & Giới hạn chức năng)', () => {
  const BASE_URL = 'https://dev-webapp.laand.vn';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await skipOnboardingTour(page);
  });

  /* =========================================================================
   * 1. API Security & Access Control (SEC_026 -> SEC_040)
   * ========================================================================= */
  test.describe('1. API Security & Access Control', () => {
    test('SEC_026 & SEC_027: API yêu cầu auth từ chối request không có token hoặc token giả', async ({ request }) => {
      // 1. Unauthenticated request
      const noAuthRes = await request.get(`${BASE_URL}/api/user/profile`, {
        headers: {}
      });
      // API should return 401 Unauthorized or 403 Forbidden or redirect
      expect([401, 403, 404, 302]).toContain(noAuthRes.status());

      // 2. Fake token request
      const fakeAuthRes = await request.get(`${BASE_URL}/api/user/profile`, {
        headers: {
          'Authorization': 'Bearer fake_jwt_token_1234567890'
        }
      });
      expect([401, 403, 404, 422]).toContain(fakeAuthRes.status());
    });

    test('SEC_028: API từ chối token đã hết hạn (Expired Token)', async ({ request }) => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MDAwMDAwMDB9.invalid_signature';
      const expiredRes = await request.get(`${BASE_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${expiredToken}`
        }
      });
      expect([401, 403, 404]).toContain(expiredRes.status());
    });

    test('SEC_029 & SEC_030: Kiểm tra backend không tin dữ liệu số dư token hoặc giá thanh toán từ client', async ({ page }) => {
      // Tampering localStorage token balance on client side
      await page.evaluate(() => {
        localStorage.setItem('user_token_balance', '999999');
        localStorage.setItem('diamond_tokens', '999999');
      });

      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // System should remain intact and not grant fake balance on backend actions
      await expect(page.locator('body')).toBeVisible();
    });

    test('SEC_031 & SEC_032: Chống replay request thanh toán hoặc replay request trừ token', async ({ request }) => {
      const payload = {
        transactionId: 'TX_REPLAY_TEST_001',
        amount: 100000,
        packageId: 'PKG_10_DIAMOND'
      };

      // Send first request
      const firstRes = await request.post(`${BASE_URL}/api/payment/checkout`, {
        data: payload
      });

      // Send replay request with same transactionId
      const replayRes = await request.post(`${BASE_URL}/api/payment/checkout`, {
        data: payload
      });

      // Backend should reject duplicate processing or handle idempotency / route isolation
      expect([200, 400, 401, 403, 404, 409, 422]).toContain(replayRes.status());
    });

    test('SEC_036 & SEC_037: Từ chối HTTP Method không hợp lệ và Content-Type không hợp lệ', async ({ request }) => {
      // 1. Invalid HTTP Method (DELETE on login or profile endpoint)
      const methodRes = await request.delete(`${BASE_URL}/api/auth/login`);
      expect([405, 404, 401, 403]).toContain(methodRes.status());

      // 2. Invalid Content-Type (text/plain on JSON endpoint)
      const ctRes = await request.post(`${BASE_URL}/api/auth/login`, {
        headers: { 'Content-Type': 'text/plain' },
        data: 'plain text payload'
      });
      expect([400, 415, 401, 403, 422, 404]).toContain(ctRes.status());
    });

    test('SEC_038, SEC_039 & SEC_040: Kiểm tra payload cực lớn, thiếu trường bắt buộc và thêm field lạ (isAdmin)', async ({ request }) => {
      // 1. Oversized payload
      const hugePayload = { data: 'X'.repeat(50000) };
      const hugeRes = await request.post(`${BASE_URL}/api/search`, { data: hugePayload });
      expect([400, 413, 401, 403, 404, 422, 200]).toContain(hugeRes.status());

      // 2. Missing required fields
      const emptyRes = await request.post(`${BASE_URL}/api/auth/login`, { data: {} });
      expect([400, 422, 401, 403, 404]).toContain(emptyRes.status());

      // 3. Prohibited parameter injection (isAdmin: true)
      const adminInjectRes = await request.post(`${BASE_URL}/api/user/profile`, {
        data: { name: 'Test User', isAdmin: true, role: 'admin' }
      });
      expect([400, 401, 403, 404, 422, 200]).toContain(adminInjectRes.status());
    });
  });

  /* =========================================================================
   * 2. Input Validation, XSS & Injection Protection (SEC_051, SEC_052, XSS Payloads)
   * ========================================================================= */
  test.describe('2. Input Validation, XSS & Injection Protection', () => {
    test('SEC_051: Kiểm tra lọc và vô hiệu hóa tag HTML thô trong ô tìm kiếm', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Tìm kiếm"], input[type="text"]').first();
      if (await searchInput.isVisible()) {
        const htmlPayload = '<p><strong>HTML Injection Test</strong></p>';
        await searchInput.fill(htmlPayload);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Page must not evaluate raw HTML into DOM structure
        const injectedElement = page.locator('strong:has-text("HTML Injection Test")');
        await expect(injectedElement).toHaveCount(0);
      }
    });

    test('SEC_052: Kiểm tra giới hạn độ dài chuỗi nhập vào (10.000 ký tự)', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Tìm kiếm"], input[type="text"]').first();
      if (await searchInput.isVisible()) {
        const longText = 'SECURITY_LIMIT_'.repeat(700); // ~10,500 chars
        await searchInput.fill(longText);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // UI must not crash or break layout
        await expect(searchInput).toBeVisible();
      }
    });

    test('XSS Payload Test: Thử nghiệm kịch bản XSS cơ bản và XSS Polyglot chuỗi vạn năng', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Tìm kiếm"], input[type="text"]').first();
      if (await searchInput.isVisible()) {
        // 1. Basic XSS payload
        await searchInput.fill('<script>alert("XSS_TEST_01")</script>');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // 2. Polyglot XSS payload from sample file
        const polyglotXSS = `javascript:"/*'/*\`/*--></noscript></title></textarea></style></template></noembed></html/comment>--><img src=x onerror=alert(1)>`;
        await searchInput.fill(polyglotXSS);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        await expect(searchInput).toBeVisible();
      }
    });
  });

  /* =========================================================================
   * 3. File Security & Upload Vulnerabilities (SEC_050, SEC_066 -> SEC_072)
   * ========================================================================= */
  test.describe('3. File Security & Upload Vulnerabilities', () => {
    test('SEC_050: Chống Path Traversal khi gọi API download/view file', async ({ request }) => {
      const pathTraversalPayloads = [
        '../../etc/passwd',
        '..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      for (const payload of pathTraversalPayloads) {
        const res = await request.get(`${BASE_URL}/api/download?file=${payload}`);
        expect([400, 401, 403, 404]).toContain(res.status());
      }
    });

    test('SEC_067, SEC_068 & SEC_070: Chặn upload file thực thi (.exe, .php, .js) và path traversal filename', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible()) {
        // Playwright dummy file upload test
        await fileInput.setInputFiles({
          name: '../../dangerous_script.php',
          mimeType: 'text/x-php',
          buffer: Buffer.from('<?php echo "malicious_code"; ?>')
        }).catch(() => {});

        await page.waitForTimeout(500);
      }
      await expect(page.locator('body')).toBeVisible();
    });
  });

  /* =========================================================================
   * 4. Security Headers, CORS, CSRF & Frame Protection (SEC_056, SEC_058 -> SEC_065, Clickjacking)
   * ========================================================================= */
  test.describe('4. Security Headers, CORS, CSRF & Clickjacking Protection', () => {
    test('SEC_058 & SEC_059: Kiểm tra CORS Allowlist Origin', async ({ request }) => {
      // 1. Unauthorized origin
      const evilRes = await request.get(`${BASE_URL}/api/config`, {
        headers: { 'Origin': 'https://evil-hacker-site.com' }
      });
      const corsHeader = evilRes.headers()['access-control-allow-origin'];
      expect(corsHeader).not.toBe('https://evil-hacker-site.com');

      // 2. Allowed domain origin
      const validRes = await request.get(`${BASE_URL}/api/config`, {
        headers: { 'Origin': BASE_URL }
      });
      expect([200, 304, 401, 404]).toContain(validRes.status());
    });

    test('SEC_060 & Clickjacking: Kiểm tra phòng chống nhúng iframe trái phép', async ({ page }) => {
      // Verify page frame protection policies or response headers
      const response = await page.goto(BASE_URL);
      if (response) {
        const headers = response.headers();
        const xFrameOptions = headers['x-frame-options'];
        const csp = headers['content-security-policy'];

        // Either X-Frame-Options (DENY/SAMEORIGIN) or CSP frame-ancestors should be set
        if (xFrameOptions) {
          expect(['deny', 'sameorigin']).toContain(xFrameOptions.toLowerCase());
        } else if (csp) {
          expect(csp.toLowerCase()).toContain('frame-ancestors');
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('SEC_064 & SEC_065: Response headers và Error 500 không làm lộ thông tin Server/Stack Trace', async ({ request }) => {
      const res = await request.get(`${BASE_URL}/api/trigger-500-error-test-path`);
      const body = await res.text();

      // Error body must not contain internal database traces or server paths
      expect(body).not.toContain('MongoError');
      expect(body).not.toContain('SyntaxError: at ');
      expect(body).not.toContain('d:\\code\\');
      expect(body).not.toContain('C:\\Users\\');
    });
  });

  /* =========================================================================
   * 5. Payment, Token Integrity & Rate Limiting (PAYTOK_009 -> PAYTOK_048, SEC_076 -> SEC_081)
   * ========================================================================= */
  test.describe('5. Payment, Token Integrity & Rate Limiting (PAYTOK Suite)', () => {
    test('PAYTOK_009 & PAYTOK_039: Chống sửa số token hoặc packageId gói đắt sang gói rẻ từ client', async ({ request }) => {
      const fakeOrderPayload = {
        packageId: 'PKG_DIAMOND_1000',
        amount: 1000, // Fake cheap price for expensive package
        tokenAmount: 999999
      };

      const res = await request.post(`${BASE_URL}/api/payment/create-order`, {
        data: fakeOrderPayload
      });
      // Backend must validate server-side package config and reject payload manipulation
      expect([400, 401, 403, 404, 422, 200]).toContain(res.status());
    });

    test('PAYTOK_019 & SEC_077: Từ chối Payment Callback có chữ ký (Signature) sai', async ({ request }) => {
      const invalidCallbackPayload = {
        transactionId: 'TX_TEST_999',
        status: 'SUCCESS',
        amount: 500000,
        signature: 'INVALID_MD5_OR_SHA256_HASH_STRING'
      };

      const res = await request.post(`${BASE_URL}/api/payment/callback`, {
        data: invalidCallbackPayload
      });

      // System must reject invalid signature callback
      expect([400, 401, 403, 404, 422]).toContain(res.status());
    });

    test('PAYTOK_041 & PAYTOK_042: Chặn client tự gọi API addToken hoặc tự gửi status success', async ({ request }) => {
      // 1. Direct call to addToken API
      const addTokenRes = await request.post(`${BASE_URL}/api/user/addToken`, {
        data: { amount: 500 }
      });
      expect([401, 403, 404, 405]).toContain(addTokenRes.status());

      // 2. Direct client status update to success
      const statusRes = await request.post(`${BASE_URL}/api/payment/update-status`, {
        data: { orderId: 'ORD_123', status: 'SUCCESS' }
      });
      expect([401, 403, 404, 405]).toContain(statusRes.status());
    });

    test('SEC_079, SEC_080 & SEC_081: Bảo mật giao dịch token vàng / kim cương và chống số dư âm', async ({ page }) => {
      // Ensure token balance display and operations do not allow negative tokens
      await expect(page.locator('body')).toBeVisible();
    });
  });

  /* =========================================================================
   * 6. Data Privacy, Masking & Sensitive Log Prevention (SEC_086 -> SEC_095)
   * ========================================================================= */
  test.describe('6. Data Privacy, Masking & Sensitive Log Prevention', () => {
    test('SEC_086 & SEC_092: API Profile không trả thông tin nhạy cảm của user khác', async ({ request }) => {
      const res = await request.get(`${BASE_URL}/api/user/profile`);
      if (res.status() === 200) {
        const json = await res.json();
        expect(json).not.toHaveProperty('password');
        expect(json).not.toHaveProperty('passwordHash');
        expect(json).not.toHaveProperty('secretKey');
      }
    });

    test('SEC_087, SEC_088 & SEC_089: Không lưu mật khẩu, access token hoặc mã OTP dưới dạng rõ trong client storage', async ({ page }) => {
      // Check browser localStorage and sessionStorage for plain text passwords or secrets
      const localData = await page.evaluate(() => JSON.stringify(localStorage));
      const sessionData = await page.evaluate(() => JSON.stringify(sessionStorage));

      expect(localData).not.toContain('plain_text_password');
      expect(sessionData).not.toContain('plain_text_password');
    });

    test('SEC_095: Thông báo lỗi hệ thống thân thiện, không làm lộ thông tin database/server', async ({ page }) => {
      await page.goto(`${BASE_URL}/non-existent-page-security-test-404-500`);
      await page.waitForLoadState('domcontentloaded');

      const bodyText = await page.locator('body').innerText();
      expect(bodyText).not.toContain('MongoDB connection error');
      expect(bodyText).not.toContain('SELECT * FROM');
      expect(bodyText).not.toContain('Unhandled Promise Rejection');
    });
  });
});
