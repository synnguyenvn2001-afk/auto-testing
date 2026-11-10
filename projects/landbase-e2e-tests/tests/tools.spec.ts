import { test, expect } from '@playwright/test';
import { skipOnboardingTour, checkAndSkipIf504 } from './helpers';
import path from 'node:path';
import { DEBUG_SCREENSHOTS_DIR } from './paths';

test.describe('Financial, Geomancy and Land Price Tools Tests', () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.BASE_URL || process.env.WEBAPP_URL || 'https://dev-webapp.laand.vn';
    const response = await page.goto(baseUrl).catch(() => null);
    await checkAndSkipIf504(page, response);
    await skipOnboardingTour(page);
  });

  /* =========================================================================
   * 1. CÔNG CỤ TÀI CHÍNH: TÍNH LÃI VAY (LOAN CALCULATOR)
   * ========================================================================= */
  test('TC01 - should open and calculate loan payments with valid inputs (Happy Case)', async ({ page }) => {
    const extTitle = page.locator('text=Tiện ích mở rộng').first();
    if (await extTitle.isVisible()) {
      await extTitle.scrollIntoViewIfNeeded();
    }

    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) {
      await finTab.click();
      await page.waitForTimeout(500);
    }

    const loanToolBtn = page.locator('text=Tính lãi vay').first();
    await expect(loanToolBtn).toBeVisible({ timeout: 15000 });
    await loanToolBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const dialogModal = page.locator('div[role="dialog"]').first();
    await expect(dialogModal).toBeVisible({ timeout: 10000 });
    await expect(dialogModal.locator('text=/Tính lãi vay/i').first()).toBeVisible();

    const allInputs = await dialogModal.locator('input:not([type="radio"]):not([type="checkbox"])').all();
    expect(allInputs.length).toBeGreaterThanOrEqual(3);

    // Điền số tiền vay, lãi suất, thời hạn vay
    if (allInputs[0] && await allInputs[0].isEditable()) await allInputs[0].fill('1000000000');
    if (allInputs[1] && await allInputs[1].isEditable()) await allInputs[1].fill('8.5');
    if (allInputs[2] && await allInputs[2].isEditable()) await allInputs[2].fill('120');
    await page.waitForTimeout(500);

    const calcBtn = dialogModal.locator('button:has-text("Ước tính khoản vay"), button:has-text("Ước tính"), button:has-text("Tính")').first();
    await expect(calcBtn).toBeVisible({ timeout: 10000 });
    await expect(calcBtn).toBeEnabled({ timeout: 5000 });
    await calcBtn.click({ force: true });

    // Xác thực bảng kết quả xuất hiện
    const resultElement = dialogModal.locator('text=/Thông tin khoản vay|Bảng dự toán|VNĐ|tháng|gốc|lãi/i').first();
    await expect(resultElement).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(DEBUG_SCREENSHOTS_DIR, 'loan-calculated.png') });
  });

  test('TC02 - should switch repayment methods (Trả góp đều vs Dư nợ giảm dần)', async ({ page }) => {
    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const loanToolBtn = page.locator('text=Tính lãi vay').first();
    await loanToolBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const dialogModal = page.locator('div[role="dialog"]').first();
    await expect(dialogModal).toBeVisible({ timeout: 10000 });

    const allInputs = await dialogModal.locator('input:not([type="radio"]):not([type="checkbox"])').all();
    if (allInputs[0]) await allInputs[0].fill('500000000');
    if (allInputs[1]) await allInputs[1].fill('9.0');
    if (allInputs[2]) await allInputs[2].fill('60');

    // Chuyển sang phương pháp: Gốc cố định, lãi giảm dần
    const reducingOption = dialogModal.locator('label, div, span').filter({ hasText: /Gốc cố định, lãi giảm dần/i }).first();
    if (await reducingOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reducingOption.click({ force: true });
      await page.waitForTimeout(300);
    }

    const calcBtn = dialogModal.locator('button:has-text("Ước tính khoản vay"), button:has-text("Tính")').first();
    await calcBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // Xác thực bảng lịch thanh toán cập nhật
    await expect(dialogModal.locator('text=/Bảng dự toán chi phí|Thông tin khoản vay/i').first()).toBeVisible({ timeout: 8000 });

    // Đóng modal
    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC03 - should disable calculation button when required loan inputs are empty (Non-Happy Case)', async ({ page }) => {
    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const loanToolBtn = page.locator('text=Tính lãi vay').first();
    await loanToolBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const dialogModal = page.locator('div[role="dialog"]').first();
    await expect(dialogModal).toBeVisible({ timeout: 10000 });

    // Xóa sạch tất cả các trường nhập liệu
    const allInputs = await dialogModal.locator('input:not([type="radio"]):not([type="checkbox"])').all();
    for (const inp of allInputs) {
      if (await inp.isEditable()) {
        await inp.fill('');
      }
    }
    await page.waitForTimeout(500);

    // Xác thực nút Tính toán bị disabled khi thiếu dữ liệu bắt buộc
    const calcBtn = dialogModal.locator('button:has-text("Ước tính khoản vay"), button:has-text("Ước tính"), button:has-text("Tính")').first();
    await expect(calcBtn).toBeDisabled();

    // Đóng modal
    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC04 - should handle extreme loan tenure boundaries (1 month vs 360 months) (Boundary Case)', async ({ page }) => {
    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const loanToolBtn = page.locator('text=Tính lãi vay').first();
    await loanToolBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const dialogModal = page.locator('div[role="dialog"]').first();
    const allInputs = await dialogModal.locator('input:not([type="radio"]):not([type="checkbox"])').all();
    if (allInputs[0]) await allInputs[0].fill('2000000000');
    if (allInputs[1]) await allInputs[1].fill('7.5');

    // Test thời hạn cực đại: 360 tháng (30 năm)
    if (allInputs[2]) await allInputs[2].fill('360');
    const calcBtn = dialogModal.locator('button:has-text("Ước tính khoản vay"), button:has-text("Tính")').first();
    await expect(calcBtn).toBeEnabled();
    await calcBtn.click({ force: true });
    await page.waitForTimeout(1000);
    await expect(dialogModal.locator('text=/Thông tin khoản vay/i').first()).toBeVisible();

    // Test thời hạn cực tiểu: 1 tháng
    if (allInputs[2]) await allInputs[2].fill('1');
    await calcBtn.click({ force: true });
    await page.waitForTimeout(1000);
    await expect(dialogModal.locator('text=/Thông tin khoản vay/i').first()).toBeVisible();

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  /* =========================================================================
   * 2. CÔNG CỤ TÀI CHÍNH: TÍNH LÃI TIẾT KIỆM (SAVINGS CALCULATOR)
   * ========================================================================= */
  test('TC05 - should open savings interest calculator and calculate returns (Happy Case)', async ({ page }) => {
    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const savingsToolBtn = page.getByText('Tính lãi tiết kiệm').first();
    await expect(savingsToolBtn).toBeVisible({ timeout: 10000 });
    await savingsToolBtn.click({ force: true });

    const dialogModal = page.locator('div[role="dialog"]').first();
    await expect(dialogModal).toBeVisible({ timeout: 10000 });

    const inputs = await dialogModal.locator('input').all();
    expect(inputs.length).toBeGreaterThan(0);

    if (inputs[0] && await inputs[0].isEditable()) {
      await inputs[0].fill('500000000');
    }
    const calcBtn = dialogModal.locator('button:has-text("Tính"), button:has-text("Kết quả")').first();
    await expect(calcBtn).toBeVisible({ timeout: 5000 });
    await expect(calcBtn).toBeEnabled({ timeout: 5000 });
    await calcBtn.click({ force: true });

    const resultText = dialogModal.locator('text=/tiết kiệm|lãi|VNĐ/i').first();
    await expect(resultText).toBeVisible({ timeout: 10000 });
  });

  test('TC06 - should compare Simple Interest and Compound Interest (Lãi đơn vs Lãi kép)', async ({ page }) => {
    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const savingsToolBtn = page.getByText('Tính lãi tiết kiệm').first();
    await savingsToolBtn.click({ force: true });

    const dialogModal = page.locator('div[role="dialog"]').first();
    await expect(dialogModal).toBeVisible({ timeout: 10000 });

    const inputs = await dialogModal.locator('input').all();
    if (inputs[0]) await inputs[0].fill('200000000'); // 200 triệu
    if (inputs[1]) await inputs[1].fill('6.5'); // 6.5%/kỳ
    if (inputs[2]) await inputs[2].fill('12'); // 12 kỳ

    const calcBtn = dialogModal.locator('button:has-text("Tính toán"), button:has-text("Tính")').first();
    await calcBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // Xác thực hiển thị cả giải thích & công thức của Lãi đơn và Lãi kép
    const simpleInterestBlock = dialogModal.locator('text=/Lãi đơn/i').first();
    const compoundInterestBlock = dialogModal.locator('text=/Lãi kép/i').first();
    await expect(simpleInterestBlock).toBeVisible({ timeout: 8000 });
    await expect(compoundInterestBlock).toBeVisible({ timeout: 8000 });

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC07 - should handle empty savings deposit input without crashing (Non-Happy Case)', async ({ page }) => {
    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const savingsToolBtn = page.getByText('Tính lãi tiết kiệm').first();
    await savingsToolBtn.click({ force: true });

    const dialogModal = page.locator('div[role="dialog"]').first();
    await expect(dialogModal).toBeVisible({ timeout: 10000 });

    const input = dialogModal.locator('input').first();
    if (await input.isEditable()) {
      await input.fill('');
    }

    // Modal vẫn ổn định, không crash trang
    await expect(dialogModal).toBeVisible();

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC08 - should validate zero or negative deposit values in savings calculator (Non-Happy Case)', async ({ page }) => {
    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const savingsToolBtn = page.getByText('Tính lãi tiết kiệm').first();
    await savingsToolBtn.click({ force: true });

    const dialogModal = page.locator('div[role="dialog"]').first();
    const inputs = await dialogModal.locator('input').all();

    // Nhập số tiền gốc = 0
    if (inputs[0]) await inputs[0].fill('0');
    await page.waitForTimeout(300);

    // Xác thực ô input hoặc UI xử lý an toàn
    const calcBtn = dialogModal.locator('button:has-text("Tính toán"), button:has-text("Tính")').first();
    if (await calcBtn.isEnabled()) {
      await calcBtn.click({ force: true });
      await page.waitForTimeout(500);
      // Kết quả không bị NaN hoặc vỡ layout
      expect(await dialogModal.innerText()).not.toContain('NaN');
    }

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  /* =========================================================================
   * 3. CÔNG CỤ TÀI CHÍNH: ƯỚC TÍNH CHI PHÍ XÂY NHÀ (HOUSE COST ESTIMATOR)
   * ========================================================================= */
  test('TC09 - should open building cost estimator and calculate costs (Happy Case)', async ({ page }) => {
    test.setTimeout(60000);

    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const buildToolBtn = page.locator('text=Ước tính chi phí xây nhà').first();
    await expect(buildToolBtn).toBeVisible({ timeout: 15000 });
    await buildToolBtn.scrollIntoViewIfNeeded();

    const cardContainer = buildToolBtn.locator('xpath=ancestor::div[contains(@class, "rounded") or contains(@class, "card") or contains(@class, "border")][1]');
    if ((await cardContainer.innerText().catch(() => '')).includes('SẮP RA MẮT')) {
      test.skip(true, 'Chức năng Ước tính chi phí xây nhà đang ở trạng thái Sắp ra mắt');
      return;
    }

    await buildToolBtn.click({ force: true });

    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 15000 });

    const areaInput = dialogModal.locator('input[placeholder*="100"]').first();
    await expect(areaInput).toBeVisible({ timeout: 5000 });
    await areaInput.fill('100');

    const floorSelect = dialogModal.locator('button[data-slot="popover-trigger"], button').filter({ hasText: /Chọn số tầng/i }).first();
    await expect(floorSelect).toBeVisible({ timeout: 5000 });
    await floorSelect.click();

    const floorOption = page.locator('button, div, span').filter({ hasText: /^3 tầng$/i }).first();
    await floorOption.waitFor({ state: 'visible', timeout: 5000 });
    await floorOption.click();
    await floorOption.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    const wallInput = dialogModal.locator('input[placeholder*="40"]').first();
    await expect(wallInput).toBeVisible({ timeout: 5000 });
    await wallInput.fill('40');

    const calcBtn = dialogModal.locator('button:has-text("Tính toán"), button:has-text("Tính")').first();
    await expect(calcBtn).toBeVisible({ timeout: 10000 });
    await expect(calcBtn).toBeEnabled({ timeout: 10000 });
    await calcBtn.click({ force: true });

    const resultTable = dialogModal.locator('text=/Bảng dự toán chi phí|TỔNG CỘNG|Vật liệu|Nhân công/i').first();
    await expect(resultTable).toBeVisible({ timeout: 15000 });
    await expect(dialogModal.locator('text=/TỔNG CỘNG/i')).toBeVisible();

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC10 - should switch construction methods between self-managed and turnkey package', async ({ page }) => {
    test.setTimeout(60000);

    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const buildToolBtn = page.locator('text=Ước tính chi phí xây nhà').first();
    await buildToolBtn.click({ force: true });

    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    const areaInput = dialogModal.locator('input[placeholder*="100"]').first();
    await areaInput.fill('120');

    const floorSelect = dialogModal.locator('button[data-slot="popover-trigger"], button').filter({ hasText: /Chọn số tầng/i }).first();
    if (await floorSelect.isVisible()) {
      await floorSelect.click();
      const floorOption = page.locator('button, div, span').filter({ hasText: /^2 tầng$/i }).first();
      await floorOption.click();
    }

    // Chọn phương pháp: Giao thầu trọn gói
    const turnkeyRadio = dialogModal.locator('label, div, span').filter({ hasText: /Giao thầu trọn gói/i }).first();
    if (await turnkeyRadio.isVisible()) {
      await turnkeyRadio.click({ force: true });
    }

    const calcBtn = dialogModal.locator('button:has-text("Tính toán"), button:has-text("Tính")').first();
    if (await calcBtn.isEnabled()) {
      await calcBtn.click({ force: true });
      await page.waitForTimeout(1000);
      await expect(dialogModal.locator('text=/TỔNG CỘNG|Bảng dự toán/i').first()).toBeVisible({ timeout: 8000 });
    }

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC11 - should prevent cost estimation when floor count or area is missing (Non-Happy Case)', async ({ page }) => {
    test.setTimeout(60000);

    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const buildToolBtn = page.locator('text=Ước tính chi phí xây nhà').first();
    await buildToolBtn.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    // Chỉ nhập diện tích sàn, KHÔNG chọn số tầng
    const areaInput = dialogModal.locator('input[placeholder*="100"]').first();
    await areaInput.fill('100');

    // Nút Tính toán phải bị disabled khi chưa chọn số tầng
    const calcBtn = dialogModal.locator('button:has-text("Tính toán"), button:has-text("Tính")').first();
    await expect(calcBtn).toBeDisabled();

    // Đóng modal
    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC12 - should prevent cost calculation when floor area is zero or negative (Non-Happy Case)', async ({ page }) => {
    test.setTimeout(60000);

    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const buildToolBtn = page.locator('text=Ước tính chi phí xây nhà').first();
    await buildToolBtn.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    const areaInput = dialogModal.locator('input[placeholder*="100"]').first();
    await areaInput.fill('0');

    const calcBtn = dialogModal.locator('button:has-text("Tính toán"), button:has-text("Tính")').first();
    await expect(calcBtn).toBeDisabled();

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  /* =========================================================================
   * 4. CÔNG CỤ BẢNG GIÁ ĐẤT (LAND PRICE & GIS HEATMAP)
   * ========================================================================= */
  test('TC13 - should access Land Price tool (Bảng giá đất), filter data and switch to GIS heatmap (Happy Case)', async ({ page }) => {
    test.setTimeout(60000);

    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const landPriceCard = page.locator('text=Bảng giá đất').first();
    const hasCard = await landPriceCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasCard) {
      await landPriceCard.click({ force: true });
    } else {
      const baseUrl = process.env.BASE_URL || process.env.WEBAPP_URL || 'https://dev-webapp.laand.vn';
      await page.goto(`${baseUrl}/bang-gia-dat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    await page.waitForTimeout(2000);
    await skipOnboardingTour(page);

    expect(page.url()).toContain('/bang-gia-dat');
    const pageHeader = page.locator('h1, h2').filter({ hasText: /Bảng giá đất/i }).first();
    await expect(pageHeader).toBeVisible({ timeout: 10000 });

    // 1. Kiểm tra bộ lọc tìm kiếm
    const searchInput = page.locator('input[placeholder*="Nhập phường/xã, tên đường"], input[placeholder*="phường/xã"]').filter({ visible: true }).first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('Giang Văn Minh');

    const searchSubmitBtn = page.locator('#btn-submit-land-search, button:has-text("Tìm kiếm")').filter({ visible: true }).first();
    await expect(searchSubmitBtn).toBeVisible({ timeout: 5000 });
    await searchSubmitBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // 2. Kiểm tra tab "Dữ liệu bảng giá"
    const tableTabBtn = page.locator('#tab-btn-table, button:has-text("Dữ liệu bảng giá")').first();
    if (await tableTabBtn.isVisible()) {
      await tableTabBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const tableHeader = page.locator('text=/Phường\\/Xã|Đường & Đoạn đường|Đơn giá/i').first();
    await expect(tableHeader).toBeVisible({ timeout: 10000 });

    const rows = page.locator('table tbody tr, [role="row"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // 3. Kiểm tra tab "Bản đồ nhiệt GIS"
    const mapTabBtn = page.locator('#tab-btn-map, button:has-text("Bản đồ nhiệt"), button:has-text("GIS")').first();
    await expect(mapTabBtn).toBeVisible({ timeout: 5000 });
    await mapTabBtn.click({ force: true });
    await page.waitForTimeout(2000);

    const heatmapContainer = page.locator('canvas, .mapboxgl-map, .leaflet-container, [class*="map"]').or(page.locator('text=/Giá đất/i')).first();
    await expect(heatmapContainer).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(DEBUG_SCREENSHOTS_DIR, 'land-price-gis-heatmap.png') });
  });

  test('TC14 - should navigate through pagination controls on land price table', async ({ page }) => {
    test.setTimeout(60000);

    const baseUrl = process.env.BASE_URL || process.env.WEBAPP_URL || 'https://dev-webapp.laand.vn';
    await page.goto(`${baseUrl}/bang-gia-dat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await skipOnboardingTour(page);

    const page2Btn = page.locator('nav[aria-label*="pagination"i] a, a').filter({ hasText: /^2$/ }).first();
    if (await page2Btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page2Btn.click({ force: true });
      await page.waitForTimeout(1500);

      const rows = page.locator('table tbody tr');
      expect(await rows.count()).toBeGreaterThan(0);

      const page1Btn = page.locator('nav[aria-label*="pagination"i] a, a').filter({ hasText: /^1$/ }).first();
      await page1Btn.click({ force: true });
      await page.waitForTimeout(1500);
      expect(await rows.count()).toBeGreaterThan(0);
    }
  });

  test('TC15 - should display empty state when searching for nonexistent street (Non-Happy Case)', async ({ page }) => {
    test.setTimeout(60000);

    const baseUrl = process.env.BASE_URL || process.env.WEBAPP_URL || 'https://dev-webapp.laand.vn';
    await page.goto(`${baseUrl}/bang-gia-dat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await skipOnboardingTour(page);

    const searchInput = page.locator('input[placeholder*="Nhập phường/xã, tên đường"]').filter({ visible: true }).first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('ĐườngKhôngTồnTại99999XYZ');

    const searchSubmitBtn = page.locator('#btn-submit-land-search, button:has-text("Tìm kiếm")').filter({ visible: true }).first();
    await searchSubmitBtn.click({ force: true });
    await page.waitForTimeout(2000);

    const emptyRow = page.locator('table tbody tr').filter({ hasText: /Dữ liệu đang được cập nhật|Không tìm thấy/i }).first();
    await expect(emptyRow).toBeVisible({ timeout: 10000 });
  });

  test('TC16 - should restore full list when search query is cleared (Non-Happy / Reset Flow)', async ({ page }) => {
    test.setTimeout(60000);

    const baseUrl = process.env.BASE_URL || process.env.WEBAPP_URL || 'https://dev-webapp.laand.vn';
    await page.goto(`${baseUrl}/bang-gia-dat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await skipOnboardingTour(page);

    const searchInput = page.locator('input[placeholder*="Nhập phường/xã, tên đường"]').filter({ visible: true }).first();
    await searchInput.fill('Trần Phú');
    const searchSubmitBtn = page.locator('#btn-submit-land-search, button:has-text("Tìm kiếm")').filter({ visible: true }).first();
    await searchSubmitBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Xóa trắng ô tìm kiếm và bấm Tìm kiếm lại
    await searchInput.fill('');
    await searchSubmitBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // Bảng dữ liệu tự động phục hồi danh sách gốc
    const rows = page.locator('table tbody tr');
    expect(await rows.count()).toBeGreaterThan(1);
  });

  test('TC17 - should handle SQL injection and special characters in street search safely (Non-Happy / Security Case)', async ({ page }) => {
    test.setTimeout(60000);

    const baseUrl = process.env.BASE_URL || process.env.WEBAPP_URL || 'https://dev-webapp.laand.vn';
    await page.goto(`${baseUrl}/bang-gia-dat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await skipOnboardingTour(page);

    const searchInput = page.locator('input[placeholder*="Nhập phường/xã, tên đường"]').filter({ visible: true }).first();
    // Test payload SQL Injection & XSS
    await searchInput.fill("' OR '1'='1' -- <script>alert(1)</script>");

    const searchSubmitBtn = page.locator('#btn-submit-land-search, button:has-text("Tìm kiếm")').filter({ visible: true }).first();
    await searchSubmitBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // Hệ thống xử lý an toàn: Không bị lỗi 500, không bị crash bảng
    const tableContainer = page.locator('table, [role="table"]').first();
    await expect(tableContainer).toBeVisible({ timeout: 10000 });
  });

  /* =========================================================================
   * 5. CÔNG CỤ ĐỊNH GIÁ (VALUATION: ĐỊNH GIÁ ĐẤT & NHÀ)
   * ========================================================================= */
  test('TC18 - should open Real Estate Valuation tool, configure parameters and apply valuation method (Happy Case)', async ({ page }) => {
    test.setTimeout(60000);

    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const valuationCard = page.locator('text=Định giá').first();
    await expect(valuationCard).toBeVisible({ timeout: 15000 });

    const cardContainer = valuationCard.locator('xpath=ancestor::div[contains(@class, "rounded") or contains(@class, "card") or contains(@class, "border")][1]');
    if ((await cardContainer.innerText().catch(() => '')).includes('SẮP RA MẮT')) {
      test.skip(true, 'Chức năng Định giá đang ở trạng thái Sắp ra mắt');
      return;
    }

    await valuationCard.click({ force: true });

    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });
    await expect(dialogModal.locator('text=/Định Giá/i').first()).toBeVisible();

    const landTab = dialogModal.locator('button:has-text("Định giá đất")').first();
    const houseTab = dialogModal.locator('button:has-text("Định giá nhà")').first();
    await expect(landTab).toBeVisible({ timeout: 5000 });
    await expect(houseTab).toBeVisible({ timeout: 5000 });

    // Điền thông tin thửa đất
    const addressInput = dialogModal.locator('#address, input[placeholder*="Cầu Giấy"]').first();
    await expect(addressInput).toBeVisible({ timeout: 5000 });
    await addressInput.fill('123 Đường Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội');

    const streetWidthInput = dialogModal.locator('#streetWidth, input[placeholder*="6"]').first();
    if (await streetWidthInput.isVisible()) await streetWidthInput.fill('6');

    const legalAreaInput = dialogModal.locator('#legalArea, input[placeholder*="100"]').first();
    if (await legalAreaInput.isVisible()) await legalAreaInput.fill('100');

    const frontageInput = dialogModal.locator('#frontage, input[placeholder*="5"]').first();
    if (await frontageInput.isVisible()) await frontageInput.fill('5');

    const submitBtn = dialogModal.locator('button').filter({ hasText: /^Định giá$/i }).last();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const methodPopover = page.locator('text=/Chọn phương pháp định giá/i').first();
    if (await methodPopover.isVisible({ timeout: 5000 }).catch(() => false)) {
      const applyBtn = page.locator('button').filter({ hasText: /^Áp dụng$/i }).first();
      await expect(applyBtn).toBeVisible();
      await applyBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: path.join(DEBUG_SCREENSHOTS_DIR, 'valuation-configured.png') });

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC19 - should open House Valuation mode and verify specialized residential fields', async ({ page }) => {
    test.setTimeout(60000);

    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const valuationCard = page.locator('text=Định giá').first();
    await valuationCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    // Chuyển sang tab "Định giá nhà"
    const houseTab = dialogModal.locator('button:has-text("Định giá nhà")').first();
    await expect(houseTab).toBeVisible({ timeout: 5000 });
    await houseTab.click({ force: true });
    await page.waitForTimeout(500);

    // Xác thực cả 2 trường chuyên biệt của nhà hiển thị chuẩn xác (kiểm tra từng trường riêng biệt)
    const builtAreaInput = dialogModal.locator('#builtArea, input[placeholder*="70"]').first();
    const totalFloorInput = dialogModal.locator('#totalFloorArea, input[placeholder*="280"]').first();
    await expect(builtAreaInput).toBeVisible({ timeout: 8000 });
    await expect(totalFloorInput).toBeVisible({ timeout: 8000 });

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC20 - should reset all entered valuation data when clicking "Định giá mới" (Non-Happy / Reset Case)', async ({ page }) => {
    test.setTimeout(60000);

    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const valuationCard = page.locator('text=Định giá').first();
    await valuationCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    const addressInput = dialogModal.locator('#address, input[placeholder*="Cầu Giấy"]').first();
    await addressInput.fill('Số 99 Phố Trần Phú, Hà Đông, Hà Nội');
    expect(await addressInput.inputValue()).toBe('Số 99 Phố Trần Phú, Hà Đông, Hà Nội');

    // Bấm nút "Định giá mới" để reset form
    const resetBtn = dialogModal.locator('button:has-text("Định giá mới")').first();
    await expect(resetBtn).toBeVisible({ timeout: 5000 });
    await resetBtn.click({ force: true });
    await page.waitForTimeout(500);

    // Xác thực trường địa chỉ đã được xóa về rỗng
    expect(await addressInput.inputValue()).toBe('');

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC21 - should require mandatory fields when address is left blank (Non-Happy Case)', async ({ page }) => {
    test.setTimeout(60000);

    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const valuationCard = page.locator('text=Định giá').first();
    await valuationCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    const addressInput = dialogModal.locator('#address, input[placeholder*="Cầu Giấy"]').first();
    await addressInput.fill(''); // Bỏ trống địa chỉ

    const submitBtn = dialogModal.locator('button').filter({ hasText: /^Định giá$/i }).last();
    await submitBtn.click({ force: true });
    await page.waitForTimeout(500);

    // Xác thực hệ thống hiển thị thông báo lỗi bắt buộc nhập địa chỉ
    const errorMsg = dialogModal.locator('text=/Vui lòng nhập địa chỉ/i').first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC22 - should switch alternative valuation methods in method selector popover', async ({ page }) => {
    test.setTimeout(60000);

    const finTab = page.locator('button, div').filter({ hasText: /^Tài chính$/i }).first();
    if (await finTab.isVisible()) await finTab.click();
    await page.waitForTimeout(500);

    const valuationCard = page.locator('text=Định giá').first();
    await valuationCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    const addressInput = dialogModal.locator('#address, input[placeholder*="Cầu Giấy"]').first();
    await addressInput.fill('456 Đường Nguyễn Trãi, Thanh Xuân, Hà Nội');

    const streetWidthInput = dialogModal.locator('#streetWidth, input[placeholder*="6"]').first();
    if (await streetWidthInput.isVisible()) await streetWidthInput.fill('6');

    const legalAreaInput = dialogModal.locator('#legalArea, input[placeholder*="100"]').first();
    if (await legalAreaInput.isVisible()) await legalAreaInput.fill('100');

    const frontageInput = dialogModal.locator('#frontage, input[placeholder*="5"]').first();
    if (await frontageInput.isVisible()) await frontageInput.fill('5');

    const submitBtn = dialogModal.locator('button').filter({ hasText: /^Định giá$/i }).last();
    await submitBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const methodDialog = page.locator('div[role="dialog"]').filter({ hasText: /Chọn phương pháp định giá/i }).first();
    await expect(methodDialog).toBeVisible({ timeout: 8000 });

    // Toggle một phương pháp bên trong methodDialog (ví dụ: Chi phí)
    const costCheckbox = methodDialog.getByRole('checkbox', { name: 'Chi phí' }).or(methodDialog.locator('text=Chi phí')).first();
    if (await costCheckbox.isVisible()) {
      await costCheckbox.click({ force: true });
      await page.waitForTimeout(300);
    }

    const applyBtn = methodDialog.getByRole('button', { name: 'Áp dụng' }).or(methodDialog.locator('button:has-text("Áp dụng")')).first();
    await expect(applyBtn).toBeVisible({ timeout: 5000 });
    await applyBtn.click({ force: true });
    await page.waitForTimeout(1500);

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  /* =========================================================================
   * 6. CÔNG CỤ PHONG THUỶ: XEM PHONG THUỶ (GIA CHỦ NAM & GIA CHỦ NỮ)
   * ========================================================================= */
  test('TC23 - should open Geomancy tool and analyze feng shui for Male owner (Gia chủ Nam)', async ({ page }) => {
    test.setTimeout(60000);

    const geomancyTab = page.locator('button, div').filter({ hasText: /^Phong thuỷ$/i }).first();
    await expect(geomancyTab).toBeVisible({ timeout: 10000 });
    await geomancyTab.click({ force: true });
    await page.waitForTimeout(1000);

    const geomancyCard = page.locator('text=Xem phong thuỷ').first();
    await expect(geomancyCard).toBeVisible({ timeout: 10000 });

    const cardContainer = geomancyCard.locator('xpath=ancestor::div[contains(@class, "rounded") or contains(@class, "card") or contains(@class, "border")][1]');
    if ((await cardContainer.innerText().catch(() => '')).includes('SẮP RA MẮT')) {
      test.skip(true, 'Chức năng Xem phong thuỷ đang ở trạng thái Sắp ra mắt');
      return;
    }

    await geomancyCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });
    await expect(dialogModal.locator('text=/Xem phong thuỷ/i').first()).toBeVisible();

    // 1. Nhập ngày sinh
    const dateBtn = dialogModal.locator('button').filter({ hasText: /ngày sinh|/i }).first();
    if (await dateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateBtn.click({ force: true });
      await page.waitForTimeout(500);
      const calDay = page.locator('[role="gridcell"], button:has-text("15"), button:has-text("10")').first();
      if (await calDay.isVisible({ timeout: 3000 }).catch(() => false)) {
        await calDay.click({ force: true });
        await page.waitForTimeout(400);
      }
    }

    // 2. Chọn giới tính: NAM
    const genderBtn = dialogModal.locator('button, [role="combobox"]').filter({ hasText: /giới tính|Chọn giới tính/i }).first();
    if (await genderBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await genderBtn.click({ force: true });
      await page.waitForTimeout(400);
      const maleOpt = page.locator('[role="option"]').filter({ hasText: /^Nam$/i }).first();
      if (await maleOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await maleOpt.click({ force: true });
        await page.waitForTimeout(400);
      }
    }

    // 3. Chọn hướng: BẮC
    const dirBtn = dialogModal.locator('button, [role="combobox"]').filter({ hasText: /Chọn hướng/i }).first();
    if (await dirBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dirBtn.click({ force: true });
      await page.waitForTimeout(400);
      const dirOpt = page.locator('[role="option"]').filter({ hasText: /^Bắc$/i }).or(page.locator('[role="option"]').first());
      if (await dirOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dirOpt.click({ force: true });
        await page.waitForTimeout(400);
      }
    }

    // 4. Bấm nút "Xem kết quả"
    const submitBtn = dialogModal.locator('button').filter({ hasText: /^Xem kết quả$/i }).or(dialogModal.locator('button:has-text("Xem kết quả")')).first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click({ force: true });
    await page.waitForTimeout(2500);

    const resultHeader = dialogModal.locator('text=/Thông tin gia chủ|Quẻ mệnh|Ngũ hành|Năm sinh/i').first();
    await expect(resultHeader).toBeVisible({ timeout: 10000 });

    const canChiInfo = dialogModal.locator('text=/Năm sinh dương lịch|Năm sinh âm lịch|Quẻ mệnh/i').first();
    await expect(canChiInfo).toBeVisible();

    await page.screenshot({ path: path.join(DEBUG_SCREENSHOTS_DIR, 'geomancy-male-analysis-result.png') });

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC24 - should open Geomancy tool and analyze feng shui for Female owner (Gia chủ Nữ)', async ({ page }) => {
    test.setTimeout(60000);

    const geomancyTab = page.locator('button, div').filter({ hasText: /^Phong thuỷ$/i }).first();
    await expect(geomancyTab).toBeVisible({ timeout: 10000 });
    await geomancyTab.click({ force: true });
    await page.waitForTimeout(1000);

    const geomancyCard = page.locator('text=Xem phong thuỷ').first();
    await geomancyCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    // 1. Nhập ngày sinh
    const dateBtn = dialogModal.locator('button').filter({ hasText: /ngày sinh|/i }).first();
    if (await dateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateBtn.click({ force: true });
      await page.waitForTimeout(500);
      const calDay = page.locator('[role="gridcell"], button:has-text("15"), button:has-text("10")').first();
      if (await calDay.isVisible({ timeout: 3000 }).catch(() => false)) {
        await calDay.click({ force: true });
        await page.waitForTimeout(400);
      }
    }

    // 2. Chọn giới tính: NỮ
    const genderBtn = dialogModal.locator('button, [role="combobox"]').filter({ hasText: /giới tính|Chọn giới tính/i }).first();
    if (await genderBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await genderBtn.click({ force: true });
      await page.waitForTimeout(400);
      const femaleOpt = page.locator('[role="option"]').filter({ hasText: /^Nữ$/i }).first();
      if (await femaleOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await femaleOpt.click({ force: true });
        await page.waitForTimeout(400);
      }
    }

    // 3. Chọn hướng: ĐÔNG
    const dirBtn = dialogModal.locator('button, [role="combobox"]').filter({ hasText: /Chọn hướng/i }).first();
    if (await dirBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dirBtn.click({ force: true });
      await page.waitForTimeout(500);
      const dirOpt = page.getByRole('option', { name: 'Đông', exact: true }).or(page.locator('[role="option"]').filter({ hasText: /^Đông$/i })).first();
      await expect(dirOpt).toBeVisible({ timeout: 5000 });
      await dirOpt.click({ force: true });
      await page.waitForTimeout(500);
    }

    // 4. Bấm nút "Xem kết quả"
    const submitBtn = dialogModal.locator('button').filter({ hasText: /^Xem kết quả$/i }).or(dialogModal.locator('button:has-text("Xem kết quả")')).first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click({ force: true });
    await page.waitForTimeout(2500);

    const resultHeader = dialogModal.locator('text=/Thông tin gia chủ|Quẻ mệnh|Ngũ hành|Năm sinh/i').first();
    await expect(resultHeader).toBeVisible({ timeout: 10000 });

    const canChiInfo = dialogModal.locator('text=/Năm sinh dương lịch|Năm sinh âm lịch|Quẻ mệnh/i').first();
    await expect(canChiInfo).toBeVisible();

    await page.screenshot({ path: path.join(DEBUG_SCREENSHOTS_DIR, 'geomancy-female-analysis-result.png') });

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC25 - should evaluate inauspicious directions and display feng shui warnings (Non-Happy / Inauspicious Case)', async ({ page }) => {
    test.setTimeout(60000);

    const geomancyTab = page.locator('button, div').filter({ hasText: /^Phong thuỷ$/i }).first();
    await geomancyTab.click({ force: true });
    await page.waitForTimeout(1000);

    const geomancyCard = page.locator('text=Xem phong thuỷ').first();
    await geomancyCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    // Chọn ngày sinh
    const dateBtn = dialogModal.locator('button').filter({ hasText: /ngày sinh|/i }).first();
    if (await dateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateBtn.click({ force: true });
      await page.waitForTimeout(400);
      const calDay = page.locator('[role="gridcell"], button:has-text("15"), button:has-text("10")').first();
      if (await calDay.isVisible({ timeout: 3000 }).catch(() => false)) {
        await calDay.click({ force: true });
        await page.waitForTimeout(400);
      }
    }

    // Chọn Giới tính: Nam
    const genderBtn = dialogModal.locator('button, [role="combobox"]').filter({ hasText: /giới tính|Chọn giới tính/i }).first();
    if (await genderBtn.isVisible()) {
      await genderBtn.click({ force: true });
      await page.locator('[role="option"]').filter({ hasText: /^Nam$/i }).first().click({ force: true });
      await page.waitForTimeout(400);
    }

    // Chọn hướng xung khắc / hướng xấu (Tây Nam hoặc Tây Bắc)
    const dirBtn = dialogModal.locator('button, [role="combobox"]').filter({ hasText: /Chọn hướng/i }).first();
    if (await dirBtn.isVisible()) {
      await dirBtn.click({ force: true });
      await page.waitForTimeout(400);
      const badDirOpt = page.locator('[role="option"]').filter({ hasText: /Tây Nam|Tây Bắc|Tây/i }).first();
      await badDirOpt.click({ force: true });
      await page.waitForTimeout(400);
    }

    const submitBtn = dialogModal.locator('button').filter({ hasText: /^Xem kết quả$/i }).first();
    await submitBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // Xác thực hệ thống hiển thị phân tích hướng phong thủy
    const analysisText = dialogModal.locator('text=/Hướng|Bát trạch|Thông tin gia chủ|Quẻ mệnh/i').first();
    await expect(analysisText).toBeVisible({ timeout: 10000 });

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC26 - should disable feng shui result submission when birth date or direction is missing (Non-Happy Case)', async ({ page }) => {
    test.setTimeout(60000);

    const geomancyTab = page.locator('button, div').filter({ hasText: /^Phong thuỷ$/i }).first();
    await geomancyTab.click({ force: true });
    await page.waitForTimeout(1000);

    const geomancyCard = page.locator('text=Xem phong thuỷ').first();
    await geomancyCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    // Khi vừa mở modal, chưa nhập ngày sinh và chưa chọn hướng
    const submitBtn = dialogModal.locator('button').filter({ hasText: /^Xem kết quả$/i }).or(dialogModal.locator('button:has-text("Xem kết quả")')).first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    // Nút "Xem kết quả" bắt buộc phải bị disabled
    await expect(submitBtn).toBeDisabled();

    // Thử chỉ chọn Giới tính Nam nhưng vẫn chưa chọn Hướng
    const genderBtn = dialogModal.locator('button, [role="combobox"]').filter({ hasText: /giới tính|Chọn giới tính/i }).first();
    if (await genderBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await genderBtn.click({ force: true });
      await page.waitForTimeout(400);
      const maleOpt = page.locator('[role="option"]').filter({ hasText: /^Nam$/i }).first();
      if (await maleOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await maleOpt.click({ force: true });
        await page.waitForTimeout(400);
      }
    }

    // Nút "Xem kết quả" vẫn phải bị disabled vì chưa chọn hướng
    await expect(submitBtn).toBeDisabled();

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC27 - should allow re-calculating with different birth years dynamically in same modal', async ({ page }) => {
    test.setTimeout(60000);

    const geomancyTab = page.locator('button, div').filter({ hasText: /^Phong thuỷ$/i }).first();
    await geomancyTab.click({ force: true });
    await page.waitForTimeout(1000);

    const geomancyCard = page.locator('text=Xem phong thuỷ').first();
    await geomancyCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    // Lần 1: Xem cho Nam sinh
    const dateBtn = dialogModal.locator('button').filter({ hasText: /ngày sinh|/i }).first();
    if (await dateBtn.isVisible()) {
      await dateBtn.click({ force: true });
      const calDay = page.locator('[role="gridcell"], button:has-text("10")').first();
      if (await calDay.isVisible()) await calDay.click({ force: true });
    }

    const genderBtn = dialogModal.locator('button, [role="combobox"]').filter({ hasText: /giới tính|Chọn giới tính/i }).first();
    if (await genderBtn.isVisible()) {
      await genderBtn.click({ force: true });
      await page.locator('[role="option"]').filter({ hasText: /^Nam$/i }).first().click({ force: true });
    }

    const dirBtn = dialogModal.locator('button, [role="combobox"]').filter({ hasText: /Chọn hướng/i }).first();
    if (await dirBtn.isVisible()) {
      await dirBtn.click({ force: true });
      await page.locator('[role="option"]').first().click({ force: true });
    }

    const submitBtn = dialogModal.locator('button').filter({ hasText: /^Xem kết quả$/i }).first();
    if (await submitBtn.isEnabled()) {
      await submitBtn.click({ force: true });
      await page.waitForTimeout(1500);
      await expect(dialogModal.locator('text=/Thông tin gia chủ/i').first()).toBeVisible({ timeout: 8000 });
    }

    // Đổi giới tính sang Nữ và tính lại ngay trên form
    if (await genderBtn.isVisible()) {
      await genderBtn.click({ force: true });
      await page.locator('[role="option"]').filter({ hasText: /^Nữ$/i }).first().click({ force: true });
      if (await submitBtn.isEnabled()) {
        await submitBtn.click({ force: true });
        await page.waitForTimeout(1500);
        await expect(dialogModal.locator('text=/Thông tin gia chủ/i').first()).toBeVisible();
      }
    }

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  /* =========================================================================
   * 7. CÔNG CỤ PHONG THUỶ: THƯỚC LỖ BAN (LU BAN RULER)
   * ========================================================================= */
  test('TC28 - should open Lu Ban Ruler tool (Thước lỗ ban), measure dimensions and verify auspicious indicators (Happy Case)', async ({ page }) => {
    test.setTimeout(60000);

    const geomancyTab = page.locator('button, div').filter({ hasText: /^Phong thuỷ$/i }).first();
    await expect(geomancyTab).toBeVisible({ timeout: 10000 });
    await geomancyTab.click({ force: true });
    await page.waitForTimeout(1000);

    const rulerCard = page.locator('text=Thước lỗ ban').first();
    await expect(rulerCard).toBeVisible({ timeout: 10000 });

    const cardContainer = rulerCard.locator('xpath=ancestor::div[contains(@class, "rounded") or contains(@class, "card") or contains(@class, "border")][1]');
    if ((await cardContainer.innerText().catch(() => '')).includes('SẮP RA MẮT')) {
      test.skip(true, 'Chức năng Thước lỗ ban đang ở trạng thái Sắp ra mắt');
      return;
    }

    await rulerCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });
    await expect(dialogModal.locator('text=/Thước lỗ ban/i').first()).toBeVisible();

    const rulerInput = dialogModal.locator('input[placeholder*="Nhập số đo"], input[type="text"]').first();
    await expect(rulerInput).toBeVisible({ timeout: 5000 });

    // Nhập số đo chuẩn 155 cm
    await rulerInput.fill('155');
    await page.waitForTimeout(1000);

    const dimensionText = dialogModal.locator('text=/155cm|155/i').first();
    await expect(dimensionText).toBeVisible({ timeout: 8000 });

    const rulerCung = dialogModal.locator('text=/Thước 52|QUÝ NHÂN|QUYỀN LỘC|TRUNG TÍN|TÁC QUAN|PHÁT ĐẠT|THÔNG MINH|HIỂM HỌA/i').first();
    await expect(rulerCung).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: path.join(DEBUG_SCREENSHOTS_DIR, 'lu-ban-ruler-measured.png') });

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC29 - should display all 3 standard Lu Ban ruler scales (52.2cm, 42.9cm, 39cm) simultaneously', async ({ page }) => {
    test.setTimeout(60000);

    const geomancyTab = page.locator('button, div').filter({ hasText: /^Phong thuỷ$/i }).first();
    await geomancyTab.click({ force: true });
    await page.waitForTimeout(1000);

    const rulerCard = page.locator('text=Thước lỗ ban').first();
    await rulerCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    // Xác thực sự tồn tại của cả 3 loại thước Lỗ Ban truyền thống
    const ruler52 = dialogModal.locator('text=/Thước 52/i').first();
    const ruler42 = dialogModal.locator('text=/Thước 42/i').first();
    const ruler39 = dialogModal.locator('text=/Thước 39/i').first();

    await expect(ruler52).toBeVisible({ timeout: 8000 });
    await expect(ruler42).toBeVisible({ timeout: 8000 });
    await expect(ruler39).toBeVisible({ timeout: 8000 });

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC30 - should identify inauspicious dimension marks across ruler scales (Non-Happy / Inauspicious Case)', async ({ page }) => {
    test.setTimeout(60000);

    const geomancyTab = page.locator('button, div').filter({ hasText: /^Phong thuỷ$/i }).first();
    await geomancyTab.click({ force: true });
    await page.waitForTimeout(1000);

    const rulerCard = page.locator('text=Thước lỗ ban').first();
    await rulerCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    const rulerInput = dialogModal.locator('input[placeholder*="Nhập số đo"]').first();
    // Kích thước rơi vào Cung Hung (Hiểm Họa / Bệnh / Ly / Tai Họa)
    await rulerInput.fill('160');
    await page.waitForTimeout(1000);

    // Xác thực các cung xấu (Hung / Cung Đen) xuất hiện trên dải thước
    const inauspiciousMark = dialogModal.locator('text=/HIỂM HỌA|TAI HỌA|THIÊN TAI|CÔ ĐỘC|BỆNH|THOÁI TÀI|HẠI|KHẨU THIỆT/i').first();
    await expect(inauspiciousMark).toBeVisible({ timeout: 8000 });

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC31 - should sanitize invalid non-numeric and negative inputs in Lu Ban ruler (Non-Happy Case)', async ({ page }) => {
    test.setTimeout(60000);

    const geomancyTab = page.locator('button, div').filter({ hasText: /^Phong thuỷ$/i }).first();
    await geomancyTab.click({ force: true });
    await page.waitForTimeout(1000);

    const rulerCard = page.locator('text=Thước lỗ ban').first();
    await rulerCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    const rulerInput = dialogModal.locator('input[placeholder*="Nhập số đo"]').first();
    await expect(rulerInput).toBeVisible({ timeout: 5000 });

    // 1. Thử nhập chuỗi ký tự chữ cái không hợp lệ
    await rulerInput.fill('ABCXYZ');
    await page.waitForTimeout(300);
    // Ô input tự động lọc bỏ chữ cái, không cho nhập ký tự phi số
    expect(await rulerInput.inputValue()).not.toContain('ABCXYZ');

    // 2. Thử nhập số âm
    await rulerInput.fill('-50');
    await page.waitForTimeout(300);
    // Ô input tự động loại bỏ dấu âm, chuyển thành số dương hợp lệ
    const val = await rulerInput.inputValue();
    expect(Number(val)).toBeGreaterThanOrEqual(0);

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  test('TC32 - should handle extreme large dimensions in Lu Ban ruler without UI break (Boundary Case)', async ({ page }) => {
    test.setTimeout(60000);

    const geomancyTab = page.locator('button, div').filter({ hasText: /^Phong thuỷ$/i }).first();
    await geomancyTab.click({ force: true });
    await page.waitForTimeout(1000);

    const rulerCard = page.locator('text=Thước lỗ ban').first();
    await rulerCard.click({ force: true });
    const dialogModal = page.locator('div[role="dialog"]').first();
    await dialogModal.waitFor({ state: 'visible', timeout: 10000 });

    const rulerInput = dialogModal.locator('input[placeholder*="Nhập số đo"]').first();
    // Nhập kích thước lớn: 2500 cm (25 mét)
    await rulerInput.fill('2500');
    await page.waitForTimeout(1000);

    // Giao diện thước vẫn hiển thị giá trị và không bị crash
    await expect(dialogModal).toBeVisible();
    const valText = dialogModal.locator('text=/2500cm|2500/i').first();
    await expect(valText).toBeVisible({ timeout: 5000 });

    const closeBtn = dialogModal.locator('button[aria-label*="close"i], button:has-text("✕"), svg.lucide-x').first();
    await closeBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
  });

  /* =========================================================================
   * 8. CÁC CHỨC NĂNG ĐANG PHÁT TRIỂN (SẮP RA MẮT)
   * ========================================================================= */
  test('TC33 - should skip disabled coming soon feature: Dự toán xây dựng', async ({ page }) => {
    test.skip(true, 'Chức năng "Dự toán xây dựng" đang ở trạng thái Sắp ra mắt / Disabled');
  });

  test('TC34 - should skip disabled coming soon feature: Bản đồ cộng đồng', async ({ page }) => {
    test.skip(true, 'Chức năng "Bản đồ cộng đồng" đang ở trạng thái Sắp ra mắt / Disabled');
  });

  test('TC35 - should skip disabled coming soon feature: Bản đồ của tôi', async ({ page }) => {
    test.skip(true, 'Chức năng "Bản đồ của tôi" đang ở trạng thái Sắp ra mắt / Disabled');
  });
});
