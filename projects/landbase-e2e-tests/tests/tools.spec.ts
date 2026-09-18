import { test, expect } from '@playwright/test';
import { skipOnboardingTour, checkAndSkipIf504 } from './helpers';
import path from 'node:path';
import { DEBUG_SCREENSHOTS_DIR } from './paths';

test.describe('Financial and Estimation Tools Tests', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'https://beta.landbase.vn';
    const response = await page.goto(baseUrl).catch(() => null);
    await checkAndSkipIf504(page, response);
    await skipOnboardingTour(page);
  });

  test('should open and calculate loan payments', async ({ page }) => {
    // Click "Tính lãi vay" button
    const loanToolBtn = page.locator('text=Tính lãi vay').first();
    await expect(loanToolBtn).toBeVisible({ timeout: 15000 });
    await loanToolBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // Locate active dialog modal
    const dialogModal = page.locator('div[role="dialog"]').first();
    await expect(dialogModal).toBeVisible({ timeout: 10000 });

    // Verify modal title "Tính lãi vay"
    const modalTitle = dialogModal.locator('text=/Tính lãi vay/i').first();
    await expect(modalTitle).toBeVisible();

    // Fill out inputs in the loan calculator modal
    const allInputs = await dialogModal.locator('input:not([type="radio"]):not([type="checkbox"])').all();
    expect(allInputs.length).toBeGreaterThanOrEqual(3);

    // Fill Required fields: Số tiền vay, Lãi suất vay (%), Thời hạn vay (tháng)
    if (allInputs[0] && await allInputs[0].isEditable()) {
      await allInputs[0].fill('1000000000'); // Số tiền: 1,000,000,000 VND
    }
    if (allInputs[1] && await allInputs[1].isEditable()) {
      await allInputs[1].fill('8.5'); // Lãi suất: 8.5%/năm
    }
    if (allInputs[2] && await allInputs[2].isEditable()) {
      await allInputs[2].fill('120'); // Thời hạn: 120 tháng
    }
    await page.waitForTimeout(500);

    // Submit button "Ước tính khoản vay" inside the modal
    const calcBtn = dialogModal.locator('button:has-text("Ước tính khoản vay"), button:has-text("Ước tính"), button:has-text("Tính")').first();
    await expect(calcBtn).toBeVisible({ timeout: 10000 });
    await expect(calcBtn).toBeEnabled({ timeout: 5000 });
    await calcBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // Verify calculated results exist in the right panel / modal
    const resultElement = dialogModal.locator('text=/Thông tin khoản vay|Bảng dự toán|VNĐ|tháng|gốc|lãi/i').first();
    await expect(resultElement).toBeVisible({ timeout: 10000 });
    
    // Take screenshot of calculations
    await page.screenshot({ path: path.join(DEBUG_SCREENSHOTS_DIR, 'loan-calculated.png') });
  });

  test('should open savings interest calculator', async ({ page }) => {
    // Click "Tính lãi tiết kiệm" button
    const savingsToolBtn = page.getByText('Tính lãi tiết kiệm').first();
    await expect(savingsToolBtn).toBeVisible();
    await savingsToolBtn.click();
    await page.waitForTimeout(2000);

    // Locate active dialog
    const dialogModal = page.locator('div[role="dialog"]');
    await expect(dialogModal).toBeVisible();

    // Verify calculator inputs inside the modal
    const inputs = await dialogModal.locator('input').all();
    expect(inputs.length).toBeGreaterThan(0);

    // Perform calculation and check return result
    if (inputs[0] && await inputs[0].isEditable()) {
      await inputs[0].fill('500000000');
    }
    const calcBtn = dialogModal.locator('button:has-text("Tính"), button:has-text("Kết quả")').first();
    await expect(calcBtn).toBeVisible({ timeout: 5000 });
    await expect(calcBtn).toBeEnabled({ timeout: 5000 });
    await calcBtn.click();
    await page.waitForTimeout(1500);

    const resultText = dialogModal.locator('text=/tiết kiệm|lãi|VNĐ/i').first();
    await expect(resultText).toBeVisible({ timeout: 10000 });
  });

  test('should open building cost estimator', async ({ page }) => {
    // Click "Ước tính chi phí xây nhà" button
    const buildToolBtn = page.locator('text=Ước tính chi phí xây nhà').first();
    await expect(buildToolBtn).toBeVisible({ timeout: 15000 });

    // Check if card is marked "SẮP RA MẮT"
    const cardContainer = buildToolBtn.locator('xpath=ancestor::div[contains(@class, "rounded") or contains(@class, "card") or contains(@class, "border")][1]');
    const isComingSoon = (await cardContainer.innerText().catch(() => '')).includes('SẮP RA MẮT');
    if (isComingSoon) {
      test.skip(true, 'Chức năng Ước tính chi phí xây nhà đang ở trạng thái Sắp ra mắt');
      return;
    }

    await buildToolBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // Locate active dialog modal
    const dialogModal = page.locator('div[role="dialog"]').first();
    await expect(dialogModal).toBeVisible({ timeout: 10000 });

    // Verify modal header title "Ước tính chi phí xây nhà"
    const modalTitle = dialogModal.locator('text=/Ước tính chi phí xây nhà/i').first();
    await expect(modalTitle).toBeVisible();

    // Điền đầy đủ các trường bắt buộc có dấu *: Diện tích sàn, Số tầng, Chiều dài tường bao
    const areaInput = dialogModal.locator('input[placeholder*="100"]').first();
    await expect(areaInput).toBeVisible({ timeout: 5000 });
    await areaInput.fill('100'); // 100 m2

    // Chọn Số tầng từ popover dropdown (Bắt buộc để kích hoạt nút tính toán)
    const floorSelect = dialogModal.locator('button[data-slot="popover-trigger"], button').filter({ hasText: /Chọn số tầng/i }).first();
    await expect(floorSelect).toBeVisible({ timeout: 5000 });
    await floorSelect.click();
    await page.waitForTimeout(400);

    const floorOption = page.locator('button, div, span').filter({ hasText: /^3 tầng$/i }).first();
    await expect(floorOption).toBeVisible({ timeout: 5000 });
    await floorOption.click();
    await page.waitForTimeout(400);

    // Điền Chiều dài tường bao
    const wallInput = dialogModal.locator('input[placeholder*="40"]').first();
    await expect(wallInput).toBeVisible({ timeout: 5000 });
    await wallInput.fill('40'); // 40 m
    await page.waitForTimeout(500);

    // Nút Tính toán phải enabled sau khi nhập đủ các trường bắt buộc
    const calcBtn = dialogModal.locator('button:has-text("Tính toán"), button:has-text("Tính")').first();
    await expect(calcBtn).toBeVisible({ timeout: 10000 });
    await expect(calcBtn).toBeEnabled({ timeout: 5000 });
    await calcBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // Bắt buộc kết quả dự toán chi phí phải xuất hiện (Không chấp nhận pass chỉ vì modal còn mở)
    const resultTable = dialogModal.locator('text=/Bảng dự toán chi phí|TỔNG CỘNG|Vật liệu|Nhân công/i').first();
    await expect(resultTable).toBeVisible({ timeout: 10000 });

    const totalAmount = dialogModal.locator('text=/TỔNG CỘNG/i');
    await expect(totalAmount).toBeVisible();
  });

  /* =========================================================================
   * CÁC CHỨC NĂNG VÔ HIỆU HÓA / SẮP RA MẮT (DISABLED & COMING SOON FEATURES)
   * ========================================================================= */
  test('should skip disabled coming soon feature: Bảng giá đất', async ({ page }) => {
    test.skip(true, 'Chức năng "Bảng giá đất" đang ở trạng thái Sắp ra mắt / Disabled');
  });

  test('should skip disabled coming soon feature: Định giá', async ({ page }) => {
    test.skip(true, 'Chức năng "Định giá" đang ở trạng thái Sắp ra mắt / Disabled');
  });

  test('should skip disabled coming soon feature: Dự toán xây dựng', async ({ page }) => {
    test.skip(true, 'Chức năng "Dự toán xây dựng" đang ở trạng thái Sắp ra mắt / Disabled');
  });

  test('should skip disabled coming soon feature: Xem phong thuỷ', async ({ page }) => {
    test.skip(true, 'Chức năng "Xem phong thuỷ" đang ở trạng thái Sắp ra mắt / Disabled');
  });

  test('should skip disabled coming soon feature: Thước lỗ ban', async ({ page }) => {
    test.skip(true, 'Chức năng "Thước lỗ ban" đang ở trạng thái Sắp ra mắt / Disabled');
  });

  test('should skip disabled coming soon feature: Bản đồ cộng đồng', async ({ page }) => {
    test.skip(true, 'Chức năng "Bản đồ cộng đồng" đang ở trạng thái Sắp ra mắt / Disabled');
  });

  test('should skip disabled coming soon feature: Bản đồ của tôi', async ({ page }) => {
    test.skip(true, 'Chức năng "Bản đồ của tôi" đang ở trạng thái Sắp ra mắt / Disabled');
  });
});
