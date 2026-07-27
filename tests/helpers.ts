import { Page, expect } from '@playwright/test';

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
    const submitBtn = dialogModal.locator('button:has-text("Đăng nhập"), #login-continue-btn').first();

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
    // Track API endpoint failures (HTTP 500+ Server Errors or unexpected 400+ failures)
    if (status >= 500 && (url.includes('/api/') || url.includes('/graphql') || url.includes('laand.vn'))) {
      const errDetail = `[HTTP ${status}] ${url}`;
      console.error(`❌ Phát hiện lỗi Backend API: ${errDetail}`);
      apiErrors.push(errDetail);
    }
  });

  return {
    verifyNoApiFailures: () => {
      expect(apiErrors, `Lỗi API Backend trả về HTTP 5xx Server Error:\n${apiErrors.join('\n')}`).toEqual([]);
    }
  };
}
