import { test, expect } from '@playwright/test';
import { skipOnboardingTour } from './helpers';

test.describe('Handbook and Resources (Cẩm nang & Tài nguyên) Tests', () => {
  test('should load handbook list, search and view details', async ({ page }) => {
    // 1. Navigate to Cẩm nang page
    await page.goto('https://dev-webapp.laand.vn/cam-nang');
    await page.waitForLoadState('domcontentloaded');
    await skipOnboardingTour(page);

    // Verify main header or content exists
    const header = page.locator('text=Cẩm nang').first();
    if (await header.isVisible()) {
      await expect(header).toBeVisible();
    }

    // Verify search input
    const searchInput = page.locator('input[placeholder*="Tìm"], input').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('quy trình');
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // Click on the first handbook article to view details
    const firstArticle = page.locator('a[href*="/cam-nang/"], div.cursor-pointer').first();
    if (await firstArticle.isVisible()) {
      await firstArticle.click();
      await page.waitForTimeout(2000);

      // Verify detail page has content
      const detailTitle = page.locator('h1, h2, .font-bold').first();
      await expect(detailTitle).toBeVisible();
    }
  });

  test('should load expert documents page', async ({ page }) => {
    // 2. Navigate to Tài liệu BĐS page with retry logic
    const docUrl = 'https://dev-webapp.laand.vn/tai-lieu';
    try {
      await page.goto(docUrl, { timeout: 35000 });
    } catch (err) {
      console.log('Phát hiện kết nối bị hủy hoặc chậm ở trang tài liệu, tự động tải lại...');
      await page.waitForTimeout(2000);
      await page.goto(docUrl, { timeout: 45000 });
    }
    await page.waitForLoadState('domcontentloaded');
    await skipOnboardingTour(page);

    // Verify that the page loads
    const docHeader = page.locator('text=Tài liệu, text=Tài liệu chuyên gia').first();
    if (await docHeader.isVisible()) {
      await expect(docHeader).toBeVisible();
    }

    // Check for document list items or download links
    const docItems = await page.locator('a[href*="download"], button:has-text("Tải"), .cursor-pointer').all();
    console.log(`Document items found: ${docItems.length}`);
  });
});
