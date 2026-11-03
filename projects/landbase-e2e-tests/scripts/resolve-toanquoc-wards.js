const fs = require('fs');
const path = require('path');

const csvPath = 'c:\\Users\\Admin\\Downloads\\Danh_muc_ten_duong_toan_quoc\\Danh_muc_ten_duong_toan_quoc.csv';
const cachePath = 'd:\\code\\projects\\landbase-e2e-tests\\test-data\\toanquoc-ward-coords-cache.json';

const STATE_INFO = {
  'Thành phố Hà Nội': { lat: 21.0285, lon: 105.8542, newProv: 'Thành phố Hà Nội' },
  'Thành phố Hồ Chí Minh': { lat: 10.7769, lon: 106.7009, newProv: 'Thành phố Hồ Chí Minh' },
  'Thành phố Hải Phòng': { lat: 20.8449, lon: 106.6881, newProv: 'Thành phố Hải Phòng' },
  'Thành phố Đà Nẵng': { lat: 16.0544, lon: 108.2022, newProv: 'Thành phố Đà Nẵng' },
  'Thành phố Cần Thơ': { lat: 10.0452, lon: 105.7469, newProv: 'Thành phố Cần Thơ' },
  'Tỉnh An Giang': { lat: 10.3864, lon: 105.4352, newProv: 'Tỉnh An Giang' },
  'Tỉnh Bà Rịa - Vũng Tàu': { lat: 10.4114, lon: 107.1362, newProv: 'Thành phố Hồ Chí Minh' },
  'Tỉnh Bạc Liêu': { lat: 9.2941, lon: 105.7278, newProv: 'Tỉnh Cà Mau' },
  'Tỉnh Bắc Giang': { lat: 21.2731, lon: 106.1946, newProv: 'Tỉnh Bắc Ninh' },
  'Tỉnh Bắc Kạn': { lat: 22.1470, lon: 105.8348, newProv: 'Tỉnh Thái Nguyên' },
  'Tỉnh Bắc Ninh': { lat: 21.1861, lon: 106.0763, newProv: 'Tỉnh Bắc Ninh' },
  'Tỉnh Bến Tre': { lat: 10.2434, lon: 106.3756, newProv: 'Tỉnh Vĩnh Long' },
  'Tỉnh Bình Dương': { lat: 10.9804, lon: 106.6519, newProv: 'Thành phố Hồ Chí Minh' },
  'Tỉnh Bình Định': { lat: 13.7820, lon: 109.2197, newProv: 'Tỉnh Gia Lai' },
  'Tỉnh Bình Phước': { lat: 11.5349, lon: 106.8832, newProv: 'Tỉnh Đồng Nai' },
  'Tỉnh Bình Thuận': { lat: 10.9289, lon: 108.1021, newProv: 'Tỉnh Lâm Đồng' },
  'Tỉnh Cà Mau': { lat: 9.1768, lon: 105.1524, newProv: 'Tỉnh Cà Mau' },
  'Tỉnh Cao Bằng': { lat: 22.6657, lon: 106.2579, newProv: 'Tỉnh Cao Bằng' },
  'Tỉnh Đắk Lắk': { lat: 12.6667, lon: 108.0500, newProv: 'Tỉnh Đắk Lắk' },
  'Tỉnh Đắk Nông': { lat: 12.0042, lon: 107.6907, newProv: 'Tỉnh Lâm Đồng' },
  'Tỉnh Điện Biên': { lat: 21.3860, lon: 103.0169, newProv: 'Tỉnh Điện Biên' },
  'Tỉnh Đồng Nai': { lat: 10.9574, lon: 106.8427, newProv: 'Tỉnh Đồng Nai' },
  'Tỉnh Đồng Tháp': { lat: 10.4602, lon: 105.6329, newProv: 'Tỉnh Đồng Tháp' },
  'Tỉnh Gia Lai': { lat: 13.9833, lon: 108.0000, newProv: 'Tỉnh Gia Lai' },
  'Tỉnh Hà Giang': { lat: 22.8233, lon: 104.9836, newProv: 'Tỉnh Tuyên Quang' },
  'Tỉnh Hà Nam': { lat: 20.5453, lon: 105.9122, newProv: 'Tỉnh Ninh Bình' },
  'Tỉnh Hà Tĩnh': { lat: 18.3428, lon: 105.9057, newProv: 'Tỉnh Hà Tĩnh' },
  'Tỉnh Hải Dương': { lat: 20.9373, lon: 106.3146, newProv: 'Thành phố Hải Phòng' },
  'Tỉnh Hậu Giang': { lat: 9.7845, lon: 105.4701, newProv: 'Thành phố Cần Thơ' },
  'Tỉnh Hòa Bình': { lat: 20.8133, lon: 105.3383, newProv: 'Tỉnh Phú Thọ' },
  'Tỉnh Hưng Yên': { lat: 20.6464, lon: 106.0511, newProv: 'Tỉnh Hưng Yên' },
  'Tỉnh Khánh Hòa': { lat: 12.2388, lon: 109.1967, newProv: 'Tỉnh Khánh Hòa' },
  'Tỉnh Kiên Giang': { lat: 10.0125, lon: 105.0809, newProv: 'Tỉnh An Giang' },
  'Tỉnh Kon Tum': { lat: 14.3545, lon: 108.0076, newProv: 'Tỉnh Quảng Ngãi' },
  'Tỉnh Lai Châu': { lat: 22.3964, lon: 103.4582, newProv: 'Tỉnh Lai Châu' },
  'Tỉnh Lạng Sơn': { lat: 21.8537, lon: 106.7615, newProv: 'Tỉnh Lạng Sơn' },
  'Tỉnh Lào Cai': { lat: 22.4856, lon: 103.9707, newProv: 'Tỉnh Lào Cai' },
  'Tỉnh Lâm Đồng': { lat: 11.9404, lon: 108.4583, newProv: 'Tỉnh Lâm Đồng' },
  'Tỉnh Long An': { lat: 10.5359, lon: 106.4137, newProv: 'Tỉnh Tây Ninh' },
  'Tỉnh Nam Định': { lat: 20.4339, lon: 106.1773, newProv: 'Tỉnh Ninh Bình' },
  'Tỉnh Nghệ An': { lat: 18.6796, lon: 105.6813, newProv: 'Tỉnh Nghệ An' },
  'Tỉnh Ninh Bình': { lat: 20.2506, lon: 105.9745, newProv: 'Tỉnh Ninh Bình' },
  'Tỉnh Ninh Thuận': { lat: 11.5643, lon: 108.9886, newProv: 'Tỉnh Khánh Hòa' },
  'Tỉnh Phú Thọ': { lat: 21.3227, lon: 105.4020, newProv: 'Tỉnh Phú Thọ' },
  'Tỉnh Phú Yên': { lat: 13.0882, lon: 109.3135, newProv: 'Tỉnh Đắk Lắk' },
  'Tỉnh Quảng Bình': { lat: 17.4689, lon: 106.6223, newProv: 'Tỉnh Quảng Trị' },
  'Tỉnh Quảng Nam': { lat: 15.5736, lon: 108.4740, newProv: 'Thành phố Đà Nẵng' },
  'Tỉnh Quảng Ngãi': { lat: 15.1205, lon: 108.7923, newProv: 'Tỉnh Quảng Ngãi' },
  'Tỉnh Quảng Ninh': { lat: 20.9505, lon: 107.0734, newProv: 'Tỉnh Quảng Ninh' },
  'Tỉnh Quảng Trị': { lat: 16.8163, lon: 107.1003, newProv: 'Tỉnh Quảng Trị' },
  'Tỉnh Sóc Trăng': { lat: 9.6025, lon: 105.9739, newProv: 'Thành phố Cần Thơ' },
  'Tỉnh Sơn La': { lat: 21.3256, lon: 103.9188, newProv: 'Tỉnh Sơn La' },
  'Tỉnh Tây Ninh': { lat: 11.3100, lon: 106.0983, newProv: 'Tỉnh Tây Ninh' },
  'Tỉnh Thái Bình': { lat: 20.4463, lon: 106.3366, newProv: 'Tỉnh Hưng Yên' },
  'Tỉnh Thái Nguyên': { lat: 21.5942, lon: 105.8482, newProv: 'Tỉnh Thái Nguyên' },
  'Tỉnh Thanh Hóa': { lat: 19.8067, lon: 105.7852, newProv: 'Tỉnh Thanh Hóa' },
  'Tỉnh Thừa Thiên Huế': { lat: 16.4637, lon: 107.5909, newProv: 'Thành phố Huế' },
  'Tỉnh Tiền Giang': { lat: 10.3600, lon: 106.3600, newProv: 'Tỉnh Đồng Tháp' },
  'Tỉnh Trà Vinh': { lat: 9.9347, lon: 106.3453, newProv: 'Tỉnh Vĩnh Long' },
  'Tỉnh Tuyên Quang': { lat: 21.8236, lon: 105.2142, newProv: 'Tỉnh Tuyên Quang' },
  'Tỉnh Vĩnh Long': { lat: 10.2537, lon: 105.9722, newProv: 'Tỉnh Vĩnh Long' },
  'Tỉnh Vĩnh Phúc': { lat: 21.3089, lon: 105.6049, newProv: 'Tỉnh Phú Thọ' },
  'Tỉnh Yên Bái': { lat: 21.7052, lon: 104.8754, newProv: 'Tỉnh Lào Cai' },
};

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

function calcDistKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function resolveAllWards() {
  const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const wardMap = new Map();
  const distMap = new Map();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const roadName = (cols[0] || '').trim();
    const ward = (cols[3] || '').trim();
    const dist = (cols[4] || '').trim();
    const state = (cols[5] || '').trim();
    if (!state) continue;

    const dKey = `${dist}|${state}`;
    if (!distMap.has(dKey)) {
      distMap.set(dKey, { dist, state, sampleRoads: [] });
    }
    const dEntry = distMap.get(dKey);
    if (dEntry.sampleRoads.length < 3 && roadName.length > 4 && roadName.toLowerCase() !== 'cầu') {
      dEntry.sampleRoads.push(roadName);
    }

    const wKey = `${ward}|${dist}|${state}`;
    if (!wardMap.has(wKey)) {
      wardMap.set(wKey, { ward, dist, state, sampleRoads: [] });
    }
    const wEntry = wardMap.get(wKey);
    if (wEntry.sampleRoads.length < 3 && roadName.length > 4 && roadName.toLowerCase() !== 'cầu') {
      wEntry.sampleRoads.push(roadName);
    }
  }

  const url = 'https://dev-gateway.laand.vn/api/v1.0/elasticsearch/public/search-suggest/geocodev2';
  const concurrency = 80;

  // Step 1: Resolve 701 districts
  const distKeys = [...distMap.keys()];
  let dIdx = 0;
  async function distWorker() {
    while (dIdx < distKeys.length) {
      const key = distKeys[dIdx++];
      const info = distMap.get(key);
      const st = STATE_INFO[info.state] || { lat: 16.0, lon: 106.0, newProv: info.state };
      let lat = st.lat;
      let lon = st.lon;

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: info.dist, latitude: st.lat, longitude: st.lon, limit: 10, minScore: 1 }),
          signal: AbortSignal.timeout(3500),
        });
        const list = await res.json();
        if (Array.isArray(list)) {
          const match = list.find(x => x.provinceName === st.newProv && calcDistKm(st.lat, st.lon, Number(x.latitude), Number(x.longitude)) < 180);
          if (match) {
            lat = Number(match.latitude);
            lon = Number(match.longitude);
          }
        }
      } catch (e) {}
      info.lat = lat;
      info.lon = lon;
      info.newProv = st.newProv;
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => distWorker()));
  console.log(`✅ Đã định vị xong ${distKeys.length} Quận/Huyện!`);

  // Step 2: Resolve 3,045 wards
  const wardKeys = [...wardMap.keys()];
  let wIdx = 0;
  let resolvedWards = 0;
  async function wardWorker() {
    while (wIdx < wardKeys.length) {
      const key = wardKeys[wIdx++];
      const info = wardMap.get(key);
      const dInfo = distMap.get(`${info.dist}|${info.state}`);
      let lat = dInfo.lat;
      let lon = dInfo.lon;
      let newWard = info.ward;

      try {
        const queryAddr = info.ward ? `UBND ${info.ward}` : (info.sampleRoads[0] || info.dist);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: queryAddr, latitude: dInfo.lat, longitude: dInfo.lon, limit: 10, minScore: 1 }),
          signal: AbortSignal.timeout(3500),
        });
        const list = await res.json();
        let match = null;
        if (Array.isArray(list)) {
          match = list.find(x => x.provinceName === dInfo.newProv && calcDistKm(dInfo.lat, dInfo.lon, Number(x.latitude), Number(x.longitude)) < 80);
        }
        if (match) {
          lat = Number(match.latitude);
          lon = Number(match.longitude);
          if (match.wardName) newWard = match.wardName;
        }
      } catch (e) {}

      info.lat = Number(lat.toFixed(6));
      info.lon = Number(lon.toFixed(6));
      info.newWard = newWard;
      info.newProv = dInfo.newProv;
      delete info.sampleRoads;

      resolvedWards++;
      if (resolvedWards % 500 === 0 || resolvedWards === wardKeys.length) {
        console.log(`⏳ Đã định vị ${resolvedWards}/${wardKeys.length} Phường/Xã toàn quốc...`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => wardWorker()));

  const outObj = {};
  for (const [k, v] of wardMap.entries()) {
    outObj[k] = v;
  }
  fs.writeFileSync(cachePath, JSON.stringify(outObj, null, 2), 'utf8');
  console.log(`🎉 Đã lưu cache tọa độ 3.045 Phường/Xã toàn quốc tại: ${cachePath}`);
}

resolveAllWards();
