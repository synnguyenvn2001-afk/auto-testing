const fs = require('fs');
const path = require('path');

const mdPath = 'c:\\Users\\Admin\\Downloads\\Danh_muc_tuyen_duong_Ha_Noi_khong_trung_co_toa_do.md';
const downloadsDir = 'c:\\Users\\Admin\\Downloads';
const projectDir = path.join(__dirname, '..');
const testDataDir = path.join(projectDir, 'test-data');

if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// 1. Parse toàn bộ 6,944 tuyến đường có tọa độ từ file Markdown
const content = fs.readFileSync(mdPath, 'utf8');
const lines = content.split(/\r?\n/);

const roads = [];
for (const line of lines) {
  if (!line.startsWith('| OSM-')) continue;
  const parts = line.split('|').map(s => s.trim());
  const maTuyen = parts[1];
  const tenTuyen = parts[2];
  const loaiDuong = parts[3];
  const soDoan = Number(parts[4]);
  const chieuDai = Number(parts[5]);
  const longitude = Number(parts[6]);
  const latitude = Number(parts[7]);
  const osmIds = parts[8];
  const trangThai = parts[9];
  const ghiChu = parts[10] || '';

  if (!isNaN(longitude) && !isNaN(latitude)) {
    roads.push({
      maTuyen,
      tenTuyen,
      loaiDuong,
      soDoan,
      chieuDai,
      longitude,
      latitude,
      osmIds,
      trangThai,
      ghiChu,
    });
  }
}

console.log(`✅ Đã đọc ${roads.length} tuyến đường có tọa độ từ file Markdown.`);

