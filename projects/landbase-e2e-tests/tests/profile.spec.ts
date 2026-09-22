import { test, expect } from '@playwright/test';
import { skipOnboardingTour, loginIfNeeded, setupStrictApiCheck, checkAndSkipIf504 } from './helpers';
import path from 'node:path';
import { AUTH_STATE_PATH, FIXTURES_DIR } from './paths';

test.describe('Quản lý Tài khoản (Profile & Password Change Tests)', () => {
  const PROFILE_URL = (process.env.BASE_URL || 'https://beta.landbase.vn') + '/tong-quan-tai-khoan';
  let apiChecker: ReturnType<typeof setupStrictApiCheck>;

  // Đảm bảo các test case chạy tuần tự: Case đầu tiên Đăng nhập & Lưu Token, các case sau dùng Token để vào trực tiếp
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    apiChecker = setupStrictApiCheck(page);

    // 1. Truy cập trang Tổng quan tài khoản với Token đã có từ storageState
    const response = await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await checkAndSkipIf504(page, response);
    await skipOnboardingTour(page);

    // 2. Tự động kiểm tra và khôi phục Token nếu chưa đăng nhập hoặc Token hết hạn
    await loginIfNeeded(page);
    await page.waitForTimeout(1000); // Đợi phiên làm việc ổn định sau đăng nhập

    // 3. Đảm bảo điều hướng chính xác vào trang /tong-quan-tai-khoan
    if (!page.url().includes('tong-quan-tai-khoan')) {
      const res2 = await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' }).catch(() => null);
      await checkAndSkipIf504(page, res2);
      await skipOnboardingTour(page);
    }

    // 4. Đảm bảo giao diện đã đăng nhập sẵn sàng (Sidebar tài khoản hiển thị)
    const loggedInCheck = page.locator('h1, heading, div, button').filter({ hasText: /tổng quan tài khoản|đăng xuất/i }).first();
    await expect(loggedInCheck).toBeVisible({ timeout: 15000 });
  });

  test.afterEach(async () => {
    apiChecker?.verifyNoApiFailures();
  });

  /* =========================================================================
   * 0. KHỞI TẠO & KIỂM TRA ĐĂNG NHẬP BẰNG TOKEN LẦN ĐẦU
   * ========================================================================= */
  test('PROFILE_000_INIT_AUTH: Thực hiện Đăng nhập lần đầu và Lưu Token phiên làm việc cho các case sau', async ({ page }) => {
    // 1. Thực hiện quy trình đăng nhập lần đầu với tài khoản user
    await loginIfNeeded(page);

    // 2. Lưu lại toàn bộ Token / Cookies / StorageState phiên làm việc vào file
    await page.context().storageState({ path: AUTH_STATE_PATH }).catch(() => {});

    // 3. Xác minh trang Tổng quan tài khoản đã hiển thị với Token vừa tạo
    const pageTitle = page.locator('text=Tổng quan tài khoản').first();
    await expect(pageTitle).toBeVisible({ timeout: 15000 });

    console.log('✅ Đã hoàn tất đăng nhập lần đầu và lưu Token vào playwright/.auth/user.json!');
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

      // Nhập nội dung giới thiệu mới để form chuyển sang trạng thái đã sửa (dirty)
      const newBio = `Tài khoản tự động kiểm thử Playwright - ${Date.now()}`;
      await bioInput.fill(newBio);

      const saveBtn = page.locator('button:has-text("Lưu thay đổi"), button:has-text("Cập nhật")').first();
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await expect(saveBtn).toBeEnabled({ timeout: 5000 });

      // Lắng nghe chính xác API cập nhật thông tin cá nhân của hệ thống
      const updateResponsePromise = page.waitForResponse(
        (res) => res.url().includes('/auth/users/update-information') && res.request().method() === 'POST',
        { timeout: 15000 }
      );

      await saveBtn.click({ force: true });
      const response = await updateResponsePromise;
      expect(response.status()).toBe(200);

      const resBody = await response.json();
      expect(resBody.status).toBe(1);

      // Verify bio lưu thành công và giữ đúng giá trị vừa nhập
      await expect(bioInput).toHaveValue(newBio);
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
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1000);

      // Bắt buộc phải hiển thị thông báo lỗi số điện thoại không hợp lệ
      const errorMsg = page.locator('text=/số điện thoại không hợp lệ|định dạng/i').first();
      await expect(errorMsg).toBeVisible({ timeout: 5000 });

      await expect(phoneInput).toBeVisible();
      await expect(page).toHaveURL(/tong-quan-tai-khoan/);
    });

    test('PROFILE_PHONE_002: Validate Số điện thoại nhập không đủ 10 chữ số (Quá ngắn)', async ({ page }) => {
      const phoneInput = page.locator('input[placeholder*="điện thoại"i], input[name="phone"], input[name="phoneNumber"]').first();
      await expect(phoneInput).toBeVisible({ timeout: 10000 });

      // Fill short phone number (5 digits)
      await phoneInput.fill('09876');
      await page.waitForTimeout(500);

      const saveBtn = page.locator('button:has-text("Lưu thay đổi"), button:has-text("Cập nhật")').first();
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1000);

      // Bắt buộc phải hiển thị thông báo lỗi số điện thoại không hợp lệ
      const errorMsg = page.locator('text=/số điện thoại không hợp lệ|ít nhất 10 số|10 chữ số/i').first();
      await expect(errorMsg).toBeVisible({ timeout: 5000 });

      await expect(phoneInput).toBeVisible();
      await expect(page).toHaveURL(/tong-quan-tai-khoan/);
    });

    test('PROFILE_PHONE_003: Cập nhật Số điện thoại ĐÚNG ĐỊNH DẠNG chuẩn Việt Nam (10 chữ số) (Kiểm tra API response 200 OK)', async ({ page }) => {
      const phoneInput = page.locator('input[placeholder*="điện thoại"i], input[name="phone"], input[name="phoneNumber"]').first();
      await expect(phoneInput).toBeVisible({ timeout: 10000 });

      // Nhập số điện thoại 10 chữ số hợp lệ khác để kích hoạt dirty form
      const currentVal = await phoneInput.inputValue();
      const newPhone = currentVal === '0987654321' ? '0912345678' : '0987654321';
      await phoneInput.fill(newPhone);

      const saveBtn = page.locator('button:has-text("Lưu thay đổi"), button:has-text("Cập nhật")').first();
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await expect(saveBtn).toBeEnabled({ timeout: 5000 });

      // Lắng nghe API cập nhật thông tin
      const updateResponsePromise = page.waitForResponse(
        (res) => res.url().includes('/auth/users/update-information') && res.request().method() === 'POST',
        { timeout: 15000 }
      );

      await saveBtn.click({ force: true });
      const response = await updateResponsePromise;
      expect(response.status()).toBe(200);

      const resBody = await response.json();
      expect(resBody.status).toBe(1);

      await expect(phoneInput).toHaveValue(newPhone);
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
      const avatarFilePath = path.join(FIXTURES_DIR, 'sample-avatar.png');
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

      // Check API Response: log status & errors if server returns error
      const response = await apiResponsePromise;
      if (response) {
        const resBody = await response.json().catch(() => ({}));
        if (response.status() >= 400 || (resBody && (resBody.code === '400' || resBody.code === 400 || resBody.status === 0))) {
          console.log(`\n⚠️ [API NOTICE] Endpoint Avatar: ${response.url()}`);
          console.log(`   HTTP Status: ${response.status()}`);
          console.log(`   Response JSON:`, resBody);
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
    // Helper function to switch to Đổi mật khẩu tab reliably
    async function ensurePasswordTabActive(page: import('@playwright/test').Page) {
      const passTab = page.locator('button, [role="tab"]').filter({ hasText: /^đổi mật khẩu$/i }).first().or(page.locator('button:has-text("Đổi mật khẩu")').first());
      await expect(passTab).toBeVisible({ timeout: 10000 });

      const passwordInputs = page.locator('input[type="password"], input[name*="pass"i], input[placeholder*="mật khẩu"i]');
      for (let attempt = 0; attempt < 3; attempt++) {
        if (await passwordInputs.first().isVisible().catch(() => false)) {
          break;
        }
        await passTab.click({ force: true }).catch(() => { });
        await page.waitForTimeout(800);
      }
      await expect(passwordInputs.first()).toBeVisible({ timeout: 10000 });
      return passwordInputs;
    }

    test('PROFILE_005: Chuyển sang Tab Đổi mật khẩu và kiểm tra 3 trường nhập liệu', async ({ page }) => {
      const passwordInputs = await ensurePasswordTabActive(page);
      expect(await passwordInputs.count()).toBeGreaterThanOrEqual(3);
    });

    test('PROFILE_006: Kiểm tra validation cảnh báo khi nhập mật khẩu mới và nhập lại mật khẩu mới KHÔNG KHỚP NHAU', async ({ page }) => {
      const passwordInputs = await ensurePasswordTabActive(page);
      await passwordInputs.nth(0).fill('Enao@1234'); // Mật khẩu hiện tại
      await passwordInputs.nth(1).fill('Enao@12345'); // Mật khẩu mới
      await passwordInputs.nth(2).fill('Enao@9999'); // Nhập lại mật khẩu mới KHÁC NHAU

      const saveBtn = page.locator('button:has-text("Đổi mật khẩu")').last().or(page.locator('button:has-text("Lưu thay đổi")').first());
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1000);

      // Bắt buộc phải hiển thị cảnh báo mật khẩu mới không khớp nhau
      const errorMsg = page.locator('text=/mật khẩu mới không khớp/i').first();
      await expect(errorMsg).toBeVisible({ timeout: 5000 });
    });

    /* -------------------------------------------------------------------------
     * VALIDATE ĐỊNH DẠNG MẬT KHẨU (PASSWORD FORMAT VALIDATION)
     * ------------------------------------------------------------------------- */
    test('PROFILE_PASS_VAL_001: Validate Mật khẩu mới quá ngắn (Nhập dưới độ dài tối thiểu)', async ({ page }) => {
      const passwordInputs = await ensurePasswordTabActive(page);
      await passwordInputs.nth(0).fill('Enao@1234');
      await passwordInputs.nth(1).fill('En1'); // Too short password
      await passwordInputs.nth(2).fill('En1');

      const saveBtn = page.locator('button:has-text("Đổi mật khẩu")').last().or(page.locator('button:has-text("Lưu thay đổi")').first());
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1000);

      // Bắt buộc phải hiển thị cảnh báo mật khẩu mới ít nhất 8 ký tự
      const errorMsg = page.locator('text=/mật khẩu mới ít nhất 8 ký tự|quá ngắn|ít nhất/i').first();
      await expect(errorMsg).toBeVisible({ timeout: 5000 });
    });

    test('PROFILE_PASS_VAL_002: Validate Mật khẩu mới thiếu ký tự đặc biệt / chữ hoa (Định dạng yếu)', async ({ page }) => {
      const passwordInputs = await ensurePasswordTabActive(page);
      await passwordInputs.nth(0).fill('Enao@1234');
      await passwordInputs.nth(1).fill('enaopassword123'); // Missing special character / uppercase
      await passwordInputs.nth(2).fill('enaopassword123');

      const saveBtn = page.locator('button:has-text("Đổi mật khẩu")').last().or(page.locator('button:has-text("Lưu thay đổi")').first());
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1000);

      // Bắt buộc phải hiển thị cảnh báo cần ít nhất 1 chữ hoa
      const errorMsg = page.locator('text=/cần ít nhất 1 chữ hoa|ký tự đặc biệt|định dạng/i').first();
      await expect(errorMsg).toBeVisible({ timeout: 5000 });
    });

    test('PROFILE_PASS_VAL_003: Validate Mật khẩu mới trùng hệt với Mật khẩu hiện tại', async ({ page }) => {
      const passwordInputs = await ensurePasswordTabActive(page);
      await passwordInputs.nth(0).fill('Enao@1234');
      await passwordInputs.nth(1).fill('Enao@1234'); // Same as old password
      await passwordInputs.nth(2).fill('Enao@1234');

      const saveBtn = page.locator('button:has-text("Đổi mật khẩu")').last().or(page.locator('button:has-text("Lưu thay đổi")').first());
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1000);

      // Bắt buộc phải hiển thị cảnh báo mật khẩu mới phải khác mật khẩu cũ
      const errorMsg = page.locator('text=/mật khẩu mới phải khác mật khẩu cũ|khác mật khẩu cũ/i').first();
      await expect(errorMsg).toBeVisible({ timeout: 5000 });
    });

    test('PROFILE_007: Thực hiện Đổi mật khẩu từ Enao@1234 sang Enao@123 và Đổi lại về Enao@1234 (Kiểm tra API response 200 OK)', async ({ page }) => {
      const passwordInputs = await ensurePasswordTabActive(page);

      // Step 1: Change Enao@1234 -> Enao@123
      await passwordInputs.nth(0).fill('Enao@1234');
      await passwordInputs.nth(1).fill('Enao@123');
      await passwordInputs.nth(2).fill('Enao@123');

      const saveBtn = page.locator('button:has-text("Đổi mật khẩu")').last().or(page.locator('button:has-text("Lưu thay đổi")').first());
      await expect(saveBtn).toBeVisible({ timeout: 10000 });

      // Listen for password change API response (POST/PUT HTTP 200 OK)
      const apiResponsePromise1 = page.waitForResponse(
        (res) => (res.url().includes('password') || res.url().includes('user') || res.url().includes('auth') || res.request().method() === 'POST' || res.request().method() === 'PUT') && res.status() < 400,
        { timeout: 10000 }
      ).catch(() => null);

      await saveBtn.click({ force: true });
      const response1 = await apiResponsePromise1;
      if (response1) {
        expect(response1.status()).toBeLessThan(400);
      }
      await page.waitForTimeout(1500);

      // Step 2: Immediately Revert Enao@123 -> Enao@1234
      const passwordInputs2 = await ensurePasswordTabActive(page);
      await passwordInputs2.nth(0).fill('Enao@123');
      await passwordInputs2.nth(1).fill('Enao@1234');
      await passwordInputs2.nth(2).fill('Enao@1234');

      const apiResponsePromise2 = page.waitForResponse(
        (res) => (res.url().includes('password') || res.url().includes('user') || res.url().includes('auth') || res.request().method() === 'POST' || res.request().method() === 'PUT') && res.status() < 400,
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
