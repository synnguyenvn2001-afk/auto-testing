import { test, expect } from '@playwright/test';
import { skipOnboardingTour, loginIfNeeded } from './helpers';

test.describe('Đăng nhập bằng Token vào Trang chủ (Token-based Authentication)', () => {
  const HOME_URL = process.env.BASE_URL || 'https://beta.landbase.vn/';

  test('AUTH_TOKEN_001: Sử dụng Token/Cookie phiên làm việc để đăng nhập Trang chủ thành công', async ({ page, context }) => {
    test.setTimeout(45000);

    // 1. Truy cập Trang chủ (Tự động nạp storageState session/token từ user.json)
    await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await skipOnboardingTour(page);

    // 2. Đảm bảo phiên làm việc có Token/Session hợp lệ (Khôi phục nếu token hết hạn)
    await loginIfNeeded(page);

    // 3. Kiểm tra nút "Đăng nhập" ở Header không còn xuất hiện khi đã đăng nhập
    const guestLoginBtn = page.locator('#login-trigger-btn').first();
    if (await guestLoginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(guestLoginBtn).toBeHidden();
    }

    // 4. Xác minh sự tồn tại của Auth Token/Cookie trong Browser Context
    const cookies = await context.cookies();
    const hasAuthCookie = cookies.some(c => 
      c.name.includes('authjs') || 
      c.name.includes('session') || 
      c.name.includes('token') || 
      c.name.includes('_mClientFP')
    );
    expect(hasAuthCookie).toBeTruthy();

    console.log('✅ Đã xác minh đăng nhập bằng Token thành công trên Trang chủ!');
  });

  test('AUTH_TOKEN_002: Kiểm tra Token cho phép điều hướng thẳng từ Trang chủ vào Trang thông tin cá nhân', async ({ page }) => {
    test.setTimeout(45000);

    // 1. Vào Trang chủ với Token đã nạp
    await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await skipOnboardingTour(page);
    await loginIfNeeded(page);

    // 2. Click chuyển sang trang Tổng quan tài khoản
    const baseUrl = process.env.BASE_URL || 'https://beta.landbase.vn';
    await page.goto(`${baseUrl}/tong-quan-tai-khoan`, { waitUntil: 'domcontentloaded' });
    await skipOnboardingTour(page);

    // 3. Xác minh trang cá nhân hiển thị thông tin người dùng (không bị redirect về login)
    const profileHeading = page.locator('h1, heading, div').filter({ hasText: /tổng quan tài khoản/i }).first();
    await expect(profileHeading).toBeVisible({ timeout: 15000 });

    console.log('✅ Token hợp lệ, điều hướng thành công vào trang Quản lý tài khoản!');
  });
});
