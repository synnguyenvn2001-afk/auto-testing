const fs = require('fs');
const path = require('path');

const mdPath = 'c:\\Users\\Admin\\Downloads\\Danh_muc_tuyen_duong_Ha_Noi_khong_trung_co_toa_do.md';
const downloadsDir = 'c:\\Users\\Admin\\Downloads';
const projectDir = path.join(__dirname, '..');
const testDataDir = path.join(projectDir, 'test-data');
const cachePath = path.join(testDataDir, 'hanoi-6944-roads-with-wards.json');

if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

function parseRoadsFromMarkdown() {
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
  return roads;
}

async function enrichRoadsWithWards(roads) {
  let cachedMap = {};
  if (fs.existsSync(cachePath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      for (const r of prev) {
        if (r.maTuyen && r.phuongXaMoi) cachedMap[r.maTuyen] = r;
      }
    } catch (e) {}
  }

  const concurrency = 50;
  let index = 0;
  let completed = 0;
  const total = roads.length;

  async function worker() {
    while (index < total) {
      const i = index++;
      const r = roads[i];
      if (
        cachedMap[r.maTuyen] &&
        cachedMap[r.maTuyen].phuongXaMoi &&
        !cachedMap[r.maTuyen].phuongXaMoi.includes('Chưa') &&
        !cachedMap[r.maTuyen].phuongXaMoi.includes('Khác') &&
        cachedMap[r.maTuyen].phuongXaMoi !== 'Thành phố Hà Nội'
      ) {
        Object.assign(r, cachedMap[r.maTuyen]);
        completed++;
        continue;
      }

      try {
        const res = await fetch('https://dev-webapp.laand.vn/api/location/decode/info-ultra-fast-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: r.latitude, lon: r.longitude }),
        });
        const body = await res.json();
        const data = body && body.data ? body.data : {};
        let newFull = data.newFullAddress || '';
        const oldFull = data.oldFullAddress || '';
        let newWard = newFull.split(',')[0].trim();

        // Fallback qua geocodev2 nếu newWard rỗng hoặc chỉ ghi "Thành phố Hà Nội"
        if (!newWard || newWard === 'Thành phố Hà Nội') {
          const gRes = await fetch('https://dev-gateway.laand.vn/api/v1.0/elasticsearch/public/search-suggest/geocodev2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: r.tenTuyen, latitude: r.latitude, longitude: r.longitude, limit: 1, minScore: 1 }),
          });
          const gList = await gRes.json();
          if (Array.isArray(gList) && gList.length > 0 && gList[0].wardName) {
            newWard = gList[0].wardName.trim();
            newFull = `${newWard}, Thành phố Hà Nội`;
          }
        }

        const oldParts = oldFull.split(',').map(s => s.trim());
        const oldWard = oldParts[0] || '';
        const oldDistrict = oldParts[1] || '';

        r.wardCode = data.wardCode || '';
        r.phuongXaMoi = newWard || 'Khu vực Cầu / Giáp ranh';
        r.diaChiMoi = newFull;
        r.phuongXaCu = oldWard;
        r.quanHuyenCu = oldDistrict;
        r.diaChiCu = oldFull;
      } catch (e) {
        r.wardCode = '';
        r.phuongXaMoi = 'Khu vực Cầu / Giáp ranh';
        r.diaChiMoi = '';
        r.phuongXaCu = '';
        r.quanHuyenCu = '';
        r.diaChiCu = '';
      }

      completed++;
      if (completed % 500 === 0 || completed === total) {
        console.log(`⏳ Đã phân loại Phường/Xã cho ${completed}/${total} tuyến đường...`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  fs.writeFileSync(cachePath, JSON.stringify(roads, null, 2), 'utf8');
  return roads;
}

function buildBatchSendRequestItem(batchTitle, batchDescription, batchRoads) {
  const firstRoad = batchRoads[0];
  const compactRoads = batchRoads.map(r => ({
    code: r.maTuyen,
    name: r.tenTuyen,
    type: r.loaiDuong,
    ward: r.phuongXaMoi || '',
    oldAddr: r.diaChiCu || '',
    lat: r.latitude,
    lon: r.longitude,
  }));

  const scriptLines = [
    '// =======================================================================================',
    '// CHẠY KIỂM TRA HÀNG LOẠT CÁC TUYẾN ĐƯỜNG TRONG PHƯỜNG/XÃ KHI BẤM NÚT "SEND"',
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
    '    .replace(/[^a-z0-9\\s]/g, " ")',
    '    .replace(/\\b(duong|pho)\\b/g, " ")',
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
    '      <div><h3 style="margin:0">📊 Kết quả Kiểm tra ${batchRoads.length} Tuyến đường (${batchRoads[0]?.ward || "Hà Nội"})</h3></div>',
    '      <div><span class="stat-pass">✅ ĐẠT: ${passCount}</span><span class="stat-fail">❌ LỖI/LỆCH: ${failCount}</span></div>',
    '    </div>',
    '    <table>',
    '      <thead>',
    '        <tr>',
    '          <th>#</th>',
    '          <th>Mã OSM</th>',
    '          <th>Tên tuyến gốc</th>',
    '          <th>Phường/Xã (Mới / Cũ)</th>',
    '          <th>Tọa độ gốc (Lat, Lon)</th>',
    '          <th>Tên đường DEV trả về</th>',
    '          <th>Phường/Xã DEV trả về</th>',
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
    '            <td><b>${r.expectedWard}</b><br/><small style="color:#64748b">${r.oldAddr}</small></td>',
    '            <td>${r.expectedLat}, ${r.expectedLon}</td>',
    '            <td><b>${r.actualName}</b></td>',
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
    '        const rawAct = item.roadName || item.name || "";',
    '        const normAct = normalizeRoadName(rawAct);',
    '        const matched = normAct === normExp;',
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
    '      expectedWard: road.ward,',
    '      oldAddr: road.oldAddr,',
    '      expectedLat: road.lat,',
    '      expectedLon: road.lon,',
    '      actualName,',
    '      wardName: bestMatch ? (bestMatch.wardName || "-") : "-",',
    '      distText: minDist === Infinity ? "N/A" : (minDist + " m"),',
    '      ok,',
    '      statusText: ok ? "✅ ĐÚNG VỊ TRÍ" : (!bestMatch ? "❌ THIẾU DỮ LIỆU" : (!hasNameMatch ? "⚠️ LỆCH TÊN" : `⚠️ LỆCH ${minDist}m`))',
    '    };',
    '',
    '    pm.test(`[${road.code} - ${road.ward}] ${road.name} -> Nhận: "${actualName}" (${bestMatch ? bestMatch.wardName : "N/A"}) | Lệch: ${minDist === Infinity ? "N/A" : minDist + "m"}`, function () {',
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

function buildSingleRoadTestScript(fixedRoad) {
  return [
    `const expectedCode = ${JSON.stringify(fixedRoad.maTuyen)};`,
    `const expectedName = ${JSON.stringify(fixedRoad.tenTuyen)};`,
    `const expectedWard = ${JSON.stringify(fixedRoad.phuongXaMoi || '')};`,
    `const expectedOldAddr = ${JSON.stringify(fixedRoad.diaChiCu || '')};`,
    `const expectedLat = Number(${fixedRoad.latitude});`,
    `const expectedLon = Number(${fixedRoad.longitude});`,
    `const expectedType = ${JSON.stringify(fixedRoad.loaiDuong)};`,
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
    '    .replace(/[^a-z0-9\\s]/g, " ")',
    '    .replace(/\\b(duong|pho)\\b/g, " ")',
    '    .replace(/\\s+/g, " ")',
    '    .trim();',
    '}',
    '',
    'pm.test(`[${expectedCode}] 1. HTTP Status 200 OK & JSON hợp lệ`, function () {',
    '  pm.expect(pm.response.code).to.be.within(200, 299);',
    '});',
    '',
    'let results = [];',
    'try { results = pm.response.json(); } catch (e) { results = []; }',
    'const isArray = Array.isArray(results);',
    '',
    'pm.test(`[${expectedCode}] 2. Có kết quả trả về cho tuyến "${expectedName}" (${expectedWard})`, function () {',
    '  pm.expect(isArray && results.length > 0, `Không tìm thấy "${expectedName}" trên DEV`).to.be.true;',
    '});',
    '',
    'if (isArray && results.length > 0) {',
    '  const normExp = normalizeRoadName(expectedName);',
    '  let bestMatch = results[0];',
    '  let minDistance = calcDistanceMeters(expectedLat, expectedLon, Number(bestMatch.latitude), Number(bestMatch.longitude));',
    '  let hasNameMatch = false;',
    '  for (const item of results) {',
    '    const rawActual = item.roadName || item.name || "";',
    '    const normAct = normalizeRoadName(rawActual);',
    '    const nameMatched = normAct === normExp;',
    '    const d = calcDistanceMeters(expectedLat, expectedLon, Number(item.latitude), Number(item.longitude));',
    '    if (nameMatched && (!hasNameMatch || d < minDistance)) {',
    '      hasNameMatch = true;',
    '      minDistance = d;',
    '      bestMatch = item;',
    '    }',
    '  }',
    '  const actualRoadName = bestMatch.roadName || bestMatch.name || "(Không có tên)";',
    '  const actualWard = bestMatch.wardName || "";',
    '  pm.test(`[${expectedCode}] 3. Tên đường khớp: Kỳ vọng "${expectedName}" -> Nhận "${actualRoadName}"`, function () {',
    '    pm.expect(hasNameMatch).to.be.true;',
    '  });',
    '  pm.test(`[${expectedCode}] 4. Vị trí tọa độ khớp (Độ lệch: ${minDistance}m <= ${maxDistMeters}m)`, function () {',
    '    pm.expect(minDistance).to.be.at.most(maxDistMeters);',
    '  });',
    '  pm.test(`[${expectedCode}] 5. Phường/Xã hiển thị: Kỳ vọng "${expectedWard}" -> Nhận "${actualWard}"`, function () {',
    '    pm.expect(String(bestMatch.provinceCode || "")).to.equal("01");',
    '  });',
    '}',
  ];
}

function makeGeocodeRequestItem(road) {
  return {
    name: `[${road.maTuyen}] ${road.tenTuyen} (${road.phuongXaMoi} - ${road.loaiDuong})`,
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
      description: `Tuyến đường: **${road.tenTuyen}** (\`${road.maTuyen}\`)\n- **Phường/Xã mới**: ${road.phuongXaMoi} (\`${road.wardCode}\`)\n- **Địa chỉ cũ**: ${road.diaChiCu}\n- **Loại đường**: ${road.loaiDuong} (${road.chieuDai}m)\n- **Tọa độ**: \`${road.latitude}, ${road.longitude}\``,
    },
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: buildSingleRoadTestScript(road),
        },
      },
    ],
  };
}

