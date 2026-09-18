const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'docs_images');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function skipOnboardingTour(page) {
  try {
    for (let i = 0; i < 3; i++) {
      const skipBtn = page.locator('button:has-text("Bỏ qua"), button:has-text("Hoàn thành"), button:has-text("Đóng"), [aria-label*="skip"i], .introjs-skipbutton, .driver-close-btn').first();
      if (await skipBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await skipBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(500);
      }
    }
    await page.keyboard.press('Escape').catch(() => {});
  } catch (e) {}
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: fs.existsSync('playwright/.auth/user.json') ? 'playwright/.auth/user.json' : undefined,
    geolocation: { latitude: 21.0285, longitude: 105.8542 },
    permissions: ['geolocation']
  });

  const page = await context.newPage();
  const baseUrl = 'https://beta.landbase.vn';

  console.log('1. Chụp Trang chủ & Bản đồ...');
  try {
    await page.goto(`${baseUrl}/ban-do`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await skipOnboardingTour(page);
    await page.screenshot({ path: path.join(outputDir, '03_ban_do_tong_quan.png') });

    // Click Lớp bản đồ
    console.log('2. Chụp Menu Lớp bản đồ quy hoạch...');
    const mapLayersBtn = page.locator('#tour-map-layers button, button:has-text("Lớp bản đồ"), [title*="Lớp bản đồ"]').first();
    if (await mapLayersBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mapLayersBtn.click({ force: true });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outputDir, '05_ban_do_lop_quy_hoach.png') });
      await mapLayersBtn.click({ force: true }).catch(() => {});
    }

    // Tra cứu tờ thửa
    console.log('3. Chụp Tab Tra cứu số tờ / số thửa...');
    const plotTab = page.locator('button[role="tab"]:has-text("Số tờ/Số thửa"), button:has-text("Số tờ/Số thửa")').first();
    if (await plotTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await plotTab.click({ force: true });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outputDir, '04_ban_do_tra_cuu_thua.png') });
    }

    // Công cụ vẽ
    console.log('4. Chụp Công cụ đo vẽ...');
    const drawBtn = page.locator('button[aria-label*="Vẽ"], button:has-text("Vẽ"), button[aria-label*="Thước"]').first();
    if (await drawBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await drawBtn.click({ force: true });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outputDir, '06_ban_do_cong_cu_ve.png') });
    }
  } catch (e) {
    console.error('Lỗi chụp map:', e.message);
  }

  // Tin rao vặt
  console.log('5. Chụp Danh sách Tin rao vặt...');
  try {
    await page.goto(`${baseUrl}/tin-rao-vat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3500);
    await skipOnboardingTour(page);
    await page.screenshot({ path: path.join(outputDir, '07_tin_rao_vat_danh_sach.png') });

    // Mở chi tiết tin rao
    console.log('6. Chụp Chi tiết tin rao...');
    const firstCard = page.locator('main [class*="card"], main div.grid > button, main button:has(img)').first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click({ force: true });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(outputDir, '08_tin_rao_vat_chi_tiet.png') });
    }
  } catch (e) {
    console.error('Lỗi chụp tin rao:', e.message);
  }

  // Tin tức thị trường
  console.log('7. Chụp Tin tức thị trường...');
  try {
    await page.goto(`${baseUrl}/tin-tuc-thi-truong`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await skipOnboardingTour(page);
    await page.screenshot({ path: path.join(outputDir, '09_tin_tuc_thi_truong.png') });

    console.log('8. Chụp Tìm kiếm tin tức & bộ lọc...');
    await page.goto(`${baseUrl}/tin-tuc-thi-truong/tim-kiem`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await skipOnboardingTour(page);
    await page.screenshot({ path: path.join(outputDir, '10_tin_tuc_tim_kiem_bo_loc.png') });
  } catch (e) {
    console.error('Lỗi chụp tin tức:', e.message);
  }

  // Tài khoản
  console.log('9. Chụp Quản lý tài khoản...');
  try {
    await page.goto(`${baseUrl}/tong-quan-tai-khoan`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await skipOnboardingTour(page);
    await page.screenshot({ path: path.join(outputDir, '13_tong_quan_tai_khoan.png') });
  } catch (e) {
    console.error('Lỗi chụp tài khoản:', e.message);
  }

  // Cẩm nang
  console.log('10. Chụp Cẩm nang...');
  try {
    await page.goto(`${baseUrl}/cam-nang`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await skipOnboardingTour(page);
    await page.screenshot({ path: path.join(outputDir, '14_cam_nang_bds.png') });
  } catch (e) {
    console.error('Lỗi chụp cẩm nang:', e.message);
  }

  // Modal Tính lãi vay & Ước tính chi phí xây nhà
  console.log('11. Chụp Công cụ Tính lãi vay...');
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await skipOnboardingTour(page);

    const loanBtn = page.locator('text=Tính lãi vay').first();
    if (await loanBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loanBtn.click({ force: true });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outputDir, '11_cong_cu_tinh_lai_vay.png') });
      const closeBtn = page.locator('div[role="dialog"] button:has-text("Đóng"), div[role="dialog"] button.absolute').first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click({ force: true });
    }

    console.log('12. Chụp Công cụ Ước tính chi phí xây nhà...');
    const buildBtn = page.locator('text=Ước tính chi phí xây nhà').first();
    if (await buildBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await buildBtn.click({ force: true });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outputDir, '12_cong_cu_chi_phi_xay_dung.png') });
    }
  } catch (e) {
    console.error('Lỗi chụp tools:', e.message);
  }

  // Modal Đăng nhập (Context Guest)
  console.log('13. Chụp Modal Đăng nhập (Guest)...');
  try {
    const guestContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const guestPage = await guestContext.newPage();
    await guestPage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await guestPage.waitForTimeout(2000);
    await skipOnboardingTour(guestPage);
    const loginTrigger = guestPage.locator('#login-trigger-btn, button:has-text("Đăng nhập")').first();
    if (await loginTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginTrigger.click({ force: true });
      await guestPage.waitForTimeout(1500);
      await guestPage.screenshot({ path: path.join(outputDir, '02_dang_nhap_modal.png') });
    }
    await guestContext.close();
  } catch (e) {
    console.error('Lỗi chụp login modal:', e.message);
  }

  await browser.close();
  console.log('✅ Hoàn thành toàn bộ ảnh chụp màn hình!');
})();
