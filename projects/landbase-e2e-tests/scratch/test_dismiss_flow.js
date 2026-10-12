const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: require('./_paths').authStatePath,
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();
  await page.goto('https://landbase.vn/ban-do', { waitUntil: 'domcontentloaded' });

  // Wait and click close button
  const closeBtn = page.locator('button.driver-popover-close-btn, button:has-text("×")').first();
  if (await closeBtn.waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false)) {
    console.log('Found close button, clicking...');
    await closeBtn.click({ force: true });
    await page.waitForTimeout(500);
  }

  // Now test search input interaction
  const searchInput = page.locator('input[placeholder="Tìm kiếm khu vực, địa chỉ hoặc toạ độ..."]').first();
  await searchInput.fill('Cầu Giấy');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  // Click search input again
  await searchInput.click();
  console.log('Successfully clicked search input without interception!');

  await browser.close();
})();
