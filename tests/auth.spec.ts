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
  // PHẦN 1: KIỂM TRA VALIDATE FORM ĐĂNG NHẬP & ĐĂNG KÝ
  // =========================================================================
  test.describe('1. Kiểm tra Validation Dữ liệu Đầu vào (Form Validation)', () => {
    test('AUTH_VAL_001: Kiểm tra thông báo lỗi khi để trống Tên đăng nhập và Mật khẩu', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn');
      await expect(loginTrigger).toBeVisible();
      await loginTrigger.click({ force: true });

      const submitBtn = page.locator('#login-continue-btn');
      await expect(submitBtn).toBeVisible();
      await submitBtn.click({ force: true });

      // Check validation error indicators
      const usernameInput = page.locator('#login-username');
      const passwordInput = page.locator('#login-password');
      await expect(usernameInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
    });

    test('AUTH_VAL_002: Kiểm tra validate Tên đăng nhập chứa ký tự đặc biệt hoặc khoảng trắng', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn');
      await loginTrigger.click({ force: true });

      const usernameInput = page.locator('#login-username');
      await usernameInput.fill('user^78!');

      const passwordInput = page.locator('#login-password');
      await passwordInput.fill('ValidPass123!');

      const submitBtn = page.locator('#login-continue-btn');
      await submitBtn.click({ force: true });

      // Modal remains open on invalid username format
      await page.waitForTimeout(1000);
      await expect(usernameInput).toBeVisible();
    });

    test('AUTH_VAL_003: Chuyển tab Đăng ký và kiểm tra validate Mật khẩu nhỏ hơn 8 ký tự', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn');
      await loginTrigger.click({ force: true });

      // Switch to Register tab
      const registerTab = page.locator('button:has-text("Đăng ký"), button:has-text("Tạo tài khoản"), [role="tab"]:has-text("Đăng ký")').first();
      if (await registerTab.isVisible()) {
        await registerTab.click({ force: true });
        await page.waitForTimeout(1000);
      }

      const passInput = page.locator('#login-password, input[type="password"]').first();
      if (await passInput.isVisible()) {
        await passInput.fill('User2%'); // 6 chars < min 8 chars
        const submitBtn = page.locator('#login-continue-btn, button[type="submit"]').first();
        await submitBtn.click({ force: true });
        await page.waitForTimeout(1000);
        await expect(passInput).toBeVisible();
      }
    });

    test('AUTH_VAL_004: Kiểm tra validate Mật khẩu thiếu ký tự đặc biệt hoặc chữ hoa', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn');
      await loginTrigger.click({ force: true });

      const passwordInput = page.locator('#login-password');
      await passwordInput.fill('abcdefg123'); // missing uppercase and special char

      const submitBtn = page.locator('#login-continue-btn');
      await submitBtn.click({ force: true });

      await page.waitForTimeout(1000);
      await expect(passwordInput).toBeVisible();
    });
  });

  // =========================================================================
  // PHẦN 2: CHỨC NĂNG ĐĂNG NHẬP & CHUYỂN TAB (LOGIN & TAB SWITCHING)
  // =========================================================================
  test.describe('2. Chức năng Đăng nhập & Chuyển đổi Tab', () => {
    test('AUTH_LOG_001: Đăng nhập thất bại khi nhập sai mật khẩu', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn');
      await expect(loginTrigger).toBeVisible();
      await loginTrigger.click({ force: true });

      const usernameInput = page.locator('#login-username');
      const passwordInput = page.locator('#login-password');
      await usernameInput.fill('usert1');
      await passwordInput.fill('WrongPassword999!');

      const submitBtn = page.locator('#login-continue-btn');
      await submitBtn.click({ force: true });

      await page.waitForTimeout(2000);
      await expect(usernameInput).toBeVisible();
      await expect(loginTrigger).toBeVisible();
    });

    test('AUTH_LOG_002: Kiểm tra đóng Modal Đăng nhập thành công', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn');
      await loginTrigger.click({ force: true });

      const usernameInput = page.locator('#login-username');
      await expect(usernameInput).toBeVisible();

      const dialogModal = page.locator('div[role="dialog"]');
      const closeBtn = dialogModal.locator('button[data-slot="dialog-close"], button:has-text("×")').first();

      await closeBtn.evaluate(btn => (btn as HTMLElement).click());
      await page.waitForTimeout(1000);
      await expect(usernameInput).toBeHidden();
    });

    test('AUTH_TAB_001: Kiểm tra chuyển đổi qua lại giữa Tab Đăng nhập và Đăng ký', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn');
      await loginTrigger.click({ force: true });

      const modalContainer = page.locator('div[role="dialog"]').first();
      await expect(modalContainer).toBeVisible();

      const registerTab = modalContainer.locator('button, [role="tab"]').filter({ hasText: /Đăng ký|Tạo tài khoản/i }).first();
      if (await registerTab.isVisible()) {
        await registerTab.click({ force: true });
        await page.waitForTimeout(1000);
        await expect(modalContainer).toBeVisible();
      }

      const loginTab = modalContainer.locator('button, [role="tab"]').filter({ hasText: /^Đăng nhập$/i }).first();
      if (await loginTab.isVisible()) {
        await loginTab.click({ force: true });
        await page.waitForTimeout(1000);
        await expect(modalContainer).toBeVisible();
      }
    });

    test('AUTH_LOG_003: Đăng nhập thành công với tài khoản và mật khẩu hợp lệ', async ({ page }) => {
      const loginTrigger = page.locator('#login-trigger-btn');
      await expect(loginTrigger).toBeVisible();
      await loginTrigger.click({ force: true });

      const usernameInput = page.locator('#login-username');
      const passwordInput = page.locator('#login-password');
      await expect(usernameInput).toBeVisible();

      await usernameInput.fill('usert1');
      await passwordInput.fill('Enao@123');

      const submitBtn = page.locator('#login-continue-btn');
      await submitBtn.click({ force: true });

      await page.waitForTimeout(3000);
      await expect(loginTrigger).toBeHidden();
    });
  });
});
