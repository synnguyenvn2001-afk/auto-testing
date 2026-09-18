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
  if (await closeBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
    await closeBtn.click({ force: true });
    await page.waitForTimeout(500);
  }

  // Click tab "Tờ/thửa"
  const plotTab = page.locator('button[role="tab"], button').filter({ hasText: /^Tờ\/thửa$/i }).first();
  await plotTab.click({ force: true });
  await page.waitForTimeout(500);

  const sheetInput = page.locator('input[placeholder="Số tờ bản đồ"]').first();
  const plotInput = page.locator('input[placeholder="Số thửa đất"]').first();
  const submitBtn = page.locator('button:has-text("Tìm kiếm")').first();

  await sheetInput.fill('10');
  await plotInput.fill('20');
  await page.waitForTimeout(500);

  console.log('Submit button disabled?', await submitBtn.isDisabled());

  // Click submit button
  await submitBtn.click({ force: true });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: require('./_paths').artifactPath('submit_without_province.png') });

  // Check what errors or messages appear
  const errors = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*')).filter(el => {
      const t = el.innerText?.trim();
      const isRed = getComputedStyle(el).color.includes('239, 68, 68') || getComputedStyle(el).color.includes('220, 38, 38');
      return (t && (t.includes('Vui lòng chọn') || t.includes('bắt buộc') || t.includes('Tỉnh/Thành phố'))) || isRed;
    }).map(el => ({ tag: el.tagName, text: el.innerText.trim().slice(0, 100), class: el.className }));
  });

  console.log('Errors/validation:', JSON.stringify(errors.slice(0, 10), null, 2));

  await browser.close();
})();