// 2. Tạo script kiểm tra hàng loạt 50 tuyến đường chỉ bằng 1 cú click nút SEND (Không cần Postman Runner trả phí)
function buildBatchSendRequestItem(batchTitle, batchDescription, batchRoads) {
  const firstRoad = batchRoads[0];
  const compactRoads = batchRoads.map(r => ({
    code: r.maTuyen,
    name: r.tenTuyen,
    type: r.loaiDuong,
    lat: r.latitude,
    lon: r.longitude,
  }));

  const scriptLines = [
    '// =======================================================================================',
    '// CHẠY KIỂM TRA HÀNG LOẠT NGAY KHI BẤM NÚT "SEND" (MIỄN PHÍ 100% - KHÔNG CẦN RUNNER)',
    '// =======================================================================================',
    `const batchRoads = ${JSON.stringify(compactRoads)};`,
    'const baseUrl = pm.environment.get("baseUrl") || pm.collectionVariables.get("baseUrl") || "https://dev-gateway.laand.vn";',
    'const maxDistMeters = Number(pm.environment.get("maxDistanceMeters") || pm.collectionVariables.get("maxDistanceMeters") || 1000);',
    '',
    'function calcDistanceMeters(lat1, lon1, lat2, lon2) {',
    '  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return Infinity;',
    '  const R = 6371000;',
    '  const toRad = (deg) => (deg * Math.PI) / 180;',
    '  const dLat = toRad(lat2 - lat1);',
    '  const dLon = toRad(lon2 - lon1);',
    '  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +',
    '            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);',
    '  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));',
    '}',
    '',
    'function normalizeRoadName(str) {',
    '  return String(str || "")',
    '    .toLowerCase()',
    '    .normalize("NFD")',
    '    .replace(/[\\u0300-\\u036f]/g, "")',
    '    .replace(/đ/g, "d")',
    '    .replace(/^(duong|pho|ngo|ngach|hem|cau vuot|cau|dai lo|kdt|khu do thi)\\s+/i, "")',
    '    .replace(/[^a-z0-9\\s]/g, " ")',
    '    .replace(/\\s+/g, " ")',
    '    .trim();',
    '}',
    '',
    'const summaryRows = [];',
    'let completed = 0;',
    'let passCount = 0;',
    'let failCount = 0;',
    '',
    'function renderVisualizer() {',
    '  const template = `',
    '    <style>',
    '      body { font-family: Segoe UI, sans-serif; padding: 14px; background: #f8fafc; color: #0f172a; }',
    '      .header { background: #fff; padding: 14px 18px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }',
    '      .stat-pass { background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 6px; font-weight: 700; margin-right: 8px; }',
    '      .stat-fail { background: #fee2e2; color: #991b1b; padding: 6px 12px; border-radius: 6px; font-weight: 700; }',
    '      table { width: 100%; border-collapse: collapse; background: #fff; font-size: 12.5px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }',
    '      th, td { border: 1px solid #e2e8f0; padding: 7px 10px; text-align: left; }',
    '      th { background: #0f172a; color: #fff; font-weight: 600; }',
    '      tr.row-fail { background: #fef2f2; }',
    '      .tag-ok { color: #15803d; font-weight: 700; }',
    '      .tag-err { color: #b91c1c; font-weight: 700; }',
    '    </style>',
    '    <div class="header">',
    '      <div><h3 style="margin:0">📊 Báo cáo Kiểm tra Hàng loạt ${batchRoads.length} Tuyến đường Hà Nội (DEV)</h3></div>',
    '      <div><span class="stat-pass">✅ ĐẠT: ${passCount}</span><span class="stat-fail">❌ LỖI/LỆCH: ${failCount}</span></div>',
    '    </div>',
    '    <table>',
    '      <thead>',
    '        <tr>',
    '          <th>#</th>',
    '          <th>Mã OSM</th>',
    '          <th>Tên tuyến gốc</th>',
    '          <th>Tọa độ gốc (Lat, Lon)</th>',
    '          <th>Tên đường DEV trả về</th>',
    '          <th>Tọa độ DEV (Lat, Lon)</th>',
    '          <th>Phường/Xã (DEV)</th>',
    '          <th>Độ lệch (m)</th>',
    '          <th>Kết quả</th>',
    '        </tr>',
    '      </thead>',
    '      <tbody>',
    '        ${summaryRows.map((r, i) => `',
    '          <tr class="${r.ok ? "" : "row-fail"}">',
    '            <td>${i + 1}</td>',
    '            <td><b>${r.code}</b></td>',
    '            <td>${r.expectedName}</td>',
    '            <td>${r.expectedLat}, ${r.expectedLon}</td>',
    '            <td><b>${r.actualName}</b></td>',
    '            <td>${r.actualLat}, ${r.actualLon}</td>',
    '            <td>${r.wardName}</td>',
    '            <td><b>${r.distText}</b></td>',
    '            <td class="${r.ok ? "tag-ok" : "tag-err"}">${r.statusText}</td>',
    '          </tr>',
    '        `).join("")}',
    '      </tbody>',
    '    </table>',
    '  `;',
    '  pm.visualizer.set(template);',
    '}',
    '',
    'batchRoads.forEach((road, idx) => {',
    '  pm.sendRequest({',
    '    url: baseUrl + "/api/v1.0/elasticsearch/public/search-suggest/geocodev2",',
    '    method: "POST",',
    '    header: { "Content-Type": "application/json", "Accept": "application/json" },',
    '    body: {',
    '      mode: "raw",',
    '      raw: JSON.stringify({',
    '        address: road.name,',
    '        latitude: road.lat,',
    '        longitude: road.lon,',
    '        limit: 10,',
    '        minScore: 5',
    '      })',
    '    }',
    '  }, function (err, res) {',
    '    completed++;',
    '    let list = [];',
    '    try { list = res ? res.json() : []; } catch (e) { list = []; }',
    '    const normExp = normalizeRoadName(road.name);',
    '    let bestMatch = Array.isArray(list) && list.length > 0 ? list[0] : null;',
    '    let minDist = bestMatch ? calcDistanceMeters(road.lat, road.lon, Number(bestMatch.latitude), Number(bestMatch.longitude)) : Infinity;',
    '    let hasNameMatch = false;',
    '',
    '    if (Array.isArray(list)) {',
    '      for (const item of list) {',
    '        const rawAct = item.roadName || item.name || item.address || "";',
    '        const normAct = normalizeRoadName(rawAct);',
    '        const matched = normAct.includes(normExp) || normExp.includes(normAct);',
    '        const d = calcDistanceMeters(road.lat, road.lon, Number(item.latitude), Number(item.longitude));',
    '        if (matched && (!hasNameMatch || d < minDist)) {',
    '          hasNameMatch = true;',
    '          minDist = d;',
    '          bestMatch = item;',
    '        }',
    '      }',
    '    }',
    '',
    '    const actualName = bestMatch ? (bestMatch.roadName || bestMatch.name || "(Không rõ)") : "❌ Không tìm thấy";',
    '    const ok = Boolean(bestMatch && hasNameMatch && minDist <= maxDistMeters && String(bestMatch.provinceCode || "") === "01");',
    '    if (ok) passCount++; else failCount++;',
    '',
    '    summaryRows[idx] = {',
    '      code: road.code,',
    '      expectedName: road.name,',
    '      expectedLat: road.lat,',
    '      expectedLon: road.lon,',
    '      actualName,',
    '      actualLat: bestMatch ? bestMatch.latitude : "-",',
    '      actualLon: bestMatch ? bestMatch.longitude : "-",',
    '      wardName: bestMatch ? (bestMatch.wardName || "-") : "-",',
    '      distText: minDist === Infinity ? "N/A" : (minDist + " m"),',
    '      ok,',
    '      statusText: ok ? "✅ ĐÚNG VỊ TRÍ" : (!bestMatch ? "❌ THIẾU DỮ LIỆU" : (!hasNameMatch ? "⚠️ LỆCH TÊN" : `⚠️ LỆCH ${minDist}m`))',
    '    };',
    '',
    '    pm.test(`[${road.code}] ${road.name} (${road.lat}, ${road.lon}) -> Nhận: "${actualName}" | Lệch: ${minDist === Infinity ? "N/A" : minDist + "m"}`, function () {',
    '      pm.expect(bestMatch, `Không tìm thấy đường "${road.name}" trên DEV`).to.not.be.null;',
    '      pm.expect(hasNameMatch, `Tên trả về "${actualName}" không khớp "${road.name}"`).to.be.true;',
    '      pm.expect(minDist, `Vị trí lệch ${minDist}m > ${maxDistMeters}m`).to.be.at.most(maxDistMeters);',
    '    });',
    '',
    '    if (completed === batchRoads.length) {',
    '      renderVisualizer();',
    '    }',
    '  });',
    '});',
  ];

  return {
    name: batchTitle,
    request: {
      method: 'POST',
      header: [
        { key: 'Accept', value: 'application/json', type: 'text' },
        { key: 'Content-Type', value: 'application/json', type: 'text' },
      ],
      body: {
        mode: 'raw',
        raw: JSON.stringify(
          {
            address: firstRoad.tenTuyen,
            latitude: firstRoad.latitude,
            longitude: firstRoad.longitude,
            limit: 10,
            minScore: 5,
          },
          null,
          2
        ),
        options: {
          raw: { language: 'json' },
        },
      },
      url: {
        raw: '{{baseUrl}}/api/v1.0/elasticsearch/public/search-suggest/geocodev2',
        host: ['{{baseUrl}}'],
        path: ['api', 'v1.0', 'elasticsearch', 'public', 'search-suggest', 'geocodev2'],
      },
      description: batchDescription,
    },
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: scriptLines,
        },
      },
    ],
  };
}

