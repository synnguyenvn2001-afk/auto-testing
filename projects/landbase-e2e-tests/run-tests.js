const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const artifactsDir = path.join(projectRoot, 'artifacts');

// Function to clean old reports and test artifacts before running new tests
const cleanOldReports = () => {
  console.log('🧹 Đang xóa báo cáo và kết quả kiểm thử cũ...');
  const dirsToClean = ['playwright-report', 'test-results'];
  dirsToClean.forEach((dir) => {
    const fullPath = path.join(artifactsDir, dir);
    if (fs.existsSync(fullPath)) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`   └─ Đã xóa thành công: ${dir}/`);
      } catch (err) {
        console.warn(`   └─ Không thể xóa ${dir}: ${err.message}`);
      }
    }
  });
  console.log('');
};

// Command line arguments parsing if provided directly
const args = process.argv.slice(2);
const getArgVal = (flag) => {
  const arg = args.find((a) => a.startsWith(flag));
  return arg ? arg.split('=')[1] : null;
};

// Web suites mapping (chỉ chứa các module Web UI)
const webSuites = {
  '1': { name: 'Tất cả các module Web UI (All Web Suites)', pattern: 'tests/' },
  '2': { name: 'Tin tức thị trường (Market News)', pattern: 'tests/news.spec.ts' },
  '3': { name: 'Bản đồ & Tìm kiếm (Map & Search)', pattern: 'tests/map.spec.ts' },
  '4': { name: 'Bảo mật & Giới hạn (Security)', pattern: 'tests/security.spec.ts' },
  '5': { name: 'Tin rao vặt (Classified Ads)', pattern: 'tests/classified-ads.spec.ts' },
  '6': { name: 'Đăng nhập & Xác thực (Auth)', pattern: 'tests/auth.spec.ts' },
  '7': { name: 'Cẩm nang BĐS (Handbook)', pattern: 'tests/handbook.spec.ts' },
  '8': { name: 'Tài khoản & Công cụ (Profile & Tools)', pattern: 'tests/navigation.spec.ts tests/profile.spec.ts tests/tools.spec.ts' },
  '9': { name: '📬 Hòm thư LandBase (Feedback Mailbox - UI & API Integration)', pattern: 'tests/feedback-mailbox.spec.ts' },
  '10': { name: '🤖 Trợ lý AI Bất Động Sản (Chat AI - Web UI & API Integration)', pattern: 'tests/chat-ai-e2e.spec.ts' },
  '11': { name: '🎁 Onboarding & Nhận thưởng LandBase (Web UI E2E - 71 test cases: UIO-001 -> UIO-071)', pattern: 'tests/onboarding-reward-ui.spec.ts' },
};

// Mobile suites mapping
const mobileSuites = {
  '1': { name: 'Tất cả các module Mobile App (All Mobile Specs)', spec: null },
  '2': { name: 'Mobile Auth (Đăng nhập & Đăng ký)', spec: './tests/mobile/app-auth.spec.ts' },
  '3': { name: 'Mobile Profile (Tài khoản, Avatar, Đổi mật khẩu)', spec: './tests/mobile/app-profile.spec.ts' },
  '4': { name: 'Mobile News (Tin tức & Tìm kiếm AI)', spec: './tests/mobile/app-news.spec.ts' },
  '5': { name: 'Mobile Ads (Tin rao vặt & Đăng tin)', spec: './tests/mobile/app-classified-ads.spec.ts' },
  '6': { name: 'Mobile Tools (Công cụ tính vay & thuế)', spec: './tests/mobile/app-tools.spec.ts' },
  '7': { name: 'Mobile Handbook (Cẩm nang BĐS)', spec: './tests/mobile/app-handbook.spec.ts' },
  '8': { name: 'Mobile Security (Bảo mật Mobile App)', spec: './tests/mobile/app-security.spec.ts' },
};

