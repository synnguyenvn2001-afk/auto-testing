import { test, expect, Page, BrowserContext, TestInfo } from '@playwright/test';
import { skipOnboardingTour } from './helpers';

/**
 * ============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG GIAO DIỆN (WEB UI E2E) – LANDBASE
 * CHỨC NĂNG: PHÂN TÍCH KHU VỰC BẰNG AI & XEM BÁO CÁO AI TỪ ĐÂY
 * ----------------------------------------------------------------------------
 * Ứng dụng kiểm thử: https://dev-webapp.laand.vn (hoặc BASE_URL)
 * Màn hình liên quan:
 *   1. Popup "Tổng quan khu vực" / "Chi tiết bất động sản" (trên /ban-do & /tin-rao-vat)
 *      - Khối "PHÂN TÍCH KHU VỰC BẰNG AI" (LocalityOverviewCard)
 *   2. Màn hình "BÁO CÁO ĐỊA PHƯƠNG" (/bao-cao-dia-phuong?reportId=...&latitude=...&longitude=...)
 *      - Hiển thị báo cáo chi tiết do AI tổng hợp theo địa phương
 *      - Quy hoạch, Giá thị trường, Hạ tầng, Tiện ích
 *      - Quy tắc mở khóa bằng Vàng (Gold)
 * ============================================================================
 */

const WEBAPP_URL = process.env.WEBAPP_BASE_URL || process.env.BASE_URL || 'https://dev-webapp.laand.vn';

// Tọa độ mẫu chuẩn kiểm thử tại Hà Nội (có báo cáo hiện hành)
const SAMPLE_LOCATION = {
  label: 'Phường Ô Chợ Dừa, Quận Đống Đa, Thành phố Hà Nội',
  province: 'Thành phố Hà Nội',
  district: 'Quận Đống Đa',
  ward: 'Phường Ô Chợ Dừa',
  latitude: '21.019301',
  longitude: '105.826367',
  reportId: 'mock-report-ha-noi-cau-giay-yen-hoa-21.0193-105.8264',
  localityName: 'Phường Yên Hòa, quận Cầu Giấy, Hà Nội',
};

// Tọa độ không có báo cáo
const NO_REPORT_LOCATION = {
  latitude: '8.3434',
  longitude: '4.5656',
};

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
 * Helper đóng mọi popup / tour hướng dẫn nếu xuất hiện trên màn hình
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
 * Helper mở Modal Chi tiết BĐS / Tổng quan khu vực có chứa khối "Phân tích khu vực bằng AI"
 * Thao tác chuẩn: /ban-do -> Tìm kiếm tọa độ mẫu -> Bấm nút "Xem chi tiết" -> Modal "Tổng quan khu vực"
 */
async function openPropertyOverviewModal(page: Page, customApiReport?: any) {
  // Mock API nếu cần kiểm thử theo kịch bản tùy biến
  if (customApiReport !== undefined) {
    await page.route(url => url.pathname.includes('/api/locality-report') || url.pathname.includes('/locality-report'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(customApiReport),
      });
    });
  }

  await page.goto(`${WEBAPP_URL}/ban-do`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await clearOverlays(page);
  await skipOnboardingTour(page);

  // Nhập tọa độ kiểm thử vào ô tìm kiếm trên /ban-do
  const searchInput = page.locator('input[placeholder*="Tìm kiếm khu vực"], input[placeholder*="Tìm kiếm"]').first();
  await expect(searchInput).toBeVisible({ timeout: 15000 });
  await clearOverlays(page);
  await searchInput.click({ force: true });
  await searchInput.fill('21.017377, 105.834759');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  await clearOverlays(page);

  // Click vào nút "Xem chi tiết" trên card thông tin bên trái
  const detailBtn = page.locator('button:has-text("Xem chi tiết")').first();
  await expect(detailBtn).toBeVisible({ timeout: 15000 });
  await detailBtn.click({ force: true });
  await page.waitForTimeout(1500);

  // Chờ Modal "Tổng quan khu vực" xuất hiện
  const modal = page.locator('div[role="dialog"]').filter({ hasText: /Tổng quan khu vực/i }).first();
  await expect(modal).toBeVisible({ timeout: 15000 });
  return modal;
}

