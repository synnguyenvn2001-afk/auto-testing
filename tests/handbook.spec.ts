import { test, expect } from '@playwright/test';
import { skipOnboardingTour } from './helpers';

test.describe('Handbook and Resources (Cẩm nang & Tài nguyên) Tests', () => {
  test('should load handbook list, search and view details', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'https://beta.landbase.vn';
    // 1. Navigate to Cẩm nang page
    await page.goto(`${baseUrl}/cam-nang`);
    await page.waitForLoadState('domcontentloaded');
    await skipOnboardingTour(page);

    // Verify main header or content exists
    const header = page.locator('text=Cẩm nang').first();
    await expect(header).toBeVisible({ timeout: 15000 });

    // Verify search input
    const searchInput = page.locator('input[placeholder*="Tìm"], input').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('quy trình');
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // Assert search result container or list is updated
    await expect(page.locator('main')).toBeVisible();

    // Click on the first handbook article to view details
    const firstArticle = page.locator('a[href*="/cam-nang/"], div.cursor-pointer, main article').first();
    await expect(firstArticle).toBeVisible({ timeout: 10000 });
    await firstArticle.click({ force: true });
    await page.waitForTimeout(2000);

    // Verify detail page has title content and URL
    const detailTitle = page.locator('h1, h2, .font-bold').first();
    await expect(detailTitle).toBeVisible({ timeout: 10000 });
    expect(page.url()).toMatch(/\/cam-nang|\/tai-lieu/);
  });

  test('should load expert documents page', async ({ page }) => {
    // 2. Navigate to Tài liệu BĐS page with retry logic
    const baseUrl = process.env.BASE_URL || 'https://beta.landbase.vn';
    const docUrl = `${baseUrl}/tai-lieu`;
    try {
      await page.goto(docUrl, { timeout: 35000 });
    } catch (err) {
      console.log('Phát hiện kết nối bị hủy hoặc chậm ở trang tài liệu, tự động tải lại...');
      await page.waitForTimeout(2000);
      await page.goto(docUrl, { timeout: 45000 });
    }
    await page.waitForLoadState('domcontentloaded');
    await skipOnboardingTour(page);

    // Verify that the page loads with header
    const docHeader = page.locator('text=Tài liệu, text=Tài liệu chuyên gia').first();
    await expect(docHeader).toBeVisible({ timeout: 15000 });

    // Check for document list items or download links and assert presence
    const docItems = page.locator('a[href*="download"], button:has-text("Tải"), .cursor-pointer, main article');
    await expect(docItems.first()).toBeVisible({ timeout: 15000 });
    const count = await docItems.count();
    expect(count).toBeGreaterThan(0);
  });
});