// 3. Xây dựng Test Script cho từng tuyến đường đơn lẻ
function buildGeocodeTestScript(fixedRoad = null) {
  const lines = [
    '// ============================================================================',
    '// BỘ KIỂM TRA VỊ TRÍ TUYẾN ĐƯỜNG TRÊN MÔI TRƯỜNG DEV (GEOCODE V2)',
    '// ============================================================================',
    fixedRoad
      ? `const expectedCode = ${JSON.stringify(fixedRoad.maTuyen)};`
      : 'const expectedCode = String(pm.iterationData.get("maTuyen") || pm.variables.get("maTuyen") || "OSM-00023");',
    fixedRoad
      ? `const expectedName = ${JSON.stringify(fixedRoad.tenTuyen)};`
      : 'const expectedName = String(pm.iterationData.get("tenTuyen") || pm.variables.get("tenTuyen") || "Bắc Linh Đàm");',
    fixedRoad
      ? `const expectedLat = Number(${fixedRoad.latitude});`
      : 'const expectedLat = Number(pm.iterationData.get("latitude") || pm.variables.get("latitude") || 20.9707252);',
    fixedRoad
      ? `const expectedLon = Number(${fixedRoad.longitude});`
      : 'const expectedLon = Number(pm.iterationData.get("longitude") || pm.variables.get("longitude") || 105.8289271);',
    fixedRoad
      ? `const expectedType = ${JSON.stringify(fixedRoad.loaiDuong)};`
      : 'const expectedType = String(pm.iterationData.get("loaiDuong") || pm.variables.get("loaiDuong") || "Đường dân cư");',
    'const maxDistMeters = Number(pm.environment.get("maxDistanceMeters") || pm.collectionVariables.get("maxDistanceMeters") || 1000);',
    '',
    'function calcDistanceMeters(lat1, lon1, lat2, lon2) {',
    '  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return Infinity;',
    '  const R = 6371000;',
    '  const toRad = (deg) => (deg * Math.PI) / 180;',
    '  const dLat = toRad(lat2 - lat1);',
    '  const dLon = toRad(lon2 - lon1);',
    '  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +',
    '            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);',
    '  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));',
    '}',
    '',
    'function normalizeRoadName(str) {',
    '  return String(str || "")',
    '    .toLowerCase()',
    '    .normalize("NFD")',
    '    .replace(/[\\u0300-\\u036f]/g, "")',
    '    .replace(/đ/g, "d")',
    '    .replace(/^(duong|pho|ngo|ngach|hem|cau vuot|cau|dai lo|kdt|khu do thi)\\s+/i, "")',
    '    .replace(/[^a-z0-9\\s]/g, " ")',
    '    .replace(/\\s+/g, " ")',
    '    .trim();',
    '}',
    '',
    'pm.test(`[${expectedCode}] 1. HTTP Status 200 OK & JSON hợp lệ`, function () {',
    '  pm.expect(pm.response.code).to.be.within(200, 299);',
    '  pm.expect(function () { pm.response.json(); }).to.not.throw();',
    '});',
    '',
    'let results = [];',
    'try { results = pm.response.json(); } catch (e) { results = []; }',
    'const isArray = Array.isArray(results);',
    '',
    'pm.test(`[${expectedCode}] 2. Có kết quả trả về cho tuyến "${expectedName}" tại (${expectedLat}, ${expectedLon})`, function () {',
    '  pm.expect(isArray, "Response phải là mảng JSON").to.be.true;',
    '  pm.expect(results.length, `Không tìm thấy tuyến đường "${expectedName}" trên DEV`).to.be.above(0);',
    '  pm.expect(results[0].matched).to.be.true;',
    '});',
    '',
    'if (isArray && results.length > 0) {',
    '  const normExp = normalizeRoadName(expectedName);',
    '  let bestMatch = results[0];',
    '  let minDistance = calcDistanceMeters(expectedLat, expectedLon, Number(bestMatch.latitude), Number(bestMatch.longitude));',
    '  let hasNameMatch = false;',
    '',
    '  for (const item of results) {',
    '    const rawActual = item.roadName || item.name || item.address || "";',
    '    const normAct = normalizeRoadName(rawActual);',
    '    const nameMatched = normAct.includes(normExp) || normExp.includes(normAct);',
    '    const d = calcDistanceMeters(expectedLat, expectedLon, Number(item.latitude), Number(item.longitude));',
    '    if (nameMatched) {',
    '      if (!hasNameMatch || d < minDistance) {',
    '        hasNameMatch = true;',
    '        minDistance = d;',
    '        bestMatch = item;',
    '      }',
    '    }',
    '  }',
    '',
    '  const actualRoadName = bestMatch.roadName || bestMatch.name || "(Không có tên)";',
    '  const actualAddress = bestMatch.address || bestMatch.fullAddressText || "";',
    '  const actualLat = bestMatch.latitude;',
    '  const actualLon = bestMatch.longitude;',
    '',
    '  pm.test(`[${expectedCode}] 3. Tên đường hiển thị khớp: Kỳ vọng "${expectedName}" -> Nhận "${actualRoadName}"`, function () {',
    '    pm.expect(hasNameMatch, `Tên đường trả về "${actualRoadName}" không khớp với "${expectedName}"`).to.be.true;',
    '  });',
    '',
    '  pm.test(`[${expectedCode}] 4. Vị trí tọa độ đường hiển thị đúng (Độ lệch: ${minDistance}m <= ${maxDistMeters}m)`, function () {',
    '    pm.expect(minDistance, `Tọa độ đường "${actualRoadName}" (${actualLat}, ${actualLon}) lệch ${minDistance}m so với tọa độ gốc (${expectedLat}, ${expectedLon})`).to.be.at.most(maxDistMeters);',
    '  });',
    '',
    '  pm.test(`[${expectedCode}] 5. Thuộc địa bàn Thành phố Hà Nội (provinceCode = "01", Phường/Xã: ${bestMatch.wardName || "N/A"})`, function () {',
    '    pm.expect(String(bestMatch.provinceCode || "")).to.equal("01");',
    '  });',
    '',
    '  const template = `',
    '    <style>',
    '      body { font-family: Segoe UI, sans-serif; padding: 14px; background: #f8fafc; color: #0f172a; }',
    '      .card { background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 14px; }',
    '      .badge-ok { background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 999px; font-weight: 600; font-size: 12px; }',
    '      .badge-warn { background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 999px; font-weight: 600; font-size: 12px; }',
    '      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }',
    '      th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }',
    '      th { background: #f1f5f9; font-weight: 600; }',
    '    </style>',
    '    <div class="card">',
    '      <h3 style="margin-top:0">📍 Kết quả Kiểm tra Vị trí Tuyến đường [${expectedCode}]</h3>',
    '      <p><b>Tuyến đường kiểm tra:</b> ${expectedName} (${expectedType}) — <span class="${minDistance <= maxDistMeters && hasNameMatch ? "badge-ok" : "badge-warn"}">Độ lệch vị trí: ${minDistance} mét</span></p>',
    '      <table>',
    '        <tr><th>Tiêu chí</th><th>Dữ liệu gốc (OSM Hà Nội)</th><th>Kết quả DEV trả về (Geocode V2)</th></tr>',
    '        <tr><td><b>Tên đường</b></td><td>${expectedName}</td><td><b>${actualRoadName}</b></td></tr>',
    '        <tr><td><b>Vĩ độ (Latitude)</b></td><td>${expectedLat}</td><td>${actualLat}</td></tr>',
    '        <tr><td><b>Kinh độ (Longitude)</b></td><td>${expectedLon}</td><td>${actualLon}</td></tr>',
    '        <tr><td><b>Địa chỉ đầy đủ / Phường Xã</b></td><td>Thành phố Hà Nội</td><td>${actualAddress} (${bestMatch.wardName || ""})</td></tr>',
    '        <tr><td><b>Road ID / Score</b></td><td>${expectedCode}</td><td>ID: ${bestMatch.roadId || bestMatch.id} | Score: ${bestMatch.score}</td></tr>',
    '      </table>',
    '    </div>',
    '  `;',
    '  pm.visualizer.set(template);',
    '}',
  ];
  return lines;
}

