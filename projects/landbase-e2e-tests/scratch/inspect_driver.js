const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: require('./_paths').authStatePath,
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();
  await page.goto('https://landbase.vn/ban-do');

  // Listen to DOM mutations or wait for .driver-popover
  console.log('Waiting for driver popover...');
  try {
    const popover = await page.waitForSelector('.driver-popover', { state: 'visible', timeout: 10000 });
    console.log('Driver popover visible!');
    const html = await page.evaluate(() => {
      const p = document.querySelector('.driver-popover');
      return p ? p.outerHTML : 'none';
    });
    console.log('Popover HTML:', html);
  } catch (e) {
    console.log('No driver popover found in 10s');
  }

  await browser.close();
})();
