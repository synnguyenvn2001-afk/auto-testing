const { spawn } = require('child_process');
const readline = require('readline');

// Command line arguments parsing if provided directly
const args = process.argv.slice(2);
const hasArg = (flag) => args.some((arg) => arg.startsWith(flag));
const getArgVal = (flag) => {
  const arg = args.find((a) => a.startsWith(flag));
  return arg ? arg.split('=')[1] : null;
};

// Available test suites mapping
const suites = {
  '1': { name: 'Tất cả các module (All Suites)', pattern: 'tests/' },
  '2': { name: 'Tin tức thị trường (Market News)', pattern: 'tests/news.spec.ts' },
  '3': { name: 'Bản đồ & Tìm kiếm (Map & Search)', pattern: 'tests/map.spec.ts' },
  '4': { name: 'Bảo mật & Giới hạn (Security)', pattern: 'tests/security.spec.ts' },
  '5': { name: 'Tin rao vặt (Classified Ads)', pattern: 'tests/classified-ads.spec.ts' },
  '6': { name: 'Đăng nhập & Xác thực (Auth)', pattern: 'tests/auth.spec.ts' },
  '7': { name: 'Cẩm nang BĐS (Handbook)', pattern: 'tests/handbook.spec.ts' },
  '8': { name: 'Tài khoản & Công cụ (Profile & Tools)', pattern: 'tests/navigation.spec.ts tests/profile.spec.ts tests/tools.spec.ts' },
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n===============================================================');
  console.log('   BỘ CÔNG CỤ CHẠY KIỂM THỬ TỰ ĐỘNG PLAYWRIGHT (TEST RUNNER)');
  console.log('===============================================================\n');

  let suiteChoice = getArgVal('--suite');
  let headedChoice = getArgVal('--headed') ? '2' : (getArgVal('--ui') ? '3' : null);
  let workerChoice = getArgVal('--workers');

  // Step 1: Select suite if not specified in CLI args
  if (!suiteChoice || !suites[suiteChoice]) {
    console.log('--- BƯỚC 1: CHỌN PHẦN MUỐN TEST ---');
    Object.keys(suites).forEach((key) => {
      console.log(`  ${key}. ${suites[key].name}`);
    });
    const ans = await askQuestion('\n👉 Nhập lựa chọn của bạn (1-8) [Mặc định: 1]: ');
    suiteChoice = ans.trim() || '1';
    if (!suites[suiteChoice]) suiteChoice = '1';
  }

  const selectedSuite = suites[suiteChoice];
  console.log(`\n✅ Đã chọn Module: ${selectedSuite.name}\n`);

  // Step 2: Select browser display mode (Headless vs Headed vs Playwright UI)
  if (!headedChoice) {
    console.log('--- BƯỚC 2: CHỌN CHẾ ĐỘ HIỂN THỊ TRÌNH DUYỆT (BROWSER) ---');
    console.log('  1. Chạy ẩn (Headless - Chạy ngầm trong nền, nhanh nhất)');
    console.log('  2. Mở trình duyệt trực quan (Headed - Mở cửa sổ browser để người dùng xem live)');
    console.log('  3. Mở Playwright UI Mode (--ui - Giao diện trực quan chọn từng test & xem live)');
    const ans = await askQuestion('\n👉 Nhập lựa chọn của bạn (1-3) [Mặc định: 2 - Mở trình duyệt]: ');
    headedChoice = ans.trim() || '2';
  }

  // Step 3: Select worker count
  if (!workerChoice) {
    console.log('\n--- BƯỚC 3: SỐ LƯỢNG WORKER CHẠY SONG SONG ---');
    const ans = await askQuestion('👉 Nhập số lượng Worker (1, 2, 4...) [Mặc định: 1]: ');
    workerChoice = ans.trim() || '1';
  }

  rl.close();

  // Construct Playwright command args
  const playwrightArgs = ['playwright', 'test'];

  if (selectedSuite.pattern !== 'tests/') {
    playwrightArgs.push(...selectedSuite.pattern.split(' '));
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

  console.log('\n===============================================================');
  console.log(`🚀 ĐANG KÍCH HOẠT LỆNH: npx ${playwrightArgs.join(' ')}`);
  console.log('===============================================================\n');

  // Spawn npx command cross-platform
  const child = spawn('npx', playwrightArgs, {
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    console.log(`\n✨ Quá trình kiểm thử đã hoàn tất với mã thoát: ${code}`);
  });
}

main().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