function makeGeocodeRequestItem(road) {
  return {
    name: `[${road.maTuyen}] ${road.tenTuyen} (${road.loaiDuong} - ${road.chieuDai}m)`,
    request: {
      method: 'POST',
      header: [
        { key: 'Accept', value: 'application/json', type: 'text' },
        { key: 'Content-Type', value: 'application/json', type: 'text' },
      ],
      body: {
        mode: 'raw',
        raw: JSON.stringify(
          {
            address: road.tenTuyen,
            latitude: road.latitude,
            longitude: road.longitude,
            limit: 10,
            minScore: 5,
          },
          null,
          2
        ),
        options: {
          raw: { language: 'json' },
        },
      },
      url: {
        raw: '{{baseUrl}}/api/v1.0/elasticsearch/public/search-suggest/geocodev2',
        host: ['{{baseUrl}}'],
        path: ['api', 'v1.0', 'elasticsearch', 'public', 'search-suggest', 'geocodev2'],
      },
      description: `Kiểm tra vị trí tuyến đường **${road.tenTuyen}** (Mã: \`${road.maTuyen}\`, Loại: ${road.loaiDuong}, Chiều dài: ${road.chieuDai}m, OSM ID: \`${road.osmIds}\`).\nTọa độ trọng tâm WGS84: \`lat=${road.latitude}, lon=${road.longitude}\`.`,
    },
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: buildGeocodeTestScript(road),
        },
      },
    ],
  };
}