// API suites mapping (Tách riêng nền tảng thứ 3 cho API)
const apiSuites = {
  '1': {
    name: '🚀 Tất cả các module API (All API Tests - 301 test cases)',
    pattern: 'tests/api/',
  },
  '2': {
    name: '🏠 Bất động sản đã lưu - Danh sách, Chi tiết & Bỏ lưu (Saved Real Estate, Detail & Remove)',
    pattern: 'tests/api/saved-real-estate.spec.ts',
  },
  '3': {
    name: '🗺️ Bảng giá đất: Danh sách tỉnh - phường (/category/public/list-province)',
    pattern: 'tests/api/land-price/province-ward.spec.ts',
  },
  '4': {
    name: '🌿 Bảng giá đất: Lớp đất (/category/public/laand-category)',
    pattern: 'tests/api/land-price/land-category.spec.ts',
  },
  '5': {
    name: '🔍 Bảng giá đất: Tìm kiếm giá đất (/land-assess-prices/search)',
    pattern: 'tests/api/land-price/price-search.spec.ts',
  },
  '6': {
    name: '📍 Bảng giá đất: Map giá đất (/land-assess-prices/map)',
    pattern: 'tests/api/land-price/price-map.spec.ts',
  },
  '7': {
    name: '📑 Toàn bộ 4 tab Bảng giá đất (All Land Price Modules)',
    pattern: 'tests/api/land-price/',
  },
  '8': {
    name: '🔮 Phong thủy: Tra cứu phong thủy (/real-estate/public/geomancy/search)',
    pattern: 'tests/api/geomancy.spec.ts',
  },
  '9': {
    name: '📬 Hòm thư Feedback (/api/feedback - 17 test cases)',
    pattern: 'tests/api/feedback.spec.ts',
  },
  '10': {
    name: '🤖 Trợ lý AI - Chat AI Streaming & Scope (/api/chat-messages - 23 test cases)',
    pattern: 'tests/api/chat-ai.spec.ts',
  },
  '11': {
    name: '💳 Đơn hàng & Thanh toán Gói Pro Subscription (/subscription/order, /cart & /cancel - 38 test cases)',
    pattern: 'tests/api/subscription-order.spec.ts',
  },
  '12': {
    name: '📊 Báo cáo tổng quan khu vực (/api/locality-report - 27 test cases)',
    pattern: 'tests/api/locality-report.spec.ts',
  },
  '13': {
    name: '📰 AI tổng hợp báo cáo theo vị trí - Xem chi tiết BĐS (/news/report-by-location - 30 test cases)',
    pattern: 'tests/api/news-report-by-location.spec.ts',
  },
  '14': {
    name: '🏙️ Tiện ích và dịch vụ quanh khu vực (/utilities-detail - 32 test cases)',
    pattern: 'tests/api/utilities-detail.spec.ts',
  },
  '15': {
    name: '🎁 Onboarding & Nhận thưởng tân thủ (/rewards/onboarding, /users/* - 46 test cases)',
    pattern: 'tests/api/onboarding-reward.spec.ts',
  },
  '16': {
    name: '🧠 Tổng quan khu vực: Phân tích khu vực bằng AI & Mở khóa Vàng (Mục E & F - 27 test cases)',
    pattern: 'tests/api/area-overview-ai.spec.ts',
  },
};

// Cấu hình các môi trường kiểm thử (Environments)
const envConfigs = {
  prod: {
    key: 'prod',
    name: 'Production (Môi trường Thật)',
    baseUrl: 'https://landbase.vn',
    webappUrl: 'https://landbase.vn',
    gatewayUrl: 'https://dev-gateway.laand.vn',
    username: process.env.TEST_USERNAME || 'user',
    password: process.env.TEST_PASSWORD || 'Enao@1234',
    badge: '🚀 Production (https://landbase.vn)',
  },
  dev: {
    key: 'dev',
    name: 'Development (Môi trường DEV)',
    baseUrl: 'https://dev-webapp.laand.vn',
    webappUrl: 'https://dev-webapp.laand.vn',
    gatewayUrl: 'https://dev-gateway.laand.vn',
    username: process.env.DEV_USERNAME || process.env.TEST_USERNAME || 'usert1',
    password: process.env.DEV_PASSWORD || process.env.TEST_PASSWORD || 'Enao@123',
    badge: '🛠️ Development (https://dev-webapp.laand.vn)',
  },
};

