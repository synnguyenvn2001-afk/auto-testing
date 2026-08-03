const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Function to clean old reports and test artifacts before running new tests
const cleanOldReports = () => {
  console.log('🧹 Đang xóa báo cáo và kết quả kiểm thử cũ...');
  const dirsToClean = ['playwright-report', 'test-results'];
  dirsToClean.forEach((dir) => {
    const fullPath = path.join(__dirname, dir);
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

// Web suites mapping
const webSuites = {
  '1': { name: 'Tất cả các module Web (All Web Suites)', pattern: 'tests/' },
  '2': { name: 'Tin tức thị trường (Market News)', pattern: 'tests/news.spec.ts' },
  '3': { name: 'Bản đồ & Tìm kiếm (Map & Search)', pattern: 'tests/map.spec.ts' },
  '4': { name: 'Bảo mật & Giới hạn (Security)', pattern: 'tests/security.spec.ts' },
  '5': { name: 'Tin rao vặt (Classified Ads)', pattern: 'tests/classified-ads.spec.ts' },
  '6': { name: 'Đăng nhập & Xác thực (Auth)', pattern: 'tests/auth.spec.ts' },
  '7': { name: 'Cẩm nang BĐS (Handbook)', pattern: 'tests/handbook.spec.ts' },
  '8': { name: 'Tài khoản & Công cụ (Profile & Tools)', pattern: 'tests/navigation.spec.ts tests/profile.spec.ts tests/tools.spec.ts' },
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n===============================================================');
  console.log('   BỘ CÔNG CỤ CHẠY KIỂM THỬ TỰ ĐỘNG LANDBASE (WEB & MOBILE APP)');
  console.log('===============================================================\n');

  let platformChoice = getArgVal('--platform');

  // Step 1: Select Platform (Web vs Mobile)
  if (!platformChoice) {
    console.log('--- BƯỚC 1: CHỌN NỀN TẢNG KIỂM THỬ ---');
    console.log('  1. 🌐 Web App (Kiểm thử trang web Laand.vn)');
    console.log('  2. 📱 Mobile App (Kiểm thử ứng dụng Landbase Android APK)');
    const ans = await askQuestion('\n👉 Nhập lựa chọn Nền tảng (1-2) [Mặc định: 1 - Web]: ');
    platformChoice = ans.trim() === '2' ? '2' : '1';
  }

  // =========================================================================
  // RUN MOBILE APP TEST SUITE
  // =========================================================================
  if (platformChoice === '2') {
    console.log('\n--- BƯỚC 2: CHỌN MODULE MOBILE APP ---');
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

    const child = spawn('npx', wdioArgs, {
      stdio: 'inherit',
      shell: true,
    });
    child.on('exit', (code) => {
      console.log(`\n✨ Quá trình kiểm thử Mobile App hoàn tất với mã thoát: ${code}`);
    });
    return;
  }

  // =========================================================================
  // RUN WEB APP TEST SUITE
  // =========================================================================
  let suiteChoice = getArgVal('--suite');
  let headedChoice = getArgVal('--headed') ? '2' : (getArgVal('--ui') ? '3' : null);
  let workerChoice = getArgVal('--workers');

  if (!suiteChoice || !webSuites[suiteChoice]) {
    console.log('\n--- BƯỚC 2: CHỌN MODULE WEB APP ---');
    Object.keys(webSuites).forEach((key) => {
      console.log(`  ${key}. ${webSuites[key].name}`);
    });
    const ans = await askQuestion('\n👉 Nhập lựa chọn Module Web (1-8) [Mặc định: 1]: ');
    suiteChoice = ans.trim() || '1';
    if (!webSuites[suiteChoice]) suiteChoice = '1';
  }

  const selectedWebSuite = webSuites[suiteChoice];
  console.log(`\n✅ Đã chọn Web Module: ${selectedWebSuite.name}\n`);

  if (!headedChoice) {
    console.log('--- BƯỚC 3: CHỌN CHẾ ĐỘ HIỂN THỊ TRÌNH DUYỆT (BROWSER) ---');
    console.log('  1. Chạy ẩn (Headless - Chạy ngầm trong nền, nhanh nhất)');
    console.log('  2. Mở trình duyệt trực quan (Headed - Mở cửa sổ browser để người dùng xem live)');
    console.log('  3. Mở Playwright UI Mode (--ui - Giao diện trực quan chọn từng test & xem live)');
    const ans = await askQuestion('\n👉 Nhập lựa chọn của bạn (1-3) [Mặc định: 2 - Mở trình duyệt]: ');
    headedChoice = ans.trim() || '2';
  }

  if (!workerChoice) {
    console.log('\n--- BƯỚC 4: SỐ LƯỢNG WORKER CHẠY SONG SONG ---');
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
  console.log('===============================================================\n');

  const child = spawn('npx', playwrightArgs, {
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    console.log(`\n✨ Quá trình kiểm thử Web hoàn tất với mã thoát: ${code}`);
  });
}

main().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
