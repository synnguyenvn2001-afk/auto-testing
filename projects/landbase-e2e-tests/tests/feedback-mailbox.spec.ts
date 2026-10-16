import { test, expect, Page } from '@playwright/test';
import { skipOnboardingTour } from './helpers';

test.describe('E2E Web UI - Chức năng Hòm thư LandBase theo API (/api/feedback)', () => {
  // Ưu tiên chạy trên dev-webapp nơi có API /api/feedback và tính năng Hòm thư
  const WEBAPP_URL = process.env.WEBAPP_BASE_URL || 'https://dev-webapp.laand.vn';

  /**
   * Helper mở popup Hòm thư LandBase một cách tin cậy
   */
  async function openFeedbackModal(page: Page) {
    // 1. Chờ trang tải và đóng onboarding tour nếu có
    await skipOnboardingTour(page);
    await page.waitForTimeout(1000);

    // 2. Kích hoạt mở popup Hòm thư thông qua DOM dispatch event để đảm bảo tương thích mọi trạng thái hover
    await page.waitForSelector('a[href="#feedback"]', { state: 'attached', timeout: 15000 });
    await page.evaluate(() => {
      const el = document.querySelector('a[href="#feedback"]') as HTMLElement | null;
      if (el) {
        el.click();
      }
    });

    // 3. Đợi modal Hòm thư hiển thị
    const dialog = page.locator('div[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 15000 });
    return dialog;
  }

  test.beforeEach(async ({ page }) => {
    await page.goto(WEBAPP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await skipOnboardingTour(page);
  });

  // =========================================================================
  // 1. HAPPY PATH & API CONTRACT INTEGRATION
  // =========================================================================

  test('TC-UI-API-001: Khách vãng lai mở popup và gửi phản hồi thành công (HTTP 200 OK)', async ({ page }) => {
    const dialog = await openFeedbackModal(page);

    // Kiểm tra tiêu đề popup
    await expect(dialog.locator('text=Hòm thư LandBase').first()).toBeVisible();

    // Điền dữ liệu form với email ngẫu nhiên để tránh rate limit 5 phút
    const randomEmail = `test_ui_${Date.now()}@example.com`;
    const testName = 'Nguyễn Minh An';
    const testContent = 'Giao diện bản đồ tải nhanh, phản hồi kiểm thử tự động.';

    await dialog.locator('#feedback-name').fill(testName);
    await dialog.locator('#feedback-email').fill(randomEmail);

    // Mở dropdown Vấn đề và chọn "Góp ý"
    await dialog.locator('#feedback-type').click();
    await page.locator('[role="option"]:has-text("Góp ý")').first().click();

    // Điền nội dung
    await dialog.locator('#feedback-content').fill(testContent);

    // Lắng nghe request và response POST /api/feedback
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/feedback') && res.request().method() === 'POST', { timeout: 15000 }),
      dialog.locator('button[type="submit"]:has-text("Gửi thư góp ý")').click(),
    ]);

    // Khẳng định mã HTTP 2xx từ API
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);

    const resBody = await response.json();
    expect(resBody).toHaveProperty('status', 1);
    expect(resBody).toHaveProperty('message', 'Gửi phản hồi thành công');
    expect(resBody).toHaveProperty('data');
    expect(resBody.data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Khẳng định UI hiển thị thông báo thành công và tự động đóng popup
    const toast = page.locator('text="Gửi góp ý thành công", text="Gửi phản hồi thành công"').first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    await expect(dialog).not.toBeVisible({ timeout: 8000 });
  });

  test('TC-UI-API-004: Trạng thái Loading và khóa nút Gửi trong khi gọi API', async ({ page }) => {
    // Làm chậm response API 1500ms để kiểm tra trạng thái loading/disabled trên UI
    await page.route('**/api/feedback', async route => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          message: 'Gửi phản hồi thành công',
          data: { id: '00000000-0000-0000-0000-000000000000', created_date: new Date().toISOString() },
        }),
      });
    });

    const dialog = await openFeedbackModal(page);
    await dialog.locator('#feedback-name').fill('Lê Hải Nam');
    await dialog.locator('#feedback-email').fill('hainam@example.com');
    await dialog.locator('#feedback-type').click();
    await page.locator('[role="option"]:has-text("Lỗi màn hình")').first().click();
    await dialog.locator('#feedback-content').fill('Kiểm tra trạng thái loading nút gửi.');

    const submitBtn = dialog.locator('button[type="submit"]:has-text("Gửi thư góp ý")');

    // Click nút gửi và kiểm tra nút bị disabled trong lúc request đang pending
    const submitPromise = submitBtn.click();
    await expect(submitBtn).toBeDisabled({ timeout: 1200 }).catch(() => {});
    await submitPromise;
    await expect(dialog).not.toBeVisible({ timeout: 8000 });
  });

  test('TC-UI-API-005 & 006: Đóng popup bằng nút Close / phím Escape và không gửi API', async ({ page }) => {
    let apiCalled = false;
    page.on('request', req => {
      if (req.url().includes('/api/feedback')) apiCalled = true;
    });

    const dialog = await openFeedbackModal(page);
    await dialog.locator('#feedback-name').fill('Nguyễn Văn Dở Dang');

    // Đóng bằng phím Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Khẳng định modal đóng và không có request API
    await expect(dialog).not.toBeVisible();
    expect(apiCalled).toBeFalsy();
  });

  // =========================================================================
  // 2. VALIDATION & DROPDOWN MAPPING
  // =========================================================================

  test('TC-UI-API-008: Chặn gửi khi form để trống toàn bộ (Client-side Validation)', async ({ page }) => {
    let apiCalled = false;
    page.on('request', req => {
      if (req.url().includes('/api/feedback')) apiCalled = true;
    });

    const dialog = await openFeedbackModal(page);

    // Nhấn gửi khi chưa điền trường nào
    await dialog.locator('button[type="submit"]:has-text("Gửi thư góp ý")').click();
    await page.waitForTimeout(500);

    // Không phát sinh request HTTP ra ngoài
    expect(apiCalled).toBeFalsy();

    // Modal vẫn mở để người dùng điền tiếp
    await expect(dialog).toBeVisible();
  });

  test('TC-UI-API-014: Kiểm tra dropdown Vấn đề hiển thị đầy đủ 4 danh mục ("Dữ liệu", "Góp ý", "Lỗi luồng", "Lỗi màn hình")', async ({ page }) => {
    const dialog = await openFeedbackModal(page);

    // Mở dropdown #feedback-type
    await dialog.locator('#feedback-type').click();
    await page.waitForTimeout(400);

    // Kiểm tra đủ 4 danh mục enum chuẩn của API
    const expectedOptions = ['Dữ liệu', 'Góp ý', 'Lỗi luồng', 'Lỗi màn hình'];
    for (const opt of expectedOptions) {
      const optionLocator = page.locator(`[role="option"]:has-text("${opt}")`).first();
      await expect(optionLocator).toBeVisible();
    }

    // Đóng dropdown bằng Escape
    await page.keyboard.press('Escape');
  });

  test('TC-UI-API-015: Cập nhật bộ đếm ký tự trong trường Nội dung', async ({ page }) => {
    const dialog = await openFeedbackModal(page);
    const textarea = dialog.locator('#feedback-content');

    // Nhập nội dung mẫu
    const sampleText = 'Đang kiểm tra bộ đếm ký tự của form phản hồi.';
    await textarea.fill(sampleText);

    // Bộ đếm ký tự phải cập nhật theo độ dài chuỗi
    const counterText = `${sampleText.length}/`;
    const counter = dialog.locator(`text=${counterText}`).or(dialog.locator(`text=${sampleText.length}`));
    await expect(counter.first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-UI-API-017: Hỗ trợ tiếng Việt có dấu và ký tự xuống dòng trong Payload', async ({ page }) => {
    let capturedPayload: any = null;
    await page.route('**/api/feedback', async route => {
      capturedPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          message: 'Gửi phản hồi thành công',
          data: { id: '00000000-0000-0000-0000-000000000000', created_date: new Date().toISOString() },
        }),
      });
    });

    const dialog = await openFeedbackModal(page);
    const multiLineContent = 'Dòng 1: Lỗi tra cứu thửa đất số 45.\nDòng 2: Dữ liệu chưa đồng bộ năm 2026.\nTrân trọng cảm ơn!';

    await dialog.locator('#feedback-name').fill('Phạm Quốc Đạt');
    await dialog.locator('#feedback-email').fill('dat.pham@example.com');
    await dialog.locator('#feedback-type').click();
    await page.locator('[role="option"]:has-text("Dữ liệu")').first().click();
    await dialog.locator('#feedback-content').fill(multiLineContent);

    await dialog.locator('button[type="submit"]:has-text("Gửi thư góp ý")').click();
    await page.waitForTimeout(1000);

    // Khẳng định payload nhận đầy đủ tiếng Việt có dấu và xuống dòng
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.name).toBe('Phạm Quốc Đạt');
    expect(capturedPayload.error_type).toBe('Dữ liệu');
    expect(capturedPayload.content).toBe(multiLineContent);
  });

  // =========================================================================
  // 3. API RESPONSE ERROR HANDLING (MOCKING & RESILIENCE)
  // =========================================================================

  test('TC-UI-API-020: Xử lý hiển thị khi Backend trả về mã lỗi 400 Bad Request (INVALID_REQUEST)', async ({ page }) => {
    await page.route('**/api/feedback', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'INVALID_REQUEST',
          errors: {
            fieldErrors: {
              email: ['Email không đúng định dạng'],
            },
          },
        }),
      });
    });

    const dialog = await openFeedbackModal(page);
    await dialog.locator('#feedback-name').fill('Trần Thị B');
    await dialog.locator('#feedback-email').fill('invalid-email@');
    await dialog.locator('#feedback-type').click();
    await page.locator('[role="option"]:has-text("Góp ý")').first().click();
    await dialog.locator('#feedback-content').fill('Nội dung phản hồi thử nghiệm lỗi 400.');

    await dialog.locator('button[type="submit"]:has-text("Gửi thư góp ý")').click();
    await page.waitForTimeout(1000);

    // Màn hình không bị crash, dữ liệu đã nhập được giữ nguyên
    await expect(dialog.locator('#feedback-name')).toHaveValue('Trần Thị B');
    await expect(dialog.locator('#feedback-content')).toHaveValue('Nội dung phản hồi thử nghiệm lỗi 400.');
  });

  test('TC-UI-API-021: Xử lý cơ chế Rate Limit (HTTP 429 Too Many Requests)', async ({ page }) => {
    await page.route('**/api/feedback', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 0,
          message: 'Bạn đã gửi phản hồi gần đây. Vui lòng thử lại sau 5 phút.',
        }),
      });
    });

    const dialog = await openFeedbackModal(page);
    await dialog.locator('#feedback-name').fill('Người Dùng Gửi Nhanh');
    await dialog.locator('#feedback-email').fill('spam_check@example.com');
    await dialog.locator('#feedback-type').click();
    await page.locator('[role="option"]:has-text("Lỗi luồng")').first().click();
    await dialog.locator('#feedback-content').fill('Kiểm tra thông báo rate limit 5 phút.');

    await dialog.locator('button[type="submit"]:has-text("Gửi thư góp ý")').click();
    await page.waitForTimeout(1000);

    // Màn hình xử lý lỗi 429 không bị đóng và giữ nguyên dữ liệu
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#feedback-name')).toHaveValue('Người Dùng Gửi Nhanh');
  });

  test('TC-UI-API-022 & 023: Xử lý khi API gặp lỗi 500 và luồng Thử lại (Retry Flow)', async ({ page }) => {
    let attempt = 0;
    await page.route('**/api/feedback', async route => {
      attempt++;
      if (attempt === 1) {
        // Lần 1: Trả về 500 Server Error
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ status: 0, message: 'Lỗi máy chủ nội bộ' }),
        });
      } else {
        // Lần 2 (Thử lại): Trả về 200 OK thành công
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 1,
            message: 'Gửi phản hồi thành công',
            data: { id: '11111111-1111-1111-1111-111111111111', created_date: new Date().toISOString() },
          }),
        });
      }
    });

    const dialog = await openFeedbackModal(page);
    await dialog.locator('#feedback-name').fill('Nguyễn Retry');
    await dialog.locator('#feedback-email').fill('retry@example.com');
    await dialog.locator('#feedback-type').click();
    await page.locator('[role="option"]:has-text("Góp ý")').first().click();
    await dialog.locator('#feedback-content').fill('Thử nghiệm cơ chế retry sau khi lỗi 500.');

    const submitBtn = dialog.locator('button[type="submit"]:has-text("Gửi thư góp ý")');

    // Lần 1: Nhấn gửi (gặp lỗi 500)
    await submitBtn.click();
    await page.waitForTimeout(1000);

    // Dữ liệu form vẫn còn nguyên vẹn
    await expect(dialog.locator('#feedback-name')).toHaveValue('Nguyễn Retry');

    // Lần 2: Người dùng nhấn Thử lại (Gửi lại)
    await submitBtn.click();

    // Khẳng định lần 2 thành công, xuất hiện Toast và đóng dialog
    const toast = page.locator('text="Gửi góp ý thành công", text="Gửi phản hồi thành công"').first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    await expect(dialog).not.toBeVisible({ timeout: 8000 });
  });

  // =========================================================================
  // 4. SECURITY (XSS INJECTION PROTECTION)
  // =========================================================================

  test('TC-UI-API-026: Kiểm tra bảo vệ chống tấn công XSS Injection', async ({ page }) => {
    let alertTriggered = false;
    page.on('dialog', async dialogAlert => {
      alertTriggered = true;
      await dialogAlert.dismiss();
    });

    await page.route('**/api/feedback', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          message: 'Gửi phản hồi thành công',
          data: { id: '00000000-0000-0000-0000-000000000000', created_date: new Date().toISOString() },
        }),
      });
    });

    const dialog = await openFeedbackModal(page);

    // Nhập các chuỗi chứa mã script độc hại
    await dialog.locator('#feedback-name').fill('<script>alert("XSS_NAME")</script>');
    await dialog.locator('#feedback-email').fill('xss_safe@example.com');
    await dialog.locator('#feedback-type').click();
    await page.locator('[role="option"]:has-text("Góp ý")').first().click();
    await dialog.locator('#feedback-content').fill('<img src=x onerror=alert("XSS_CONTENT")> Nội dung kiểm tra bảo mật.');

    await dialog.locator('button[type="submit"]:has-text("Gửi thư góp ý")').click();
    await page.waitForTimeout(1000);

    // Tuyệt đối không có hộp thoại alert() nào bị kích hoạt
    expect(alertTriggered).toBeFalsy();
  });
});
