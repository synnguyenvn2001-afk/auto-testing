const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: require('./_paths').authStatePath,
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();
  await page.goto('https://beta.landbase.vn/ban-do');

  // Wait for driver popover to appear
  const closeBtn = page.locator('.driver-popover-close-btn, button:has-text("×"), button.driver-close-btn');
  try {
    await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Close button appeared!');
    await closeBtn.click({ force: true });
    console.log('Clicked close button.');
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log('Close button not visible within 5s');
  }

  // Check if driver is still active
  const isActive = await page.evaluate(() => {
    return document.body.classList.contains('driver-active') || !!document.querySelector('.driver-popover');
  });
  console.log('Is driver still active?', isActive);

  // Check localStorage keys
  const storage = await page.evaluate(() => {
    return JSON.stringify(window.localStorage);
  });
  console.log('LocalStorage:', storage);

  await browser.close();
})();
