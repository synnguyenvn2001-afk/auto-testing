const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: require('./_paths').authStatePath,
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();
  await page.goto('https://landbase.vn/ban-do', { waitUntil: 'networkidle' });

  // Take screenshot before
  await page.screenshot({ path: require('./_paths').artifactPath('before_tothua.png') });

  // Check if driver.js is present
  const driverActive = await page.evaluate(() => {
    const el = document.querySelector('.driver-popover, .driver-overlay, #driver-highlighted-element-stage');
    return !!el;
  });
  console.log('Driver active:', driverActive);

  // Close guide if present
  const closeBtn = page.locator('button.driver-popover-close-btn, button:has-text("×"), [aria-label*="close"i]');
  if (await closeBtn.count() > 0) {
    console.log('Clicking close btn...');
    await closeBtn.first().click({ force: true });
    await page.waitForTimeout(500);
  }

  const toThuaTab = page.locator('button[role="tab"]').filter({ hasText: /Tờ\/thửa/i }).first();
  console.log('Tờ/thửa tab text:', await toThuaTab.innerText());
  console.log('Tờ/thửa class before:', await toThuaTab.getAttribute('class'));
  
  await toThuaTab.click({ force: true });
  await page.waitForTimeout(1500);

  console.log('Tờ/thửa class after:', await toThuaTab.getAttribute('class'));
  await page.screenshot({ path: require('./_paths').artifactPath('after_tothua.png') });

  // Dump all input elements
  const allInputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, select, textarea, [role="combobox"]')).map(el => ({
      tag: el.tagName,
      placeholder: el.placeholder,
      id: el.id,
      name: el.name,
      value: el.value,
      className: el.className,
      visible: el.offsetParent !== null
    }));
  });
  console.log('All inputs:', JSON.stringify(allInputs, null, 2));

  await browser.close();
})();
