const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: require('./_paths').authStatePath,
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();

  page.on('request', req => {
    if (req.url().includes('search') || req.url().includes('suggest') || req.url().includes('location') || req.url().includes('geo')) {
      console.log('REQ:', req.method(), req.url());
    }
  });

  page.on('response', async res => {
    if (res.url().includes('search') || res.url().includes('suggest') || res.url().includes('location') || res.url().includes('geo')) {
      console.log('RES:', res.status(), res.url());
      try {
        const text = await res.text();
        console.log('DATA:', text.slice(0, 200));
      } catch (e) {}
    }
  });

  await page.goto('https://beta.landbase.vn/ban-do', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Close guide
  const closeBtn = page.locator('button.driver-popover-close-btn, button:has-text("×")').first();
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click({ force: true });
  }

  const searchInput = page.locator('input[placeholder="Tìm kiếm khu vực, địa chỉ hoặc toạ độ..."]').first();

  console.log('--- Typing: Ha Noi ---');
  await searchInput.fill('Ha Noi');
  await page.waitForTimeout(2500);

  console.log('--- Typing: Hà Nội ---');
  await searchInput.fill('Hà Nội');
  await page.waitForTimeout(2500);

  console.log('--- Typing: Cầu Giấy ---');
  await searchInput.fill('Cầu Giấy');
  await page.waitForTimeout(2500);

  await browser.close();
})();
