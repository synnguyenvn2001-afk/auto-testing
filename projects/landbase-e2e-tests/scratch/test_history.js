const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: require('./_paths').authStatePath,
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();
  await page.goto('https://beta.landbase.vn/ban-do', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Close guide
  const closeBtn = page.locator('button.driver-popover-close-btn, button:has-text("×"), [aria-label*="close"i]');
  if (await closeBtn.count() > 0) {
    await closeBtn.first().click({ force: true });
    await page.waitForTimeout(500);
  }

  // Look at search input
  const searchInput = page.locator('input[placeholder="Tìm kiếm khu vực, địa chỉ hoặc toạ độ..."]');
  console.log('Search input visible:', await searchInput.isVisible());

  // Click on search input before search
  await searchInput.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: require('./_paths').artifactPath('history_before.png') });

  // Now type a keyword and press Enter or select suggestion
  await searchInput.fill('Hà Nội');
  await page.waitForTimeout(1000);
  
  // See suggestions
  const suggestions = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('div, li, button, span')).filter(el => {
      const text = el.innerText?.trim();
      return text && (text.includes('Hà Nội') || text.includes('Lịch sử') || text.includes('Gợi ý'));
    }).map(el => ({ text: el.innerText.trim().slice(0, 50), class: el.className }));
  });
  console.log('Suggestions after typing Hà Nội:', suggestions.slice(0, 10));

  // Press Enter or click suggestion
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);

  // Clear or click search input again
  await searchInput.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: require('./_paths').artifactPath('history_after.png') });

  const historyItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.innerText?.trim();
      return text && (text.includes('Lịch sử') || text.includes('Đã tìm') || text.includes('Gần đây'));
    }).map(el => ({ tag: el.tagName, text: el.innerText.trim().slice(0, 100), class: el.className }));
  });
  console.log('History elements:', historyItems.slice(0, 10));

  await browser.close();
})();
