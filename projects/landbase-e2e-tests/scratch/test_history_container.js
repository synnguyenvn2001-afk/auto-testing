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
  if (await closeBtn.waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false)) {
    await closeBtn.click({ force: true });
    await page.waitForTimeout(500);
  }

  const searchContainer = page.locator('#tour-map-search');
  const searchInput = searchContainer.locator('input[placeholder="Tìm kiếm khu vực, địa chỉ hoặc toạ độ..."]').first();
  
  // 1. Nhập từ khóa tìm kiếm "Cầu Giấy"
  await searchInput.fill('Cầu Giấy');
  await page.waitForTimeout(1500);
  
  // Chọn gợi ý đầu tiên trong search dropdown để thực hiện tìm kiếm
  const suggestion = searchContainer.locator('div, li, button, p').filter({ hasText: /Cầu Giấy/i }).first();
  if (await suggestion.isVisible()) {
    await suggestion.click({ force: true });
    console.log('Clicked suggestion to perform search!');
    await page.waitForTimeout(2000);
  }

  // 2. Click lại vào ô tìm kiếm để hiển thị lịch sử tìm kiếm
  await searchInput.click({ force: true });
  await page.waitForTimeout(1000);

  // Kiểm tra các item trong searchContainer
  const historyItems = searchContainer.locator('div, li, button, p').filter({ hasText: /Cầu Giấy|Lịch sử|Gần đây/i });
  console.log('History items in container:', await historyItems.count());
  for (let i = 0; i < Math.min(await historyItems.count(), 5); i++) {
    console.log(`History Item ${i}:`, (await historyItems.nth(i).innerText()).replace(/\n/g, ' '));
  }

  // Click vào mục lịch sử trong container
  const historyItem = historyItems.first();
  await historyItem.click({ force: true });
  await page.waitForTimeout(1000);

  console.log('Selected history item successfully!');
  await browser.close();
})();
