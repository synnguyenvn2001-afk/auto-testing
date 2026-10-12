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

  const searchInput = page.locator('#tour-map-search input[placeholder="Tìm kiếm khu vực, địa chỉ hoặc toạ độ..."]').first();
  await searchInput.fill('Cầu Giấy');

  // Wait for suggest-all response
  await page.waitForResponse(res => res.url().includes('suggest-all'));
  await page.waitForTimeout(1000);

  // Dump the dropdown options inside #tour-map-search
  const options = await page.evaluate(() => {
    const searchRoot = document.querySelector('#tour-map-search');
    const all = Array.from(searchRoot.querySelectorAll('*')).filter(el => {
      return el.children.length === 0 && el.innerText?.trim();
    });
    return all.map(el => ({
      tag: el.tagName,
      text: el.innerText.trim(),
      class: el.className,
      parentClass: el.parentElement?.className
    }));
  });

  console.log('Dropdown leaf elements:', JSON.stringify(options, null, 2));

  await browser.close();
})();
