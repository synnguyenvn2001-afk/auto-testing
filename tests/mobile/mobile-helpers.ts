import { driver, $, $$ } from '@wdio/globals';

export const TEST_ACCOUNTS = [
  'user', 'user1', 'user2', 'user3', 'user4', 'user5',
  'user6', 'user7', 'user8', 'user9', 'user10'
];

export const TEST_PASSWORD = 'Enao@1234';

export const TEST_ACCOUNT = {
  username: TEST_ACCOUNTS[0],
  password: TEST_PASSWORD,
};

/**
 * Tự động ĐÓNG POPUP ĐĂNG NHẬP GOOGLE EMAIL nếu xuất hiện
 */
export async function dismissGooglePopup() {
  const googlePopupText = await $('//*[contains(@text, "Choose an account") or contains(@text, "continue to LandBase") or contains(@text, "gmail.com") or contains(@resource-id, "com.google.android.gms")]');
  if (await googlePopupText.isDisplayed().catch(() => false)) {
    console.log('🚫 Tắt Popup Google Sign-In...');
    await driver.back().catch(() => {});
    await driver.pause(1500);
  }
}

/**
 * Kiểm tra xem ứng dụng đang ở trạng thái ĐÃ ĐĂNG NHẬP hay CHƯA ĐĂNG NHẬP
 */
export async function isMobileLoggedIn(): Promise<boolean> {
  await dismissGooglePopup();

  // 1. Kiểm tra sự xuất hiện của chữ "Xin chào", "Kim cương", "Vàng"
  const welcomeText = await $('//*[contains(@text, "Xin chào") or contains(@text, "Kim cương") or contains(@text, "Vàng")]');
  if (await welcomeText.isDisplayed().catch(() => false)) {
    return true;
  }

  // 2. Kiểm tra Nút User Menu góc phải trên Header
  const userMenuBtn = await $('//android.widget.Button[@text="Menu"]');
  if (await userMenuBtn.isDisplayed().catch(() => false)) {
    return true;
  }

  return false;
}

/**
 * TỰ ĐỘNG BẤM "Đăng nhập bằng tài khoản khác?" NẾU HIỂN THỊ MÀN HÌNH ĐĂNG NHẬP TÀI KHOẢN CŨ
 */
export async function switchToOtherAccountFormIfNeeded() {
  await dismissGooglePopup();

  const switchAccountBtn = await $('//*[contains(@text, "Đăng nhập bằng tài khoản khác")]');
  if (await switchAccountBtn.isDisplayed().catch(() => false)) {
    console.log('🔄 Phát hiện giao diện đăng nhập nhanh tài khoản cũ -> Click "Đăng nhập bằng tài khoản khác"...');
    await switchAccountBtn.click();
    await driver.pause(2500);
    await dismissGooglePopup();
  }
}

/**
 * ĐẢM BẢO MODAL ĐĂNG NHẬP ĐANG MỞ VÀ HIỂN THỊ CẢ 2 Ô (USERNAME & PASSWORD)
 */
export async function openLoginModalIfNeeded() {
  await dismissGooglePopup();

  const modalTitle = await $('//*[contains(@text, "HOẶC") or contains(@text, "Mở khóa dữ liệu thị trường") or contains(@text, "Đăng nhập Landbase") or contains(@text, "Đăng nhập bằng tài khoản khác")]');
  if (!await modalTitle.isDisplayed().catch(() => false)) {
    const headerLoginBtn = await $('//android.widget.Button[contains(@text, "Đăng nhập") and not(contains(@text, "Google"))]');
    if (await headerLoginBtn.isDisplayed().catch(() => false)) {
      console.log('👉 Click Nút Đăng nhập trên Header để mở Modal Đăng nhập...');
      await headerLoginBtn.click();
      await driver.pause(2500);
      await dismissGooglePopup();
    }
  }

  await switchToOtherAccountFormIfNeeded();
}

/**
 * Lấy danh sách ô nhập liệu CHỈ TRONG MODAL ĐĂNG NHẬP
 */
export async function getLoginModalInputs() {
  await switchToOtherAccountFormIfNeeded();

  let modalInputs: any[] = [];
  for (let attempt = 0; attempt < 6; attempt++) {
    const allInputs = await $$('//android.widget.EditText');
    modalInputs = [];

    for (const input of allInputs) {
      const hint = await input.getAttribute('hint').catch(() => '');
      const text = await input.getText().catch(() => '');
      if (!hint.includes('khu vực') && !hint.includes('tìm hiểu') && !text.includes('khu vực')) {
        modalInputs.push(input);
      }
    }

    if (modalInputs.length >= 1) {
      break;
    }
    await driver.pause(1500);
  }

  // Fallback: If filtered list is empty, return all available EditText fields
  if (modalInputs.length === 0) {
    const allInputs = await $$('//android.widget.EditText');
    return allInputs;
  }

  return modalInputs;
}

