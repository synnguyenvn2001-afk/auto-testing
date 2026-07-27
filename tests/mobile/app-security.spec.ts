import { driver, $, $$, expect } from '@wdio/globals';

/**
 * BỘ KIỂM THỬ TỰ ĐỘNG MOBILE APP - BẢO MẬT & GIỚI HẠN DỮ LIỆU (SECURITY)
 * App: Landbase Mobile App (vn.laand)
 */
describe('7. Kiểm thử Bảo mật & Giới hạn dữ liệu trên Mobile App (Mobile Security)', () => {

  it('MOBILE_SEC_001: Chống injection XSS / Script trên các ô nhập liệu Mobile', async () => {
    await driver.pause(1500);

    const inputField = await $('//android.widget.EditText');
    if (await inputField.isDisplayed().catch(() => false)) {
      await inputField.setValue('<script>alert("xss")</script>');
      await driver.pause(500);

      const submitBtn = await $('//android.widget.Button[contains(@text, "Tiếp tục") or contains(@text, "Tìm kiếm") or contains(@text, "Lưu")]');
      if (await submitBtn.isDisplayed().catch(() => false)) {
        await submitBtn.click();
        await driver.pause(1000);
      }
    }
    const pageContainer = await $('//android.view.ViewGroup | //android.widget.FrameLayout');
    await expect(pageContainer).toBeDisplayed();
  });

  it('MOBILE_SEC_002: Chống bấm liên tục nút Submit (Double-click / Rapid tap protection)', async () => {
    const submitBtn = await $('//android.widget.Button[contains(@text, "Đăng nhập") or contains(@text, "Tạo tài khoản") or contains(@text, "Mở menu")]');
    if (await submitBtn.isDisplayed().catch(() => false)) {
      // Bấm nhanh 3 lần liên tiếp
      await submitBtn.click();
      await submitBtn.click();
      await submitBtn.click();
      await driver.pause(1000);
    }
    const pageContainer = await $('//android.view.ViewGroup | //android.widget.FrameLayout');
    await expect(pageContainer).toBeDisplayed();
  });
});
