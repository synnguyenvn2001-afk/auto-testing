import { test, expect } from '@playwright/test';
import { skipOnboardingTour } from './helpers';

test.describe('Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'https://landbase.vn';
    await page.goto(baseUrl);
    await page.waitForLoadState('domcontentloaded');
    await skipOnboardingTour(page);
  });

  test('should navigate to all main pages via sidebar links', async ({ page }) => {
    // 1. Navigation to "Bản đồ"
    const mapLink = page.locator('a:has-text("Bản đồ"), button:has-text("Bản đồ")').first();
    await expect(mapLink).toBeVisible();
    await mapLink.click();
    await page.waitForURL(/\/ban-do/);
    await expect(page).toHaveURL(/.*ban-do.*/);
    await expect(page.locator('main, #tour-map-search, body')).toBeVisible();

    // 2. Navigation to "Tin rao vặt"
    const adsLink = page.locator('a:has-text("Tin rao vặt"), button:has-text("Tin rao vặt")').first();
    await expect(adsLink).toBeVisible();
    await adsLink.click();
    await page.waitForURL(/\/tin-rao-vat/);
    await expect(page).toHaveURL(/.*tin-rao-vat.*/);
    await expect(page.locator('main, body')).toBeVisible();

    // 3. Navigation to "Tin tức thị trường"
    const newsLink = page.locator('a:has-text("Tin tức thị trường"), button:has-text("Tin tức thị trường")').first();
    await expect(newsLink).toBeVisible();
    await newsLink.click();
    await page.waitForURL(/\/tin-tuc-thi-truong/);
    await expect(page).toHaveURL(/.*tin-tuc-thi-truong.*/);
    await expect(page.locator('main, body')).toBeVisible();

    // 4. Navigation to "Cẩm nang"
    const handbookLink = page.locator('a:has-text("Cẩm nang"), button:has-text("Cẩm nang")').first();
    await expect(handbookLink).toBeVisible();
    await handbookLink.click();
    await page.waitForURL(/\/cam-nang/);
    await expect(page).toHaveURL(/.*cam-nang.*/);
    await expect(page.locator('main, body')).toBeVisible();

    // 5. Navigation to "Bảng giá"
    const pricingLink = page.locator('a:has-text("Bảng giá"), button:has-text("Bảng giá")').first();
    await expect(pricingLink).toBeVisible();
    await pricingLink.click();
    await page.waitForURL(/\/bang-gia/);
    await expect(page).toHaveURL(/.*bang-gia.*/);
    await expect(page.locator('main, body')).toBeVisible();

    // 6. Navigation back to "Trang chủ"
    const homeLink = page.locator('a:has-text("Trang chủ"), button:has-text("Trang chủ")').first();
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await expect(page).toHaveURL(/(https:\/\/(dev-webapp\.laand\.vn|beta\.landbase\.vn|landbase\.vn)\/?$)/);
    await expect(page.locator('main, body')).toBeVisible();
  });
});
