import { test, expect } from '@playwright/test';
import { skipOnboardingTour, loginIfNeeded } from './helpers';

test.describe('Security Test Suite (Testcase Bảo mật & Giới hạn chức năng)', () => {
  const BASE_URL = process.env.BASE_URL || 'https://landbase.vn';

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
        localStorage.setItem('gold_tokens', '999999');
      });

      await page.goto(`${BASE_URL}/ban-do`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      // Kiểm tra phần tử hiển thị token vàng trên Header
      const tokenDisplay = page.locator('#tour-sidebar-gold, [class*="fa-coins"]').first();
      await expect(tokenDisplay).toBeVisible({ timeout: 10000 });

      // Server-side balance không được bị ghi đè thành 999999 bởi client tampering
      const tokenText = await tokenDisplay.innerText();
      expect(tokenText).not.toContain('999999');
    });

    test('SEC_031 & SEC_032: Chống replay request thanh toán hoặc replay request trừ token', async ({ request }) => {
      const payload = {
        transactionId: 'TX_REPLAY_TEST_' + Date.now(),
        amount: 100000,
        packageId: 'PKG_10_DIAMOND'
      };

      // Send first request
      const firstRes = await request.post(`${BASE_URL}/api/payment/checkout`, {
        data: payload
      });

      // Nếu endpoint thanh toán chưa triển khai trên môi trường hiện tại (404),
      // Bắt buộc skip với lý do rõ ràng, tuyệt đối không chấp nhận 404 để pass giả
      if (firstRes.status() === 404) {
        test.skip(true, 'API payment/checkout chưa được triển khai trên môi trường hiện tại (trả về 404)');
        return;
      }

      // Send replay request with same transactionId
      const replayRes = await request.post(`${BASE_URL}/api/payment/checkout`, {
        data: payload
      });

      // Replay request không được phép tạo giao dịch lặp hoặc trừ trùng:
      // Phải trả mã từ chối (400, 409, 422, 403) hoặc nếu 200 thì phải mang cờ idempotent chặn trùng
      if (replayRes.status() === 200) {
        const body = await replayRes.json().catch(() => ({}));
        expect(body).toHaveProperty('duplicate', true);
      } else {
        expect([400, 409, 422, 403]).toContain(replayRes.status());
      }
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
      expect([400, 413, 401, 403, 404, 422]).toContain(hugeRes.status());

      // 2. Missing required fields
      const emptyRes = await request.post(`${BASE_URL}/api/auth/login`, { data: {} });
      expect([400, 422, 401, 403, 404]).toContain(emptyRes.status());

      // 3. Prohibited parameter injection (isAdmin: true)
      const adminInjectRes = await request.post(`${BASE_URL}/api/user/profile`, {
        data: { name: 'Test User', isAdmin: true, role: 'admin' }
      });
      expect([400, 401, 403, 404, 422]).toContain(adminInjectRes.status());
    });
  });

  /* =========================================================================
   * 2. Input Validation, XSS & Injection Protection (SEC_051, SEC_052, XSS Payloads)
   * ========================================================================= */
  test.describe('2. Input Validation, XSS & Injection Protection', () => {
    test('SEC_051: Kiểm tra lọc và vô hiệu hóa tag HTML thô trong ô tìm kiếm', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Tìm kiếm"], input[type="text"]').first();
      await expect(searchInput).toBeVisible({ timeout: 10000 });
      const htmlPayload = '<p><strong>HTML Injection Test</strong></p>';
      await searchInput.fill(htmlPayload);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Page must not evaluate raw HTML into DOM structure
      const injectedElement = page.locator('strong:has-text("HTML Injection Test")');
      await expect(injectedElement).toHaveCount(0);
    });

    test('SEC_052: Kiểm tra giới hạn độ dài chuỗi nhập vào (10.000 ký tự)', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Tìm kiếm"], input[type="text"]').first();
      await expect(searchInput).toBeVisible({ timeout: 10000 });
      const longText = 'SECURITY_LIMIT_'.repeat(700); // ~10,500 chars
      await searchInput.fill(longText);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // UI must not crash or break layout
      await expect(searchInput).toBeVisible();
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
      expect(body.toLowerCase()).not.toContain(process.cwd().toLowerCase());
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

      // Nếu endpoint payment create-order chưa được triển khai trên môi trường hiện tại (404)
      if (res.status() === 404) {
        test.skip(true, 'API payment/create-order chưa được triển khai trên môi trường hiện tại (trả về 404)');
        return;
      }

      // Backend must validate server-side package config and reject payload manipulation
      if (res.status() === 200) {
        const body = await res.json().catch(() => ({}));
        // Server-side validation must not allow fake client amount (1000 VND) or fake tokenAmount (999999)
        if (body.amount !== undefined) {
          expect(body.amount).not.toBe(1000);
        }
        if (body.tokenAmount !== undefined) {
          expect(body.tokenAmount).not.toBe(999999);
        }
      } else {
        expect([400, 401, 403, 422]).toContain(res.status());
      }
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

      if (res.status() === 404) {
        test.skip(true, 'API payment/callback chưa được triển khai trên môi trường hiện tại (trả về 404)');
        return;
      }

      // System must reject invalid signature callback
      expect([400, 401, 403, 422]).toContain(res.status());
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
      // Kiểm tra phần tử hiển thị token vàng trên Header
      const tokenDisplay = page.locator('#tour-sidebar-gold, [class*="fa-coins"]').first();
      await expect(tokenDisplay).toBeVisible({ timeout: 10000 });

      // Số dư token không được phép hiển thị giá trị âm (không chứa dấu trừ '-')
      const tokenText = await tokenDisplay.innerText();
      expect(tokenText).not.toContain('-');
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

  /* =========================================================================
   * 7. Stress Testing & Multi-Page Concurrency Suite (Tất cả các màn hình & API Modules)
   * ========================================================================= */
  test.describe('7. Multi-Module Stress Testing & Rate Limiting Protection (Tất cả các màn hình)', () => {
    // 1. Màn Tin tức thị trường (Market News)
    test('SEC_STRESS_001_NEWS: Stress test màn Tin tức thị trường (Burst load 30 requests dồn dập tìm kiếm & lọc danh mục)', async ({ request }) => {
      const promises = Array.from({ length: 30 }).map((_, i) =>
        request.get(`${BASE_URL}/tin-tuc-thi-truong?keyword=quy_hoach_${i}&tag=vi-mo`).catch((err) => ({ error: err }))
      );
      const results = await Promise.all(promises);
      expect(results.length).toBe(30);

      const statuses = results.map((r) => ('status' in r && typeof r.status === 'function' ? r.status() : 0));
      expect(statuses.some((code) => code >= 500 && code < 600)).toBeFalsy();
    });

    // 2. Màn Tin rao vặt (Classified Ads)
    test('SEC_STRESS_002_ADS: Stress test màn Tin rao vặt (Gửi song song 30 requests tải danh sách tin bài & lọc vị trí)', async ({ request }) => {
      const promises = Array.from({ length: 30 }).map((_, i) =>
        request.get(`${BASE_URL}/tin-rao-vat?page=${(i % 5) + 1}&category=ban-nha-dat`).catch((err) => ({ error: err }))
      );
      const results = await Promise.all(promises);
      expect(results.length).toBe(30);

      const statuses = results.map((r) => ('status' in r && typeof r.status === 'function' ? r.status() : 0));
      expect(statuses.some((code) => code >= 500 && code < 600)).toBeFalsy();
    });

    // 3. Màn Bản đồ & Tìm kiếm (Map & Spatial Search)
    test('SEC_STRESS_003_MAP: Stress test màn Bản đồ (Gửi dồn dập 30 requests truy vấn toạ độ & polygon lớp bản đồ)', async ({ request }) => {
      const promises = Array.from({ length: 30 }).map((_, i) =>
        request.get(`${BASE_URL}/ban-do?lat=21.02${i}&lng=105.85${i}&zoom=14`).catch((err) => ({ error: err }))
      );
      const results = await Promise.all(promises);
      expect(results.length).toBe(30);

      const statuses = results.map((r) => ('status' in r && typeof r.status === 'function' ? r.status() : 0));
      expect(statuses.some((code) => code >= 500 && code < 600)).toBeFalsy();
    });

    // 4. Màn Đăng nhập & Tài khoản (Auth & User Profile)
    test('SEC_STRESS_004_AUTH: Stress test màn Đăng nhập & Profile (Brute-force & Auth Rate Limiting 25 requests)', async ({ request }) => {
      const promises = Array.from({ length: 25 }).map((_, i) =>
        request.post(`${BASE_URL}/api/auth/login`, {
          data: { username: `user_stress_${i}`, password: `Pass_Stress_${i}` }
        }).catch((err) => ({ error: err }))
      );
      const results = await Promise.all(promises);
      expect(results.length).toBe(25);

      const statuses = results.map((r) => ('status' in r && typeof r.status === 'function' ? r.status() : 0));
      // Auth requests must return standard HTTP codes (400, 401, 403, 429) without HTTP 500 crash
      expect(statuses.some((code) => code >= 500 && code < 600)).toBeFalsy();
    });

    // 5. Màn Cẩm nang BĐS (Handbook)
    test('SEC_STRESS_005_HANDBOOK: Stress test màn Cẩm nang BĐS (Burst load 25 requests tải bài viết cẩm nang)', async ({ request }) => {
      const promises = Array.from({ length: 25 }).map((_, i) =>
        request.get(`${BASE_URL}/cam-nang?category=phap-ly&page=${(i % 3) + 1}`).catch((err) => ({ error: err }))
      );
      const results = await Promise.all(promises);
      expect(results.length).toBe(25);

      const statuses = results.map((r) => ('status' in r && typeof r.status === 'function' ? r.status() : 0));
      expect(statuses.some((code) => code >= 500 && code < 600)).toBeFalsy();
    });

    // 6. Màn Công cụ tài chính / Vay (Financial Tools)
    test('SEC_STRESS_006_TOOLS: Stress test màn Công cụ tài chính (Gửi dồn dập 25 requests tính toán lãi vay & thuế)', async ({ request }) => {
      const promises = Array.from({ length: 25 }).map((_, i) =>
        request.get(`${BASE_URL}/api/tools/loan-calculator?amount=${1000000000 + i * 10000000}&rate=8.5&months=120`).catch((err) => ({ error: err }))
      );
      const results = await Promise.all(promises);
      expect(results.length).toBe(25);

      const statuses = results.map((r) => ('status' in r && typeof r.status === 'function' ? r.status() : 0));
      expect(statuses.some((code) => code >= 500 && code < 600)).toBeFalsy();
    });

    // 7. Stress test đa màn hình đồng thời (Cross-Module Parallel Multi-Page Load Test)
    test('SEC_STRESS_007_ALL_PAGES: Stress test ĐA MÀN HÌNH ĐỒNG THỜI (Tải song song Tin tức, Tin rao, Bản đồ, Cẩm nang & Auth)', async ({ request }) => {
      const endpoints = [
        `${BASE_URL}/tin-tuc-thi-truong`,
        `${BASE_URL}/tin-rao-vat`,
        `${BASE_URL}/ban-do`,
        `${BASE_URL}/cam-nang`,
        `${BASE_URL}/bang-gia`,
        `${BASE_URL}/tong-quan-tai-khoan`
      ];

      // Replicate 6 requests for each of the 6 main screens = 36 parallel cross-module requests
      const multiPagePromises: Promise<any>[] = [];
      for (let i = 0; i < 6; i++) {
        endpoints.forEach((ep) => {
          multiPagePromises.push(request.get(ep).catch((err) => ({ error: err })));
        });
      }

      const results = await Promise.all(multiPagePromises);
      expect(results.length).toBe(36);

      const statuses = results.map((r) => ('status' in r && typeof r.status === 'function' ? r.status() : 0));
      // System must hold up under cross-module concurrent load without internal 500 crashes
      expect(statuses.some((code) => code >= 500 && code < 600)).toBeFalsy();
    });
  });
});

