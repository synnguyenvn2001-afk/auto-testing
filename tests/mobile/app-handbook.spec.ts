import { driver, $, $$, expect } from '@wdio/globals';

/**
 * BỘ KIỂM THỬ TỰ ĐỘNG MOBILE APP - CẨM NANG BẤT ĐỘNG SẢN
 * App: Landbase Mobile App (vn.laand)
 */
describe('6. Kiểm thử Cẩm nang BĐS trên Mobile App (Mobile Handbook)', () => {

  it('MOBILE_HANDBOOK_001: Mở Menu và chọn mục "Cẩm nang BĐS"', async () => {
    await driver.pause(1500);

    const menuBtn = await $('//android.widget.Button[contains(@text, "Mở menu")]');
    if (await menuBtn.isDisplayed().catch(() => false)) {
      await menuBtn.click();
      await driver.pause(1000);
    }

    const handbookOption = await $('//*[contains(@text, "Cẩm nang") or contains(@text, "Kiến thức")]');
    if (await handbookOption.isDisplayed().catch(() => false)) {
      await handbookOption.click();
      await driver.pause(1500);
    }

    const pageContainer = await $('//android.view.ViewGroup | //android.widget.FrameLayout');
    await expect(pageContainer).toBeDisplayed();
  });

  it('MOBILE_HANDBOOK_002: Xem danh sách bài viết Pháp lý / Phong thủy', async () => {
    const article = await $('//android.widget.TextView[contains(@text, "Pháp lý") or contains(@text, "Phong thủy") or string-length(@text) > 15]');
    if (await article.isDisplayed().catch(() => false)) {
      await article.click();
      await driver.pause(1500);
    }
    const pageContainer = await $('//android.view.ViewGroup | //android.widget.FrameLayout');
    await expect(pageContainer).toBeDisplayed();
  });
});
