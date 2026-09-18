const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: require('./_paths').authStatePath,
    viewport: { width: 1366, height: 768 }
  });

  const page = await context.newPage();

  // Test addInitScript to disable tour
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('tour_completed_ban_do_tour_7bd1cea3-4151-4f2d-b753-c5079cf988b7', 'true');
      window.localStorage.setItem('tour_completed_general_layout_tour_7bd1cea3-4151-4f2d-b753-c5079cf988b7', 'true');
      // Intercept localStorage setItem/getItem
      const origGet = window.localStorage.getItem.bind(window.localStorage);
      window.localStorage.getItem = (key) => {
        if (key && key.includes('tour_completed')) return 'true';
        return origGet(key);
      };
    } catch (e) {}
  });

  await page.goto('https://beta.landbase.vn/ban-do', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const isDriverActive = await page.evaluate(() => {
    return document.body.classList.contains('driver-active') || !!document.querySelector('.driver-popover');
  });

  console.log('Is driver active after initScript?', isDriverActive);

  await browser.close();
})();
