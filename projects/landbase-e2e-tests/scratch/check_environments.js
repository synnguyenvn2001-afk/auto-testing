const fs = require('fs');
const path = require('path');

console.log('=== 1. KIỂM TRA CÁC FILE POSTMAN ENVIRONMENT ===');
const rootFiles = fs.readdirSync('.');
const envFiles = rootFiles.filter(f => f.endsWith('.postman_environment.json'));
console.log('Các file environment tìm thấy:', envFiles);

const mainEnvFile = 'LandBase_Environment.postman_environment.json';
let mainEnvKeys = [];
if (fs.existsSync(mainEnvFile)) {
  const mainEnv = JSON.parse(fs.readFileSync(mainEnvFile, 'utf8'));
  mainEnvKeys = mainEnv.values.map(v => v.key);
  console.log(`\nFile môi trường chung [${mainEnvFile}] có ${mainEnvKeys.length} biến:`);
}

for (const envF of envFiles) {
  if (envF === mainEnvFile) continue;
  const envData = JSON.parse(fs.readFileSync(envF, 'utf8'));
  const keys = envData.values.map(v => v.key);
  const missingInMain = keys.filter(k => !mainEnvKeys.includes(k));
  console.log(`\n👉 File môi trường riêng: [${envF}] (${keys.length} biến)`);
  console.log('   Tên môi trường trong file:', envData.name);
  if (missingInMain.length > 0) {
    console.log('   ⚠️ Biến có trong file này nhưng CHƯA CÓ trong file chung:', missingInMain);
  } else {
    console.log('   ✅ Toàn bộ biến đã có trong file chung!');
  }
}

console.log('\n=== 2. KIỂM TRA CÁC URL HARDCODE TRONG POSTMAN COLLECTIONS ===');
const colFiles = rootFiles.filter(f => f.endsWith('.postman_collection.json'));
for (const colF of colFiles) {
  const content = fs.readFileSync(colF, 'utf8');
  // Match raw urls that start with http instead of {{
  const rawUrlMatches = content.match(/"raw":\s*"https?:\/\/[^"]+"/g) || [];
  const hardcodedRawUrls = rawUrlMatches.map(m => m.replace(/"raw":\s*"/, '').replace(/"$/, ''));
  if (hardcodedRawUrls.length > 0) {
    console.log(`\n⚠️ Collection [${colF}] có ${hardcodedRawUrls.length} request có URL hardcode (không dùng {{baseUrl}}):`);
    console.log('   Ví dụ:', hardcodedRawUrls.slice(0, 3));
  } else {
    console.log(`✅ Collection [${colF}]: Tất cả request đều dùng biến môi trường ({{baseUrl}}, {{webappUrl}}, ...), không hardcode URL!`);
  }
}

console.log('\n=== 3. KIỂM TRA TRONG CÁC FILE TESTS (PLAYWRIGHT) ===');
function scanDir(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results = results.concat(scanDir(full));
    } else if (ent.name.endsWith('.spec.ts')) {
      results.push(full);
    }
  }
  return results;
}

const specFiles = scanDir('tests');
for (const spec of specFiles) {
  const txt = fs.readFileSync(spec, 'utf8');
  
  // Check if test defines custom baseURL or hardcoded API origins
  const hardcodedUrls = [];
  const urlRegex = /https?:\/\/[a-zA-Z0-9.-]+(?::[0-9]+)?/g;
  let match;
  while ((match = urlRegex.exec(txt)) !== null) {
    const u = match[0];
    if (!u.includes('schema.org') && !u.includes('w3.org') && !u.includes('evil-hacker')) {
      hardcodedUrls.push(u);
    }
  }
  const uniqueUrls = [...new Set(hardcodedUrls)];
  
  // Check if test creates its own mock environment or separate env
  const createsSeparateEnv = txt.includes('createSixStandardTasks') || txt.includes('new LandBaseApiClient({') || txt.includes('process.env.TEST_ENV');
  
  const issues = [];
  if (uniqueUrls.some(u => u.includes('192.168.') || u.includes('10.100.'))) {
    issues.push(`Có IP mạng nội bộ hardcoded: ${uniqueUrls.filter(u => u.includes('192.168.') || u.includes('10.100.'))}`);
  }
  if (uniqueUrls.some(u => u.includes('landbase.vn') && !u.includes('dev-') && !spec.includes('mobile'))) {
    issues.push(`Có hardcode domain prod: https://landbase.vn`);
  }
  
  if (issues.length > 0) {
    console.log(`\n⚠️ File [${spec}]:`);
    issues.forEach(i => console.log('   - ' + i));
  }
}