// 4. Phân nhóm các tuyến đường
const groupTrucCaoToc = roads.filter(r =>
  r.loaiDuong.includes('Đường trục') || r.loaiDuong.includes('Cao tốc') || r.loaiDuong.includes('cao tốc')
);
const groupChinh = roads.filter(
  r => !groupTrucCaoToc.includes(r) && r.loaiDuong.includes('Đường chính')
);
const groupThuCap = roads.filter(
  r => !groupTrucCaoToc.includes(r) && !groupChinh.includes(r) && r.loaiDuong.includes('thứ cấp')
);
const groupKhuVuc = roads.filter(
  r =>
    !groupTrucCaoToc.includes(r) &&
    !groupChinh.includes(r) &&
    !groupThuCap.includes(r) &&
    r.loaiDuong.includes('khu vực')
);
const groupDanCuSample = roads
  .filter(r => r.loaiDuong === 'Đường dân cư' || r.loaiDuong.includes('Phố đi bộ'))
  .slice(0, 120);
const groupNoiBoSample = roads
  .filter(r => r.loaiDuong === 'Đường dịch vụ/đường nội bộ')
  .slice(0, 120);

// 5. Folder 00: Chạy hàng loạt chỉ bằng 1 nút SEND (Không cần Postman Runner trả phí!)
const folderOneClickBatch = {
  name: '00. ⚡ BẤM "SEND" CHẠY HÀNG LOẠT (Miễn phí 100% - Không cần Runner)',
  description:
    'Bạn **KHÔNG cần dùng Collection Runner trả phí của Postman**. Chỉ cần chọn bất kỳ Request nào trong Folder 00 này rồi bấm nút **Send** màu xanh: Script sẽ tự động gọi kiểm tra hàng loạt 50 tuyến đường cùng lúc, chấm điểm từng tuyến ở tab **Test Results** và vẽ bảng tổng hợp ở tab **Visualize**!',
  item: [
    buildBatchSendRequestItem(
      '⚡ [BẤM SEND] Đợt 1: Kiểm tra 50 Tuyến Đường Trục, Cao tốc & Cầu Lớn',
      'Chỉ cần bấm nút **Send**! Postman sẽ tự động kiểm tra 50 tuyến Đường trục, Cao tốc & Cầu lớn tại Hà Nội và hiển thị bảng kết quả ở tab **Test Results** và **Visualize**.',
      groupTrucCaoToc.slice(0, 50)
    ),
    buildBatchSendRequestItem(
      '⚡ [BẤM SEND] Đợt 2: Kiểm tra 50 Tuyến Đường Trục & Đường Chính (Tiếp theo)',
      'Chỉ cần bấm nút **Send**! Kiểm tra tiếp 50 tuyến Đường trục & Đường chính tại Hà Nội.',
      [...groupTrucCaoToc.slice(50, 100)]
    ),
    buildBatchSendRequestItem(
      '⚡ [BẤM SEND] Đợt 3: Kiểm tra 50 Tuyến Đường Chính Nội Thành Hà Nội',
      'Chỉ cần bấm nút **Send**! Kiểm tra 50 tuyến Đường chính nội thành Hà Nội.',
      groupChinh.slice(0, 50)
    ),
    buildBatchSendRequestItem(
      '⚡ [BẤM SEND] Đợt 4: Kiểm tra 50 Tuyến Đường Thứ Cấp Hà Nội',
      'Chỉ cần bấm nút **Send**! Kiểm tra 50 tuyến Đường thứ cấp tại Hà Nội.',
      groupThuCap.slice(0, 50)
    ),
    buildBatchSendRequestItem(
      '⚡ [BẤM SEND] Đợt 5: Kiểm tra 50 Tuyến Đường Khu Vực Hà Nội',
      'Chỉ cần bấm nút **Send**! Kiểm tra 50 tuyến Đường khu vực tại Hà Nội.',
      groupKhuVuc.slice(0, 50)
    ),
    buildBatchSendRequestItem(
      '⚡ [BẤM SEND] Đợt 6: Kiểm tra 50 Tuyến Đường Dân Cư & Phố Nội Thành',
      'Chỉ cần bấm nút **Send**! Kiểm tra 50 tuyến Đường dân cư & Phố nội thành Hà Nội.',
      groupDanCuSample.slice(0, 50)
    ),
    buildBatchSendRequestItem(
      '⚡ [BẤM SEND] Đợt 7: Kiểm tra 50 Tuyến Ngõ, Ngách, Hẻm & Đường Nội Bộ',
      'Chỉ cần bấm nút **Send**! Kiểm tra 50 tuyến Ngõ, Ngách, Hẻm & Đường nội bộ tại Hà Nội.',
      groupNoiBoSample.slice(0, 50)
    ),
  ],
};

