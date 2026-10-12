import { test as setup, expect } from '@playwright/test';
import { skipOnboardingTour } from './helpers';
import { AUTH_STATE_PATH } from './paths';

const authFile = AUTH_STATE_PATH;

setup('authenticate user once and save storage state', async ({ page }) => {
  setup.setTimeout(60000);

  const baseUrl = process.env.BASE_URL || 'https://landbase.vn';
  console.log(`Navigating to ${baseUrl}...`);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await skipOnboardingTour(page);

  // 1. Tìm nút Đăng nhập góc trên phải
  const loginTrigger = page.locator('button, a').filter({ hasText: /^đăng nhập$/i }).or(page.locator('button:has-text("Đăng nhập")')).first();
  await expect(loginTrigger).toBeVisible({ timeout: 15000 });
  console.log('Clicking login button...');
  await loginTrigger.click({ force: true });
  await page.waitForTimeout(1000);

  // 2. Chờ Modal Popup Đăng nhập
  const dialogModal = page.locator('div[role="dialog"]').first();
  await expect(dialogModal).toBeVisible({ timeout: 10000 });

  const usernameInput = dialogModal.locator('input[placeholder*="tên đăng nhập"i], #login-username, input:not([type="password"])').first();
  const passwordInput = dialogModal.locator('#login-password, input[type="password"]').first();
  const submitBtn = dialogModal.locator('button').filter({ hasText: /^đăng nhập$/i }).or(dialogModal.locator('button[type="submit"]:not(:has-text("Google"))')).last();

  await expect(usernameInput).toBeVisible({ timeout: 10000 });
  console.log('Filling credentials: user / Enao@1234...');
  await usernameInput.fill('user');
  await passwordInput.fill('Enao@1234');

  // Đợi phản hồi API callback / session
  const authResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/auth/callback/credentials') || res.url().includes('/api/auth/session'),
    { timeout: 15000 }
  ).catch(() => null);

  await submitBtn.click({ force: true });
  const authRes = await authResponsePromise;
  if (authRes) {
    console.log(`Auth API response: ${authRes.status()} ${authRes.url()}`);
  }

  await page.waitForTimeout(3000);
  await skipOnboardingTour(page);
  await dialogModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});

  // 3. Lưu toàn bộ Cookies, LocalStorage và Session Tokens vào file
  await page.context().storageState({ path: authFile });
  console.log(`✅ Saved storage state to ${authFile}`);
});
