const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: require('./_paths').authStatePath,
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();
  await page.goto('https://landbase.vn/ban-do', { waitUntil: 'domcontentloaded' });

  // Dismiss guide
  const closeBtn = page.locator('button.driver-popover-close-btn, button:has-text("×")').first();
  if (await closeBtn.waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false)) {
    await closeBtn.click({ force: true });
    await page.waitForTimeout(500);
  }

  const searchInput = page.locator('input[placeholder="Tìm kiếm khu vực, địa chỉ hoặc toạ độ..."]').first();
  
  // 1. Thực hiện tìm kiếm
  await searchInput.fill('Cầu Giấy');
  await page.waitForTimeout(1000);
  
  // Chọn gợi ý đầu tiên để hoàn tất tìm kiếm
  const suggestion = page.locator('div, li, button, p').filter({ hasText: /Cầu Giấy/i }).first();
  await suggestion.click({ force: true });
  await page.waitForTimeout(2000);

  // 2. Click lại vào ô tìm kiếm hoặc xóa từ khóa để xem danh sách lịch sử
  await searchInput.click({ force: true });
  await page.waitForTimeout(1000);

  // Lấy danh sách các mục hiển thị trong dropdown
  const listItems = await page.locator('ul li, div[class*="cursor-pointer"], button').filter({ hasText: /Cầu Giấy|Lịch sử|Gần đây/i });
  console.log('List items count:', await listItems.count());
  for (let i = 0; i < Math.min(await listItems.count(), 10); i++) {
    console.log(`Item ${i}:`, (await listItems.nth(i).innerText()).replace(/\n/g, ' '));
  }

  // Click vào mục lịch sử tìm kiếm
  const historyItem = listItems.first();
  if (await historyItem.isVisible()) {
    console.log('Clicking history item...');
    await historyItem.click({ force: true });
    await page.waitForTimeout(1000);
  }

  console.log('Test completed successfully!');
  await browser.close();
})();