const geocodeCollection = {
  info: {
    _postman_id: 'a3d63f64-97c8-4a5a-8a34-3b4f2fcd8e71',
    name: 'LandBase - Kiểm thử Vị trí Tuyến đường Hà Nội (Geocode V2 - MT Dev)',
    description:
      'Bộ Postman Collection kiểm tra vị trí hiển thị của các tuyến đường Hà Nội có tọa độ trên môi trường DEV (`https://dev-gateway.laand.vn`).\n\n### Cách sử dụng miễn phí 100% (Không cần Postman Runner trả phí):\n1. **Chạy hàng loạt 50 tuyến đường chỉ với 1 nút `Send`**: Mở Folder `00. ⚡ BẤM "SEND" CHẠY HÀNG LOẠT`, chọn bất kỳ Đợt nào (Đợt 1 -> Đợt 7) và bấm nút **Send** màu xanh (góc trên bên phải). Chờ ~3 giây, mở tab **Test Results** (xem kết quả 50/50 tuyến) và tab **Visualize** (xem bảng báo cáo tổng hợp).\n2. **Test lẻ từng tuyến đường**: Mở các Folder `01` -> `06` và bấm **Send** ở tuyến đường bất kỳ.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'https://dev-gateway.laand.vn', type: 'string' },
    { key: 'webappUrl', value: 'https://dev-webapp.laand.vn', type: 'string' },
    { key: 'maTuyen', value: 'OSM-00023', type: 'string' },
    { key: 'tenTuyen', value: 'Bắc Linh Đàm', type: 'string' },
    { key: 'latitude', value: '20.9707252', type: 'string' },
    { key: 'longitude', value: '105.8289271', type: 'string' },
    { key: 'loaiDuong', value: 'Đường dân cư', type: 'string' },
    { key: 'maxDistanceMeters', value: '1000', type: 'string' },
  ],
  item: [
    folderOneClickBatch,
    {
      name: `01. 🛣️ Đường trục & Cao tốc (${groupTrucCaoToc.length} tuyến)`,
      description: 'Toàn bộ các tuyến Đường trục, Nhánh đường trục, Cao tốc, Nhánh cao tốc tại Hà Nội.',
      item: groupTrucCaoToc.map(makeGeocodeRequestItem),
    },
    {
      name: `02. 🚗 Đường chính (${groupChinh.length} tuyến)`,
      description: 'Toàn bộ các tuyến Đường chính và Nhánh đường chính tại Hà Nội.',
      item: groupChinh.map(makeGeocodeRequestItem),
    },
    {
      name: `03. 🚙 Đường thứ cấp (${groupThuCap.length} tuyến)`,
      description: 'Toàn bộ các tuyến Đường thứ cấp và Nhánh đường thứ cấp tại Hà Nội.',
      item: groupThuCap.map(makeGeocodeRequestItem),
    },
    {
      name: `04. 🏘️ Đường khu vực (${groupKhuVuc.length} tuyến)`,
      description: 'Toàn bộ các tuyến Đường khu vực tại Hà Nội.',
      item: groupKhuVuc.map(makeGeocodeRequestItem),
    },
    {
      name: `05. 🏠 Đường dân cư & Phố đi bộ tiêu biểu (${groupDanCuSample.length} tuyến)`,
      description: '120 tuyến Đường dân cư và Phố đi bộ tiêu biểu tại Hà Nội.',
      item: groupDanCuSample.map(makeGeocodeRequestItem),
    },
    {
      name: `06. 🛤️ Ngõ, Ngách, Hẻm & Đường nội bộ tiêu biểu (${groupNoiBoSample.length} tuyến)`,
      description: '120 tuyến Đường dịch vụ / đường nội bộ / ngõ ngách tiêu biểu tại Hà Nội.',
      item: groupNoiBoSample.map(makeGeocodeRequestItem),
    },
  ],
};

const collDownloadsPath = path.join(downloadsDir, 'MT_Dev_GeocodeV2.postman_collection.json');
const collProjectPath = path.join(projectDir, 'MT_Dev_GeocodeV2.postman_collection.json');
fs.writeFileSync(collDownloadsPath, JSON.stringify(geocodeCollection, null, 2), 'utf8');
fs.writeFileSync(collProjectPath, JSON.stringify(geocodeCollection, null, 2), 'utf8');

console.log('✅ Đã cập nhật Folder 00 (Bấm Send chạy hàng loạt miễn phí) vào:', collDownloadsPath);
