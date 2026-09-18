const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: require('./_paths').authStatePath,
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();
  await page.goto('https://beta.landbase.vn/ban-do', { waitUntil: 'domcontentloaded' });

  // Close guide
  const closeBtn = page.locator('.driver-popover-close-btn, button:has-text("×")').first();
  if (await closeBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await closeBtn.click({ force: true });
    await page.waitForTimeout(500);
  }

  const searchInput = page.locator('input[placeholder="Tìm kiếm khu vực, địa chỉ hoặc toạ độ..."]').first();
  console.log('Search input visible:', await searchInput.isVisible());

  // Type a query: "Cầu Giấy"
  await searchInput.fill('Cầu Giấy');
  await page.waitForTimeout(1500);

  // Look at dropdown items (suggestions)
  const items = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('div, li, button, span, p')).filter(el => {
      const t = el.innerText?.trim();
      return t && t.includes('Cầu Giấy') && el.offsetParent !== null;
    }).map(el => ({ tag: el.tagName, text: el.innerText.trim(), class: el.className }));
  });
  console.log('Suggestions on typing Cầu Giấy:', items.slice(0, 5));

  // Click on the first suggestion item
  const firstSuggestion = page.locator('div, li, button, span, p').filter({ hasText: /Cầu Giấy/i }).first();
  // Wait, let's find the dropdown option or press Enter
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  console.log('After pressing enter, clearing input...');
  await searchInput.click();
  await searchInput.fill('');
  await page.waitForTimeout(1000);

  // Check what appears in the dropdown now (search history!)
  const afterSearchElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*')).filter(el => {
      const t = el.innerText?.trim();
      return t && (t.includes('Lịch sử') || t.includes('Cầu Giấy') || t.includes('Đã tìm') || t.includes('Gần đây')) && el.offsetParent !== null;
    }).map(el => ({ tag: el.tagName, text: el.innerText.trim(), class: el.className }));
  });
  console.log('Dropdown after search (History):', afterSearchElements);

  await page.screenshot({ path: require('./_paths').artifactPath('history_dropdown.png') });
  await browser.close();
})();
