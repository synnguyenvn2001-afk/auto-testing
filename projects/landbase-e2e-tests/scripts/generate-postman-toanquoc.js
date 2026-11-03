const fs = require('fs');
const path = require('path');

const csvPath = 'c:\\Users\\Admin\\Downloads\\Danh_muc_ten_duong_toan_quoc\\Danh_muc_ten_duong_toan_quoc.csv';
const downloadsDir = 'c:\\Users\\Admin\\Downloads';
const toanQuocDir = 'c:\\Users\\Admin\\Downloads\\Danh_muc_ten_duong_toan_quoc';
const perProvinceDir = path.join(toanQuocDir, 'Postman_63_Tinh_Thanh');
const projectDir = path.join(__dirname, '..');
const testDataDir = path.join(projectDir, 'test-data');
const cachePath = path.join(testDataDir, 'toanquoc-ward-coords-cache.json');

if (!fs.existsSync(testDataDir)) fs.mkdirSync(testDataDir, { recursive: true });
if (!fs.existsSync(perProvinceDir)) fs.mkdirSync(perProvinceDir, { recursive: true });

function parseCsvLine(line) {
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      res.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res;
}

function slugifyFileName(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Script độc lập gắn trực tiếp vào từng request [BẤM SEND]:
// - Kiểm tra đồng bộ ngay tuyến đầu tiên từ pm.response.json() (đảm bảo Runner luôn nhận diện test ngay lập tức)
// - Quét song song các tuyến còn lại trong Phường/Xã qua pm.sendRequest()
function buildBatchTestScript(meta, compactPairs) {
  return [
    `const meta = ${JSON.stringify(meta)};`,
    `const compactRoads = ${JSON.stringify(compactPairs)};`,
    'const baseUrl = pm.environment.get("baseUrl") || pm.collectionVariables.get("baseUrl") || "https://dev-gateway.laand.vn";',
    'function norm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9\\s]/g," ").replace(/\\b(duong|pho)\\b/g," ").replace(/\\s+/g," ").trim();}',
    'const rows = new Array(compactRoads.length);',
    'let done = 0, pass = 0, fail = 0;',
    'function evalRoad(idx, code, name, list) {',
    '  done++;',
    '  const normExp = norm(name);',
    '  let best = Array.isArray(list) && list.length > 0 ? list[0] : null;',
    '  let nameOk = false, provOk = false;',
    '  if (Array.isArray(list)) {',
    '    for (let k = 0; k < list.length; k++) {',
    '      const it = list[k];',
    '      const nOk = norm(it.roadName || it.name || "") === normExp;',
    '      const pOk = (it.provinceName || "") === meta.newProv || (it.provinceName || "") === meta.state;',
    '      if (nOk && pOk) { nameOk = true; provOk = true; best = it; break; }',
    '      else if (nOk && !nameOk) { nameOk = true; best = it; }',
    '    }',
    '  }',
    '  const actName = best ? (best.roadName || best.name || "(Không rõ)") : "❌ Không tìm thấy";',
    '  const actWard = best ? (best.wardName || "-") : "-";',
    '  const actProv = best ? (best.provinceName || "-") : "-";',
    '  const ok = Boolean(best && nameOk && provOk);',
    '  if (ok) pass++; else fail++;',
    '  rows[idx] = { code, name, actName, actWard, actProv, coords: best && best.latitude ? (best.latitude + ", " + best.longitude) : "N/A", ok, st: ok ? "✅ KHỚP ĐÚNG" : (!best ? "❌ THIẾU DỮ LIỆU" : (!nameOk ? "⚠️ LỆCH TÊN" : "⚠️ KHÁC TỈNH")) };',
    '  pm.test("[" + code + " - " + meta.ward + ", " + meta.state + "] " + name + " -> Nhận: \\"" + actName + "\\" (" + actWard + ", " + actProv + ")", function () {',
    '    pm.expect(best, "Không tìm thấy đường \\"" + name + "\\" trên DEV").to.not.be.null;',
    '    pm.expect(nameOk, "Tên trả về \\"" + actName + "\\" không khớp \\"" + name + "\\"").to.be.true;',
    '    pm.expect(provOk, "Tỉnh trả về \\"" + actProv + "\\" không thuộc \\"" + meta.newProv + "\\"").to.be.true;',
    '  });',
    '  if (done === compactRoads.length) {',
    '    pm.visualizer.set(`<style>body{font-family:Segoe UI,sans-serif;padding:12px;background:#f8fafc;color:#0f172a}.hd{background:#fff;padding:12px 16px;border-radius:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}table{width:100%;border-collapse:collapse;background:#fff;font-size:12px}th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}th{background:#0f172a;color:#fff}.f{background:#fef2f2}.ok{color:#15803d;font-weight:700}.er{color:#b91c1c;font-weight:700}</style><div class="hd"><h3 style="margin:0">📊 Kết quả ${compactRoads.length} Tuyến (${meta.ward} - ${meta.dist} - ${meta.state})</h3><div><b style="color:#166534;margin-right:12px">✅ ĐẠT: ${pass}</b><b style="color:#991b1b">❌ LỖI: ${fail}</b></div></div><table><thead><tr><th>#</th><th>Mã</th><th>Tên đường gốc</th><th>Phường/Xã - Quận/Huyện</th><th>Tên đường DEV</th><th>Phường/Xã - Tỉnh DEV</th><th>Tọa độ DEV</th><th>Kết quả</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${r.ok?"":"f"}"><td>${i+1}</td><td><b>${r.code}</b></td><td>${r.name}</td><td>${meta.ward} (${meta.dist})</td><td><b>${r.actName}</b></td><td>${r.actWard}, ${r.actProv}</td><td>${r.coords}</td><td class="${r.ok?"ok":"er"}">${r.st}</td></tr>`).join("")}</tbody></table>`);',
    '  }',
    '}',
    'let firstList = []; try { firstList = pm.response.json(); } catch (e) { firstList = []; }',
    'evalRoad(0, compactRoads[0][0], compactRoads[0][1], firstList);',
    'for (let i = 1; i < compactRoads.length; i++) {',
    '  (function(idx) {',
    '    const code = compactRoads[idx][0], name = compactRoads[idx][1];',
    '    pm.sendRequest({',
    '      url: baseUrl + "/api/v1.0/elasticsearch/public/search-suggest/geocodev2",',
    '      method: "POST",',
    '      header: { "Content-Type": "application/json", "Accept": "application/json" },',
    '      body: { mode: "raw", raw: JSON.stringify({ address: name, latitude: meta.lat, longitude: meta.lon, limit: 15, minScore: 1 }) }',
    '    }, function (err, res) {',
    '      let list = []; try { list = res ? res.json() : []; } catch (e) { list = []; }',
    '      evalRoad(idx, code, name, list);',
    '    });',
    '  })(i);',
    '}',
  ];
}

function buildSingleTestScript(road) {
  const info = {
    code: road.code,
    name: road.name,
    ward: road.ward,
    dist: road.dist,
    state: road.state,
    newProv: road.newProv,
  };
  return [
    `const road = ${JSON.stringify(info)};`,
    'function norm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9\\s]/g," ").replace(/\\b(duong|pho)\\b/g," ").replace(/\\s+/g," ").trim();}',
    'pm.test("[" + road.code + "] 1. HTTP Status 200 OK", function () { pm.expect(pm.response.code).to.be.within(200, 299); });',
    'let list = []; try { list = pm.response.json(); } catch (e) { list = []; }',
    'const normExp = norm(road.name);',
    'let best = Array.isArray(list) && list.length > 0 ? list[0] : null;',
    'let nameOk = false, provOk = false;',
    'if (Array.isArray(list)) {',
    '  for (let k = 0; k < list.length; k++) {',
    '    const it = list[k];',
    '    const nOk = norm(it.roadName || it.name || "") === normExp;',
    '    const pOk = (it.provinceName || "") === road.newProv || (it.provinceName || "") === road.state;',
    '    if (nOk && pOk) { nameOk = true; provOk = true; best = it; break; }',
    '    else if (nOk && !nameOk) { nameOk = true; best = it; }',
    '  }',
    '}',
    'const actName = best ? (best.roadName || best.name || "(Không rõ)") : "Không tìm thấy";',
    'const actWard = best ? (best.wardName || "-") : "-";',
    'const actProv = best ? (best.provinceName || "-") : "-";',
    'pm.test("[" + road.code + "] 2. Tên đường khớp: Kỳ vọng \\"" + road.name + "\\" -> Nhận \\"" + actName + "\\"", function () { pm.expect(nameOk).to.be.true; });',
    'pm.test("[" + road.code + "] 3. Tỉnh/TP khớp: Nhận \\"" + actWard + ", " + actProv + "\\" (Kỳ vọng: \\"" + road.ward + ", " + road.newProv + "\\")", function () { pm.expect(provOk).to.be.true; });',
  ];
}

function buildBatchItem(batchTitle, batchRoads) {
  const first = batchRoads[0];
  const meta = {
    ward: first.ward,
    dist: first.dist,
    state: first.state,
    newProv: first.newProv,
    lat: first.lat,
    lon: first.lon,
  };
  const compactPairs = batchRoads.map(r => [r.code, r.name]);

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
        raw: JSON.stringify({
          address: first.name,
          latitude: first.lat,
          longitude: first.lon,
          limit: 15,
          minScore: 1,
        }),
        options: { raw: { language: 'json' } },
      },
      url: '{{baseUrl}}/api/v1.0/elasticsearch/public/search-suggest/geocodev2',
    },
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: buildBatchTestScript(meta, compactPairs),
        },
      },
    ],
  };
}

