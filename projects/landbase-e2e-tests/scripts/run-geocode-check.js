const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const enrichedJsonPath = path.join(projectDir, 'test-data', 'hanoi-6944-roads-with-wards.json');
const artifactsDir = path.join(projectDir, 'artifacts');
const downloadsDir = 'c:\\Users\\Admin\\Downloads';

if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

const baseUrl = process.env.API_BASE_URL || 'https://dev-gateway.laand.vn';
const maxDistMeters = Number(process.env.MAX_DIST_METERS || 1000);
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const wardArg = process.argv.find(a => a.startsWith('--ward='));
const maxRoads = limitArg ? Number(limitArg.split('=')[1]) : Number(process.env.ROAD_LIMIT ?? 100);
const wardFilter = (wardArg ? wardArg.split('=')[1] : process.env.WARD_FILTER || '').trim();
const concurrency = 20;

function calcDistanceMeters(lat1, lon1, lat2, lon2) {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return Infinity;
  const R = 6371000;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

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
  const rawList = JSON.parse(fs.readFileSync(enrichedJsonPath, 'utf8'));
  let allRoads = rawList.map(r => ({
    code: r.maTuyen,
    name: r.tenTuyen,
    type: r.loaiDuong,
    ward: r.phuongXaMoi || '',
    oldAddr: r.diaChiCu || '',
    length: Number(r.chieuDai),
    lon: Number(r.longitude),
    lat: Number(r.latitude),
  }));

  if (wardFilter && wardFilter.toLowerCase() !== 'all' && !wardFilter.includes('Tất cả')) {
    const q = wardFilter.toLowerCase();
    allRoads = allRoads.filter(
      r => r.ward.toLowerCase().includes(q) || r.oldAddr.toLowerCase().includes(q)
    );
  }

  const targetRoads = maxRoads > 0 ? allRoads.slice(0, maxRoads) : allRoads;
  console.log(
    `\n🚀 Đang kiểm tra ${targetRoads.length}/${allRoads.length} tuyến đường Hà Nội${wardFilter ? ` (Lọc: ${wardFilter})` : ''} trên ${baseUrl}...\n`
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
            limit: 10,
            minScore: 5,
          }),
        });
        const list = await res.json();
        const normExp = normalizeRoadName(road.name);
        let bestMatch = Array.isArray(list) && list.length > 0 ? list[0] : null;
        let minDist = bestMatch
          ? calcDistanceMeters(road.lat, road.lon, Number(bestMatch.latitude), Number(bestMatch.longitude))
          : Infinity;
        let hasNameMatch = false;

        if (Array.isArray(list)) {
          for (const item of list) {
            const rawAct = item.roadName || item.name || '';
            const normAct = normalizeRoadName(rawAct);
            const matched = normAct === normExp;
            const d = calcDistanceMeters(road.lat, road.lon, Number(item.latitude), Number(item.longitude));
            if (matched && (!hasNameMatch || d < minDist)) {
              hasNameMatch = true;
              minDist = d;
              bestMatch = item;
            }
          }
        }

        const actualName = bestMatch ? bestMatch.roadName || bestMatch.name || '(Không rõ)' : 'Không tìm thấy';
        const ok = Boolean(
          bestMatch && hasNameMatch && minDist <= maxDistMeters && String(bestMatch.provinceCode || '') === '01'
        );
        if (ok) passCount++;
        else failCount++;

        results[i] = {
          ...road,
          actualName,
          actualLat: bestMatch?.latitude ?? '',
          actualLon: bestMatch?.longitude ?? '',
          wardName: bestMatch?.wardName ?? '',
          distMeters: minDist === Infinity ? null : minDist,
          ok,
          statusText: ok
            ? 'ĐÚNG VỊ TRÍ'
            : !bestMatch
              ? 'THIẾU DỮ LIỆU'
              : !hasNameMatch
                ? 'LỆCH TÊN ĐƯỜNG'
                : `LỆCH VỊ TRÍ (${minDist}m)`,
        };
      } catch (e) {
        failCount++;
        results[i] = {
          ...road,
          actualName: 'Lỗi kết nối',
          actualLat: '',
          actualLon: '',
          wardName: '',
          distMeters: null,
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
  <title>Báo cáo Kiểm tra Vị trí Tuyến đường Hà Nội (DEV)</title>
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
      <h2 style="margin:0 0 6px 0">📍 Báo cáo Kiểm tra Vị trí Tuyến đường Hà Nội (Môi trường DEV)</h2>
      <div>Tổng số kiểm tra: <b>${results.length}</b> tuyến đường | Ngưỡng lệch cho phép: <b>&le; ${maxDistMeters}m</b></div>
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
        <th>Mã OSM</th>
        <th>Tên tuyến gốc</th>
        <th>Phường/Xã (Mới / Cũ)</th>
        <th>Loại đường</th>
        <th>Tọa độ gốc (Lat, Lon)</th>
        <th>Tên đường DEV trả về</th>
        <th>Phường/Xã (DEV)</th>
        <th>Độ lệch (m)</th>
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
          <td><b>${r.ward}</b><br/><small style="color:#64748b">${r.oldAddr}</small></td>
          <td>${r.type}</td>
          <td>${r.lat}, ${r.lon}</td>
          <td><b>${r.actualName}</b></td>
          <td>${r.wardName}</td>
          <td><b>${r.distMeters === null ? 'N/A' : r.distMeters + ' m'}</b></td>
          <td class="${r.ok ? 'ok' : 'err'}">${r.statusText}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  const artifactReportPath = path.join(artifactsDir, 'Bao_Cao_Vi_Tri_Tuyen_Duong_HaNoi_DEV.html');
  fs.writeFileSync(artifactReportPath, html, 'utf8');
  if (fs.existsSync(downloadsDir)) {
    fs.writeFileSync(path.join(downloadsDir, 'Bao_Cao_Vi_Tri_Tuyen_Duong_HaNoi_DEV.html'), html, 'utf8');
  }

  // Ghi Job Summary nếu đang chạy trên GitHub Actions Cloud
  if (process.env.GITHUB_STEP_SUMMARY) {
    const failedRows = results.filter(r => !r.ok).slice(0, 100);
    const mdSummary = [
      `## 📍 Báo cáo Kiểm tra Vị trí Tuyến đường Hà Nội (DEV Cloud)`,
      `- **Tổng số kiểm tra**: \`${results.length}\` tuyến đường`,
      `- **✅ ĐẠT (Đúng vị trí & tên đường)**: \`${passCount}\``,
      `- **❌ LỖI / LỆCH VỊ TRÍ**: \`${failCount}\``,
      '',
      failedRows.length > 0
        ? `### ⚠️ Danh sách các tuyến đường bị thiếu hoặc lệch vị trí (Tối đa 100 dòng đầu):\n| Mã OSM | Tên tuyến | Phường/Xã | Tọa độ gốc | Kết quả DEV | Độ lệch | Trạng thái |\n|---|---|---|---|---|---|---|\n` +
          failedRows
            .map(
              r =>
                `| ${r.code} | ${r.name} | ${r.ward} | ${r.lat}, ${r.lon} | ${r.actualName} | ${r.distMeters === null ? 'N/A' : r.distMeters + 'm'} | **${r.statusText}** |`
            )
            .join('\n')
        : `### 🎉 Toàn bộ 100% tuyến đường kiểm tra đều hiển thị đúng vị trí!`,
    ].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, mdSummary + '\n', 'utf8');
  }

  console.log(`✅ Hoàn tất! ĐẠT: ${passCount}/${results.length} | LỖI/LỆCH: ${failCount}/${results.length}`);
  console.log(`📄 Báo cáo HTML chi tiết đã lưu tại: ${artifactReportPath}\n`);
})();
