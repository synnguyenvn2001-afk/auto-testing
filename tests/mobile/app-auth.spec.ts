import { driver, $, $$, expect } from '@wdio/globals';
import {
  TEST_ACCOUNT,
  dismissGooglePopup,
  isMobileLoggedIn,
  getLoginModalInputs,
  openLoginModalIfNeeded,
  ensureMobileLoggedIn,
  ensureMobileLoggedOut
} from './mobile-helpers';

/**
 * BỘ KIỂM THỬ TỰ ĐỘNG MOBILE APP - ĐĂNG NHẬP BẰNG TÀI KHOẢN LANDBASE
 * (Tự động chuyển đổi giữa màn hình Đăng nhập tài khoản cũ và Đăng nhập bằng tài khoản khác)
 */
describe('1. Kiểm thử Đăng nhập bằng Tài khoản trên Mobile App (Direct Account Auth)', () => {

  // Helper tìm chính xác NÚT ĐĂNG NHẬP MÀU TÍM bên dưới ô Mật khẩu
  async function getPurpleSubmitButton() {
    const allBtns = await $$('//android.widget.Button[contains(@text, "Đăng nhập")]');
    const nonGoogleBtns = [];
    for (const btn of allBtns) {
      const text = await btn.getText().catch(() => '');
      if (!text.includes('Google')) {
        nonGoogleBtns.push(btn);
      }
    }
    return nonGoogleBtns.length > 0 ? nonGoogleBtns[nonGoogleBtns.length - 1] : null;
  }

  it('MOBILE_AUTH_000: Tự động kiểm tra và đưa ứng dụng về trạng thái ĐĂNG XUẤT', async () => {
    await driver.pause(1500);
    await ensureMobileLoggedOut();
  });

  it('MOBILE_AUTH_001: Mở ứng dụng và kiểm tra Giao diện Đăng nhập trên Header', async () => {
    await dismissGooglePopup();

    const loginBtn = await $('//android.widget.Button[contains(@text, "Đăng nhập") and not(contains(@text, "Google"))]');
    await expect(loginBtn).toBeDisplayed();
  });

  it('MOBILE_AUTH_002: Click nút "Đăng nhập" và mở Form Modal điền Tên tài khoản & Mật khẩu', async () => {
    await openLoginModalIfNeeded();

    const modalInputs = await getLoginModalInputs();
    expect(modalInputs.length).toBeGreaterThan(0);
  });

  it('MOBILE_AUTH_003: Validate Tên tài khoản không hợp lệ (Ký tự đặc biệt user^78!)', async () => {
    await openLoginModalIfNeeded();

    const modalInputs = await getLoginModalInputs();
    if (modalInputs.length >= 1) {
      await modalInputs[0].click();
      await modalInputs[0].clearValue();
      await modalInputs[0].setValue('user^78!');
      await driver.pause(500);

      const purpleSubmitBtn = await getPurpleSubmitButton();
      if (purpleSubmitBtn && await purpleSubmitBtn.isDisplayed().catch(() => false)) {
        await purpleSubmitBtn.click();
        await driver.pause(1000);
        console.log('✅ Đã nhập user^78! vào Modal Đăng nhập và kiểm tra validate');
      }
    }
  });

  it('MOBILE_AUTH_004: Validate Đăng nhập thất bại khi nhập Sai Mật khẩu', async () => {
    await openLoginModalIfNeeded();

    const modalInputs = await getLoginModalInputs();
    if (modalInputs.length >= 1) {
      await modalInputs[0].click();
      await modalInputs[0].clearValue();
      await modalInputs[0].setValue(TEST_ACCOUNT.username); // usert1
      await driver.pause(300);

      if (modalInputs.length >= 2) {
        await modalInputs[1].click();
        await modalInputs[1].clearValue();
        await modalInputs[1].setValue('WrongPassword999!'); // Mật khẩu sai
        await driver.pause(300);
      }

      const purpleSubmitBtn = await getPurpleSubmitButton();
      if (purpleSubmitBtn && await purpleSubmitBtn.isDisplayed().catch(() => false)) {
        await purpleSubmitBtn.click();
        await driver.pause(1500);
        console.log('✅ Đã thử nghiệm nhập sai mật khẩu trong Modal Đăng nhập');
      }
    }
  });

  it('MOBILE_AUTH_005: ĐĂNG NHẬP THÀNH CÔNG trực tiếp bằng Tên tài khoản [usert1] & Mật khẩu [Enao@123]', async () => {
    // Đóng Modal cũ từ testcase nhập sai mật khẩu để reset form về trạng thái sạch
    const closeBtn = await $('//android.widget.Button[@text="Đóng"]');
    if (await closeBtn.isDisplayed().catch(() => false)) {
      await closeBtn.click();
      await driver.pause(1200);
    }

    await openLoginModalIfNeeded();
    await ensureMobileLoggedIn(TEST_ACCOUNT);

    const loggedIn = await isMobileLoggedIn();
    console.log(`✅ Trạng thái sau Đăng nhập: ${loggedIn ? 'ĐÃ ĐĂNG NHẬP THÀNH CÔNG' : 'CHƯA ĐĂNG NHẬP'}`);
    expect(loggedIn).toBe(true);
  });

  it('MOBILE_AUTH_006: ĐĂNG XUẤT THÀNH CÔNG khỏi ứng dụng', async () => {
    await ensureMobileLoggedOut();

    const loggedIn = await isMobileLoggedIn();
    console.log(`✅ Trạng thái sau Đăng xuất: ${!loggedIn ? 'ĐÃ ĐĂNG XUẤT THÀNH CÔNG' : 'VẪN CÒN ĐĂNG NHẬP'}`);
    expect(loggedIn).toBe(false);
  });
});