function buildSingleItem(road) {
  return {
    name: `[${road.code}] ${road.name} (${road.ward} - ${road.dist})`,
    request: {
      method: 'POST',
      header: [
        { key: 'Accept', value: 'application/json', type: 'text' },
        { key: 'Content-Type', value: 'application/json', type: 'text' },
      ],
      body: {
        mode: 'raw',
        raw: JSON.stringify({
          address: road.name,
          latitude: road.lat,
          longitude: road.lon,
          limit: 15,
          minScore: 1,
        }),
        options: { raw: { language: 'json' } },
      },
      url: '{{baseUrl}}/api/v1.0/elasticsearch/public/search-suggest/geocodev2',
    },
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: buildSingleTestScript(road),
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

function main() {
  const wardCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);

  const allRoads = [];
  const byState = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = (cols[0] || '').trim();
    const type = (cols[2] || '').trim();
    const rawWard = (cols[3] || '').trim();
    const rawDist = (cols[4] || '').trim();
    const state = (cols[5] || '').trim() || 'Khác';
    const postal = (cols[6] || '').trim();
    const mergedCount = Number(cols[8] || 1);

    const wKey = `${rawWard}|${rawDist}|${state}`;
    const wInfo = wardCache[wKey] || { lat: 16.0544, lon: 108.2022, newWard: rawWard, newProv: state };

    const resolvedWard =
      rawWard ||
      (wInfo.newWard && !wInfo.newWard.includes('Chưa') ? wInfo.newWard : '') ||
      (rawDist ? `Tuyến thuộc ${rawDist}` : `Tuyến liên khu vực`);
    const resolvedDist = rawDist || state;

    const road = {
      code: `TQ-${String(i).padStart(5, '0')}`,
      name,
      type,
      ward: resolvedWard,
      dist: resolvedDist,
      state,
      newWard: wInfo.newWard || resolvedWard,
      newProv: wInfo.newProv || state,
      lat: wInfo.lat,
      lon: wInfo.lon,
      postal,
      mergedCount,
    };

    allRoads.push(road);
    if (!byState[state]) byState[state] = {};
    const wardGroupKey =
      resolvedWard.startsWith('Tuyến ') && rawDist
        ? `Tuyến chung thuộc ${rawDist}`
        : `${resolvedWard} (${resolvedDist})`;
    if (!byState[state][wardGroupKey]) byState[state][wardGroupKey] = [];
    byState[state][wardGroupKey].push(road);
  }

  console.log(`📦 Đã đọc ${allRoads.length} tuyến đường toàn quốc thuộc ${Object.keys(byState).length} Tỉnh/TP.`);

  const csvHeader = 'code,name,type,ward,district,state,newWard,newProvince,latitude,longitude,postalCode';
  const csvRows = allRoads.map(r =>
    [r.code, r.name, r.type, r.ward, r.dist, r.state, r.newWard, r.newProv, r.lat, r.lon, r.postal]
      .map(escapeCsv)
      .join(',')
  );
  const csvOut = '\uFEFF' + [csvHeader, ...csvRows].join('\r\n');
  fs.writeFileSync(path.join(toanQuocDir, 'ToanQuoc_77061_TuyenDuong_Postman_Data.csv'), csvOut, 'utf8');
  fs.writeFileSync(path.join(downloadsDir, 'ToanQuoc_77061_TuyenDuong_Postman_Data.csv'), csvOut, 'utf8');
  fs.writeFileSync(
    path.join(testDataDir, 'toanquoc-77061-roads-with-coords.json'),
    JSON.stringify(allRoads, null, 2),
    'utf8'
  );

  const sortedStates = Object.keys(byState).sort((a, b) => a.localeCompare(b, 'vi'));
  const masterStateFolders = [];

  sortedStates.forEach((stateName, sIdx) => {
    const wardGroups = byState[stateName];
    const sortedWards = Object.keys(wardGroups).sort((a, b) => {
      const aGen = a.startsWith('Tuyến ');
      const bGen = b.startsWith('Tuyến ');
      if (aGen !== bGen) return aGen ? 1 : -1;
      return a.localeCompare(b, 'vi');
    });
    let stateTotalRoads = 0;

    const masterWardFolders = [];
    const detailWardFolders = [];

    sortedWards.forEach((wardLabel, wIdx) => {
      const wRoads = wardGroups[wardLabel];
      stateTotalRoads += wRoads.length;

      const batchItems = [];
      const chunkSize = 50;
      for (let c = 0; c < wRoads.length; c += chunkSize) {
        const slice = wRoads.slice(c, c + chunkSize);
        const partText =
          wRoads.length > chunkSize
            ? ` (Phần ${Math.floor(c / chunkSize) + 1}: Tuyến ${c + 1} -> ${c + slice.length})`
            : ` (Toàn bộ ${slice.length} tuyến)`;
        batchItems.push(buildBatchItem(`⚡ [BẤM SEND] Kiểm tra ${wardLabel}${partText}`, slice));
      }

      const detailSingles = wRoads.slice(0, 25).map(buildSingleItem);

      const folderTitle = `${String(wIdx + 1).padStart(2, '0')}. 📍 ${wardLabel} (${wRoads.length} tuyến)`;
      // Trong file Tổng hợp Toàn Quốc: chỉ để các request [BẤM SEND] trong từng Phường/Xã để khi bấm Run cả Thành phố không bị chạy trùng lặp và nhẹ gấp đôi!
      masterWardFolders.push({
        name: folderTitle,
        item: batchItems,
      });
      detailWardFolders.push({
        name: folderTitle,
        item: [...batchItems, ...detailSingles],
      });
    });

    const stateFolderTitle = `${String(sIdx + 1).padStart(2, '0')}. 🏛️ ${stateName} (${sortedWards.length} Phường/Xã - ${stateTotalRoads} tuyến)`;
    masterStateFolders.push({
      name: stateFolderTitle,
      item: masterWardFolders,
    });

    const stateCollection = {
      info: {
        _postman_id: `b4e74f75-88d9-4b6b-9b45-${String(sIdx + 1).padStart(12, '0')}`,
        name: `LandBase - Kiểm thử Đường ${stateName} (${sortedWards.length} Phường/Xã - ${stateTotalRoads} Tuyến)`,
        description: `Bộ Postman Collection kiểm tra **${stateTotalRoads} tuyến đường** tại **${stateName}**, chia theo **${sortedWards.length} Phường/Xã**.`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      variable: [
        { key: 'baseUrl', value: 'https://dev-gateway.laand.vn', type: 'string' },
        { key: 'webappUrl', value: 'https://dev-webapp.laand.vn', type: 'string' },
      ],
      item: detailWardFolders,
    };

    const stateFileName = `${String(sIdx + 1).padStart(2, '0')}_${slugifyFileName(stateName)}.postman_collection.json`;
    fs.writeFileSync(path.join(perProvinceDir, stateFileName), JSON.stringify(stateCollection, null, 2), 'utf8');
  });

  const masterCollection = {
    info: {
      _postman_id: 'c9f84e12-55a1-4c9d-8e77-998877665544',
      name: 'LandBase - Kiểm thử Danh mục Đường Toàn Quốc (63 Tỉnh/TP - 77.061 Tuyến)',
      description:
        'Bộ Postman Collection kiểm thử toàn bộ **77.061 tuyến đường toàn quốc**, được phân cấp thành **63 Folder Tỉnh/Thành phố** và các **Sub-folder Phường/Xã** ở bên trong.\n\n### Cách sử dụng miễn phí 100%:\n1. Mở **Tỉnh/Thành phố** cần kiểm tra (01 -> 63), có thể bấm chuột phải vào Tỉnh/TP chọn **Run** hoặc mở từng **Phường/Xã**.\n2. Bấm vào request **`⚡ [BẤM SEND] Kiểm tra ...`** và nhấn nút **Send** để kiểm tra tự động toàn bộ các tuyến đường trong Phường/Xã đó!',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'baseUrl', value: 'https://dev-gateway.laand.vn', type: 'string' },
      { key: 'webappUrl', value: 'https://dev-webapp.laand.vn', type: 'string' },
    ],
    item: masterStateFolders,
  };

  const masterJson = JSON.stringify(masterCollection);
  fs.writeFileSync(path.join(downloadsDir, 'MT_Dev_GeocodeV2_ToanQuoc.postman_collection.json'), masterJson, 'utf8');
  fs.writeFileSync(path.join(toanQuocDir, 'MT_Dev_GeocodeV2_ToanQuoc.postman_collection.json'), masterJson, 'utf8');
  fs.writeFileSync(path.join(projectDir, 'MT_Dev_GeocodeV2_ToanQuoc.postman_collection.json'), masterJson, 'utf8');

  console.log(`🎉 Đã xuất thành công Collection Toàn Quốc (Hỗ trợ cả bấm Run cả Tỉnh/TP lẫn bấm Send từng Phường/Xã)!`);
}

main();
