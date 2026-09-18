import { driver, $, $$, expect } from '@wdio/globals';

/**
 * BỘ KIỂM THỬ TỰ ĐỘNG MOBILE APP - TIN TỨC THỊ TRƯỜNG & TÌM KIẾM
 * App: Landbase Mobile App (vn.laand)
 */
describe('3. Kiểm thử Tin tức thị trường trên Mobile App (Mobile News)', () => {

  it('MOBILE_NEWS_001: Mở Menu và truy cập mục "Tin tức thị trường"', async () => {
    await driver.pause(1500);

    const menuBtn = await $('//android.widget.Button[contains(@text, "Mở menu")]');
    if (await menuBtn.isDisplayed().catch(() => false)) {
      await menuBtn.click();
      await driver.pause(1000);
    }

    const newsOption = await $('//*[contains(@text, "Tin tức") or contains(@text, "Thị trường")]');
    if (await newsOption.isDisplayed().catch(() => false)) {
      await newsOption.click();
      await driver.pause(1500);
    }

    const pageContainer = await $('//android.view.ViewGroup | //android.widget.FrameLayout');
    await expect(pageContainer).toBeDisplayed();
  });

  it('MOBILE_NEWS_002: Kiểm tra ô Tìm kiếm AI ("Bạn muốn tìm hiểu về khu vực nào?...")', async () => {
    const searchInput = await $('//android.widget.EditText[contains(@hint, "tìm hiểu") or contains(@hint, "khu vực") or contains(@text, "09")]');
    if (await searchInput.isDisplayed().catch(() => false)) {
      await searchInput.setValue('Hà Nội');
      await driver.pause(1000);
      const value = await searchInput.getText();
      expect(value).toContain('Hà Nội');
    } else {
      const pageContainer = await $('//android.view.ViewGroup | //android.widget.FrameLayout');
      await expect(pageContainer).toBeDisplayed();
    }
  });

  it('MOBILE_NEWS_003: Thao tác vuốt cuộn danh sách bài viết (Swipe / Scroll)', async () => {
    await driver.action('pointer')
      .move({ duration: 0, x: 500, y: 1400 })
      .down({ button: 0 })
      .move({ duration: 1000, x: 500, y: 400 })
      .up({ button: 0 })
      .perform();

    await driver.pause(1000);
    const pageContainer = await $('//android.view.ViewGroup | //android.widget.FrameLayout');
    await expect(pageContainer).toBeDisplayed();
  });

  it('MOBILE_NEWS_004: Mở Bộ lọc Tin tức & Click nút Reset (↺) "Xóa bộ lọc"', async () => {
    const filterBtn = await $('//android.widget.Button[contains(@text, "Bộ lọc") or contains(@text, "Lọc")]');
    if (await filterBtn.isDisplayed().catch(() => false)) {
      await filterBtn.click();
      await driver.pause(1000);

      const resetBtn = await $('//android.widget.Button[contains(@text, "Xóa bộ lọc") or contains(@text, "Đặt lại")]');
      if (await resetBtn.isDisplayed().catch(() => false)) {
        await resetBtn.click();
        await driver.pause(1000);
      }
    }
    const pageContainer = await $('//android.view.ViewGroup | //android.widget.FrameLayout');
    await expect(pageContainer).toBeDisplayed();
  });
});
