const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'api-environment.json');

async function main() {
  console.log('\n===============================================================');
  console.log('   CÔNG CỤ TỰ ĐỘNG ĐĂNG NHẬP & BẮT TOKEN API LANDBASE (DEV)');
  console.log('===============================================================\n');

  let username = process.env.DEV_USERNAME || 'usert1';
  let password = process.env.DEV_PASSWORD || 'Enao@123';
  let webappUrl = process.env.WEBAPP_BASE_URL || 'https://dev-webapp.laand.vn';
  let gatewayUrl = process.env.API_BASE_URL || 'https://dev-gateway.laand.vn';

  // Read config file if exists
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (cfg.webappUrl) webappUrl = cfg.webappUrl;
      if (cfg.baseUrl) gatewayUrl = cfg.baseUrl;
      if (cfg.username && !username) username = cfg.username;
      if (cfg.password && !password) password = cfg.password;
    } catch {}
  }

  console.log(`🌐 Mở trình duyệt đến: ${webappUrl}`);
  console.log('ℹ️  Đang theo dõi phiên đăng nhập để tự động bắt Token...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let captured = {
    accessToken: '',
    xAuthToken: '',
    xSessionRef: '',
  };

  // Intercept any outgoing request containing authentication headers
  page.on('request', (req) => {
    const headers = req.headers();
    if (headers['authorization'] && !captured.accessToken) {
      captured.accessToken = headers['authorization'].replace(/^Bearer /i, '');
    }
    if (headers['x-auth-token'] && !captured.xAuthToken) {
      captured.xAuthToken = headers['x-auth-token'];
    }
    if (headers['x-session-ref'] && !captured.xSessionRef) {
      captured.xSessionRef = headers['x-session-ref'];
    }
  });

  await page.goto(webappUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Dismiss guide tour
  const closeBtn = page.locator('.driver-popover-close-btn, button:has-text("×"), button.driver-close-btn').first();
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click({ force: true }).catch(() => {});
  }

  // Check if already logged in
  const checkSession = async () => {
    try {
      const session = await page.evaluate(async () => {
        const res = await window.fetch('/api/auth/session');
        return await res.json();
      });
      if (session?.user?.accessToken) {
        captured.accessToken = session.user.accessToken;
      }
    } catch {}

    const cookies = await context.cookies(webappUrl);
    for (const c of cookies) {
      if (c.name === '_v2_mClientFP') captured.xSessionRef = c.value;
      if (c.name === '_v2_sig' || c.name === '_v2_sig_fp') captured.xAuthToken = c.value;
    }

    if (!captured.xSessionRef) {
      const fp = await page.evaluate(() => localStorage.getItem('_v2_mClientFP')).catch(() => null);
      if (fp) captured.xSessionRef = fp;
    }

    return !!captured.accessToken;
  };

  const alreadyLoggedIn = await checkSession();

  if (!alreadyLoggedIn) {
    console.log('👉 Vui lòng ĐĂNG NHẬP vào tài khoản của bạn trên cửa sổ trình duyệt...');
    
    // Auto fill credentials if configured
    if (username && password) {
      console.log(`🔑 Tự động điền tài khoản [${username}]...`);
      const loginTrigger = page.locator('#login-trigger-btn, button:has-text("Đăng nhập")').first();
      if (await loginTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await loginTrigger.click({ force: true });
        await page.waitForTimeout(1000);
        const dialog = page.locator('div[role="dialog"]').first();
        const u = dialog.locator('input[placeholder*="tên đăng nhập"i], #login-username, input:not([type="password"])').first();
        const p = dialog.locator('#login-password, input[type="password"]').first();
        const submit = dialog.locator('button').filter({ hasText: /^đăng nhập$/i }).or(dialog.locator('button[type="submit"]:not(:has-text("Google"))')).last();
        if (await u.isVisible()) {
          await u.fill(username);
          await p.fill(password);
          await submit.click({ force: true });
        }
      }
    }

    // Wait for login to complete (polling session or waiting for navigation)
    const startTime = Date.now();
    while (Date.now() - startTime < 120000) { // wait up to 2 mins
      await page.waitForTimeout(1500);
      if (await checkSession()) {
        break;
      }
    }
  }

  // Double check cookies and session
  await checkSession();

  if (captured.accessToken) {
    console.log('\n===============================================================');
    console.log('🎉 BẮT TOKEN THÀNH CÔNG TỪ DEV-WEBAPP!');
    console.log('===============================================================');
    console.log(`• Access Token:  ${captured.accessToken.slice(0, 30)}...`);
    console.log(`• X-Auth-Token:  ${captured.xAuthToken || '(sẽ tự nạp từ cookie)'}`);
    console.log(`• X-Session-Ref: ${captured.xSessionRef || '(sẽ tự nạp từ cookie)'}`);

    const resultConfig = {
      baseUrl: gatewayUrl,
      webappUrl: webappUrl,
      accessToken: captured.accessToken,
      xAuthToken: captured.xAuthToken,
      xSessionRef: captured.xSessionRef,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(configPath, JSON.stringify(resultConfig, null, 2), 'utf-8');
    console.log(`\n💾 Đã lưu vào: ${configPath}`);
    console.log('👉 Giờ đây bạn có thể chạy: npm run test:api để kiểm thử toàn bộ API!\n');
  } else {
    console.warn('\n⚠️ Hết thời gian chờ hoặc chưa phát hiện phiên đăng nhập thành công.');
  }

  await browser.close();
}

main().catch((err) => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});