const resolveEnv = (rawChoice, defaultKey = 'prod') => {
  if (!rawChoice) return envConfigs[defaultKey];
  const val = String(rawChoice).trim().toLowerCase();
  if (val === '1' || val === 'prod' || val === 'production' || val.includes('landbase.vn')) {
    return envConfigs.prod;
  }
  if (val === '2' || val === 'dev' || val === 'development' || val.includes('dev-webapp') || val.includes('laand.vn')) {
    return envConfigs.dev;
  }
  if (val.startsWith('http://') || val.startsWith('https://')) {
    const isDev = val.includes('dev');
    return {
      key: isDev ? 'dev' : 'prod',
      name: `Custom URL (${val})`,
      baseUrl: val,
      webappUrl: val,
      gatewayUrl: envConfigs.dev.gatewayUrl,
      username: isDev ? 'usert1' : 'user',
      password: isDev ? 'Enao@123' : 'Enao@1234',
      badge: `🌐 Custom URL (${val})`,
    };
  }
  return envConfigs[defaultKey];
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n===============================================================');
  console.log('   BỘ CÔNG CỤ CHẠY KIỂM THỬ TỰ ĐỘNG LANDBASE (WEB, MOBILE & API)');
  console.log('===============================================================\n');

  // =========================================================================
  // BƯỚC 1: CHỌN MÔI TRƯỜNG KIỂM THỬ (PRODUCTION vs DEVELOPMENT)
  // =========================================================================
  let selectedEnv;
  let cliEnv = getArgVal('--env') || getArgVal('--environment');
  let cliUrl = getArgVal('--url') || getArgVal('--base-url');

  if (cliUrl) {
    selectedEnv = resolveEnv(cliUrl, 'prod');
    console.log(`✅ Môi trường từ tham số dòng lệnh: ${selectedEnv.badge}\n`);
  } else if (cliEnv) {
    selectedEnv = resolveEnv(cliEnv, 'prod');
    console.log(`✅ Môi trường từ tham số dòng lệnh: ${selectedEnv.badge}\n`);
  } else {
    console.log('--- BƯỚC 1: CHỌN MÔI TRƯỜNG KIỂM THỬ (ENVIRONMENT) ---');
    console.log('  1. 🚀 Production  (Môi trường Thật - https://landbase.vn)');
    console.log('  2. 🛠️ Development (Môi trường DEV  - https://dev-webapp.laand.vn)');
    const envAns = await askQuestion('\n👉 Nhập lựa chọn Môi trường (1-2) [Mặc định: 1 - Production]: ');
    selectedEnv = resolveEnv(envAns, 'prod');
    console.log(`\n✅ Đã chọn môi trường: ${selectedEnv.badge}\n`);
  }

  // =========================================================================
  // CHỌN TÀI KHOẢN KIỂM THỬ (TEST ACCOUNT CHO DEV)
  // =========================================================================
  const devAccounts = [
    { username: 'usert1', password: 'Enao@123', label: 'Tài khoản chính (usert1)' },
    { username: 'usert2', password: 'Enao@123', label: 'Tài khoản phụ 2 (usert2)' },
    { username: 'usert3', password: 'Enao@123', label: 'Tài khoản phụ 3 (usert3)' },
    { username: 'usert4', password: 'Enao@123', label: 'Tài khoản phụ 4 (usert4)' },
    { username: 'usert5', password: 'Enao@123', label: 'Tài khoản phụ 5 (usert5)' },
  ];

  let cliUser = getArgVal('--user') || getArgVal('--username') || getArgVal('--account');
  if (cliUser) {
    const matched = devAccounts.find((a) => a.username.toLowerCase() === cliUser.toLowerCase());
    if (matched) {
      selectedEnv.username = matched.username;
      selectedEnv.password = matched.password;
    } else {
      selectedEnv.username = cliUser;
      selectedEnv.password = getArgVal('--pass') || getArgVal('--password') || 'Enao@123';
    }
    console.log(`👤 Tài khoản từ tham số dòng lệnh: ${selectedEnv.username}\n`);
  } else if (selectedEnv.key === 'dev') {
    console.log('--- CHỌN TÀI KHOẢN TEST DEV (ACCOUNT) ---');
    devAccounts.forEach((acc, idx) => {
      console.log(`  ${idx + 1}. 👤 ${acc.username} - ${acc.label}`);
    });
    console.log(`  ${devAccounts.length + 1}. ✏️ Nhập tài khoản tùy chỉnh khác (Custom)`);
    const accAns = await askQuestion(`\n👉 Nhập lựa chọn Tài khoản (1-${devAccounts.length + 1}) [Mặc định: 1 - usert1]: `);
    const trimmed = accAns.trim();
    if (trimmed === String(devAccounts.length + 1)) {
      const customUser = await askQuestion('👉 Nhập Username: ');
      const customPass = await askQuestion('👉 Nhập Password [Mặc định: Enao@123]: ');
      selectedEnv.username = customUser.trim() || 'usert1';
      selectedEnv.password = customPass.trim() || 'Enao@123';
    } else if (trimmed && devAccounts[parseInt(trimmed) - 1]) {
      const chosen = devAccounts[parseInt(trimmed) - 1];
      selectedEnv.username = chosen.username;
      selectedEnv.password = chosen.password;
    } else if (trimmed && devAccounts.find((a) => a.username.toLowerCase() === trimmed.toLowerCase())) {
      const chosen = devAccounts.find((a) => a.username.toLowerCase() === trimmed.toLowerCase());
      selectedEnv.username = chosen.username;
      selectedEnv.password = chosen.password;
    }
    console.log(`\n✅ Đã chọn tài khoản test: ${selectedEnv.username}\n`);
  }

  // =========================================================================
  // BƯỚC 2: CHỌN NỀN TẢNG KIỂM THỬ (Web vs Mobile vs API)
  // =========================================================================
  let platformChoice = getArgVal('--platform');
  if (!platformChoice) {
    console.log('--- BƯỚC 2: CHỌN NỀN TẢNG KIỂM THỬ ---');
    console.log(`  1. 🌐 Web App (Kiểm thử giao diện Web - ${selectedEnv.baseUrl})`);
    console.log('  2. 📱 Mobile App (Kiểm thử ứng dụng Landbase Android APK)');
    console.log(`  3. ⚡ API Testing (Kiểm thử API Gateway & In-Page Context - ${selectedEnv.baseUrl})`);
    const ans = await askQuestion('\n👉 Nhập lựa chọn Nền tảng (1-3) [Mặc định: 1 - Web]: ');
    platformChoice = ans.trim() || '1';
    if (!['1', '2', '3'].includes(platformChoice)) platformChoice = '1';
  }

  // =========================================================================
  // RUN MOBILE APP TEST SUITE (PLATFORM 2)
  // =========================================================================
  if (platformChoice === '2') {
    console.log('\n--- BƯỚC 3: CHỌN MODULE MOBILE APP ---');
    Object.keys(mobileSuites).forEach((key) => {
      console.log(`  ${key}. ${mobileSuites[key].name}`);
    });
    const ans = await askQuestion('\n👉 Nhập lựa chọn Module Mobile (1-8) [Mặc định: 1]: ');
    let mobileChoice = ans.trim() || '1';
    if (!mobileSuites[mobileChoice]) mobileChoice = '1';

    const selectedMobileSuite = mobileSuites[mobileChoice];
    console.log(`\n✅ Đã chọn Mobile Module: ${selectedMobileSuite.name}\n`);

    rl.close();
    cleanOldReports();

    const wdioArgs = ['wdio', 'run', 'wdio.conf.js'];
    if (selectedMobileSuite.spec) {
      wdioArgs.push('--spec', selectedMobileSuite.spec);
    }

    console.log('===============================================================');
    console.log(`🚀 ĐANG KÍCH HOẠT LỆNH TEST MOBILE: npx ${wdioArgs.join(' ')}`);
    console.log('===============================================================\n');

    const child = spawn(`npx ${wdioArgs.join(' ')}`, {
      stdio: 'inherit',
      shell: true,
      cwd: projectRoot,
      env: {
        ...process.env,
        TEST_ENV: selectedEnv.key,
        BASE_URL: selectedEnv.baseUrl,
        WEBAPP_BASE_URL: selectedEnv.webappUrl,
        API_BASE_URL: selectedEnv.gatewayUrl,
        TEST_USERNAME: selectedEnv.username,
        TEST_PASSWORD: selectedEnv.password,
      },
    });
    child.on('exit', (code) => {
      console.log(`\n✨ Quá trình kiểm thử Mobile App hoàn tất với mã thoát: ${code}`);
    });
    return;
  }

  // =========================================================================
  // RUN API TEST SUITE (PLATFORM 3)
  // =========================================================================
  if (platformChoice === '3') {
    let apiChoice = getArgVal('--suite');
    let headedChoice = getArgVal('--headed') ? '2' : (getArgVal('--ui') ? '3' : null);
    let workerChoice = getArgVal('--workers');

    if (!apiChoice) {
      console.log('\n--- BƯỚC 3: CHỌN PHẦN API MUỐN KIỂM THỬ ---');
      Object.keys(apiSuites).forEach((key) => {
        console.log(`  ${key}. ${apiSuites[key].name}`);
      });
      const ans = await askQuestion('\n👉 Nhập lựa chọn phần API muốn test (1-11, hoặc gõ nhiều số như 2,3) [Mặc định: 1 - Tất cả]: ');
      apiChoice = ans.trim() || '1';
    }

    // Phân tích lựa chọn: hỗ trợ chọn 1 mục hoặc nhiều mục (ví dụ "2,3" hoặc "2 5")
    const selectedKeys = apiChoice
      .split(/[\s,]+/)
      .map((k) => k.trim())
      .filter((k) => apiSuites[k]);

    const activeKeys = selectedKeys.length > 0 ? selectedKeys : ['1'];
    const selectedNames = activeKeys.map((k) => apiSuites[k].name);
    const selectedPatterns = activeKeys.map((k) => apiSuites[k].pattern);

    console.log(`\n✅ Đã chọn phần kiểm thử API:`);
    selectedNames.forEach((n) => console.log(`   └─ ${n}`));
    console.log('');

    if (!headedChoice) {
      console.log('--- BƯỚC 4: CHỌN CHẾ ĐỘ HIỂN THỊ TRÌNH DUYỆT (BROWSER) ---');
      console.log('  1. Chạy ẩn (Headless - Nhanh nhất, chạy ngầm trong nền)');
      console.log('  2. Mở trình duyệt trực quan (Headed - Xem trực quan & lưu Card bằng chứng)');
      console.log('  3. Mở Playwright UI Mode (--ui - Giao diện trực quan chọn từng test & xem live)');
      const ans = await askQuestion('\n👉 Nhập lựa chọn của bạn (1-3) [Mặc định: 1 - Chạy ẩn Headless]: ');
      headedChoice = ans.trim() || '1';
    }

    if (!workerChoice) {
      console.log('\n--- BƯỚC 5: SỐ LƯỢNG WORKER CHẠY SONG SONG ---');
      console.log('  (Khuyến nghị worker=1 khi test API để token đăng nhập được đồng bộ tốt nhất)');
      const ans = await askQuestion('👉 Nhập số lượng Worker (1, 2, 4...) [Mặc định: 1]: ');
      workerChoice = ans.trim() || '1';
    }

    rl.close();
    cleanOldReports();

    const playwrightArgs = ['playwright', 'test'];
    playwrightArgs.push(...selectedPatterns);
    playwrightArgs.push('--project=api');

    if (headedChoice === '2') {
      playwrightArgs.push('--headed');
    } else if (headedChoice === '3') {
      playwrightArgs.push('--ui');
    }

    if (workerChoice) {
      playwrightArgs.push(`--workers=${workerChoice}`);
    }

    console.log('===============================================================');
    console.log(`🚀 ĐANG KÍCH HOẠT LỆNH TEST API: npx ${playwrightArgs.join(' ')}`);
    console.log(`🌍 Môi trường: ${selectedEnv.badge}`);
    console.log(`👤 Tài khoản test: ${selectedEnv.username}`);
    console.log('===============================================================\n');

    const child = spawn(`npx ${playwrightArgs.join(' ')}`, {
      stdio: 'inherit',
      shell: true,
      cwd: projectRoot,
      env: {
        ...process.env,
        TEST_ENV: selectedEnv.key,
        BASE_URL: selectedEnv.baseUrl,
        WEBAPP_BASE_URL: selectedEnv.webappUrl,
        API_BASE_URL: selectedEnv.gatewayUrl,
        TEST_USERNAME: selectedEnv.username,
        TEST_PASSWORD: selectedEnv.password,
      },
    });

    child.on('exit', (code) => {
      console.log(`\n✨ Quá trình kiểm thử API hoàn tất với mã thoát: ${code}`);
      console.log(`👉 Bạn có thể xem báo cáo HTML bằng lệnh: npx playwright show-report artifacts/playwright-report\n`);
    });
    return;
  }

  // =========================================================================
  // RUN WEB APP TEST SUITE (PLATFORM 1)
  // =========================================================================
  let suiteChoice = getArgVal('--suite');
  let headedChoice = getArgVal('--headed') ? '2' : (getArgVal('--ui') ? '3' : null);
  let workerChoice = getArgVal('--workers');

  if (!suiteChoice || !webSuites[suiteChoice]) {
    console.log('\n--- BƯỚC 3: CHỌN MODULE WEB APP ---');
    Object.keys(webSuites).forEach((key) => {
      console.log(`  ${key}. ${webSuites[key].name}`);
    });
    const ans = await askQuestion('\n👉 Nhập lựa chọn Module Web (1-10) [Mặc định: 1]: ');
    suiteChoice = ans.trim() || '1';
    if (!webSuites[suiteChoice]) suiteChoice = '1';
  }

  const selectedWebSuite = webSuites[suiteChoice];
  console.log(`\n✅ Đã chọn Web Module: ${selectedWebSuite.name}\n`);

  if (!headedChoice) {
    console.log('--- BƯỚC 4: CHỌN CHẾ ĐỘ HIỂN THỊ TRÌNH DUYỆT (BROWSER) ---');
    console.log('  1. Chạy ẩn (Headless - Chạy ngầm trong nền, nhanh nhất)');
    console.log('  2. Mở trình duyệt trực quan (Headed - Mở cửa sổ browser để người dùng xem live)');
    console.log('  3. Mở Playwright UI Mode (--ui - Giao diện trực quan chọn từng test & xem live)');
    const ans = await askQuestion('\n👉 Nhập lựa chọn của bạn (1-3) [Mặc định: 2 - Mở trình duyệt]: ');
    headedChoice = ans.trim() || '2';
  }

  if (!workerChoice) {
    console.log('\n--- BƯỚC 5: SỐ LƯỢNG WORKER CHẠY SONG SONG ---');
    const ans = await askQuestion('👉 Nhập số lượng Worker (1, 2, 4...) [Mặc định: 1]: ');
    workerChoice = ans.trim() || '1';
  }

  rl.close();
  cleanOldReports();

  const playwrightArgs = ['playwright', 'test'];

  if (selectedWebSuite.pattern !== 'tests/') {
    playwrightArgs.push(...selectedWebSuite.pattern.split(' '));
  }

  playwrightArgs.push('--project=chromium');

  if (headedChoice === '2') {
    playwrightArgs.push('--headed');
  } else if (headedChoice === '3') {
    playwrightArgs.push('--ui');
  }

  if (workerChoice) {
    playwrightArgs.push(`--workers=${workerChoice}`);
  }

  console.log('===============================================================');
  console.log(`🚀 ĐANG KÍCH HOẠT LỆNH TEST WEB: npx ${playwrightArgs.join(' ')}`);
  console.log(`🌍 Môi trường: ${selectedEnv.badge}`);
  console.log(`👤 Tài khoản test: ${selectedEnv.username}`);
  console.log('===============================================================\n');

  const child = spawn(`npx ${playwrightArgs.join(' ')}`, {
    stdio: 'inherit',
    shell: true,
    cwd: projectRoot,
    env: {
      ...process.env,
      TEST_ENV: selectedEnv.key,
      BASE_URL: selectedEnv.baseUrl,
      WEBAPP_BASE_URL: selectedEnv.webappUrl,
      API_BASE_URL: selectedEnv.gatewayUrl,
      TEST_USERNAME: selectedEnv.username,
      TEST_PASSWORD: selectedEnv.password,
    },
  });

  child.on('exit', (code) => {
    console.log(`\n✨ Quá trình kiểm thử Web hoàn tất với mã thoát: ${code}`);
  });
}

main().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
