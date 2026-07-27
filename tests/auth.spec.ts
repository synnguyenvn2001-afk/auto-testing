import { test, expect } from '@playwright/test';
import { skipOnboardingTour } from './helpers';

test.describe('Authentication & Validation Tests (Testcase Auth Tài khoản)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('https://dev-webapp.laand.vn/');
    await page.waitForLoadState('domcontentloaded');
    await skipOnboardingTour(page);
  });

  // =========================================================================
  // PHẦN 1: KIỂM TRA VALIDATE FORM ĐĂNG NHẬP & ĐĂNG KÝ (TẠO TÀI KHOẢN)
  // =========================================================================
  test.describe('1. Kiểm tra Validation Dữ liệu Đầu vào (Form Validation)', () => {
    test('AUTH_VAL_001: Kiểm tra thông báo lỗi khi để trống Tên đăng nhập và Mật khẩu', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn, button:has-text("Đăng nhập")').first();
      await expect(loginTrigger).toBeVisible();
      await loginTrigger.click({ force: true });

      const dialogModal = page.locator('div[role="dialog"], [class*="modal"], [class*="dialog"]').first();
      await expect(dialogModal).toBeVisible();

      const submitBtn = dialogModal.locator('button:not(:has-text("Google")):has-text("Đăng nhập"), button[type="submit"], #login-continue-btn').first();
      await expect(submitBtn).toBeVisible();
      await submitBtn.click({ force: true });

      await page.waitForTimeout(1000);

      // Verify inline red error messages under empty inputs
      const usernameError = page.locator('text=/Vui lòng điền tên đăng nhập|bắt buộc|không được để trống/i').first();
      const passwordError = page.locator('text=/Vui lòng điền mật khẩu|bắt buộc|không được để trống/i').first();

      await expect(usernameError).toBeVisible({ timeout: 10000 });
      await expect(passwordError).toBeVisible({ timeout: 10000 });
      await expect(dialogModal).toBeVisible();
    });

    test('AUTH_VAL_002: Kiểm tra validate Tên đăng nhập chứa ký tự đặc biệt hoặc khoảng trắng', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn, button:has-text("Đăng nhập")').first();
      await expect(loginTrigger).toBeVisible();
      await loginTrigger.click({ force: true });

      const dialogModal = page.locator('div[role="dialog"]').first();
      await expect(dialogModal).toBeVisible();

      const usernameInput = dialogModal.locator('input[placeholder*="tên đăng nhập"i], #login-username, input:not([type="password"])').first();
      await usernameInput.fill('user^78!');

      const passwordInput = dialogModal.locator('#login-password, input[type="password"]').first();
      await passwordInput.fill('ValidPass123!');

      const submitBtn = dialogModal.locator('button:not(:has-text("Google")):has-text("Đăng nhập"), button[type="submit"], #login-continue-btn').first();
      await submitBtn.click({ force: true });

      // Modal remains open on invalid username format
      await page.waitForTimeout(1000);
      await expect(dialogModal).toBeVisible();
      await expect(usernameInput).toBeVisible();
    });

    test('AUTH_VAL_003: Chuyển màn Đăng ký (Tạo tài khoản) và kiểm tra validate Mật khẩu nhỏ hơn 8 ký tự', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn, button:has-text("Đăng nhập")').first();
      await expect(loginTrigger).toBeVisible();
      await loginTrigger.click({ force: true });

      const dialogModal = page.locator('div[role="dialog"]').first();
      await expect(dialogModal).toBeVisible();

      // Switch to Register screen via "Thiết lập hồ sơ mới" link
      const registerLink = dialogModal.locator('text=/Thiết lập hồ sơ mới/i, a:has-text("Thiết lập hồ sơ mới"), button:has-text("Thiết lập hồ sơ mới")').first();
      await expect(registerLink).toBeVisible({ timeout: 10000 });
      await registerLink.click({ force: true });
      await page.waitForTimeout(1000);

      // Verify Title "Tạo tài khoản"
      const registerTitle = dialogModal.locator('text=/Tạo tài khoản/i').first();
      await expect(registerTitle).toBeVisible();

      // Fill password < 8 chars into password input
      const passInput = dialogModal.locator('input[placeholder*="mật khẩu"i], input[type="password"]').first();
      await expect(passInput).toBeVisible({ timeout: 10000 });
      await passInput.fill('User2%'); // 6 chars < min 8 chars

      const submitBtn = dialogModal.locator('button:has-text("Tạo tài khoản"), button[type="submit"]').first();
      await expect(submitBtn).toBeVisible();
      await submitBtn.click({ force: true });
      await page.waitForTimeout(1000);

      // Verify register modal remains open
      await expect(dialogModal).toBeVisible();
      await expect(passInput).toBeVisible();
    });

    test('AUTH_VAL_004: Kiểm tra validate Mật khẩu thiếu ký tự đặc biệt hoặc chữ hoa', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn, button:has-text("Đăng nhập")').first();
      await expect(loginTrigger).toBeVisible();
      await loginTrigger.click({ force: true });

      const dialogModal = page.locator('div[role="dialog"]').first();
      await expect(dialogModal).toBeVisible();

      const passwordInput = dialogModal.locator('#login-password, input[type="password"]').first();
      await expect(passwordInput).toBeVisible();
      await passwordInput.fill('abcdefg123'); // missing uppercase and special char

      const submitBtn = dialogModal.locator('button:not(:has-text("Google")):has-text("Đăng nhập"), button[type="submit"], #login-continue-btn').first();
      await submitBtn.click({ force: true });

      await page.waitForTimeout(1000);
      await expect(passwordInput).toBeVisible();
      await expect(dialogModal).toBeVisible();
    });
  });

  // =========================================================================
  // PHẦN 2: CHỨC NĂNG ĐĂNG NHẬP & CHUYỂN MÀN HÌNH (LOGIN & REGISTER SWITCHING)
  // =========================================================================
  test.describe('2. Chức năng Đăng nhập & Chuyển đổi Màn hình Đăng nhập / Đăng ký', () => {
    test('AUTH_LOG_001: Đăng nhập thất bại khi nhập sai mật khẩu', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn, button:has-text("Đăng nhập")').first();
      await expect(loginTrigger).toBeVisible();
      await loginTrigger.click({ force: true });

      const dialogModal = page.locator('div[role="dialog"]').first();
      await expect(dialogModal).toBeVisible();

      const usernameInput = dialogModal.locator('input[placeholder*="tên đăng nhập"i], #login-username, input:not([type="password"])').first();
      const passwordInput = dialogModal.locator('#login-password, input[type="password"]').first();
      await usernameInput.fill('usert1');
      await passwordInput.fill('WrongPassword999!');

      const submitBtn = dialogModal.locator('button:not(:has-text("Google")):has-text("Đăng nhập"), button[type="submit"], #login-continue-btn').first();
      await submitBtn.click({ force: true });

      await page.waitForTimeout(2000);
      await expect(dialogModal).toBeVisible();
      await expect(usernameInput).toBeVisible();
    });

    test('AUTH_LOG_002: Kiểm tra đóng Modal Đăng nhập thành công', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn, button:has-text("Đăng nhập")').first();
      await expect(loginTrigger).toBeVisible();
      await loginTrigger.click({ force: true });

      const dialogModal = page.locator('div[role="dialog"]').first();
      await expect(dialogModal).toBeVisible();

      const closeBtn = dialogModal.locator('button:has(svg), button[data-slot="dialog-close"], button.absolute').first();
      await closeBtn.click({ force: true });

      await page.waitForTimeout(1000);
      await expect(dialogModal).toBeHidden();
    });

    test('AUTH_TAB_001: Kiểm tra chuyển đổi qua lại giữa Màn Đăng nhập và Màn Tạo tài khoản (Đăng ký)', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn, button:has-text("Đăng nhập")').first();
      await expect(loginTrigger).toBeVisible();
      await loginTrigger.click({ force: true });

      const modalContainer = page.locator('div[role="dialog"]').first();
      await expect(modalContainer).toBeVisible();

      // 1. Verify Login Modal title and Google button
      const loginTitle = modalContainer.locator('text=/Đăng nhập/i').first();
      await expect(loginTitle).toBeVisible();
      const googleLoginBtn = modalContainer.locator('button:has-text("Đăng nhập với Google")');
      await expect(googleLoginBtn).toBeVisible();

      // 2. Click "Thiết lập hồ sơ mới" link to switch to Register (Tạo tài khoản)
      const registerLink = modalContainer.locator('text=/Thiết lập hồ sơ mới/i, a:has-text("Thiết lập hồ sơ mới"), button:has-text("Thiết lập hồ sơ mới")').first();
      await expect(registerLink).toBeVisible({ timeout: 10000 });
      await registerLink.click({ force: true });
      await page.waitForTimeout(1000);

      // Verify Register Modal title, Google button ("Tiếp tục với Google"), and 3 input fields
      const registerTitle = modalContainer.locator('text=/Tạo tài khoản/i').first();
      await expect(registerTitle).toBeVisible();
      const googleRegisterBtn = modalContainer.locator('button:has-text("Tiếp tục với Google")');
      await expect(googleRegisterBtn).toBeVisible();
      const confirmPassInput = modalContainer.locator('input[placeholder*="nhập lại mật khẩu"i]');
      await expect(confirmPassInput).toBeVisible();

      // 3. Click "Đăng nhập" link at bottom to switch back to Login modal
      const backToLoginLink = modalContainer.locator('text=/Đã có tài khoản/i, a:has-text("Đăng nhập")').last();
      await expect(backToLoginLink).toBeVisible({ timeout: 10000 });
      await backToLoginLink.click({ force: true });
      await page.waitForTimeout(1000);

      // Verify switched back to Login Modal
      await expect(loginTitle).toBeVisible();
      await expect(googleLoginBtn).toBeVisible();
    });

    test('AUTH_LOG_003: Đăng nhập thành công với tài khoản và mật khẩu hợp lệ', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn, button:has-text("Đăng nhập")').first();
      await expect(loginTrigger).toBeVisible();
      await loginTrigger.click({ force: true });

      const dialogModal = page.locator('div[role="dialog"]').first();
      await expect(dialogModal).toBeVisible();

      const usernameInput = dialogModal.locator('input[placeholder*="tên đăng nhập"i], #login-username, input:not([type="password"])').first();
      const passwordInput = dialogModal.locator('#login-password, input[type="password"]').first();
      await expect(usernameInput).toBeVisible();

      await usernameInput.fill('usert1');
      await passwordInput.fill('Enao@123');

      const submitBtn = dialogModal.locator('button:has-text("Đăng nhập"), #login-continue-btn').first();
      await submitBtn.click({ force: true });

      await page.waitForTimeout(3000);
      await expect(dialogModal).toBeHidden();
    });
  });
});
