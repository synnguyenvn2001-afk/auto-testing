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
  if (await closeBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
    await closeBtn.click({ force: true });
  }

  const searchContainer = page.locator('#tour-map-search');
  const searchInput = searchContainer.locator('input[placeholder="Tìm kiếm khu vực, địa chỉ hoặc toạ độ..."]').first();
  await searchInput.fill('Cầu Giấy');

  // Click the suggestion SPAN
  const suggestion = searchContainer.locator('span').filter({ hasText: 'Cầu Giấy, Quan Hoa' }).first();
  await suggestion.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Suggestion visible, clicking...');
  await suggestion.click({ force: true });
  await page.waitForTimeout(2000);

  console.log('Search input value after select:', await searchInput.inputValue());

  // Now, what happens if we click searchInput?
  await searchInput.click({ force: true });
  await page.waitForTimeout(1000);

  // Check what is in the dropdown now
  const optionsAfter = await page.evaluate(() => {
    const searchRoot = document.querySelector('#tour-map-search');
    const all = Array.from(searchRoot.querySelectorAll('*')).filter(el => {
      return el.children.length === 0 && el.innerText?.trim();
    });
    return all.map(el => ({
      tag: el.tagName,
      text: el.innerText.trim(),
      class: el.className
    }));
  });

  console.log('Leaf elements when clicking search input after selection:', JSON.stringify(optionsAfter, null, 2));

  // Now let's test clearing input:
  const clearBtn = searchContainer.locator('button:has(svg), [class*="cursor-pointer"]').filter({ has: page.locator('svg') });
  console.log('Clicking clear / fill empty...');
  await searchInput.fill('');
  await page.waitForTimeout(1000);

  const optionsAfterClear = await page.evaluate(() => {
    const searchRoot = document.querySelector('#tour-map-search');
    const all = Array.from(searchRoot.querySelectorAll('*')).filter(el => {
      return el.children.length === 0 && el.innerText?.trim();
    });
    return all.map(el => ({
      tag: el.tagName,
      text: el.innerText.trim(),
      class: el.className
    }));
  });

  console.log('Leaf elements when input is EMPTY:', JSON.stringify(optionsAfterClear, null, 2));

  await browser.close();
})();
