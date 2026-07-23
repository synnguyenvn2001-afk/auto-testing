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
  const loginTrigger = page.locator('#login-trigger-btn');
  if (await loginTrigger.isVisible().catch(() => false)) {
    await loginTrigger.click({ force: true }).catch(() => {});
    await page.locator('#login-username').fill('usert1').catch(() => {});
    await page.locator('#login-password').fill('Enao@123').catch(() => {});
    await page.locator('#login-continue-btn').click({ force: true }).catch(() => {});
    await page.waitForTimeout(3000);
    await skipOnboardingTour(page);
  }
}