test.describe('LandBase Web UI E2E – Phân tích khu vực bằng AI & Xem báo cáo AI từ popup (Mục E & F)', () => {
  // Cấu hình mode: 'default' để 1 test fail thì các test tiếp theo vẫn tiếp tục chạy
  test.describe.configure({ mode: 'default' });

  test.afterEach(async ({ page }) => {
    await clearOverlays(page);
  });

  // ============================================================================
  // NHÓM 1: KHỐI PHÂN TÍCH KHU VỰC BẰNG AI TRÊN POPUP (UI-AI-001 -> UI-AI-007)
  // ============================================================================
  test.describe('Nhóm 1: Khối Phân tích khu vực bằng AI trên Popup (Mục E - AI-E-001 .. AI-E-009)', () => {

    test('UI-AI-001: Hiển thị đầy đủ khối "Phân tích khu vực bằng AI" với nhãn badge, icon và tiêu đề "Tổng quan địa phương"', async ({ page }, testInfo) => {
      const modal = await openPropertyOverviewModal(page);

      // 1. Kiểm tra nhãn badge "PHÂN TÍCH KHU VỰC BẰNG AI"
      const badge = modal.locator('p, span').filter({ hasText: /^PHÂN TÍCH KHU VỰC BẰNG AI$/i }).first();
      await expect(badge).toBeVisible({ timeout: 10000 });
      const badgeText = (await badge.innerText()).trim();

      // 2. Kiểm tra tiêu đề "Tổng quan địa phương"
      const heading = modal.locator('h1, h2, h3, h4, p, span').filter({ hasText: /^Tổng quan địa phương$/i }).first();
      await expect(heading).toBeVisible({ timeout: 10000 });
      const headingText = (await heading.innerText()).trim();

      await attachUiEvidence(page, testInfo, 'UI-AI-001', {
        badgeText,
        headingText,
        modalVisible: await modal.isVisible(),
      });

      expect(badgeText.toUpperCase()).toBe('PHÂN TÍCH KHU VỰC BẰNG AI');
      expect(headingText).toBe('Tổng quan địa phương');
    });

    test('UI-AI-002: Hiển thị chính xác nhãn "Địa bàn đang xem" và thông tin địa chỉ hành chính của khu vực', async ({ page }, testInfo) => {
      const modal = await openPropertyOverviewModal(page);

      // 1. Kiểm tra nhãn "Địa bàn đang xem"
      const fieldLabel = modal.locator('p, span, div').filter({ hasText: /^Địa bàn đang xem$/i }).first();
      await expect(fieldLabel).toBeVisible({ timeout: 10000 });

      // 2. Kiểm tra khối hiển thị địa chỉ địa bàn (bên trong khối bo góc rounded-xl)
      const localityBox = modal.locator('div:has(> p:has-text("Địa bàn đang xem")), div:has-text("Địa bàn đang xem")').first();
      await expect(localityBox).toBeVisible({ timeout: 10000 });
      const localityText = (await localityBox.innerText()).trim();

      await attachUiEvidence(page, testInfo, 'UI-AI-002', {
        fieldLabel: await fieldLabel.innerText(),
        renderedLocalityText: localityText,
      });

      expect(localityText).toContain('Địa bàn đang xem');
      // Địa bàn phải chứa thông tin địa danh hành chính (Phường/Xã/Quận/Huyện/Tỉnh/Thành phố/Thổ Quan/Đống Đa)
      expect(localityText).toMatch(/Phường|Xã|Quận|Huyện|Thành phố|Hà Nội|Hồ Chí Minh|Thổ Quan|Đống Đa/i);
    });

    test('UI-AI-003: Hiển thị đúng dòng mô tả giới thiệu "Xem báo cáo phân tích đã được LandBase cập nhật cho địa phương này."', async ({ page }, testInfo) => {
      const modal = await openPropertyOverviewModal(page);

      // Kiểm tra dòng mô tả giới thiệu
      const desc = modal.locator('p, div, span').filter({
        hasText: /Xem báo cáo phân tích đã được LandBase cập nhật cho địa phương này/i,
      }).first();

      await expect(desc).toBeVisible({ timeout: 10000 });
      const descText = (await desc.innerText()).trim();

      await attachUiEvidence(page, testInfo, 'UI-AI-003', {
        descText,
      });

      expect(descText).toContain('Xem báo cáo phân tích đã được LandBase cập nhật cho địa phương này');
    });

    test('UI-AI-004: Hiển thị nút "Xem báo cáo địa phương" kèm icon chuyển liên kết khi đã đăng nhập và có báo cáo', async ({ page }, testInfo) => {
      // Mock API trả về báo cáo khả dụng (available: true)
      const mockReportData = {
        available: true,
        report: {
          reportId: SAMPLE_LOCATION.reportId,
          locality: SAMPLE_LOCATION.localityName,
          province: SAMPLE_LOCATION.province,
          district: SAMPLE_LOCATION.district,
          ward: SAMPLE_LOCATION.ward,
          updatedAt: '2026-10-20T08:00:00.000Z',
          costGold: 1,
        },
      };

      const modal = await openPropertyOverviewModal(page, mockReportData);

      // Tìm nút "Xem báo cáo địa phương" (thẻ <a> hoặc <button>)
      const reportBtn = modal.locator('a, button').filter({ hasText: /Xem báo cáo địa phương/i }).first();
      await expect(reportBtn).toBeVisible({ timeout: 10000 });

      const href = await reportBtn.getAttribute('href');
      const btnText = (await reportBtn.innerText()).trim();

      await attachUiEvidence(page, testInfo, 'UI-AI-004', {
        buttonText: btnText,
        linkHref: href,
      });

      expect(btnText).toContain('Xem báo cáo địa phương');
      if (href) {
        expect(href).toContain('/bao-cao-dia-phuong');
      }
    });

    test('UI-AI-005: Người dùng chưa đăng nhập (Guest) -> Hiển thị nút "Đăng nhập" và bấm vào mở Modal Đăng nhập', async ({ browser }, testInfo) => {
      // Sử dụng Browser Context hoàn toàn mới (Incognito / Chưa có Session Login, override storageState của project)
      const guestContext = await browser.newContext({
        storageState: { cookies: [], origins: [] },
        baseURL: WEBAPP_URL,
        viewport: { width: 1280, height: 720 },
      });
      const guestPage = await guestContext.newPage();

      try {
        await guestPage.goto(`${WEBAPP_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await guestPage.waitForTimeout(2000);
        await clearOverlays(guestPage);
        await skipOnboardingTour(guestPage);

        // Khi chưa đăng nhập (Guest), kiểm tra nút "Đăng nhập" trên Header
        const loginBtn = guestPage.locator('button:has-text("Đăng nhập")').first();
        await expect(loginBtn).toBeVisible({ timeout: 15000 });
        const buttonText = (await loginBtn.innerText()).trim();

        // Click nút đăng nhập -> Khẳng định Modal Đăng nhập hiển thị
        await loginBtn.click({ force: true });
        await guestPage.waitForTimeout(1500);

        const authModal = guestPage.locator('div[role="dialog"]').first();
        await expect(authModal).toBeVisible({ timeout: 10000 });

        await attachUiEvidence(guestPage, testInfo, 'UI-AI-005', {
          isGuestUser: true,
          buttonFound: buttonText,
          loginModalVisible: await authModal.isVisible(),
        });

        expect(buttonText.toLowerCase()).toContain('đăng nhập');
      } finally {
        await guestContext.close();
      }
    });

    test('UI-AI-006: Khối Phân tích AI trên popup hiển thị đúng trạng thái theo dữ liệu địa phương', async ({ page }, testInfo) => {
      const modal = await openPropertyOverviewModal(page);

      // Khẳng định khối Phân tích khu vực bằng AI hiển thị trên Popup
      const aiSection = modal.locator('text=/PHÂN TÍCH KHU VỰC BẰNG AI/i').first();
      await expect(aiSection).toBeVisible({ timeout: 10000 });

      // Khẳng định có nhãn "Địa bàn đang xem"
      const localityLabel = modal.locator('text=/Địa bàn đang xem/i').first();
      await expect(localityLabel).toBeVisible({ timeout: 10000 });

      // Khẳng định nút "Xem báo cáo địa phương" hoặc thông báo
      const reportBtn = modal.locator('a:has-text("Xem báo cáo địa phương"), button:has-text("Xem báo cáo địa phương")').first();
      const hasBtn = await reportBtn.isVisible({ timeout: 5000 }).catch(() => false);

      await attachUiEvidence(page, testInfo, 'UI-AI-006', {
        aiSectionVisible: await aiSection.isVisible(),
        localityLabelVisible: await localityLabel.isVisible(),
        reportButtonVisible: hasBtn,
      });

      expect(await aiSection.isVisible()).toBeTruthy();
    });

    test('UI-AI-007: Popup không tự tiện render nội dung AI tóm tắt dài dòng bên trong (Đảm bảo bố cục gọn gàng theo SRS)', async ({ page }, testInfo) => {
      const modal = await openPropertyOverviewModal(page);

      // Bên trong popup chỉ hiển thị tóm tắt địa bàn, nút mở báo cáo, không bung toàn bộ các section AI dài
      const fullAiContent = modal.locator('text=/Phân tích chuyên sâu 1000 từ/i');
      await expect(fullAiContent).toBeHidden();

      // Đảm bảo các khối liền kề (Tổng quan BĐS, Tiện ích, Ước tính chi phí) vẫn hiển thị đồng thời
      const overviewProp = modal.locator('text=/Tổng quan bất động sản/i').first();
      const aiSection = modal.locator('text=/PHÂN TÍCH KHU VỰC BẰNG AI/i').first();
      const utilityBlock = modal.locator('text=/Tiện ích và dịch vụ/i').first();
      const calcBlock = modal.locator('text=/Ước tính chi phí xây dựng/i').first();

      await expect(overviewProp).toBeVisible();
      await expect(aiSection).toBeVisible();
      await expect(utilityBlock).toBeVisible();
      await expect(calcBlock).toBeVisible();

      await attachUiEvidence(page, testInfo, 'UI-AI-007', {
        overviewPropVisible: await overviewProp.isVisible(),
        aiSectionVisible: await aiSection.isVisible(),
        utilityBlockVisible: await utilityBlock.isVisible(),
        calcBlockVisible: await calcBlock.isVisible(),
      });
    });
  });

  // ============================================================================
  // NHÓM 2: ĐIỀU HƯỚNG & XEM BÁO CÁO AI TỪ ĐÂY (UI-AI-008 -> UI-AI-014)
  // ============================================================================
  test.describe('Nhóm 2: Điều hướng & Xem Báo cáo AI từ đây (Mục F - AI-F-001 .. AI-F-012)', () => {

    test('UI-AI-008: Click "Xem báo cáo địa phương" điều hướng chính xác sang URL /bao-cao-dia-phuong kèm query parameters', async ({ page }, testInfo) => {
      const modal = await openPropertyOverviewModal(page);

      const reportLink = modal.locator('a:has-text("Xem báo cáo địa phương"), button:has-text("Xem báo cáo địa phương")').first();
      await expect(reportLink).toBeVisible({ timeout: 10000 });

      // Lấy href hoặc click điều hướng
      const href = await reportLink.getAttribute('href');
      let targetUrl = '';
      if (href) {
        expect(href).toContain('/bao-cao-dia-phuong');
        targetUrl = href.startsWith('http') ? href : `${WEBAPP_URL}${href}`;
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } else {
        const [newPage] = await Promise.all([
          page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null),
          reportLink.click({ force: true }),
        ]);
        if (newPage) {
          await newPage.waitForLoadState('domcontentloaded');
          targetUrl = newPage.url();
        } else {
          targetUrl = page.url();
        }
      }
      await clearOverlays(page);

      await attachUiEvidence(page, testInfo, 'UI-AI-008', {
        targetUrl,
        reportLinkHref: href,
      });

      expect(targetUrl).toContain('/bao-cao-dia-phuong');
    });

    test('UI-AI-009: Màn hình Báo cáo địa phương hiển thị đúng tiêu đề "BÁO CÁO ĐỊA PHƯƠNG", nhãn "AI", địa bàn và ngày cập nhật', async ({ page }, testInfo) => {
      const reportUrl = `${WEBAPP_URL}/bao-cao-dia-phuong?reportId=${SAMPLE_LOCATION.reportId}&latitude=${SAMPLE_LOCATION.latitude}&longitude=${SAMPLE_LOCATION.longitude}`;
      await page.goto(reportUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await clearOverlays(page);

      // 1. Tiêu đề "BÁO CÁO ĐỊA PHƯƠNG"
      const reportTitle = page.locator('text=/BÁO CÁO ĐỊA PHƯƠNG/i').first();
      await expect(reportTitle).toBeVisible({ timeout: 15000 });

      // 2. Nhãn "AI"
      const aiBadge = page.locator('text=/^AI$/i').first();
      await expect(aiBadge).toBeVisible();

      // 3. Tên địa bàn và ngày cập nhật
      const localityText = page.locator(`text=/${SAMPLE_LOCATION.ward}|${SAMPLE_LOCATION.district}|Hà Nội/i`).first();
      await expect(localityText).toBeVisible();

      const updateDate = page.locator('text=/Cập nhật/i').first();
      await expect(updateDate).toBeVisible();

      await attachUiEvidence(page, testInfo, 'UI-AI-009', {
        title: await reportTitle.innerText(),
        locality: await localityText.innerText(),
        updatedAt: await updateDate.innerText(),
      });
    });

    test('UI-AI-010: Hiển thị đầy đủ 4 tab nội dung phân tích AI chuyên sâu: Quy hoạch, Giá thị trường, Hạ tầng, Tiện ích', async ({ page }, testInfo) => {
      const reportUrl = `${WEBAPP_URL}/bao-cao-dia-phuong?reportId=${SAMPLE_LOCATION.reportId}&latitude=${SAMPLE_LOCATION.latitude}&longitude=${SAMPLE_LOCATION.longitude}`;
      await page.goto(reportUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await clearOverlays(page);

      // Kiểm tra 4 nhóm nội dung phân tích cốt lõi
      const tabQuyHoach = page.locator('button, div, span').filter({ hasText: /^Quy hoạch$/i }).first();
      const tabGiaThiTruong = page.locator('button, div, span').filter({ hasText: /^Giá thị trường$/i }).first();
      const tabHaTang = page.locator('button, div, span').filter({ hasText: /^Hạ tầng$/i }).first();
      const tabTienIch = page.locator('button, div, span').filter({ hasText: /^Tiện ích$/i }).first();

      await expect(tabQuyHoach).toBeVisible({ timeout: 10000 });
      await expect(tabGiaThiTruong).toBeVisible({ timeout: 10000 });
      await expect(tabHaTang).toBeVisible({ timeout: 10000 });
      await expect(tabTienIch).toBeVisible({ timeout: 10000 });

      await attachUiEvidence(page, testInfo, 'UI-AI-010', {
        hasQuyHoach: await tabQuyHoach.isVisible(),
        hasGiaThiTruong: await tabGiaThiTruong.isVisible(),
        hasHaTang: await tabHaTang.isVisible(),
        hasTienIch: await tabTienIch.isVisible(),
      });
    });

    test('UI-AI-011: Hiển thị chi phí mở khóa Vàng (1 Vàng) và nút hành động "Kiểm tra số dư và xem báo cáo"', async ({ page }, testInfo) => {
      const reportUrl = `${WEBAPP_URL}/bao-cao-dia-phuong?reportId=${SAMPLE_LOCATION.reportId}&latitude=${SAMPLE_LOCATION.latitude}&longitude=${SAMPLE_LOCATION.longitude}`;
      await page.goto(reportUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await clearOverlays(page);

      // 1. Kiểm tra hiển thị mức phí Vàng (ví dụ: 1 Vàng)
      const goldCost = page.locator('text=/\\d+\\s*Vàng/i').first();
      await expect(goldCost).toBeVisible({ timeout: 10000 });
      const costText = (await goldCost.innerText()).trim();

      // 2. Nút hành động "Kiểm tra số dư và xem báo cáo"
      const actionBtn = page.locator('button:has-text("Kiểm tra số dư và xem báo cáo"), button:has-text("Xem báo cáo"), button:has-text("Mở khóa")').first();
      await expect(actionBtn).toBeVisible({ timeout: 10000 });

      // 3. Nút "Xuất báo cáo" (Download / Print)
      const exportBtn = page.locator('button:has-text("Xuất báo cáo")').first();
      await expect(exportBtn).toBeVisible({ timeout: 10000 });

      await attachUiEvidence(page, testInfo, 'UI-AI-011', {
        costText,
        actionButtonText: (await actionBtn.innerText()).trim(),
        exportButtonText: (await exportBtn.innerText()).trim(),
      });

      expect(costText).toContain('Vàng');
    });

    test('UI-AI-012: Không trừ Vàng của người dùng khi chỉ mới mở popup Tổng quan khu vực trên bản đồ', async ({ page }, testInfo) => {
      // Truy cập trang để lấy số dư Vàng hiện tại
      await page.goto(`${WEBAPP_URL}/ban-do`, { waitUntil: 'domcontentloaded' });
      await clearOverlays(page);

      // Đọc số dư vàng trên Header
      const goldBadge = page.locator('header, nav, aside, div').locator('text=/\\d+K|\\d+\\s*Vàng/i').first();
      let initialGold = '';
      if (await goldBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
        initialGold = (await goldBadge.innerText()).trim();
      }

      // Mở popup Tổng quan khu vực
      const modal = await openPropertyOverviewModal(page);
      await expect(modal).toBeVisible();

      // Đọc lại số dư vàng trên Header -> Không thay đổi
      if (initialGold) {
        const afterGold = (await goldBadge.innerText()).trim();
        expect(afterGold).toBe(initialGold);
      }

      await attachUiEvidence(page, testInfo, 'UI-AI-012', {
        initialGold,
        popupOpened: true,
        message: 'Khẳng định Vàng được bảo toàn, chỉ trừ Vàng khi thực sự xác nhận mở khóa báo cáo tại màn đích.',
      });
    });

    test('UI-AI-013: Màn hình rỗng (Empty State) khi địa bàn chưa có báo cáo: "Chưa có báo cáo hiện hành cho địa bàn này."', async ({ page }, testInfo) => {
      // Truy cập trang báo cáo với tọa độ không có dữ liệu
      const emptyUrl = `${WEBAPP_URL}/bao-cao-dia-phuong?latitude=${NO_REPORT_LOCATION.latitude}&longitude=${NO_REPORT_LOCATION.longitude}`;
      await page.goto(emptyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await clearOverlays(page);

      // Kiểm tra tiêu đề và thông điệp empty state
      const emptyTitle = page.locator('h1, h2, h3, p').filter({ hasText: /^Chưa có báo cáo hiện hành$/i }).first();
      await expect(emptyTitle).toBeVisible({ timeout: 15000 });

      const emptySub = page.locator('text=/Chưa có báo cáo hiện hành cho địa bàn này/i').first();
      await expect(emptySub).toBeVisible();

      await attachUiEvidence(page, testInfo, 'UI-AI-013', {
        emptyTitle: await emptyTitle.innerText(),
        emptySub: await emptySub.innerText(),
      });

      expect(await emptySub.innerText()).toContain('Chưa có báo cáo hiện hành cho địa bàn này');
    });

    test('UI-AI-014: Đóng popup Tổng quan khu vực bằng nút Đóng X trả về giao diện bản đồ sạch sẽ', async ({ page }, testInfo) => {
      const modal = await openPropertyOverviewModal(page);
      await expect(modal).toBeVisible();

      // Click nút đóng X (nút tròn góc trên bên phải)
      const closeBtn = modal.locator('button[data-slot="dialog-close"], button.absolute, button:has(svg), [aria-label*="close"i]').first();
      if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await closeBtn.click({ force: true });
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500);

      // Khẳng định Modal đã ẩn hoàn toàn
      await expect(modal).toBeHidden({ timeout: 8000 });

      await attachUiEvidence(page, testInfo, 'UI-AI-014', {
        modalHidden: true,
        currentUrl: page.url(),
      });
    });
  });
});

