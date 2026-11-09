/**
 * Refresh LandBase JWT Access Token via NextAuth credentials and update all Postman environments.
 * Usage: node scripts/refresh-token.js
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_DEV = path.join(ROOT_DIR, 'LandBase_Environment.postman_environment.json');
const ENV_ONB = path.join(ROOT_DIR, 'LandBase_Onboarding_Reward_Environment.postman_environment.json');
const ENV_API = path.join(ROOT_DIR, 'api-environment.json');

const WEBAPP_URL = process.env.WEBAPP_URL || 'https://dev-webapp.laand.vn';
const USERNAME = process.env.DEV_USERNAME || 'usert1';
const PASSWORD = process.env.DEV_PASSWORD || 'Enao@123';

async function refresh() {
  console.log(`[Token Refresh] 🔑 Đang đăng nhập tài khoản ${USERNAME} tại ${WEBAPP_URL}...`);

  const csrfRes = await fetch(`${WEBAPP_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfCookies = (csrfRes.headers.getSetCookie ? csrfRes.headers.getSetCookie() : [])
    .map(c => c.split(';')[0])
    .join('; ');

  const loginRes = await fetch(`${WEBAPP_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookies,
    },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken,
      userName: USERNAME,
      password: PASSWORD,
      loginType: 'BASIC',
      callbackUrl: `${WEBAPP_URL}/`,
    }),
  });

  const authCookies = (loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [])
    .map(c => c.split(';')[0])
    .join('; ');

  const sessionRes = await fetch(`${WEBAPP_URL}/api/auth/session`, {
    headers: {
      Cookie: [csrfCookies, authCookies].join('; '),
    },
  });

  const sessionData = await sessionRes.json();
  const token = sessionData?.user?.accessToken;

  if (!token) {
    throw new Error('Không lấy được accessToken từ session!');
  }

  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  const expDate = new Date(payload.exp * 1000);
  console.log(`[Token Refresh] 🎉 Lấy token thành công! Hạn dùng đến: ${expDate.toLocaleTimeString()} (${Math.round((expDate - Date.now()) / 1000)}s)`);

  function updateEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(data.values)) {
        for (const item of data.values) {
          if (item.key === 'accessToken') {
            item.value = token;
            item.enabled = true;
          }
        }
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`[Token Refresh] 💾 Đã cập nhật token vào: ${path.basename(filePath)}`);
    } catch (e) {
      console.warn(`[Token Refresh] Lỗi ghi file ${filePath}:`, e.message);
    }
  }

  updateEnvFile(ENV_DEV);
  updateEnvFile(ENV_ONB);

  // Update api-environment.json
  if (fs.existsSync(ENV_API)) {
    try {
      const apiEnv = JSON.parse(fs.readFileSync(ENV_API, 'utf8'));
      apiEnv.accessToken = token;
      apiEnv.updatedAt = new Date().toISOString();
      fs.writeFileSync(ENV_API, JSON.stringify(apiEnv, null, 2), 'utf8');
      console.log(`[Token Refresh] 💾 Đã cập nhật token vào: ${path.basename(ENV_API)}`);
    } catch (e) {
      console.warn(`[Token Refresh] Lỗi ghi file ${ENV_API}:`, e.message);
    }
  }

  return token;
}

if (require.main === module) {
  refresh().catch(err => {
    console.error('[Token Refresh] ❌ Thất bại:', err.message);
    process.exit(1);
  });
}

module.exports = { refresh };

