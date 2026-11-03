const fs = require('fs');
const path = require('path');

const downloadsDir = 'c:\\Users\\Admin\\Downloads';

function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function findLatestTestRunJson() {
  const argPath = process.argv[2];
  if (argPath && fs.existsSync(argPath)) return argPath;

  const files = fs
    .readdirSync(downloadsDir)
    .filter(f => f.endsWith('.postman_test_run.json') || (f.endsWith('.json') && f.includes('test_run')))
    .map(f => {
      const full = path.join(downloadsDir, f);
      return { full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  return files.length > 0 ? files[0].full : null;
}

function parseAssertionTitle(title) {
  // Format: [TQ-06224 - Phường Bạch Đằng, Thành phố Hà Nội] Dãy A2 -> Nhận: "Dãy A2" (Phường Đồng Nguyên, Tỉnh Bắc Ninh)
  const m = /^\[([^\]]+)\]\s*(.*?)\s*->\s*Nhận:\s*"([^"]*)"\s*\(([^)]*)\)/.exec(title);
  if (!m) {
    return {
      code: '',
      sourceArea: '',
      expectedRoad: title,
      actualRoad: '',
      actualArea: '',
    };
  }
  const bracket = m[1];
  const dashIdx = bracket.indexOf(' - ');
  const code = dashIdx >= 0 ? bracket.slice(0, dashIdx).trim() : bracket.trim();
  const sourceArea = dashIdx >= 0 ? bracket.slice(dashIdx + 3).trim() : '';
  return {
    code,
    sourceArea,
    expectedRoad: m[2].trim(),
    actualRoad: m[3].trim(),
    actualArea: m[4].trim(),
  };
}

function main() {
  const jsonFile = findLatestTestRunJson();
  if (!jsonFile) {
    console.log('⚠️ Không tìm thấy file *.postman_test_run.json nào trong thư mục Downloads.');
    console.log('👉 Hãy bấm "Export run results" trên Postman và lưu vào thư mục Downloads rồi chạy lại lệnh này!');
    process.exit(0);
  }

  console.log(`📂 Đang đọc file kết quả Postman: ${jsonFile}`);
  const raw = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const results = Array.isArray(raw.results) ? raw.results : [];

  const rows = [];
  let passCount = 0;
  let failCount = 0;

  for (const item of results) {
    const requestName = item.name || '';
    const allTests = item.allTests || [];
    const testPassFailCounts = item.testPassFailCounts || {};

    // Postman export có thể lưu trong allTests (mảng các object) hoặc testPassFailCounts
    const seen = new Set();
    for (const tObj of allTests) {
      for (const [testTitle, passed] of Object.entries(tObj)) {
        seen.add(testTitle);
        const isPass = Boolean(passed);
        if (isPass) passCount++;
        else failCount++;
        const parsed = parseAssertionTitle(testTitle);
        rows.push({
          requestName,
          ...parsed,
          status: isPass ? 'PASS (ĐẠT)' : 'FAIL (LỖI/LỆCH)',
          isPass,
        });
      }
    }

    for (const [testTitle, counts] of Object.entries(testPassFailCounts)) {
      if (seen.has(testTitle)) continue;
      const isPass = Number(counts.pass || 0) > 0 && Number(counts.fail || 0) === 0;
      if (isPass) passCount++;
      else failCount++;
      const parsed = parseAssertionTitle(testTitle);
      rows.push({
        requestName,
        ...parsed,
        status: isPass ? 'PASS (ĐẠT)' : 'FAIL (LỖI/LỆCH)',
        isPass,
      });
    }
  }

  const baseName = path.basename(jsonFile, '.json').replace(/\.postman_test_run$/, '');
  const outCsvPath = path.join(downloadsDir, `${baseName}_Excel.csv`);
  const outFailCsvPath = path.join(downloadsDir, `${baseName}_Chi_Tiet_Loi_FAIL.csv`);
  const outHtmlPath = path.join(downloadsDir, `${baseName}_Bao_Cao.html`);

  const header = 'STT,Mã tuyến,Phường/Xã - Tỉnh/TP (Nguồn),Tên đường gốc,Tên đường DEV trả về,Phường/Xã - Tỉnh/TP (DEV),Kết quả,Thuộc Request';
  const allCsvLines = rows.map((r, i) =>
    [i + 1, r.code, r.sourceArea, r.expectedRoad, r.actualRoad, r.actualArea, r.status, r.requestName]
      .map(escapeCsv)
      .join(',')
  );
  const failRows = rows.filter(r => !r.isPass);
  const failCsvLines = failRows.map((r, i) =>
    [i + 1, r.code, r.sourceArea, r.expectedRoad, r.actualRoad, r.actualArea, r.status, r.requestName]
      .map(escapeCsv)
      .join(',')
  );

  fs.writeFileSync(outCsvPath, '\uFEFF' + [header, ...allCsvLines].join('\r\n'), 'utf8');
  fs.writeFileSync(outFailCsvPath, '\uFEFF' + [header, ...failCsvLines].join('\r\n'), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Báo cáo Export từ Postman (${baseName})</title>
  <style>
    body { font-family: Segoe UI, sans-serif; padding: 20px; background: #f8fafc; color: #0f172a; }
    .header { background: #fff; padding: 18px 24px; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
    .badge-pass { background: #dcfce7; color: #166534; padding: 8px 14px; border-radius: 8px; font-weight: 700; margin-right: 10px; }
    .badge-fail { background: #fee2e2; color: #991b1b; padding: 8px 14px; border-radius: 8px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; background: #fff; font-size: 13px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
    th { background: #0f172a; color: #fff; }
    tr.fail { background: #fef2f2; }
    .ok { color: #15803d; font-weight: 700; }
    .err { color: #b91c1c; font-weight: 700; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2 style="margin:0 0 6px 0">📊 Báo cáo Kết quả Test từ Postman (${baseName})</h2>
      <div>Tổng số tuyến đã kiểm tra: <b>${rows.length}</b></div>
    </div>
    <div>
      <span class="badge-pass">✅ ĐẠT (PASS): ${passCount}</span>
      <span class="badge-fail">❌ LỖI (FAIL): ${failCount}</span>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Mã tuyến</th>
        <th>Phường/Xã - Tỉnh/TP (Nguồn)</th>
        <th>Tên đường gốc</th>
        <th>Tên đường DEV trả về</th>
        <th>Phường/Xã - Tỉnh/TP (DEV)</th>
        <th>Kết quả</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r, i) => `
        <tr class="${r.isPass ? '' : 'fail'}">
          <td>${i + 1}</td>
          <td><b>${r.code}</b></td>
          <td>${r.sourceArea}</td>
          <td><b>${r.expectedRoad}</b></td>
          <td><b>${r.actualRoad}</b></td>
          <td>${r.actualArea}</td>
          <td class="${r.isPass ? 'ok' : 'err'}">${r.status}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  fs.writeFileSync(outHtmlPath, html, 'utf8');

  console.log(`✅ Đã chuyển đổi thành công ${rows.length} kết quả (PASS: ${passCount} | FAIL: ${failCount})!`);
  console.log(`📊 File Excel (Tất cả): ${outCsvPath}`);
  console.log(`❌ File Excel (Chỉ lọc ${failCount} tuyến FAIL): ${outFailCsvPath}`);
  console.log(`🌐 File Báo cáo HTML: ${outHtmlPath}`);
}

main();

