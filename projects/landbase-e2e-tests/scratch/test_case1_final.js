const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: require('./_paths').authStatePath,
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();
  await page.goto('https://beta.landbase.vn/ban-do', { waitUntil: 'domcontentloaded' });

  // Dismiss guide
  const closeBtn = page.locator('button.driver-popover-close-btn, button:has-text("×")').first();
  if (await closeBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
    await closeBtn.click({ force: true });
  }

  const searchContainer = page.locator('#tour-map-search');
  const searchInput = searchContainer.locator('input[placeholder="Tìm kiếm khu vực, địa chỉ hoặc toạ độ..."]').first();

  // 1. Phải có tìm kiếm trước thì mới có lịch sử: Tìm "Cầu Giấy"
  await searchInput.fill('Cầu Giấy');
  const suggestion = searchContainer.locator('span').filter({ hasText: 'Cầu Giấy, Quan Hoa' }).first();
  await suggestion.waitFor({ state: 'visible', timeout: 5000 });
  await suggestion.click({ force: true });
  await page.waitForTimeout(2000);

  // 2. Xóa trắng ô tìm kiếm để hiển thị mục "Lịch sử tìm kiếm"
  const clearBtn = searchContainer.locator('button:has(svg), [class*="cursor-pointer"]').filter({ has: page.locator('svg path') }).first();
  if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await clearBtn.click({ force: true });
  } else {
    await searchInput.fill('');
  }
  await searchInput.click({ force: true });
  await page.waitForTimeout(1000);

  // 3. Khẳng định "Lịch sử tìm kiếm" xuất hiện
  const historyHeader = searchContainer.locator('p:has-text("Lịch sử tìm kiếm")');
  console.log('History header visible:', await historyHeader.isVisible());

  // 4. Click vào mục trong lịch sử tìm kiếm
  const historyItem = searchContainer.locator('span').filter({ hasText: 'Cầu Giấy, Quan Hoa' }).first();
  console.log('History item visible:', await historyItem.isVisible());
  await historyItem.click({ force: true });
  await page.waitForTimeout(1500);

  console.log('Selected history item successfully! Input value:', await searchInput.inputValue());

  await browser.close();
})();
