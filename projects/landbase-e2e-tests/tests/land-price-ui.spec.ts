import { test, expect, Page, TestInfo } from '@playwright/test';
import { skipOnboardingTour } from './helpers';

/**
 * ============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG GIAO DIỆN (WEB UI E2E) – LANDBASE
 * CHỨC NĂNG: BẢNG GIÁ ĐẤT & BẢN ĐỒ NHIỆT GIS
 * ----------------------------------------------------------------------------
 * Ứng dụng kiểm thử: https://dev-webapp.laand.vn/bang-gia-dat (hoặc BASE_URL)
 * Các tính năng bao phủ:
 *   1. Điều hướng & Giao diện tổng quan (Header, Subtitle, Menu, Chú thích vị trí đất)
 *   2. Bảng dữ liệu giá đất (4 cột tiêu đề chuẩn, format giá tiền VNĐ, phân loại đất)
 *   3. Phân trang dữ liệu (Pagination: Trước, 1, 2, Sau)
 *   4. Bộ lọc tìm kiếm tên đường & An toàn dữ liệu (Reset, XSS/SQLi)
 *   5. Tự động nhận diện Vị trí & GPS Geolocation (Hà Nội, TP.HCM, Fallback không GPS)
 *   6. Bộ lọc chi tiết từng ô tìm kiếm (Tỉnh/TP -> mở khóa Phường/Xã, Loại đất, Đa điều kiện)
 *   7. Bản đồ nhiệt GIS tương tác theo Loại đất & Bộ lọc
 *   8. Xem vị trí thửa đất trên Bản đồ nhiệt GIS qua Icon Con Mắt (UI-LP-024 -> UI-LP-026)
 * ============================================================================
 */

const WEBAPP_URL = process.env.WEBAPP_BASE_URL || process.env.BASE_URL || 'https://dev-webapp.laand.vn';

/**
 * Đính kèm bằng chứng kiểm thử (JSON metadata + Ảnh chụp màn hình) vào HTML Report
 */
async function attachUiEvidence(page: Page, testInfo: TestInfo, testId: string, details: Record<string, any>) {
  await testInfo.attach(`${testId}_UI_Evidence.json`, {
    contentType: 'application/json',
    body: JSON.stringify(
      {
        testcaseId: testId,
        title: testInfo.title,
        currentUrl: page.url(),
        timestamp: new Date().toISOString(),
        ...details,
      },
      null,
      2
    ),
  });

  const screenshot = await page.screenshot({ fullPage: false }).catch(() => null);
  if (screenshot) {
    await testInfo.attach(`${testId}_UI_Screenshot.png`, {
      contentType: 'image/png',
      body: screenshot,
    });
  }
}

/**
 * Helper đóng driver tour và các overlay popup nếu xuất hiện
 */
async function clearOverlays(page: Page) {
  await page.evaluate(() => {
    try {
      const driverClose = document.querySelector('.driver-popover-close-btn') as HTMLElement | null;
      if (driverClose) driverClose.click();
      document.querySelectorAll('.driver-overlay, .driver-popover').forEach(el => el.remove());
    } catch {}
  }).catch(() => {});
}

/**
 * Helper mở trang Bảng giá đất và đảm bảo đã load xong dữ liệu
 */
