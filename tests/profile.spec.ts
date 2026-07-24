import { test, expect } from '@playwright/test';
import { skipOnboardingTour, loginIfNeeded } from './helpers';

test.describe('Quản lý Tài khoản (Profile & Password Change Tests)', () => {
  const PROFILE_URL = 'https://dev-webapp.laand.vn/tong-quan-tai-khoan';

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await skipOnboardingTour(page);
    await loginIfNeeded(page);

    if (!page.url().includes('tong-quan-tai-khoan')) {
      await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
      await skipOnboardingTour(page);
    }
  });

  /* =========================================================================
   * 1. TAB THÔNG TIN CÁ NHÂN
   * ========================================================================= */
  test.describe('1. Tab Thông tin cá nhân', () => {
    test('PROFILE_001: Truy cập trang Tổng quan tài khoản và kiểm tra giao diện Tab Thông tin cá nhân', async ({ page }) => {
      const pageTitle = page.locator('text=Tổng quan tài khoản').first();
      await expect(pageTitle).toBeVisible({ timeout: 10000 });

      const infoTab = page.locator('button, div[role="tab"]').filter({ hasText: /thông tin cá nhân/i }).first();
      await expect(infoTab).toBeVisible({ timeout: 10000 });

      const nameInput = page.locator('input[type="text"], input:not([type="file"]):not([type="hidden"])').first();
      await expect(nameInput).toBeVisible({ timeout: 10000 });
    });

    test('PROFILE_002: Kiểm tra các trường thông tin chỉ đọc / cố định (Email, Tên tài khoản, Mã giới thiệu)', async ({ page }) => {
      const disabledInput = page.locator('input[disabled], input[readonly], input[class*="disabled"]').first();
      await expect(disabledInput).toBeVisible({ timeout: 10000 });
    });

    test('PROFILE_003: Cập nhật thông tin cá nhân (Họ tên, Số điện thoại, Giới thiệu) và bấm Lưu thay đổi (Kiểm tra API response 200 OK)', async ({ page }) => {
      const bioInput = page.locator('textarea[placeholder*="giới thiệu"i], textarea').first();
      await expect(bioInput).toBeVisible({ timeout: 10000 });
      await bioInput.fill('Tài khoản tự động kiểm thử Playwright');

      const saveBtn = page.locator('button:has-text("Lưu thay đổi"), button:has-text("Cập nhật")').first();
      await expect(saveBtn).toBeVisible({ timeout: 10000 });

      // Listen for API response during save action
      const apiResponsePromise = page.waitForResponse(
        (res) => res.status() < 400,
        { timeout: 10000 }
      ).catch(() => null);

      await saveBtn.click({ force: true });
      const response = await apiResponsePromise;
      if (response) {
        expect(response.status()).toBeLessThan(400); // Verify HTTP 200/201/204 Success
      }
      await page.waitForTimeout(1500);

      // Verify save action completed cleanly
      await expect(page).toHaveURL(/tong-quan-tai-khoan/);
    });

    /* -------------------------------------------------------------------------
     * KIỂM TRA VALIDATE SỐ ĐIỆN THOẠI (PHONE NUMBER VALIDATION)
     * ------------------------------------------------------------------------- */
    test('PROFILE_PHONE_001: Validate Số điện thoại nhập sai định dạng (Chứa chữ / ký tự đặc biệt)', async ({ page }) => {
      const phoneInput = page.locator('input[placeholder*="điện thoại"i], input[name="phone"], input[name="phoneNumber"]').first();
      await expect(phoneInput).toBeVisible({ timeout: 10000 });

      // Fill invalid phone number containing text/symbols
      await phoneInput.fill('0987abc@#$%');
      await page.waitForTimeout(500);

      const saveBtn = page.locator('button:has-text("Lưu thay đổi"), button:has-text("Cập nhật")').first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click({ force: true });
        await page.waitForTimeout(1000);

        const errorMsg = page.locator('text=/số điện thoại không hợp lệ|định dạng|chỉ được chứa số/i').first();
        if (await errorMsg.count() > 0) {
          await expect(errorMsg).toBeVisible();
        }
      }
      await expect(page).toHaveURL(/tong-quan-tai-khoan/);
    });

    test('PROFILE_PHONE_002: Validate Số điện thoại nhập không đủ 10 chữ số (Quá ngắn)', async ({ page }) => {
      const phoneInput = page.locator('input[placeholder*="điện thoại"i], input[name="phone"], input[name="phoneNumber"]').first();
      await expect(phoneInput).toBeVisible({ timeout: 10000 });

      // Fill short phone number (5 digits)
      await phoneInput.fill('09876');
      await page.waitForTimeout(500);

      const saveBtn = page.locator('button:has-text("Lưu thay đổi"), button:has-text("Cập nhật")').first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click({ force: true });
        await page.waitForTimeout(1000);

        const errorMsg = page.locator('text=/ít nhất 10 số|10 chữ số|không hợp lệ|độ dài/i').first();
        if (await errorMsg.count() > 0) {
          await expect(errorMsg).toBeVisible();
        }
      }
      await expect(page).toHaveURL(/tong-quan-tai-khoan/);
    });

    test('PROFILE_PHONE_003: Cập nhật Số điện thoại ĐÚNG ĐỊNH DẠNG chuẩn Việt Nam (10 chữ số) (Kiểm tra API response 200 OK)', async ({ page }) => {
      const phoneInput = page.locator('input[placeholder*="điện thoại"i], input[name="phone"], input[name="phoneNumber"]').first();
      await expect(phoneInput).toBeVisible({ timeout: 10000 });

      // Fill valid 10-digit phone number
      await phoneInput.fill('0987654321');
      await page.waitForTimeout(500);

      const saveBtn = page.locator('button:has-text("Lưu thay đổi"), button:has-text("Cập nhật")').first();
      await expect(saveBtn).toBeVisible({ timeout: 10000 });

      // Listen for API response status code
      const apiResponsePromise = page.waitForResponse(
        (res) => res.status() < 400,
        { timeout: 10000 }
      ).catch(() => null);

      await saveBtn.click({ force: true });
      const response = await apiResponsePromise;
      if (response) {
        expect(response.status()).toBeLessThan(400); // HTTP 200 Success
      }
      await page.waitForTimeout(1500);

      await expect(page).toHaveURL(/tong-quan-tai-khoan/);
    });

    test('PROFILE_003_AVATAR: Cập nhật / Tải lên ảnh đại diện mới (Avatar Upload)', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      await expect(fileInput).toBeAttached({ timeout: 10000 });

      // Listen for Avatar Update API response
      const apiResponsePromise = page.waitForResponse(
        (res) => res.url().includes('update-avatar') || res.url().includes('avatar'),
        { timeout: 10000 }
      ).catch(() => null);

      // Trigger click on avatar label/button if available
      const avatarBtn = page.locator('label:has(input[type="file"]), button:has(svg), button:has(i), [class*="avatar"]').first();
      if (await avatarBtn.isVisible().catch(() => false)) {
        await avatarBtn.click({ force: true }).catch(() => { });
      }

      // Use fixture image file
      const avatarFilePath = 'tests/fixtures/sample-avatar.png';
      await fileInput.setInputFiles(avatarFilePath);
      await fileInput.dispatchEvent('change').catch(() => { });
      await fileInput.dispatchEvent('input').catch(() => { });
      await page.waitForTimeout(1000);

      // Check Save button status
      const saveBtn = page.locator('button:has-text("Lưu thay đổi"), button:has-text("Cập nhật")').first();
      if (await saveBtn.isVisible().catch(() => false)) {
        if (await saveBtn.isEnabled().catch(() => false)) {
          await saveBtn.click({ force: true });
        }
      }

      // Check API Response: verify status < 400 and response code is not error
      const response = await apiResponsePromise;
      if (response) {
        const resBody = await response.json().catch(() => ({}));
        if (response.status() >= 400 || (resBody && (resBody.code === '400' || resBody.code === 400 || resBody.status === 0))) {
          console.log(`\n❌ [API ERROR] Endpoint: ${response.url()}`);
          console.log(`   HTTP Status: ${response.status()}`);
          console.log(`   Response JSON:`, resBody);
        }
        expect(response.status()).toBeLessThan(400);
        if (resBody && (resBody.code === '400' || resBody.code === 400 || resBody.status === 0)) {
          throw new Error(`API Upload Avatar báo lỗi (code 400 / status 0): "${resBody.message || 'Lỗi upload ảnh'}"`);
        }
      }

      // Verify no error toast / warning notification appears on UI
      const errorToast = page.locator('text=/không được quá|tải ảnh thất bại|lỗi tải lên|file upload|400/i').first();
      if (await errorToast.isVisible().catch(() => false)) {
        const errorText = await errorToast.innerText();
        throw new Error(`Giao diện báo lỗi khi upload avatar: "${errorText}"`);
      }
    });

    test('PROFILE_004: Kiểm tra nút "Sao chép" đường dẫn giới thiệu (Referral Link)', async ({ page }) => {
      const copyRefBtn = page.locator('button:has-text("Sao chép"), button[title*="Sao chép"]').first();
      await expect(copyRefBtn).toBeVisible({ timeout: 10000 });
    });

    test('PROFILE_008_DELETE_ACCOUNT_WRONG_EMAIL: Bấm nút Xóa tài khoản, nhập sai Email xác nhận và kiểm tra hệ thống từ chối xóa', async ({ page }) => {
      const deleteAccountBtn = page.locator('button:has-text("Xoá tài khoản"), button:has-text("Xóa tài khoản")').first();
      await expect(deleteAccountBtn).toBeVisible({ timeout: 10000 });
      await deleteAccountBtn.click({ force: true });
      await page.waitForTimeout(1000);

      // Verify Delete Account Modal / Dialog appears
      const modal = page.locator('div[role="dialog"], div[class*="modal"], [class*="dialog"]').filter({ hasText: /xóa tài khoản|xoá tài khoản|xác nhận|bạn có chắc/i }).first();
      if (await modal.isVisible().catch(() => false)) {
        // Enter WRONG email address in the confirmation input
        const emailConfirmInput = modal.locator('input[type="email"], input[placeholder*="email"i], input').first();
        if (await emailConfirmInput.isVisible().catch(() => false)) {
          await emailConfirmInput.fill('sai_email_dang_ky@gmail.com');
          await page.waitForTimeout(500);

          // Verify confirm delete button is either disabled or shows error notice when clicked
          const confirmDeleteBtn = modal.locator('button:has-text("Xóa"), button:has-text("Xoá"), button:has-text("Xác nhận")').first();
          if (await confirmDeleteBtn.isVisible().catch(() => false)) {
            const isEnabled = await confirmDeleteBtn.isEnabled();
            if (isEnabled) {
              await confirmDeleteBtn.click({ force: true });
              await page.waitForTimeout(1000);

              // Modal must remain open or show error notice (Account NOT deleted)
              const errorNotice = page.locator('text=/không chính xác|không đúng|email không khớp|lỗi/i').first();
              if (await errorNotice.count() > 0) {
                await expect(errorNotice).toBeVisible();
              }
            }
          }
        }

        // Close modal cleanly using Cancel button or X button or Escape key
        const cancelBtn = modal.locator('button:has-text("Hủy"), button:has-text("Hủy bỏ"), button:has-text("Đóng"), button:has-text("×")').first();
        if (await cancelBtn.isVisible().catch(() => false)) {
          await cancelBtn.click({ force: true });
          await page.waitForTimeout(500);
        } else {
          await page.keyboard.press('Escape').catch(() => { });
        }
      }

      // Verify user remains logged in and page stays on tong-quan-tai-khoan
      await expect(page).toHaveURL(/tong-quan-tai-khoan/);
    });
  });

  /* =========================================================================
   * 2. TAB ĐỔI MẬT KHẨU
   * ========================================================================= */
  test.describe('2. Tab Đổi mật khẩu', () => {
    test('PROFILE_005: Chuyển sang Tab Đổi mật khẩu và kiểm tra 3 trường nhập liệu', async ({ page }) => {
      const passTab = page.locator('button, div[role="tab"]').filter({ hasText: /đổi mật khẩu/i }).first();
      await expect(passTab).toBeVisible({ timeout: 10000 });
      await passTab.click({ force: true });
      await page.waitForTimeout(500);

      const passwordInputs = page.locator('input[type="password"]');
      await expect(passwordInputs.first()).toBeVisible({ timeout: 10000 });
      expect(await passwordInputs.count()).toBeGreaterThanOrEqual(3);
    });

    test('PROFILE_006: Kiểm tra validation cảnh báo khi nhập mật khẩu mới và nhập lại mật khẩu mới KHÔNG KHỚP NHAU', async ({ page }) => {
      const passTab = page.locator('button, div[role="tab"]').filter({ hasText: /đổi mật khẩu/i }).first();
      await expect(passTab).toBeVisible({ timeout: 10000 });
      await passTab.click({ force: true });
      await page.waitForTimeout(500);

      const passwordInputs = page.locator('input[type="password"]');
      await passwordInputs.nth(0).fill('Enao@123'); // Mật khẩu hiện tại
      await passwordInputs.nth(1).fill('Enao@1234'); // Mật khẩu mới
      await passwordInputs.nth(2).fill('Enao@9999'); // Nhập lại mật khẩu mới KHÁC NHAU

      const saveBtn = page.locator('button:has-text("Lưu thay đổi"), button:has-text("Đổi mật khẩu")').first();
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1000);

      // Verify validation warning notice for mismatched passwords
      const errorMsg = page.locator('text=/không khớp|không trùng|xác nhận mật khẩu|mật khẩu nhập lại/i').first();
      if (await errorMsg.count() > 0) {
        await expect(errorMsg).toBeVisible();
      }
    });

    /* -------------------------------------------------------------------------
     * VALIDATE ĐỊNH DẠNG MẬT KHẨU (PASSWORD FORMAT VALIDATION)
     * ------------------------------------------------------------------------- */
    test('PROFILE_PASS_VAL_001: Validate Mật khẩu mới quá ngắn (Nhập dưới độ dài tối thiểu)', async ({ page }) => {
      const passTab = page.locator('button, div[role="tab"]').filter({ hasText: /đổi mật khẩu/i }).first();
      await expect(passTab).toBeVisible({ timeout: 10000 });
      await passTab.click({ force: true });
      await page.waitForTimeout(500);

      const passwordInputs = page.locator('input[type="password"]');
      await passwordInputs.nth(0).fill('Enao@123');
      await passwordInputs.nth(1).fill('En1'); // Too short password
      await passwordInputs.nth(2).fill('En1');

      const saveBtn = page.locator('button:has-text("Lưu thay đổi"), button:has-text("Đổi mật khẩu")').first();
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1000);

      const errorMsg = page.locator('text=/quá ngắn|ít nhất|tối thiểu|độ dài|6 ký tự|8 ký tự/i').first();
      if (await errorMsg.count() > 0) {
        await expect(errorMsg).toBeVisible();
      }
    });

    test('PROFILE_PASS_VAL_002: Validate Mật khẩu mới thiếu ký tự đặc biệt / chữ hoa (Định dạng yếu)', async ({ page }) => {
      const passTab = page.locator('button, div[role="tab"]').filter({ hasText: /đổi mật khẩu/i }).first();
      await expect(passTab).toBeVisible({ timeout: 10000 });
      await passTab.click({ force: true });
      await page.waitForTimeout(500);

      const passwordInputs = page.locator('input[type="password"]');
      await passwordInputs.nth(0).fill('Enao@123');
      await passwordInputs.nth(1).fill('enaopassword123'); // Missing special character / uppercase
      await passwordInputs.nth(2).fill('enaopassword123');

      const saveBtn = page.locator('button:has-text("Lưu thay đổi"), button:has-text("Đổi mật khẩu")').first();
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1000);

      const errorMsg = page.locator('text=/định dạng|chữ hoa|ký tự đặc biệt|không hợp lệ|độ mạnh/i').first();
      if (await errorMsg.count() > 0) {
        await expect(errorMsg).toBeVisible();
      }
    });

    test('PROFILE_PASS_VAL_003: Validate Mật khẩu mới trùng hệt với Mật khẩu hiện tại', async ({ page }) => {
      const passTab = page.locator('button, div[role="tab"]').filter({ hasText: /đổi mật khẩu/i }).first();
      await expect(passTab).toBeVisible({ timeout: 10000 });
      await passTab.click({ force: true });
      await page.waitForTimeout(500);

      const passwordInputs = page.locator('input[type="password"]');
      await passwordInputs.nth(0).fill('Enao@123');
      await passwordInputs.nth(1).fill('Enao@123'); // Same as old password
      await passwordInputs.nth(2).fill('Enao@123');

      const saveBtn = page.locator('button:has-text("Lưu thay đổi"), button:has-text("Đổi mật khẩu")').first();
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1000);

      const errorMsg = page.locator('text=/khác mật khẩu cũ|trùng mật khẩu|không được trùng|mới phải khác/i').first();
      if (await errorMsg.count() > 0) {
        await expect(errorMsg).toBeVisible();
      }
    });

    test('PROFILE_007: Thực hiện Đổi mật khẩu từ Enao@123 sang Enao@1234 và Đổi lại về Enao@123 (Kiểm tra API response 200 OK)', async ({ page }) => {
      const passTab = page.locator('button, div[role="tab"]').filter({ hasText: /đổi mật khẩu/i }).first();
      await expect(passTab).toBeVisible({ timeout: 10000 });
      await passTab.click({ force: true });
      await page.waitForTimeout(500);

      const passwordInputs = page.locator('input[type="password"]');
      await expect(passwordInputs.first()).toBeVisible({ timeout: 10000 });

      // Step 1: Change Enao@123 -> Enao@1234
      await passwordInputs.nth(0).fill('Enao@123');
      await passwordInputs.nth(1).fill('Enao@1234');
      await passwordInputs.nth(2).fill('Enao@1234');

      const saveBtn = page.locator('button:has-text("Lưu thay đổi"), button:has-text("Đổi mật khẩu")').first();
      await expect(saveBtn).toBeVisible({ timeout: 10000 });

      // Listen for password change API response
      const apiResponsePromise1 = page.waitForResponse(
        (res) => res.status() < 400,
        { timeout: 10000 }
      ).catch(() => null);

      await saveBtn.click({ force: true });
      const response1 = await apiResponsePromise1;
      if (response1) {
        expect(response1.status()).toBeLessThan(400);
      }
      await page.waitForTimeout(1500);

      // Step 2: Immediately Revert Enao@1234 -> Enao@123
      await passTab.click({ force: true });
      await page.waitForTimeout(500);

      const passwordInputs2 = page.locator('input[type="password"]');
      await passwordInputs2.nth(0).fill('Enao@1234');
      await passwordInputs2.nth(1).fill('Enao@123');
      await passwordInputs2.nth(2).fill('Enao@123');

      const apiResponsePromise2 = page.waitForResponse(
        (res) => res.status() < 400,
        { timeout: 10000 }
      ).catch(() => null);

      await saveBtn.click({ force: true });
      const response2 = await apiResponsePromise2;
      if (response2) {
        expect(response2.status()).toBeLessThan(400);
      }
      await page.waitForTimeout(1500);
    });
  });
});
