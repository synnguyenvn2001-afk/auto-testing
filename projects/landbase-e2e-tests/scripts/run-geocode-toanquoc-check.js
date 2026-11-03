const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const jsonPath = path.join(projectDir, 'test-data', 'toanquoc-77061-roads-with-coords.json');
const artifactsDir = path.join(projectDir, 'artifacts');
const downloadsDir = 'c:\\Users\\Admin\\Downloads';

if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

const baseUrl = process.env.API_BASE_URL || 'https://dev-gateway.laand.vn';
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const provArg = process.argv.find(a => a.startsWith('--province='));
const wardArg = process.argv.find(a => a.startsWith('--ward='));

const maxRoads = limitArg ? Number(limitArg.split('=')[1]) : Number(process.env.ROAD_LIMIT ?? 100);
const provFilter = (provArg ? provArg.split('=')[1] : process.env.PROVINCE_FILTER || '').trim();
const wardFilter = (wardArg ? wardArg.split('=')[1] : process.env.WARD_FILTER || '').trim();
const concurrency = 25;

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

(async () => {
  let allRoads = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  if (provFilter && provFilter.toLowerCase() !== 'all') {
    const q = provFilter.toLowerCase();
    allRoads = allRoads.filter(
      r => r.state.toLowerCase().includes(q) || r.newProv.toLowerCase().includes(q)
    );
  }
  if (wardFilter && wardFilter.toLowerCase() !== 'all') {
    const q = wardFilter.toLowerCase();
    allRoads = allRoads.filter(
      r =>
        r.ward.toLowerCase().includes(q) ||
        r.dist.toLowerCase().includes(q) ||
        r.newWard.toLowerCase().includes(q)
    );
  }

  const targetRoads = maxRoads > 0 ? allRoads.slice(0, maxRoads) : allRoads;
  console.log(
    `\n🚀 Đang kiểm tra ${targetRoads.length}/${allRoads.length} tuyến đường Toàn Quốc${provFilter ? ` (Tỉnh: ${provFilter})` : ''}${wardFilter ? ` (Phường/Xã: ${wardFilter})` : ''} trên ${baseUrl}...\n`
  );

  const results = new Array(targetRoads.length);
  let idx = 0;
  let passCount = 0;
  let failCount = 0;

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
            ? 'KHỚP ĐÚNG'
            : !bestMatch
              ? 'THIẾU DỮ LIỆU'
              : !hasNameMatch
                ? 'LỆCH TÊN ĐƯỜNG'
                : 'KHÁC TỈNH/TP',
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
          statusText: 'LỖI REQUEST',
        };
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Báo cáo Kiểm tra Danh mục Đường Toàn Quốc (DEV)</title>
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
      <h2 style="margin:0 0 6px 0">🇻🇳 Báo cáo Kiểm tra Danh mục Đường Toàn Quốc (Môi trường DEV)</h2>
      <div>Tổng số kiểm tra: <b>${results.length}</b> tuyến đường ${provFilter ? `| Tỉnh/TP: <b>${provFilter}</b>` : ''} ${wardFilter ? `| Phường/Xã: <b>${wardFilter}</b>` : ''}</div>
    </div>
    <div>
      <span class="badge-pass">✅ ĐẠT: ${passCount}</span>
      <span class="badge-fail">❌ LỖI/LỆCH: ${failCount}</span>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Mã</th>
        <th>Tên đường gốc</th>
        <th>Phường/Xã - Quận/Huyện (Nguồn)</th>
        <th>Tỉnh/TP (Nguồn -> Mới)</th>
        <th>Tên đường DEV trả về</th>
        <th>Phường/Xã - Tỉnh/TP (DEV)</th>
        <th>Tọa độ DEV</th>
        <th>Trạng thái</th>
      </tr>
    </thead>
    <tbody>
      ${results
        .map(
          (r, i) => `
        <tr class="${r.ok ? '' : 'fail'}">
          <td>${i + 1}</td>
          <td><b>${r.code}</b></td>
          <td>${r.name}</td>
          <td><b>${r.ward}</b><br/><small style="color:#64748b">${r.dist}</small></td>
          <td><b>${r.state}</b><br/><small style="color:#64748b">→ ${r.newProv}</small></td>
          <td><b>${r.actualName}</b></td>
          <td><b>${r.actualWard}</b><br/><small style="color:#64748b">${r.actualProv}</small></td>
          <td>${r.actualLat ? `${r.actualLat}, ${r.actualLon}` : 'N/A'}</td>
          <td class="${r.ok ? 'ok' : 'err'}">${r.statusText}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  const reportPath = path.join(artifactsDir, 'Bao_Cao_Tuyen_Duong_Toan_Quoc_DEV.html');
  fs.writeFileSync(reportPath, html, 'utf8');
  if (fs.existsSync(downloadsDir)) {
    fs.writeFileSync(path.join(downloadsDir, 'Bao_Cao_Tuyen_Duong_Toan_Quoc_DEV.html'), html, 'utf8');

    const esc = v => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csvHeader = 'STT,Mã tuyến,Tên đường gốc,Phường/Xã (Nguồn),Quận/Huyện (Nguồn),Tỉnh/TP (Nguồn),Tỉnh/TP (Mới),Tên đường DEV trả về,Phường/Xã (DEV),Tỉnh/TP (DEV),Vĩ độ DEV,Kinh độ DEV,Trạng thái';
    const toCsvRow = (r, idx) =>
      [idx + 1, r.code, r.name, r.ward, r.dist, r.state, r.newProv, r.actualName, r.actualWard, r.actualProv, r.actualLat, r.actualLon, r.statusText]
        .map(esc)
        .join(',');
    const allCsv = '\uFEFF' + [csvHeader, ...results.map(toCsvRow)].join('\r\n');
    const failCsv = '\uFEFF' + [csvHeader, ...results.filter(r => !r.ok).map(toCsvRow)].join('\r\n');
    fs.writeFileSync(path.join(downloadsDir, 'Bao_Cao_Tuyen_Duong_Toan_Quoc_DEV.csv'), allCsv, 'utf8');
    fs.writeFileSync(path.join(downloadsDir, 'Bao_Cao_Tuyen_Duong_Toan_Quoc_DEV_Chi_Tiet_Loi.csv'), failCsv, 'utf8');
  }

  console.log(`✅ Hoàn tất! ĐẠT: ${passCount}/${results.length} | LỖI/LỆCH: ${failCount}/${results.length}`);
  console.log(`📄 Báo cáo HTML & Excel CSV chi tiết đã lưu tại: ${downloadsDir}\n`);
})();