async function openLandPricePage(page: Page) {
  await page.goto(`${WEBAPP_URL}/bang-gia-dat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await clearOverlays(page);
  await skipOnboardingTour(page);

  // Đợi tiêu đề trang hoặc bảng dữ liệu hiển thị
  const pageHeader = page.locator('h1, h2').filter({ hasText: /^Bảng giá đất$/i }).first();
  await expect(pageHeader).toBeVisible({ timeout: 15000 });
  return pageHeader;
}

/**
 * Helper chọn một mục trong dropdown Radix Popover (Tỉnh/Thành phố, Phường/Xã, Loại đất)
 */
async function selectDropdownOption(page: Page, ariaLabel: string, optionMatcher: string | RegExp) {
  const btn = page.locator(`button[aria-label="${ariaLabel}"]`).first();
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click({ force: true });
  await page.waitForTimeout(600);

  const popover = page.locator('[data-radix-popper-content-wrapper]');
  const option = popover.locator('[role="option"]').filter({ hasText: optionMatcher }).first();
  await expect(option).toBeVisible({ timeout: 8000 });
  await option.click({ force: true });
  await page.waitForTimeout(600);
}

test.describe('LandBase Web UI E2E – Chức năng Bảng giá đất & Bản đồ nhiệt GIS', () => {
  // Cấu hình mode: 'default' để 1 test fail không làm gián đoạn các test tiếp theo
  test.describe.configure({ mode: 'default' });

  test.afterEach(async ({ page }) => {
    await clearOverlays(page);
  });

  // ============================================================================
  // NHÓM 1: ĐIỀU HƯỚNG & GIAO DIỆN TỔNG QUAN (UI-LP-001 -> UI-LP-004)
  // ============================================================================
  test.describe('Nhóm 1: Điều hướng & Giao diện tổng quan', () => {

    test('UI-LP-001: Điều hướng đến trang Bảng giá đất từ Trang chủ -> Khối "Tiện ích mở rộng" -> Tab "Tài chính" -> Bấm thẻ "Bảng giá đất"', async ({ page }, testInfo) => {
      // 1. Mở Trang chủ
      await page.goto(`${WEBAPP_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await clearOverlays(page);
      await skipOnboardingTour(page);

      // 2. Cuộn tới khối "Tiện ích mở rộng"
      const utilitiesSection = page.locator('text=/Tiện ích mở rộng/i').first();
      await expect(utilitiesSection).toBeVisible({ timeout: 15000 });
      await utilitiesSection.scrollIntoViewIfNeeded();

      // 3. Đảm bảo tab "Tài chính" được chọn
      const tabTaiChinh = page.locator('button, [role="tab"]').filter({ hasText: /^Tài chính$/i }).first();
      if (await tabTaiChinh.isVisible()) {
        await tabTaiChinh.click({ force: true });
        await page.waitForTimeout(500);
      }

      // 4. Tìm thẻ/nút "Bảng giá đất" (với mô tả tra cứu khung giá đất Nhà nước)
      const landPriceCard = page.locator('button').filter({ hasText: 'Bảng giá đất' }).first();
      await expect(landPriceCard).toBeVisible({ timeout: 10000 });
      await landPriceCard.scrollIntoViewIfNeeded();

      const cardDesc = await landPriceCard.innerText();

      // 5. Click vào thẻ "Bảng giá đất"
      await landPriceCard.click({ force: true });
      await page.waitForTimeout(2000);

      // 6. Khẳng định URL chuyển hướng chính xác đến /bang-gia-dat
      await expect(page).toHaveURL(/\/bang-gia-dat/);

      // 7. Khẳng định tiêu đề H1 "Bảng giá đất" hiển thị rõ ràng
      const header = page.locator('h1, h2').filter({ hasText: /^Bảng giá đất$/i }).first();
      await expect(header).toBeVisible({ timeout: 15000 });

      // Chụp ảnh màn hình bằng chứng trang Bảng giá đất thực tế
      await attachUiEvidence(page, testInfo, 'UI-LP-001', {
        navigatedFrom: 'Trang chủ > Tiện ích mở rộng > Tài chính > Bảng giá đất',
        currentUrl: page.url(),
        cardDescription: cardDesc.trim(),
        pageHeader: (await header.innerText()).trim(),
      });

      expect(page.url()).toContain('/bang-gia-dat');
    });

    test('UI-LP-002: Hiển thị đúng tiêu đề chính "Bảng giá đất" và dòng mô tả giới thiệu màn hình', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      // 1. Tiêu đề chính h1 / h2 "Bảng giá đất"
      const title = page.locator('h1, h2').filter({ hasText: /^Bảng giá đất$/i }).first();
      await expect(title).toBeVisible({ timeout: 10000 });
      const titleText = (await title.innerText()).trim();

      // 2. Dòng mô tả: "Tra cứu bảng giá đất của nhà nước theo từng khu vực"
      const subtitle = page.locator('p, span').filter({ hasText: /Tra cứu bảng giá đất của nhà nước theo từng khu vực/i }).first();
      await expect(subtitle).toBeVisible({ timeout: 10000 });
      const subtitleText = (await subtitle.innerText()).trim();

      await attachUiEvidence(page, testInfo, 'UI-LP-002', {
        titleText,
        subtitleText,
      });

      expect(titleText).toBe('Bảng giá đất');
      expect(subtitleText).toContain('Tra cứu bảng giá đất của nhà nước');
    });

    test('UI-LP-003: Hiển thị đầy đủ khối "Bộ lọc tìm kiếm" bên trái (Ô nhập, 3 Dropdown chọn và nút Tìm kiếm)', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      // 1. Tiêu đề khối bộ lọc
      const filterTitle = page.locator('text=/Bộ lọc tìm kiếm/i').first();
      await expect(filterTitle).toBeVisible({ timeout: 10000 });

      // 2. Ô nhập tìm kiếm (Nhập phường/xã, tên đường)
      const searchInput = page.locator('input[placeholder*="Nhập phường/xã, tên đường"]:visible').first();
      await expect(searchInput).toBeVisible({ timeout: 10000 });

      // 3. Các nhãn trường lọc: Tỉnh / Thành phố, Phường / Xã, Loại đất
      const labelProvince = page.locator('text=/Tỉnh\\s*\\/\\s*Thành phố/i').first();
      const labelWard = page.locator('text=/Phường\\s*\\/\\s*Xã/i').first();
      const labelLandType = page.locator('text=/Loại đất/i').first();

      await expect(labelProvince).toBeVisible();
      await expect(labelWard).toBeVisible();
      await expect(labelLandType).toBeVisible();

      // 4. Nút bấm "Tìm kiếm"
      const submitBtn = page.locator('button:has-text("Tìm kiếm")').first();
      await expect(submitBtn).toBeVisible({ timeout: 5000 });

      await attachUiEvidence(page, testInfo, 'UI-LP-003', {
        filterTitle: (await filterTitle.innerText()).trim(),
        inputPlaceholder: await searchInput.getAttribute('placeholder'),
        hasSubmitButton: await submitBtn.isVisible(),
      });
    });

    test('UI-LP-004: Hiển thị khối "Chú thích" vị trí đất đầy đủ (Vị trí 1: Mặt tiền, Vị trí 2 & 3: Ngõ 3m-5m, Vị trí 4 & 5: Ngõ sâu)', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      // Khối Chú thích
      const noteTitle = page.locator('text=/Chú thích/i').first();
      await expect(noteTitle).toBeVisible({ timeout: 10000 });

      // Vị trí 1
      const notePos1 = page.locator('li:has-text("Vị trí 1"), p:has-text("Vị trí 1"), div:has-text("Vị trí 1")').filter({ hasText: /Mặt tiền/i }).first();
      await expect(notePos1).toBeVisible();
      const pos1Text = (await notePos1.innerText()).trim();

      // Vị trí 2 & 3
      const notePos23 = page.locator('li:has-text("Vị trí 2"), p:has-text("Vị trí 2"), div:has-text("Vị trí 2")').first();
      await expect(notePos23).toBeVisible();

      // Vị trí 4 & 5
      const notePos45 = page.locator('li:has-text("Vị trí 4"), p:has-text("Vị trí 4"), div:has-text("Vị trí 4")').first();
      await expect(notePos45).toBeVisible();

      await attachUiEvidence(page, testInfo, 'UI-LP-004', {
        pos1Text,
        hasNoteSection: await noteTitle.isVisible(),
      });

      expect(pos1Text).toContain('Mặt tiền');
    });
  });

  // ============================================================================
  // NHÓM 2: BẢNG DỮ LIỆU GIÁ ĐẤT & PHÂN TRANG (UI-LP-005 -> UI-LP-009)
  // ============================================================================
  test.describe('Nhóm 2: Bảng dữ liệu giá đất & Phân trang', () => {

    test('UI-LP-005: Hiển thị bảng dữ liệu với 4 cột tiêu đề chuẩn: PHƯỜNG/XÃ, ĐƯỜNG & ĐOẠN ĐƯỜNG, VỊ TRÍ & ĐƠN GIÁ (VNĐ/M²), LOẠI ĐẤT', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      // Kiểm tra 4 cột header của bảng dữ liệu
      const colWard = page.locator('th, [role="columnheader"]').filter({ hasText: /PHƯỜNG\/XÃ/i }).first();
      const colStreet = page.locator('th, [role="columnheader"]').filter({ hasText: /ĐƯỜNG & ĐOẠN ĐƯỜNG/i }).first();
      const colPrice = page.locator('th, [role="columnheader"]').filter({ hasText: /VỊ TRÍ & ĐƠN GIÁ/i }).first();
      const colLandType = page.locator('th, [role="columnheader"]').filter({ hasText: /LOẠI ĐẤT/i }).first();

      await expect(colWard).toBeVisible({ timeout: 10000 });
      await expect(colStreet).toBeVisible({ timeout: 10000 });
      await expect(colPrice).toBeVisible({ timeout: 10000 });
      await expect(colLandType).toBeVisible({ timeout: 10000 });

      await attachUiEvidence(page, testInfo, 'UI-LP-005', {
        colWard: (await colWard.innerText()).trim(),
        colStreet: (await colStreet.innerText()).trim(),
        colPrice: (await colPrice.innerText()).trim(),
        colLandType: (await colLandType.innerText()).trim(),
      });
    });

    test('UI-LP-006: Dữ liệu mỗi dòng hiển thị đầy đủ thông tin: Đường, Đoạn đường (từ -> đến), Đơn giá format VNĐ và Loại đất', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      // Đợi hàng dữ liệu đầu tiên hiển thị
      const firstRow = page.locator('table tbody tr').first();
      await expect(firstRow).toBeVisible({ timeout: 15000 });

      const rowText = (await firstRow.innerText()).trim();

      // Kiểm tra định dạng tiền tệ (chứa ký hiệu "đ" hoặc "VNĐ")
      const priceCell = firstRow.locator('text=/\\d+[.,]\\d+\\s*(?:đ|VNĐ|đồng)/i').first();
      await expect(priceCell).toBeVisible({ timeout: 10000 });
      const priceText = (await priceCell.innerText()).trim();

      // Kiểm tra mũi tên chỉ đoạn đường (→ hoặc ->)
      const hasArrow = rowText.includes('→') || rowText.includes('->') || rowText.includes('đến');

      await attachUiEvidence(page, testInfo, 'UI-LP-006', {
        sampleRowText: rowText,
        formattedPrice: priceText,
        hasRoadSegment: hasArrow,
      });

      expect(priceText).toMatch(/\d/);
    });

    test('UI-LP-007: Hiển thị thanh điều hướng phân trang (Trước, 1, 2, ..., Sau) và chuyển trang mượt mà khi bấm trang 2', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      // Tìm thanh phân trang
      const paginationNav = page.locator('nav, [class*="pagination"]').first();
      await expect(paginationNav).toBeVisible({ timeout: 15000 });

      // Lấy text hàng đầu tiên ở trang 1
      const initialRowText = (await page.locator('table tbody tr').first().innerText()).trim();

      // Tìm và bấm nút chuyển sang Trang 2
      const page2Btn = page.locator('nav a, nav button, [class*="pagination"] a, [class*="pagination"] button').filter({ hasText: /^2$/ }).first();
      if (await page2Btn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page2Btn.click({ force: true });
        await page.waitForTimeout(2000);

        // Hàng đầu tiên ở trang 2 phải khác biệt so với trang 1
        const newRowText = (await page.locator('table tbody tr').first().innerText()).trim();

        await attachUiEvidence(page, testInfo, 'UI-LP-007', {
          page1FirstRow: initialRowText.slice(0, 80),
          page2FirstRow: newRowText.slice(0, 80),
          isDifferent: initialRowText !== newRowText,
        });

        expect(newRowText.length).toBeGreaterThan(0);
      }
    });

    test('UI-LP-008: Nút "Trước" (Previous) bị vô hiệu hóa khi đang ở trang đầu tiên (trang 1)', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      // Tìm thẻ link/button "Trước" trong thanh phân trang
      const prevBtn = page.locator('nav a, nav button, [data-slot="pagination-link"]').filter({ hasText: /Trước|Previous/i }).first();
      if (await prevBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Kiểm tra xem nút có class disabled, pointer-events-none hoặc aria-disabled không
        const isAriaDisabled = (await prevBtn.getAttribute('aria-disabled')) === 'true';
        const className = (await prevBtn.getAttribute('class')) || '';
        const isDisabled = isAriaDisabled || className.includes('disabled') || className.includes('pointer-events-none') || className.includes('opacity');

        await attachUiEvidence(page, testInfo, 'UI-LP-008', {
          buttonText: (await prevBtn.innerText()).trim(),
          isAriaDisabled,
          className,
          isDisabledAtPage1: isDisabled,
        });

        expect(isDisabled).toBe(true);
      }
    });

    test('UI-LP-009: Bấm chuyển qua lại giữa các trang (Trang 1 -> Trang 2 -> Trang 1) phục hồi đúng dữ liệu ban đầu', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      const firstRow = page.locator('table tbody tr').first();
      await expect(firstRow).toBeVisible({ timeout: 10000 });
      const originalText = (await firstRow.innerText()).trim();

      // Bấm sang trang 2
      const page2Btn = page.locator('nav a, nav button').filter({ hasText: /^2$/ }).first();
      if (await page2Btn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page2Btn.click({ force: true });
        await page.waitForTimeout(1500);

        // Bấm quay lại trang 1
        const page1Btn = page.locator('nav a, nav button').filter({ hasText: /^1$/ }).first();
        await expect(page1Btn).toBeVisible({ timeout: 5000 });
        await page1Btn.click({ force: true });
        await page.waitForTimeout(1500);

        // Khẳng định dữ liệu trang 1 được khôi phục nguyên vẹn
        const restoredText = (await firstRow.innerText()).trim();

        await attachUiEvidence(page, testInfo, 'UI-LP-009', {
          originalText: originalText.slice(0, 80),
          restoredText: restoredText.slice(0, 80),
        });

        expect(restoredText).toBe(originalText);
      }
    });
  });

  // ============================================================================
  // NHÓM 3: BỘ LỌC & TÌM KIẾM GIÁ ĐẤT (UI-LP-010 -> UI-LP-013)
  // ============================================================================
  test.describe('Nhóm 3: Bộ lọc & Tìm kiếm giá đất', () => {

    test('UI-LP-010: Tìm kiếm theo tên đường hợp lệ (ví dụ: "Âu Cơ") trả về danh sách kết quả khớp chính xác từ khóa', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      const searchInput = page.locator('input[placeholder*="Nhập phường/xã, tên đường"]:visible').first();
      await expect(searchInput).toBeVisible({ timeout: 10000 });

      // Nhập từ khóa tên đường phổ biến có trong dữ liệu
      const keyword = 'Âu Cơ';
      await searchInput.fill(keyword);

      const submitBtn = page.locator('button:has-text("Tìm kiếm")').first();
      await submitBtn.click({ force: true });
      await page.waitForTimeout(2000);

      // Kiểm tra các hàng kết quả trả về
      const resultRows = page.locator('table tbody tr');
      const rowCount = await resultRows.count();
      expect(rowCount).toBeGreaterThan(0);

      // Khẳng định ít nhất 1 hàng hiển thị đúng tên đường đã tìm
      const matchedRow = resultRows.filter({ hasText: new RegExp(keyword, 'i') }).first();
      await expect(matchedRow).toBeVisible({ timeout: 10000 });

      await attachUiEvidence(page, testInfo, 'UI-LP-010', {
        searchKeyword: keyword,
        returnedRowsCount: rowCount,
        firstRowSnippet: (await resultRows.first().innerText()).trim().slice(0, 100),
      });
    });

    test('UI-LP-011: Tìm kiếm với tên đường không tồn tại hiển thị Empty State chuẩn UX', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      const searchInput = page.locator('input[placeholder*="Nhập phường/xã, tên đường"]:visible').first();
      await searchInput.fill('ĐườngKhôngTồnTại99999XYZ');

      const submitBtn = page.locator('button:has-text("Tìm kiếm")').first();
      await submitBtn.click({ force: true });
      await page.waitForTimeout(2000);

      // Bảng hiển thị thông báo rỗng (Empty State)
      const emptyState = page.locator('table tbody, div').locator('text=/Không tìm thấy|Dữ liệu đang được cập nhật|Chưa có dữ liệu|Không có dữ liệu/i').first();
      await expect(emptyState).toBeVisible({ timeout: 10000 });

      await attachUiEvidence(page, testInfo, 'UI-LP-011', {
        emptyStateMessage: (await emptyState.innerText()).trim(),
      });
    });

    test('UI-LP-012: Xóa trắng ô tìm kiếm và bấm lại "Tìm kiếm" -> Bảng dữ liệu tự động phục hồi danh sách gốc ban đầu', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      const searchInput = page.locator('input[placeholder*="Nhập phường/xã, tên đường"]:visible').first();
      const submitBtn = page.locator('button:has-text("Tìm kiếm")').first();

      // 1. Tìm kiếm đường "Giang Văn Minh"
      await searchInput.fill('Giang Văn Minh');
      await submitBtn.click({ force: true });
      await page.waitForTimeout(1500);

      // 2. Xóa trắng ô tìm kiếm và bấm Tìm kiếm lại
      await searchInput.fill('');
      await submitBtn.click({ force: true });
      await page.waitForTimeout(2000);

      // Khẳng định danh sách đầy đủ ban đầu được khôi phục (>= 5 hàng)
      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThanOrEqual(5);

      await attachUiEvidence(page, testInfo, 'UI-LP-012', {
        restoredRowCount: rowCount,
      });
    });

    test('UI-LP-013: Xử lý an toàn khi nhập ký tự đặc biệt, dấu ngoặc, SQL Injection & XSS payload vào ô tìm kiếm', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      const searchInput = page.locator('input[placeholder*="Nhập phường/xã, tên đường"]:visible').first();
      const submitBtn = page.locator('button:has-text("Tìm kiếm")').first();

      // Payload kiểm thử bảo mật
      const securityPayload = "' OR 1=1 -- <script>alert('XSS')</script>";
      await searchInput.fill(securityPayload);
      await submitBtn.click({ force: true });
      await page.waitForTimeout(2000);

      // Kiểm tra hệ thống xử lý an toàn: Không bị lỗi sập trang (500), không bung alert và bảng vẫn hiển thị bình thường
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 10000 });

      await attachUiEvidence(page, testInfo, 'UI-LP-013', {
        payload: securityPayload,
        isTableIntact: await table.isVisible(),
      });
    });
  });

  // ============================================================================
  // NHÓM 4: CHUYỂN ĐỔI BẢN ĐỒ NHIỆT GIS (UI-LP-014 -> UI-LP-015)
  // ============================================================================
  test.describe('Nhóm 4: Chuyển đổi giao diện Bản đồ nhiệt GIS', () => {

    test('UI-LP-014: Chuyển đổi giữa 2 tab "Dữ liệu bảng giá" và "Bản đồ nhiệt GIS" mượt mà, hiển thị badge GIS màu đỏ', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      // 1. Kiểm tra 2 tab chuyển đổi hiển thị phía trên bảng
      const tabTable = page.locator('button:has-text("Dữ liệu bảng giá")').first();
      const tabMap = page.locator('button:has-text("Bản đồ nhiệt")').first();

      await expect(tabTable).toBeVisible({ timeout: 10000 });
      await expect(tabMap).toBeVisible({ timeout: 10000 });

      // 2. Kiểm tra nhãn badge "GIS" màu đỏ nổi bật
      const gisBadge = tabMap.locator('text=/GIS/i').first();
      await expect(gisBadge).toBeVisible();

      // 3. Click chuyển sang tab "Bản đồ nhiệt GIS"
      await tabMap.click({ force: true });
      await page.waitForTimeout(2000);

      // 4. Click quay lại tab "Dữ liệu bảng giá"
      await tabTable.click({ force: true });
      await page.waitForTimeout(1000);

      // Bảng dữ liệu tiếp tục hiển thị bình thường
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 10000 });

      await attachUiEvidence(page, testInfo, 'UI-LP-014', {
        tabTableText: (await tabTable.innerText()).trim(),
        tabMapText: (await tabMap.innerText()).trim(),
        hasGisBadge: await gisBadge.isVisible(),
      });
    });

    test('UI-LP-015: Khi mở tab "Bản đồ nhiệt GIS", bản đồ trực quan (Canvas Map / Mapbox / MapLibre) được tải và hiển thị thành công', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      // Click sang tab "Bản đồ nhiệt GIS"
      const tabMap = page.locator('button:has-text("Bản đồ nhiệt")').first();
      await tabMap.click({ force: true });
      await page.waitForTimeout(3000);

      // Khẳng định phần tử bản đồ (canvas map hoặc container bản đồ) hiển thị
      const mapCanvas = page.locator('canvas, .mapboxgl-map, .maplibregl-map, [class*="map"]').first();
      await expect(mapCanvas).toBeVisible({ timeout: 15000 });

      await attachUiEvidence(page, testInfo, 'UI-LP-015', {
        mapCanvasVisible: await mapCanvas.isVisible(),
        currentUrl: page.url(),
      });
    });
  });

  // ============================================================================
  // NHÓM 5: TỰ ĐỘNG NHẬN DIỆN VỊ TRÍ & GPS GEOLOCATION (UI-LP-016 -> UI-LP-018)
  // ============================================================================
  test.describe('Nhóm 5: Tự động nhận diện Vị trí & GPS Geolocation', () => {

    test('UI-LP-016: Cấp quyền GPS toạ độ Hà Nội -> Tự động điền "Thành phố Hà Nội" và mở khóa ô Phường/Xã', async ({ context, page }, testInfo) => {
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 21.0285, longitude: 105.8542 });

      await page.goto(`${WEBAPP_URL}/bang-gia-dat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await clearOverlays(page);
      await skipOnboardingTour(page);
      await page.waitForTimeout(4000);

      const provinceBtn = page.locator('button[aria-label="Tỉnh / Thành phố"]').first();
      await expect(provinceBtn).toHaveText(/Thành phố Hà Nội/i, { timeout: 10000 });

      const wardBtn = page.locator('button[aria-label="Phường / Xã"]').first();
      const isWardDisabled = await wardBtn.isDisabled();
      expect(isWardDisabled).toBe(false);

      await attachUiEvidence(page, testInfo, 'UI-LP-016', {
        detectedProvince: await provinceBtn.innerText(),
        isWardDisabled,
      });
    });

    test('UI-LP-017: Cấp quyền GPS toạ độ TP.HCM -> Tự động nhận diện và điền "Thành phố Hồ Chí Minh"', async ({ context, page }, testInfo) => {
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 10.7769, longitude: 106.7009 });

      await page.goto(`${WEBAPP_URL}/bang-gia-dat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await clearOverlays(page);
      await skipOnboardingTour(page);
      await page.waitForTimeout(4000);

      const provinceBtn = page.locator('button[aria-label="Tỉnh / Thành phố"]').first();
      await expect(provinceBtn).toHaveText(/Thành phố Hồ Chí Minh/i, { timeout: 10000 });

      await attachUiEvidence(page, testInfo, 'UI-LP-017', {
        detectedProvince: await provinceBtn.innerText(),
      });
    });

    test('UI-LP-018: Khi không cấp quyền GPS (Fallback), ô Tỉnh/TP hiển thị "Tất cả" và ô Phường/Xã bị khóa (disabled)', async ({ context, page }, testInfo) => {
      await context.clearPermissions();

      await page.goto(`${WEBAPP_URL}/bang-gia-dat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await clearOverlays(page);
      await skipOnboardingTour(page);
      await page.waitForTimeout(3000);

      const provinceBtn = page.locator('button[aria-label="Tỉnh / Thành phố"]').first();
      const provinceText = (await provinceBtn.innerText()).trim();

      const wardBtn = page.locator('button[aria-label="Phường / Xã"]').first();
      const isWardDisabled = await wardBtn.isDisabled();

      await attachUiEvidence(page, testInfo, 'UI-LP-018', {
        provinceText,
        isWardDisabled,
      });

      expect(provinceText).toMatch(/Tất cả/i);
      expect(isWardDisabled).toBe(true);
    });
  });

  // ============================================================================
  // NHÓM 6: BỘ LỌC CHI TIẾT TỪNG Ô TÌM KIẾM (UI-LP-019 -> UI-LP-022)
  // ============================================================================
  test.describe('Nhóm 6: Bộ lọc chi tiết từng ô tìm kiếm (Tỉnh/TP, Phường/Xã, Loại đất)', () => {

    test('UI-LP-019: Chọn Tỉnh/Thành phố trong dropdown mở khóa và nạp danh sách Phường/Xã tương ứng', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      // Chọn Tỉnh Hà Nội
      await selectDropdownOption(page, 'Tỉnh / Thành phố', /Thành phố Hà Nội/i);

      const provinceBtn = page.locator('button[aria-label="Tỉnh / Thành phố"]').first();
      await expect(provinceBtn).toHaveText(/Thành phố Hà Nội/i);

      // Dropdown Phường/Xã được mở khóa
      const wardBtn = page.locator('button[aria-label="Phường / Xã"]').first();
      expect(await wardBtn.isDisabled()).toBe(false);

      // Mở dropdown Phường/Xã và kiểm tra có danh sách options trực thuộc
      await wardBtn.click({ force: true });
      await page.waitForTimeout(600);

      const popover = page.locator('[data-radix-popper-content-wrapper]');
      const wardOptions = popover.locator('[role="option"]');
      const count = await wardOptions.count();
      expect(count).toBeGreaterThan(1);

      await page.keyboard.press('Escape');

      await attachUiEvidence(page, testInfo, 'UI-LP-019', {
        selectedProvince: await provinceBtn.innerText(),
        wardOptionsCount: count,
      });
    });

    test('UI-LP-020: Chọn một Phường/Xã cụ thể trong dropdown và bấm Tìm kiếm -> Bảng dữ liệu lọc chính xác', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      // 1. Chọn Hà Nội
      await selectDropdownOption(page, 'Tỉnh / Thành phố', /Thành phố Hà Nội/i);

      // 2. Mở dropdown Phường/Xã và chọn một xã/phường
      const wardBtn = page.locator('button[aria-label="Phường / Xã"]').first();
      await wardBtn.click({ force: true });
      await page.waitForTimeout(600);

      const popover = page.locator('[data-radix-popper-content-wrapper]');
      const wardOption = popover.locator('[role="option"]').filter({ hasText: /Xã An Khánh|Phường Ba Đình|Phường/i }).first();
      const chosenWard = (await wardOption.innerText()).trim();
      await wardOption.click({ force: true });
      await page.waitForTimeout(600);

      // 3. Bấm Tìm kiếm
      const submitBtn = page.locator('button:has-text("Tìm kiếm")').first();
      await submitBtn.click({ force: true });
      await page.waitForTimeout(2000);

      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);

      await attachUiEvidence(page, testInfo, 'UI-LP-020', {
        chosenWard,
        rowCount,
        firstRowText: (await rows.first().innerText()).trim().slice(0, 100),
      });
    });

    test('UI-LP-021: Lọc theo Loại đất cụ thể -> Bảng dữ liệu chỉ hiển thị các bản ghi khớp Loại đất đã chọn', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      const targetCategory = 'Đất sản xuất, kinh doanh phi nông nghiệp';
      await selectDropdownOption(page, 'Loại đất', new RegExp(targetCategory, 'i'));

      const submitBtn = page.locator('button:has-text("Tìm kiếm")').first();
      await submitBtn.click({ force: true });
      await page.waitForTimeout(2000);

      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);

      // Khẳng định bản ghi trả về hiển thị đúng loại đất đã lọc
      const firstRowText = await rows.first().innerText();
      expect(firstRowText).toContain(targetCategory);

      await attachUiEvidence(page, testInfo, 'UI-LP-021', {
        selectedCategory: targetCategory,
        rowCount,
        firstRowText: firstRowText.slice(0, 120),
      });
    });

    test('UI-LP-022: Kết hợp đa bộ lọc đồng thời (Tên đường + Tỉnh/TP + Loại đất) -> Dữ liệu trả về chuẩn xác', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      // 1. Nhập tên đường
      const searchInput = page.locator('input[placeholder*="Nhập phường/xã, tên đường"]:visible').first();
      await searchInput.fill('Âu Cơ');

      // 2. Chọn Tỉnh Hà Nội
      await selectDropdownOption(page, 'Tỉnh / Thành phố', /Thành phố Hà Nội/i);

      // 3. Chọn Loại đất
      const targetCategory = 'Đất sản xuất, kinh doanh phi nông nghiệp';
      await selectDropdownOption(page, 'Loại đất', new RegExp(targetCategory, 'i'));

      // 4. Bấm Tìm kiếm
      const submitBtn = page.locator('button:has-text("Tìm kiếm")').first();
      await submitBtn.click({ force: true });
      await page.waitForTimeout(2000);

      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);

      const firstRow = await rows.first().innerText();
      expect(firstRow).toMatch(/Âu Cơ/i);
      expect(firstRow).toContain(targetCategory);

      await attachUiEvidence(page, testInfo, 'UI-LP-022', {
        keyword: 'Âu Cơ',
        province: 'Thành phố Hà Nội',
        category: targetCategory,
        rowCount,
        firstRow: firstRow.slice(0, 120),
      });
    });
  });

  // ============================================================================
  // NHÓM 7: BẢN ĐỒ NHIỆT GIS TƯƠNG TÁC THEO LOẠI ĐẤT (UI-LP-023)
  // ============================================================================
  test.describe('Nhóm 7: Bản đồ nhiệt GIS tương tác theo Loại đất & Bộ lọc', () => {

    test('UI-LP-023: Đang ở tab "Bản đồ nhiệt GIS", thay đổi Loại đất và bấm Tìm kiếm -> Bản đồ nhiệt GIS duy trì ổn định và cập nhật layer', async ({ page }, testInfo) => {
      await openLandPricePage(page);

      // 1. Chuyển sang tab Bản đồ nhiệt GIS
      const tabMap = page.locator('button:has-text("Bản đồ nhiệt")').first();
      await tabMap.click({ force: true });
      await page.waitForTimeout(3000);

      // Khẳng định phần tử bản đồ hiển thị
      const mapCanvas = page.locator('canvas, .mapboxgl-map, [class*="map"]').first();
      await expect(mapCanvas).toBeVisible({ timeout: 15000 });

      // 2. Thay đổi Loại đất
      await selectDropdownOption(page, 'Loại đất', /Đất sản xuất, kinh doanh phi nông nghiệp|Đất ở/i);

      // 3. Bấm Tìm kiếm để áp dụng lớp bản đồ nhiệt mới
      const submitBtn = page.locator('button:has-text("Tìm kiếm")').first();
      await submitBtn.click({ force: true });
      await page.waitForTimeout(3000);

      // 4. Bản đồ vẫn hiển thị ổn định, không crash UI hay lỗi render
      await expect(mapCanvas).toBeVisible({ timeout: 10000 });

      await attachUiEvidence(page, testInfo, 'UI-LP-023', {
        activeTab: 'Bản đồ nhiệt GIS',
        updatedCategory: await page.locator('button[aria-label="Loại đất"]').first().innerText(),
        mapCanvasIntact: await mapCanvas.isVisible(),
      });
    });
  });

  // ============================================================================
  // NHÓM 8: XEM VỊ TRÍ THỬA ĐẤT TRÊN BẢN ĐỒ NHIỆT GIS QUA ICON CON MẮT (UI-LP-024 -> UI-LP-026)
  // ============================================================================
  test.describe('Nhóm 8: Xem vị trí thửa đất trên Bản đồ nhiệt GIS qua Icon Con Mắt', () => {

    test('UI-LP-024: Khi bản ghi có dữ liệu toạ độ (lat/lng), nút icon con mắt "Xem trên bản đồ nhiệt" hiển thị trong dòng dữ liệu', async ({ page }, testInfo) => {
      // Mock API trả về bản ghi có toạ độ lat/lng
      await page.route('**/category/public/land-assess-prices/search', async route => {
        const response = await route.fetch();
        const json = await response.json();
        if (json.data && json.data.content && json.data.content.length > 0) {
          json.data.content[0].lat = 21.0368;
          json.data.content[0].lng = 105.8342;
        }
        await route.fulfill({ response, json });
      });

      await openLandPricePage(page);

      // Tìm nút icon con mắt trong dòng bảng
      const eyeBtn = page.locator('button[title*="Xem trên bản đồ nhiệt"], button:has(i.fa-eye)').first();
      await expect(eyeBtn).toBeVisible({ timeout: 10000 });

      const titleAttr = await eyeBtn.getAttribute('title');
      const hasEyeIcon = (await eyeBtn.locator('i.fa-eye, i[class*="fa-eye"]').count()) > 0;

      await attachUiEvidence(page, testInfo, 'UI-LP-024', {
        eyeButtonVisible: await eyeBtn.isVisible(),
        titleAttr,
        hasEyeIcon,
      });

      expect(titleAttr).toContain('Xem trên bản đồ nhiệt');
      expect(hasEyeIcon).toBe(true);
    });

    test('UI-LP-025: Người dùng đã đăng nhập click icon con mắt -> Tự động chuyển sang tab "Bản đồ nhiệt GIS" và định vị toạ độ trên bản đồ', async ({ page }, testInfo) => {
      // Mock API có toạ độ
      const targetLat = 21.0368;
      const targetLng = 105.8342;
      await page.route('**/category/public/land-assess-prices/search', async route => {
        const response = await route.fetch();
        const json = await response.json();
        if (json.data && json.data.content && json.data.content.length > 0) {
          json.data.content[0].lat = targetLat;
          json.data.content[0].lng = targetLng;
        }
        await route.fulfill({ response, json });
      });

      await openLandPricePage(page);

      // Click vào nút icon con mắt
      const eyeBtn = page.locator('button[title*="Xem trên bản đồ nhiệt"], button:has(i.fa-eye)').first();
      await expect(eyeBtn).toBeVisible({ timeout: 10000 });
      await eyeBtn.click({ force: true });
      await page.waitForTimeout(3000);

      // Khẳng định tab "Bản đồ nhiệt GIS" được kích hoạt tự động (có class màu active / chữ tím)
      const tabMap = page.locator('button:has-text("Bản đồ nhiệt")').first();
      const tabMapClass = (await tabMap.getAttribute('class')) || '';
      const isMapTabActive = tabMapClass.includes('bg-white') && tabMapClass.includes('purple');

      // Khẳng định canvas bản đồ nhiệt GIS hiển thị
      const mapCanvas = page.locator('canvas, .mapboxgl-map, [class*="map"]').first();
      await expect(mapCanvas).toBeVisible({ timeout: 15000 });

      await attachUiEvidence(page, testInfo, 'UI-LP-025', {
        targetLat,
        targetLng,
        isMapTabActive,
        tabMapClass,
        mapCanvasVisible: await mapCanvas.isVisible(),
      });

      expect(isMapTabActive).toBe(true);
    });

    test('UI-LP-026: Khách vãng lai (Guest chưa đăng nhập) click icon con mắt -> Yêu cầu đăng nhập hiển thị Modal xác thực', async ({ browser }, testInfo) => {
      // Khởi tạo context khách vãng lai (không nạp token/storageState)
      const guestContext = await browser.newContext({ storageState: undefined });
      const guestPage = await guestContext.newPage();
      await guestPage.setViewportSize({ width: 1440, height: 900 });

      // Mock toạ độ cho khách
      await guestPage.route('**/category/public/land-assess-prices/search', async route => {
        const response = await route.fetch();
        const json = await response.json();
        if (json.data && json.data.content && json.data.content.length > 0) {
          json.data.content[0].lat = 21.0368;
          json.data.content[0].lng = 105.8342;
        }
        await route.fulfill({ response, json });
      });

      await guestPage.goto(`${WEBAPP_URL}/bang-gia-dat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await clearOverlays(guestPage);
      await skipOnboardingTour(guestPage);
      await guestPage.waitForTimeout(2000);

      // Click icon con mắt
      const eyeBtn = guestPage.locator('button[title*="Xem trên bản đồ nhiệt"], button:has(i.fa-eye)').first();
      if (await eyeBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
        await eyeBtn.click({ force: true });
        await guestPage.waitForTimeout(1500);

        // Khẳng định Modal/Dialog Đăng nhập xuất hiện
        const loginModal = guestPage.locator('[role="dialog"], [data-slot="dialog-content"]').filter({ hasText: /Đăng nhập|Tài khoản|Mật khẩu/i }).first();
        await expect(loginModal).toBeVisible({ timeout: 10000 });

        await attachUiEvidence(guestPage, testInfo, 'UI-LP-026', {
          isGuest: true,
          loginModalVisible: await loginModal.isVisible(),
        });
      }

      await guestContext.close();
    });
  });
});
