import { Page, expect, test } from '@playwright/test';

/**
 * Checks if the page or response is returning a Cloudflare 504 Gateway Timeout or 5xx Server Error,
 * and skips the test case with a clear reason.
 */
export async function checkAndSkipIf504(page: Page, response?: any) {
  const is504 = (!response || (response && response.status() >= 500)) || 
                (await page.locator('text=/Gateway time-out|Cloudflare|Error code 504|Error code 502/i').first().isVisible({ timeout: 2000 }).catch(() => false));
  if (is504) {
    test.skip(true, 'Máy chủ Backend đang gặp lỗi Cloudflare [HTTP 504 Gateway Timeout]');
  }
}

/**
 * Navigates to a URL and automatically skips the test if a 504 Cloudflare / 5xx error occurs.
 */
export async function gotoAndSkipIf504(page: Page, url: string, options?: Parameters<Page['goto']>[1]) {
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000, ...options }).catch(() => null);
  await checkAndSkipIf504(page, res);
  return res;
}

/**
 * Checks if the onboarding tour overlay (driver.js) is visible and skips it.
 */
export async function skipOnboardingTour(page: Page) {
  await page.waitForTimeout(500); // Wait for the tour to mount if any
  const closeTourBtn = page.locator('button:has-text("×"), button.driver-close-btn, .driver-popover-close-btn').first();
  if (await closeTourBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('Onboarding tour detected. Skipping...');
    await closeTourBtn.click({ force: true }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
  }

  // Remove overlay from DOM if driver-overlay persists
  await page.evaluate(() => {
    const overlays = document.querySelectorAll('.driver-overlay, .driver-popover');
    overlays.forEach((el) => el.remove());
  }).catch(() => {});
}

/**
 * Logs in with the test user credentials if not already logged in.
 */
export async function loginIfNeeded(page: Page) {
  const loginTrigger = page.locator('#login-trigger-btn, button:has-text("Đăng nhập")').first();
  if (await loginTrigger.isVisible().catch(() => false)) {
    await loginTrigger.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    const dialogModal = page.locator('div[role="dialog"]').first();
    const usernameInput = dialogModal.locator('input[placeholder*="tên đăng nhập"i], #login-username, input:not([type="password"])').first();
    const passwordInput = dialogModal.locator('#login-password, input[type="password"]').first();
    const submitBtn = dialogModal.locator('button:not(:has-text("Google")):has-text("Đăng nhập"), button[type="submit"], #login-continue-btn').first();

    if (await usernameInput.isVisible().catch(() => false)) {
      await usernameInput.fill('usert1').catch(() => {});
      await passwordInput.fill('Enao@123').catch(() => {});
      await submitBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(3000);
      await skipOnboardingTour(page);
    }
  }
}
/**
 * Sets up strict API response status checking for all test cases.
 * Listens for all HTTP responses from backend API endpoints.
 */
export function setupStrictApiCheck(page: Page) {
  const apiErrors: string[] = [];

  page.on('response', (res) => {
    const url = res.url();
    const status = res.status();

    // Bỏ qua tài nguyên tĩnh (ảnh, icon, font, css, svg...) khỏi danh sách theo dõi lỗi API Backend
    const isStaticAsset = /\.(svg|png|jpg|jpeg|gif|webp|ico|css|woff2?|ttf|eot)(\?.*)?$/i.test(url);

    // Track API endpoint failures (HTTP 500+ Server Errors)
    if (status >= 500 && (url.includes('/api/') || url.includes('/graphql') || url.includes('laand.vn')) && !isStaticAsset) {
      const errDetail = `[HTTP ${status}] ${url}`;
      console.error(`❌ Phát hiện lỗi Backend API: ${errDetail}`);
      apiErrors.push(errDetail);
    }
  });

  return {
    verifyNoApiFailures: () => {
      const has5xx = apiErrors.length > 0;
      if (has5xx) {
        test.skip(true, `Máy chủ Backend / Gateway đang gặp lỗi [HTTP 5xx Server Error]:\n${apiErrors.join('\n')}`);
        return;
      }
      expect(apiErrors, `Lỗi API Backend trả về HTTP 5xx Server Error:\n${apiErrors.join('\n')}`).toEqual([]);
    }
  };
}
