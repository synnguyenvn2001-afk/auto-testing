const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: require('./_paths').authStatePath,
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();
  await page.goto('https://beta.landbase.vn/ban-do', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Take screenshot of initial state
  await page.screenshot({ path: require('./_paths').artifactPath('map_initial.png') });

  // Check for any guides, tours, dialogs, popovers, close buttons
  const popups = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, div, span, a'));
    const xButtons = buttons.filter(b => {
      const text = b.innerText?.trim();
      const aria = b.getAttribute('aria-label');
      const hasXIcon = b.querySelector('svg, i.fa-xmark, i.fa-times, .driver-close-btn');
      return text === '✕' || text === '×' || text === 'X' || text === 'x' || aria?.includes('close') || aria?.includes('Đóng') || hasXIcon;
    }).map(b => ({
      tagName: b.tagName,
      className: b.className,
      text: b.innerText?.trim()?.slice(0, 50),
      aria: b.getAttribute('aria-label'),
      rect: b.getBoundingClientRect()
    }));

    // Find all tabs
    const tabs = Array.from(document.querySelectorAll('[role="tab"], button')).map(t => ({
      text: t.innerText?.trim()?.slice(0, 50),
      role: t.getAttribute('role'),
      className: t.className
    })).filter(t => t.text && (t.text.includes('Tờ') || t.text.includes('thửa') || t.text.includes('Địa chỉ') || t.text.includes('Hướng dẫn') || t.text.includes('Tìm kiếm')));

    return { xButtons, tabs, bodyText: document.body.innerText.slice(0, 500) };
  });

  console.log('Popups/X-buttons:', JSON.stringify(popups.xButtons, null, 2));
  console.log('Tabs:', JSON.stringify(popups.tabs, null, 2));

  await browser.close();
})();
