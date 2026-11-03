const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const jsonPath = path.join(projectDir, 'test-data', 'toanquoc-77061-roads-with-coords.json');
const downloadsDir = 'c:\\Users\\Admin\\Downloads';
const baseUrl = 'https://dev-gateway.laand.vn';

function normalizeRoadName(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(duong|pho)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

(async () => {
  const allRoads = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const targetStates = new Set(['Thành phố Cần Thơ', 'Thành phố Đà Nẵng', 'Thành phố Hà Nội']);
  const targetRoads = allRoads.filter(r => targetStates.has(r.state));

  console.log(`🚀 Đang chạy xuất báo cáo Excel cho ${targetRoads.length} tuyến đường (Cần Thơ, Đà Nẵng, Hà Nội)...`);

  const results = new Array(targetRoads.length);
  let idx = 0;
  let passCount = 0;
  let failCount = 0;
  const concurrency = 80;

  async function worker() {
    while (idx < targetRoads.length) {
      const i = idx++;
      const road = targetRoads[i];
      try {
        const res = await fetch(`${baseUrl}/api/v1.0/elasticsearch/public/search-suggest/geocodev2`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            address: road.name,
            latitude: road.lat,
            longitude: road.lon,
            limit: 15,
            minScore: 1,
          }),
          signal: AbortSignal.timeout(5000),
        });
        const list = await res.json();
        const normExp = normalizeRoadName(road.name);
        let bestMatch = Array.isArray(list) && list.length > 0 ? list[0] : null;
        let hasNameMatch = false;
        let hasProvMatch = false;

        if (Array.isArray(list)) {
          for (const item of list) {
            const rawAct = item.roadName || item.name || '';
            const normAct = normalizeRoadName(rawAct);
            const nameOk = normAct === normExp;
            const provOk =
              (item.provinceName || '') === road.newProv || (item.provinceName || '') === road.state;
            if (nameOk && provOk) {
              hasNameMatch = true;
              hasProvMatch = true;
              bestMatch = item;
              break;
            } else if (nameOk && !hasNameMatch) {
              hasNameMatch = true;
              bestMatch = item;
            }
          }
        }

        const actualName = bestMatch ? bestMatch.roadName || bestMatch.name || '(Không rõ)' : 'Không tìm thấy';
        const actualWard = bestMatch?.wardName || '-';
        const actualProv = bestMatch?.provinceName || '-';
        const ok = Boolean(bestMatch && hasNameMatch && hasProvMatch);
        if (ok) passCount++;
        else failCount++;

        results[i] = {
          ...road,
          actualName,
          actualWard,
          actualProv,
          actualLat: bestMatch?.latitude ?? '',
          actualLon: bestMatch?.longitude ?? '',
          ok,
          statusText: ok
            ? 'PASS - KHỚP ĐÚNG'
            : !bestMatch
              ? 'FAIL - THIẾU DỮ LIỆU'
              : !hasNameMatch
                ? 'FAIL - LỆCH TÊN ĐƯỜNG'
                : 'FAIL - KHÁC TỈNH/TP',
        };
      } catch (e) {
        failCount++;
        results[i] = {
          ...road,
          actualName: 'Lỗi kết nối',
          actualWard: '-',
          actualProv: '-',
          actualLat: '',
          actualLon: '',
          ok: false,
          statusText: 'FAIL - LỖI REQUEST',
        };
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const csvHeader =
    'STT,Mã tuyến,Tỉnh/TP (Nguồn),Phường/Xã (Nguồn),Quận/Huyện (Nguồn),Tên đường gốc,Tên đường DEV trả về,Phường/Xã (DEV),Tỉnh/TP (DEV),Vĩ độ DEV,Kinh độ DEV,Kết quả';
  const toRow = (r, i) =>
    [
      i + 1,
      r.code,
      r.state,
      r.ward,
      r.dist,
      r.name,
      r.actualName,
      r.actualWard,
      r.actualProv,
      r.actualLat,
      r.actualLon,
      r.statusText,
    ]
      .map(escapeCsv)
      .join(',');

  const allCsvPath = path.join(downloadsDir, 'Ket_Qua_Test_11616_Tuyen_Excel.csv');
  const failCsvPath = path.join(downloadsDir, 'Ket_Qua_Test_Loi_FAIL_Excel.csv');
  const htmlPath = path.join(downloadsDir, 'Ket_Qua_Test_11616_Tuyen_Bao_Cao.html');

  fs.writeFileSync(allCsvPath, '\uFEFF' + [csvHeader, ...results.map(toRow)].join('\r\n'), 'utf8');
  const failedResults = results.filter(r => !r.ok);
  fs.writeFileSync(failCsvPath, '\uFEFF' + [csvHeader, ...failedResults.map(toRow)].join('\r\n'), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Báo cáo Kết quả Kiểm tra ${results.length} Tuyến đường (DEV)</title>
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
      <h2 style="margin:0 0 6px 0">📊 Báo cáo Chi tiết các Tuyến đường Lỗi/Lệch (${failedResults.length}/${results.length} tuyến)</h2>
      <div>Đã kiểm tra: <b>${results.length}</b> tuyến (Cần Thơ, Đà Nẵng, Hà Nội)</div>
    </div>
    <div>
      <span class="badge-pass">✅ PASS: ${passCount}</span>
      <span class="badge-fail">❌ FAIL: ${failCount}</span>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Mã</th>
        <th>Tỉnh/TP - Phường/Xã (Nguồn)</th>
        <th>Tên đường gốc</th>
        <th>Tên đường DEV trả về</th>
        <th>Phường/Xã - Tỉnh/TP (DEV)</th>
        <th>Tọa độ DEV</th>
        <th>Kết quả</th>
      </tr>
    </thead>
    <tbody>
      ${failedResults
        .map(
          (r, i) => `
        <tr class="fail">
          <td>${i + 1}</td>
          <td><b>${r.code}</b></td>
          <td><b>${r.ward}</b> (${r.dist})<br/><small style="color:#64748b">${r.state}</small></td>
          <td><b>${r.name}</b></td>
          <td><b>${r.actualName}</b></td>
          <td>${r.actualWard}<br/><small style="color:#64748b">${r.actualProv}</small></td>
          <td>${r.actualLat ? `${r.actualLat}, ${r.actualLon}` : 'N/A'}</td>
          <td class="err">${r.statusText}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`✅ Đã xuất xong! PASS: ${passCount} | FAIL: ${failCount}`);
  console.log(`📊 File Excel (Đầy đủ 11.616 tuyến): ${allCsvPath}`);
  console.log(`❌ File Excel (Chỉ lọc ${failCount} tuyến FAIL): ${failCsvPath}`);
  console.log(`🌐 File Báo cáo HTML: ${htmlPath}`);
})();