/**
 * Lấy NÚT ĐĂNG NHẬP MÀU TÍM BÊN DƯỚI FORM MODAL (Luôn là nút Đăng nhập cuối cùng trên màn hình)
 */
export async function getPurpleSubmitButton() {
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

/**
 * TỰ ĐỘNG ĐĂNG XUẤT TÀI KHOẢN (Đưa ứng dụng về trạng thái Chưa Đăng Nhập)
 */
export async function ensureMobileLoggedOut() {
  await dismissGooglePopup();

  const loggedIn = await isMobileLoggedIn();
  if (!loggedIn) {
    console.log('ℹ️ Ứng dụng đã ở trạng thái CHƯA ĐĂNG NHẬP');
    return;
  }

  console.log('🚪 Phát hiện tài khoản đang Đăng nhập -> Tiến hành ĐĂNG XUẤT THỰC TẾ...');

  // 1. Click nút "Menu" góc phải trên (Header Nút User khi đã đăng nhập)
  const userMenuBtn = await $('//android.widget.Button[@text="Menu" or contains(@text, "Menu")]');
  if (await userMenuBtn.isDisplayed().catch(() => false)) {
    await userMenuBtn.click();
    await driver.pause(2000);
  } else {
    const leftMenuBtn = await $('//android.widget.Button[contains(@text, "Mở menu")]');
    if (await leftMenuBtn.isDisplayed().catch(() => false)) {
      await leftMenuBtn.click();
      await driver.pause(2000);
    }
  }

  // 2. Click nút Đăng xuất
  let logoutOption = await $('//*[contains(@text, "Đăng xuất") or contains(@text, "Thoát tài khoản") or contains(@text, "Log out")]');

  if (await logoutOption.isDisplayed().catch(() => false)) {
    await logoutOption.click();
    await driver.pause(2000);

    const confirmLogoutBtn = await $('//android.widget.Button[contains(@text, "Đồng ý") or contains(@text, "Đăng xuất") or contains(@text, "Xác nhận")]');
    if (await confirmLogoutBtn.isDisplayed().catch(() => false)) {
      await confirmLogoutBtn.click();
      await driver.pause(3000);
    }
  }

  await driver.pause(2000);
  console.log('✅ Đã hoàn tất Đăng xuất');
}

/**
 * TỰ ĐỘNG ĐĂNG NHẬP BẰNG TÀI KHOẢN LANDBASE
 * Nếu tài khoản hiện tại bị khóa, tự động chuyển sang thử các tài khoản từ user -> user10 (Mật khẩu: Enao@1234)
 */
export async function ensureMobileLoggedIn(account = TEST_ACCOUNT) {
  const loggedIn = await isMobileLoggedIn();
  if (loggedIn) {
    console.log(`ℹ️ Tài khoản ĐÃ đăng nhập sẵn`);
    return;
  }

  // Tạo danh sách ưu tiên thử nghiệm từ account truyền vào -> user1..user10
  const candidateUsers = [account.username, ...TEST_ACCOUNTS.filter(u => u !== account.username)];

  for (const username of candidateUsers) {
    console.log(`🔑 Thử ĐĂNG NHẬP bằng Tài khoản [${username}]...`);
    await openLoginModalIfNeeded();

    const inputs = await getLoginModalInputs();
    if (inputs.length >= 1) {
      await inputs[0].click();
      await inputs[0].clearValue();
      await inputs[0].setValue(username);
      await driver.pause(500);
    }

    if (inputs.length >= 2) {
      await inputs[1].click();
      await inputs[1].clearValue();
      await inputs[1].setValue(TEST_PASSWORD);
      await driver.pause(500);
    }

    const purpleSubmitBtn = await getPurpleSubmitButton();
    if (purpleSubmitBtn) {
      await purpleSubmitBtn.click();
      await driver.pause(6000);
    }

    if (await isMobileLoggedIn()) {
      console.log(`🎉 ĐĂNG NHẬP THÀNH CÔNG bằng Tài khoản [${username}]!`);
      return;
    }

    console.log(`⚠️ Tài khoản [${username}] bị khóa/lỗi -> Thử tài khoản tiếp theo trong danh sách...`);
  }

  console.log(`❌ Tất cả các tài khoản từ user đến user10 đều không thể đăng nhập.`);
}
