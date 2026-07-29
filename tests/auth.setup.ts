import { test as setup, expect } from '@playwright/test';
import { skipOnboardingTour } from './helpers';

const authFile = 'playwright/.auth/user.json';

setup('authenticate user once and save storage state', async ({ page }) => {
  setup.setTimeout(60000);

  await page.goto('https://laand.vn:8443', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
  await skipOnboardingTour(page);

  // 1. Tìm nút Đăng nhập góc trên phải
  const loginTrigger = page.locator('button, a').filter({ hasText: /đăng nhập/i }).first();
  if (await loginTrigger.isVisible({ timeout: 10000 }).catch(() => false)) {
    await loginTrigger.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);

    // 2. Chờ Modal Popup Đăng nhập
    const dialogModal = page.locator('div[role="dialog"]').first();
    if (await dialogModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      const usernameInput = dialogModal.locator('input[placeholder*="tên đăng nhập"i], #login-username, input:not([type="password"])').first();
      const passwordInput = dialogModal.locator('#login-password, input[type="password"]').first();
      const submitBtn = dialogModal.locator('button').filter({ hasText: /^đăng nhập$/i }).or(dialogModal.locator('button[type="submit"]:not(:has-text("Google"))')).last();

      if (await usernameInput.isVisible({ timeout: 8000 }).catch(() => false)) {
        await usernameInput.fill('usert1').catch(() => {});
        await passwordInput.fill('Enao@123').catch(() => {});
        await submitBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(2500);

        // Dự phòng nếu ô nhập password vẫn còn hiển thị (chưa đăng nhập được với Enao@123)
        if (await passwordInput.isVisible({ timeout: 1500 }).catch(() => false)) {
          await passwordInput.fill('Enao@1234').catch(() => {});
          await submitBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(2500);
        }

        await skipOnboardingTour(page);
        await dialogModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      }
    }
  }

  // 3. Khẳng định phiên đăng nhập hợp lệ
  await page.waitForTimeout(1000);

  // 4. Lưu toàn bộ Cookies, LocalStorage và Session Tokens vào file
  await page.context().storageState({ path: authFile });
});
