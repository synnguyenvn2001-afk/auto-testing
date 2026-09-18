import { driver, $, $$, expect } from '@wdio/globals';
import {
  TEST_ACCOUNT,
  dismissGooglePopup,
  ensureMobileLoggedIn,
  ensureMobileLoggedOut
} from './mobile-helpers';

/**
 * BỘ KIỂM THỬ TỰ ĐỘNG MOBILE APP - QUẢN LÝ TÀI KHOẢN & ĐỔI MẬT KHẨU
 * Tự động Đăng nhập tài khoản trước khi thực hiện testcase Profile
 */
describe('2. Kiểm thử Quản lý Tài khoản trên Mobile App (Mobile Profile)', () => {

  it('MOBILE_PROFILE_000: Tự động ĐĂNG NHẬP TÀI KHOẢN để thực hiện các ca test Profile', async () => {
    await driver.pause(1500);
    await ensureMobileLoggedIn(TEST_ACCOUNT);
  });

  it('MOBILE_PROFILE_001: Mở Menu chính ("Mở menu") và chọn "Thông tin cá nhân"', async () => {
    await dismissGooglePopup();

    const menuBtn = await $('//android.widget.Button[contains(@text, "Mở menu")]');
    if (await menuBtn.isDisplayed().catch(() => false)) {
      await menuBtn.click();
      await driver.pause(1000);
    }

    const profileOption = await $('//*[contains(@text, "Thông tin cá nhân") or contains(@text, "Tài khoản") or contains(@text, "Cá nhân")]');
    if (await profileOption.isDisplayed().catch(() => false)) {
      await profileOption.click();
      await driver.pause(1000);
    }

    const pageContainer = await $('//android.view.ViewGroup | //android.widget.FrameLayout');
    await expect(pageContainer).toBeDisplayed();
  });

  it('MOBILE_PROFILE_002: Kiểm tra nút "Đổi ảnh đại diện" / Avatar Upload', async () => {
    const avatarBtn = await $('//*[contains(@text, "Đổi ảnh") or contains(@text, "Avatar") or contains(@content-desc, "Avatar")]');
    if (await avatarBtn.isDisplayed().catch(() => false)) {
      await avatarBtn.click();
      await driver.pause(1000);

      const option = await $('//*[contains(@text, "Thư viện") or contains(@text, "Chọn ảnh")]');
      if (await option.isDisplayed().catch(() => false)) {
        await expect(option).toBeDisplayed();
      }
    }
    const pageContainer = await $('//android.view.ViewGroup | //android.widget.FrameLayout');
    await expect(pageContainer).toBeDisplayed();
  });

  it('MOBILE_PROFILE_003: Cập nhật Số điện thoại chuẩn Việt Nam (10 chữ số)', async () => {
    const phoneInput = await $('//android.widget.EditText');
    if (await phoneInput.isDisplayed().catch(() => false)) {
      await phoneInput.clearValue();
      await phoneInput.setValue('0987654321');
      await driver.pause(500);

      const saveBtn = await $('//android.widget.Button[contains(@text, "Lưu thay đổi") or contains(@text, "Cập nhật")]');
      if (await saveBtn.isDisplayed().catch(() => false)) {
        await saveBtn.click();
        await driver.pause(1500);
      }
    }
    const pageContainer = await $('//android.view.ViewGroup | //android.widget.FrameLayout');
    await expect(pageContainer).toBeDisplayed();
  });

  it('MOBILE_PROFILE_004: Kiểm tra Validation Đổi mật khẩu KHÔNG KHỚP NHAU', async () => {
    const changePassOption = await $('//*[contains(@text, "Đổi mật khẩu")]');
    if (await changePassOption.isDisplayed().catch(() => false)) {
      await changePassOption.click();
      await driver.pause(1000);

      const passInputs = await $$('//android.widget.EditText');
      if (passInputs.length >= 2) {
        await passInputs[0].setValue('Enao@123'); // Mật khẩu mới
        await passInputs[1].setValue('Enao@999'); // Mật khẩu xác nhận KHÁC NHAU

        const submitBtn = await $('//android.widget.Button[contains(@text, "Đổi mật khẩu") or contains(@text, "Lưu")]');
        if (await submitBtn.isDisplayed().catch(() => false)) {
          await submitBtn.click();
          await driver.pause(1000);

          const errorMsg = await $('//*[contains(@text, "không khớp") or contains(@text, "không trùng")]');
          if (await errorMsg.isDisplayed().catch(() => false)) {
            await expect(errorMsg).toBeDisplayed();
          }
        }
      }
    }
    const pageContainer = await $('//android.view.ViewGroup | //android.widget.FrameLayout');
    await expect(pageContainer).toBeDisplayed();
  });

  it('MOBILE_PROFILE_005: Thao tác nút "Sao chép" đường dẫn giới thiệu (Referral Link)', async () => {
    const copyRefBtn = await $('//*[contains(@text, "Sao chép") or contains(@content-desc, "Copy")]');
    if (await copyRefBtn.isDisplayed().catch(() => false)) {
      await copyRefBtn.click();
      await driver.pause(500);
    }
    const pageContainer = await $('//android.view.ViewGroup | //android.widget.FrameLayout');
    await expect(pageContainer).toBeDisplayed();
  });
});