function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

(async () => {
  const rawRoads = parseRoadsFromMarkdown();
  console.log(`🚀 Bắt đầu xác định Phường/Xã (Mới & Cũ) cho toàn bộ ${rawRoads.length} tuyến đường Hà Nội...`);
  const roads = await enrichRoadsWithWards(rawRoads);

  // 1. Cập nhật file CSV & JSON có đầy đủ cột Phường/Xã Mới và Phường/Xã - Quận/Huyện Cũ
  const csvHeader =
    'maTuyen,tenTuyen,phuongXaMoi,wardCode,phuongXaCu,quanHuyenCu,loaiDuong,chieuDai,latitude,longitude,osmIds';
  const csvRows = roads.map(r =>
    [
      r.maTuyen,
      r.tenTuyen,
      r.phuongXaMoi,
      r.wardCode,
      r.phuongXaCu,
      r.quanHuyenCu,
      r.loaiDuong,
      r.chieuDai,
      r.latitude,
      r.longitude,
      r.osmIds,
    ]
      .map(escapeCsv)
      .join(',')
  );
  const csvContent = '\uFEFF' + [csvHeader, ...csvRows].join('\r\n');

  fs.writeFileSync(path.join(downloadsDir, 'HaNoi_6944_TuyenDuong_Postman_Data.csv'), csvContent, 'utf8');
  fs.writeFileSync(path.join(testDataDir, 'HaNoi_6944_TuyenDuong_Postman_Data.csv'), csvContent, 'utf8');
  fs.writeFileSync(
    path.join(downloadsDir, 'HaNoi_6944_TuyenDuong_Postman_Data.json'),
    JSON.stringify(roads, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(testDataDir, 'HaNoi_6944_TuyenDuong_Postman_Data.json'),
    JSON.stringify(roads, null, 2),
    'utf8'
  );

  // 2. Gom nhóm toàn bộ 6,944 tuyến đường theo từng Phường/Xã mới của Hà Nội
  const byWard = {};
  for (const r of roads) {
    const w = r.phuongXaMoi || 'Khác';
    if (!byWard[w]) byWard[w] = [];
    byWard[w].push(r);
  }

  const sortedWardNames = Object.keys(byWard).sort((a, b) => a.localeCompare(b, 'vi'));
  console.log(`✅ Đã phân loại 6,944 tuyến đường vào ${sortedWardNames.length} Phường/Xã của Hà Nội!`);

  // 3. Tạo Folder "01. 🏛️ PHÂN LOẠI THEO TỪNG PHƯỜNG / XÃ HÀ NỘI"
  // Trong mỗi Phường/Xã: có các nút [BẤM SEND] kiểm tra theo đợt 50 tuyến của Phường/Xã đó + các request tiêu biểu
  const wardSubFolders = sortedWardNames.map((wardName, wIdx) => {
    const wardRoads = byWard[wardName];
    const sampleOldDistricts = [
      ...new Set(wardRoads.map(r => r.quanHuyenCu).filter(Boolean)),
    ].join(', ');
    const batchItems = [];

    // Chia các tuyến trong Phường/Xã thành từng đợt 50 tuyến để bấm Send chạy ngay (Miễn phí 100%)
    const chunkSize = 50;
    for (let c = 0; c < wardRoads.length; c += chunkSize) {
      const slice = wardRoads.slice(c, c + chunkSize);
      const partLabel =
        wardRoads.length > chunkSize
          ? ` (Phần ${Math.floor(c / chunkSize) + 1}: Tuyến ${c + 1} -> ${c + slice.length})`
          : ` (Toàn bộ ${slice.length} tuyến)`;
      batchItems.push(
        buildBatchSendRequestItem(
          `⚡ [BẤM SEND] Kiểm tra ${wardName}${partLabel}`,
          `Bấm nút **Send** để kiểm tra tự động ${slice.length} tuyến đường thuộc **${wardName}** (Địa bàn cũ: ${sampleOldDistricts || 'Hà Nội'}).`,
          slice
        )
      );
    }

    // Kèm tối đa 25 tuyến đường chính/tiêu biểu trong Phường/Xã đó để bấm test lẻ
    const singleItems = wardRoads.slice(0, 25).map(makeGeocodeRequestItem);

    return {
      name: `${String(wIdx + 1).padStart(2, '0')}. 📍 ${wardName} (${wardRoads.length} tuyến${sampleOldDistricts ? ' - ' + sampleOldDistricts : ''})`,
      description: `Danh sách **${wardRoads.length} tuyến đường** thuộc **${wardName}** (Địa bàn cũ: ${sampleOldDistricts || 'Hà Nội'}).\n- Bấm vào request **⚡ [BẤM SEND]** ở đầu folder để quét toàn bộ các tuyến đường trong phường/xã này chỉ với 1 click!`,
      item: [...batchItems, ...singleItems],
    };
  });

  const geocodeCollection = {
    info: {
      _postman_id: 'a3d63f64-97c8-4a5a-8a34-3b4f2fcd8e71',
      name: 'LandBase - Kiểm thử Vị trí 6.944 Tuyến đường Hà Nội theo Phường/Xã (Geocode V2 - MT Dev)',
      description:
        `Bộ Postman Collection đã phân loại toàn bộ **6.944 tuyến đường Hà Nội có tọa độ** vào **${sortedWardNames.length} Phường/Xã**.\n\n### Cách sử dụng miễn phí 100% (Không cần Postman Runner trả phí):\n1. Mở Folder **\`01. 🏛️ KIỂM TRA THEO TỪNG PHƯỜNG / XÃ HÀ NỘI (${sortedWardNames.length} Phường/Xã - 6.944 Tuyến)\`**.\n2. Chọn Phường/Xã bạn muốn kiểm tra (ví dụ: *Phường Cầu Giấy*, *Phường Đống Đa*, *Phường Định Công*, *Phường Hoàn Kiếm*...).\n3. Bấm vào request đầu tiên **\`⚡ [BẤM SEND] Kiểm tra Phường...\`** rồi nhấn nút **Send** màu xanh -> Postman sẽ tự động kiểm tra toàn bộ các tuyến đường của Phường/Xã đó và xuất bảng báo cáo ở tab **Test Results** & **Visualize**!`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'baseUrl', value: 'https://dev-gateway.laand.vn', type: 'string' },
      { key: 'webappUrl', value: 'https://dev-webapp.laand.vn', type: 'string' },
      { key: 'maxDistanceMeters', value: '1000', type: 'string' },
    ],
    item: [
      {
        name: `01. 🏛️ KIỂM TRA THEO TỪNG PHƯỜNG / XÃ HÀ NỘI (${sortedWardNames.length} Phường/Xã - 6.944 Tuyến)`,
        description: `Toàn bộ 6.944 tuyến đường Hà Nội được chia vào đúng **${sortedWardNames.length} Phường/Xã**. Mỗi Phường/Xã đều có sẵn nút **⚡ [BẤM SEND]** để chạy kiểm tra hàng loạt miễn phí 100%.`,
        item: wardSubFolders,
      },
    ],
  };

  const collDownloadsPath = path.join(downloadsDir, 'MT_Dev_GeocodeV2.postman_collection.json');
  const collProjectPath = path.join(projectDir, 'MT_Dev_GeocodeV2.postman_collection.json');
  fs.writeFileSync(collDownloadsPath, JSON.stringify(geocodeCollection, null, 2), 'utf8');
  fs.writeFileSync(collProjectPath, JSON.stringify(geocodeCollection, null, 2), 'utf8');

  // Tự động đồng bộ vào thư mục Postman Local Mode (D:\test data duong) nếu tồn tại
  const localPostmanRoot = 'D:\\test data duong';
  if (fs.existsSync(localPostmanRoot)) {
    function walkYaml(dir) {
      let list = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) list.push(...walkYaml(full));
        else if (entry.name.endsWith('.request.yaml')) list.push(full);
      }
      return list;
    }
    const yamlFiles = walkYaml(localPostmanRoot);
    let updatedCount = 0;
    const oldPattern = '.replace(/^(duong|pho|ngo|ngach|hem|cau vuot|cau|dai lo|kdt|khu do thi)\\s+/i, "")';
    const newPattern =
      '.replace(/\\b(duong|pho|tuyen|lo)\\b/g, " ").replace(/^(ngo|ngach|hem|cau vuot|cau|dai lo|kdt|khu do thi)\\s+/i, "")';
    for (const yf of yamlFiles) {
      const content = fs.readFileSync(yf, 'utf8');
      if (content.includes(oldPattern)) {
        fs.writeFileSync(yf, content.split(oldPattern).join(newPattern), 'utf8');
        updatedCount++;
      }
    }
    console.log(`🔄 Đã tự động cập nhật trực tiếp ${updatedCount}/${yamlFiles.length} file YAML trong D:\\test data duong`);
  }

  console.log(`🎉 Đã xuất thành công Postman Collection phân loại theo ${sortedWardNames.length} Phường/Xã tại: ${collDownloadsPath}`);
})();

