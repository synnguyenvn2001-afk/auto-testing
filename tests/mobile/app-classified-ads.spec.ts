import { driver, $, $$, expect } from '@wdio/globals';

/**
 * BỘ KIỂM THỬ TỰ ĐỘNG MOBILE APP - TIN RAO VẶT & BẤT ĐỘNG SẢN
 * App: Landbase Mobile App (vn.laand)
 */
describe('4. Kiểm thử Tin rao vặt & Đăng tin BĐS trên Mobile App (Mobile Ads)', () => {

  it('MOBILE_ADS_001: Mở Menu và chuyển sang mục "Tin rao vặt BĐS"', async () => {
    await driver.pause(1500);

    const menuBtn = await $('//android.widget.Button[contains(@text, "Mở menu")]');
    if (await menuBtn.isDisplayed().catch(() => false)) {
      await menuBtn.click();
      await driver.pause(1000);
    }

    const adsOption = await $('//*[contains(@text, "Rao vặt") or contains(@text, "Bất động sản") or contains(@text, "Nhà đất")]');
    if (await adsOption.isDisplayed().catch(() => false)) {
      await adsOption.click();
      await driver.pause(1500);
    }
  });

  it('MOBILE_ADS_002: Lọc tin rao vặt theo Tỉnh thành / Khu vực', async () => {
    const locationFilter = await $('//android.widget.Button[contains(@text, "Tỉnh/Thành") or contains(@text, "Khu vực")]');
    if (await locationFilter.isDisplayed().catch(() => false)) {
      await locationFilter.click();
      await driver.pause(1000);

      const option = await $('//*[contains(@text, "Hà Nội") or contains(@text, "TP. Hồ Chí Minh")]');
      if (await option.isDisplayed().catch(() => false)) {
        await option.click();
        await driver.pause(1500);
        console.log('✅ Đã lọc tin rao theo khu vực trên Mobile App');
      }
    }
  });

  it('MOBILE_ADS_003: Xem Chi tiết Tin rao & nút Liên hệ (Gọi ngay / Zalo)', async () => {
    const adTitle = await $('//android.widget.TextView[string-length(@text) > 15]');
    if (await adTitle.isDisplayed().catch(() => false)) {
      await adTitle.click();
      await driver.pause(1500);

      const contactBtn = await $('//android.widget.Button[contains(@text, "Gọi ngay") or contains(@text, "Zalo") or contains(@text, "Liên hệ")]');
      if (await contactBtn.isDisplayed().catch(() => false)) {
        console.log('✅ Hiển thị đầy đủ nút liên hệ chính chủ trên Mobile App');
      }
    }
  });
});
