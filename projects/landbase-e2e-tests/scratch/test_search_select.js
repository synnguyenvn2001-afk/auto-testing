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

  const searchInput = page.locator('input[placeholder="Tìm kiếm khu vực, địa chỉ hoặc toạ độ..."]').first();
  
  // 1. Type "Cầu Giấy" and check suggestions
  await searchInput.fill('Cầu Giấy');
  await page.waitForTimeout(1500);

  // Look at suggestions list
  const suggestions = await page.locator('div[class*="suggestion"], div[role="listbox"] div, ul li, button').filter({ hasText: /Cầu Giấy/i });
  console.log('Suggestions count:', await suggestions.count());
  for (let i = 0; i < Math.min(await suggestions.count(), 5); i++) {
    console.log(`Suggestion ${i}:`, await suggestions.nth(i).innerText());
  }

  // Click the first suggestion to actually perform a search
  if (await suggestions.count() > 0) {
    await suggestions.first().click({ force: true });
    console.log('Clicked suggestion!');
    await page.waitForTimeout(2000);
  } else {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
  }

  // Now clear or click on search input to see if search history dropdown appears
  await searchInput.click();
  await page.waitForTimeout(1000);

  // Let's dump all visible elements in the search dropdown/popover
  const dropdownTexts = await page.evaluate(() => {
    const root = document.querySelector('#tour-map-search') || document;
    return Array.from(root.querySelectorAll('*')).filter(el => {
      const t = el.innerText?.trim();
      return t && el.offsetParent !== null;
    }).map(el => ({ tag: el.tagName, class: el.className, text: el.innerText.trim().slice(0, 100) }));
  });
  console.log('Dropdown items after click:', JSON.stringify(dropdownTexts.slice(0, 15), null, 2));

  await page.screenshot({ path: require('./_paths').artifactPath('after_search_click.png') });

  await browser.close();
})();
