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
    await page.waitForTimeout(500);
  }

  const searchContainer = page.locator('#tour-map-search');
  const searchInput = searchContainer.locator('input[placeholder="Tìm kiếm khu vực, địa chỉ hoặc toạ độ..."]').first();

  // 1. Nhập từ khóa tìm kiếm: "Hà Nội"
  await searchInput.fill('Hà Nội');
  await page.waitForTimeout(1500);

  // Chọn gợi ý đầu tiên trong dropdown
  const suggestion = searchContainer.locator('div, li, button, p').filter({ hasText: /Hà Nội/i }).first();
  if (await suggestion.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Clicking suggestion:', (await suggestion.innerText()).slice(0, 50));
    await suggestion.click({ force: true });
    await page.waitForTimeout(2000);
  } else {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
  }

  // 2. Xóa trắng ô tìm kiếm bằng nút 'x' (clear button) hoặc fill('')
  const clearBtn = searchContainer.locator('button:has(svg), button:has(i), [class*="cursor-pointer"]').filter({ has: page.locator('svg path') }).first();
  // Hoặc dùng nút clear 'x' trong input:
  const inputClearBtn = searchContainer.locator('input ~ button, div:has(> input) button, [class*="clear"]').first();
  console.log('Clear button count:', await inputClearBtn.count());
  
  // Clear input
  await searchInput.fill('');
  await searchInput.click();
  await page.waitForTimeout(1000);

  // Take screenshot to see history
  await page.screenshot({ path: require('./_paths').artifactPath('history_empty_input.png') });

  const historyTexts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('#tour-map-search *')).filter(el => {
      const t = el.innerText?.trim();
      return t && el.offsetParent !== null;
    }).map(el => ({ tag: el.tagName, class: el.className, text: el.innerText.trim().slice(0, 100) }));
  });

  console.log('Elements with empty input after search:', JSON.stringify(historyTexts.slice(0, 15), null, 2));

  await browser.close();
})();
