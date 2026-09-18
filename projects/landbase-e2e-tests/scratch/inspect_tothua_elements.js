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

  // Click tab "Tờ/thửa"
  const plotTab = page.locator('button[role="tab"], button').filter({ hasText: /Tờ\/thửa|Số tờ/i }).first();
  await plotTab.click({ force: true });
  await page.waitForTimeout(1000);

  // Check inputs and buttons in Tờ/thửa tab
  const elements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('#tour-map-search *')).filter(el => {
      const isInteractive = ['INPUT', 'BUTTON', 'SELECT'].includes(el.tagName) || el.getAttribute('role') === 'button' || el.getAttribute('role') === 'combobox';
      return isInteractive && el.offsetParent !== null;
    }).map(el => ({
      tag: el.tagName,
      role: el.getAttribute('role'),
      text: el.innerText?.trim()?.slice(0, 50),
      placeholder: el.placeholder,
      disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
      class: el.className
    }));
  });

  console.log('Interactive elements in Tờ/thửa tab:', JSON.stringify(elements, null, 2));

  await browser.close();
})();
