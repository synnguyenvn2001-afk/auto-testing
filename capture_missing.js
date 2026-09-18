const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://beta.landbase.vn/ban-do', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  // Try finding Số tờ / Số thửa tab
  const tabs = await page.locator('button, [role="tab"]').all();
  for (const t of tabs) {
    const txt = await t.innerText().catch(() => '');
    if (txt.includes('Số tờ') || txt.includes('thửa')) {
      console.log('Found tab:', txt);
      await t.click({ force: true });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'docs_images/04_ban_do_tra_cuu_thua.png' });
      break;
    }
  }

  // Try finding draw tool
  const drawBtns = await page.locator('button').all();
  for (const b of drawBtns) {
    const aria = (await b.getAttribute('aria-label')) || '';
    const title = (await b.getAttribute('title')) || '';
    const txt = await b.innerText().catch(() => '');
    if (aria.includes('Vẽ') || title.includes('Vẽ') || txt.includes('Vẽ') || aria.includes('Thước') || title.includes('Thước')) {
      console.log('Found draw btn:', aria || title || txt);
      await b.click({ force: true });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'docs_images/06_ban_do_cong_cu_ve.png' });
      break;
    }
  }

  await browser.close();
  console.log('Done capturing missing 04 & 06!');
})();
