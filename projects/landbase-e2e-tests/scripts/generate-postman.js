const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Đọc thông tin môi trường thực tế
const envPath = path.join(__dirname, '..', 'api-environment.json');
let envData = {};
if (fs.existsSync(envPath)) {
  try {
    envData = JSON.parse(fs.readFileSync(envPath, 'utf8'));
  } catch (e) {}
}

const baseUrl = envData.baseUrl || 'https://dev-gateway.laand.vn';
const webappUrl = envData.webappUrl || 'https://dev-webapp.laand.vn';
const accessToken = envData.accessToken || '';
const xAuthToken = envData.xAuthToken || 'WQLBeqrKWOOS';
const xSessionRef = envData.xSessionRef || 'WQLBeqrKWOOS';

function buildStandardHeaders(includeAuth = true, extraHeaders = {}) {
  const headers = [
    { key: 'Accept', value: 'application/json, text/plain, */*' },
    { key: 'Content-Type', value: 'application/json' },
    { key: 'clientlocale', value: 'vi' },
    { key: 'clientmessageid', value: '{{$guid}}' },
    { key: 'clienttime', value: '{{$isoTimestamp}}' },
    { key: 'Origin', value: '{{webappUrl}}' },
    { key: 'Referer', value: '{{webappUrl}}/' },
  ];

  if (includeAuth) {
    headers.push({ key: 'Authorization', value: 'Bearer {{accessToken}}' });
    headers.push({ key: 'x-auth-token', value: '{{xAuthToken}}' });
    headers.push({ key: 'x-session-ref', value: '{{xSessionRef}}' });
  }

  for (const [k, v] of Object.entries(extraHeaders)) {
    const idx = headers.findIndex(h => h.key.toLowerCase() === k.toLowerCase());
    if (idx >= 0) {
      if (v === null) headers.splice(idx, 1);
      else headers[idx].value = v;
    } else if (v !== null) {
      headers.push({ key: k, value: v });
    }
  }

  return headers;
}

function parseUrl(rawUrl) {
  const [baseAndPath, queryStr] = rawUrl.split('?');
  const pathParts = baseAndPath.replace('{{baseUrl}}', '').split('/').filter(Boolean);
  const query = [];
  if (queryStr) {
    queryStr.split('&').forEach(param => {
      const [k, v] = param.split('=');
      query.push({ key: decodeURIComponent(k || ''), value: decodeURIComponent(v || '') });
    });
  }

  return {
    raw: rawUrl,
    host: ['{{baseUrl}}'],
    path: pathParts,
    query: query.length > 0 ? query : undefined,
  };
}

function makeRequest(name, method, url, body, headers, tests) {
  const testScript = tests && tests.length > 0 ? [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: tests,
      },
    },
  ] : [];

  const reqObj = {
    method,
    header: headers,
    url: parseUrl(url),
  };

  if (body) {
    reqObj.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: {
        raw: {
          language: 'json',
        },
      },
    };
  }

  return {
    name,
    event: testScript,
    request: reqObj,
  };
}

// -------------------------------------------------------------
// FOLDER 1: BẢNG GIÁ ĐẤT - 01. TỈNH PHƯỜNG
// -------------------------------------------------------------
const folderProvinceWard = {
  name: '01. Bảng giá đất - Tỉnh Phường (/category/public/list-province)',
  item: [
    makeRequest(
      'API_01_001: Lấy danh sách phường/xã (version=2 & parentCode=01 Hà Nội) - 200 OK',
      'GET',
      '{{baseUrl}}/api/v1.0/category/public/list-province?version=2&parentCode=01',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.response.to.have.status(200);',
        '});',
        'pm.test("Response contains list of wards/districts", function () {',
        '    var json = pm.response.json();',
        '    pm.expect(json).to.be.an("object");',
        '    var list = json.data || json;',
        '    pm.expect(list).to.be.an("array");',
        '    pm.expect(list.length).to.be.above(0);',
        '    pm.expect(list[0]).to.have.property("code");',
        '    pm.expect(list[0]).to.have.property("name");',
        '});',
      ]
    ),
    makeRequest(
      'API_01_002: Kiểm tra cấu trúc dữ liệu JSON & Content-Type - 200 OK',
      'GET',
      '{{baseUrl}}/api/v1.0/category/public/list-province?version=2&parentCode=01',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Content-Type is JSON", function () {',
        '    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");',
        '});',
        'pm.test("Item data schema valid", function () {',
        '    var json = pm.response.json();',
        '    var list = json.data || json;',
        '    pm.expect(list[0].code).to.be.a("string");',
        '    pm.expect(list[0].name).to.be.a("string");',
        '    pm.expect(list[0].parentCode).to.equal("01");',
        '});',
      ]
    ),
    makeRequest(
      'API_01_004: Không truyền parentCode (trả về danh sách tỉnh/thành) - 200 OK',
      'GET',
      '{{baseUrl}}/api/v1.0/category/public/list-province?version=2',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.response.to.have.status(200);',
        '});',
        'pm.test("Returns list of provinces", function () {',
        '    var json = pm.response.json();',
        '    var list = json.data || json;',
        '    pm.expect(list).to.be.an("array");',
        '    pm.expect(list.length).to.be.above(0);',
        '});',
      ]
    ),
    makeRequest(
      'API_01_005: parentCode để trống (version=2&parentCode=) - 200 OK',
      'GET',
      '{{baseUrl}}/api/v1.0/category/public/list-province?version=2&parentCode=',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.response.to.have.status(200);',
        '});',
      ]
    ),
    makeRequest(
      'API_01_006: parentCode không tồn tại (parentCode=999999) - 200 OK (Danh sách rỗng)',
      'GET',
      '{{baseUrl}}/api/v1.0/category/public/list-province?version=2&parentCode=999999',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.response.to.have.status(200);',
        '});',
        'pm.test("List is empty for non-existent parentCode", function () {',
        '    var json = pm.response.json();',
        '    var list = json.data || json;',
        '    pm.expect(list).to.be.an("array").that.is.empty;',
        '});',
      ]
    ),
    makeRequest(
      'API_01_007: parentCode là chữ (parentCode=abc) - [Kỳ vọng 200 rỗng / 400 Bad Request]',
      'GET',
      '{{baseUrl}}/api/v1.0/category/public/list-province?version=2&parentCode=abc',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Mã lỗi KHÔNG ĐƯỢC LÀ 406 Not Acceptable (Bug hệ thống)", function () {',
        '    pm.expect(pm.response.code).to.not.equal(406);',
        '});',
        'pm.test("Kỳ vọng 200 OK (Danh sách rỗng) hoặc 400 Bad Request", function () {',
        '    pm.expect([200, 400, 422]).to.include(pm.response.code);',
        '});',
        'if (pm.response.code === 200) {',
        '    var json = pm.response.json();',
        '    var list = json.data || json;',
        '    pm.expect(list).to.be.an("array").that.is.empty;',
        '}',
      ]
    ),
    makeRequest(
      'API_01_008: parentCode có ký tự đặc biệt (@#$) - [Kỳ vọng 200 rỗng / 400 Bad Request]',
      'GET',
      '{{baseUrl}}/api/v1.0/category/public/list-province?version=2&parentCode=%40%23%24',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Mã lỗi KHÔNG ĐƯỢC LÀ 406 Not Acceptable (Bug hệ thống)", function () {',
        '    pm.expect(pm.response.code).to.not.equal(406);',
        '});',
        'pm.test("Kỳ vọng 200 OK (Danh sách rỗng) hoặc 400 Bad Request", function () {',
        '    pm.expect([200, 400, 422]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'API_01_010: parentCode là số âm (-1) - [Kỳ vọng 200 rỗng / 400 Bad Request]',
      'GET',
      '{{baseUrl}}/api/v1.0/category/public/list-province?version=2&parentCode=-1',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Mã lỗi KHÔNG ĐƯỢC LÀ 406 Not Acceptable (Bug hệ thống)", function () {',
        '    pm.expect(pm.response.code).to.not.equal(406);',
        '});',
        'pm.test("Kỳ vọng 200 OK (Danh sách rỗng) hoặc 400 Bad Request", function () {',
        '    pm.expect([200, 400, 422]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'API_01_015: Không truyền version - [PHÁT HIỆN BUG BACKEND 406 (Kỳ vọng 400 Bad Request)]',
      'GET',
      '{{baseUrl}}/api/v1.0/category/public/list-province?parentCode=01',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Mã lỗi KHÔNG ĐƯỢC LÀ 406 Not Acceptable (Bug backend trả 406 kèm 500)", function () {',
        '    pm.expect(pm.response.code).to.not.equal(406);',
        '});',
        'pm.test("Kỳ vọng chuẩn REST là 400 Bad Request khi thiếu tham số version bắt buộc", function () {',
        '    pm.expect([400, 422]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'API_01_017: Version sai định dạng (version=abc) - [PHÁT HIỆN BUG BACKEND 406 (Kỳ vọng 400 Bad Request)]',
      'GET',
      '{{baseUrl}}/api/v1.0/category/public/list-province?version=abc&parentCode=01',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Mã lỗi KHÔNG ĐƯỢC LÀ 406 Not Acceptable (Bug backend trả 406 kèm 500)", function () {',
        '    pm.expect(pm.response.code).to.not.equal(406);',
        '});',
        'pm.test("Kỳ vọng chuẩn REST là 400 Bad Request khi version sai kiểu dữ liệu", function () {',
        '    pm.expect([400, 422]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'API_01_024: Kiểm tra Public API (không cần gửi Authentication Token) - 200 OK',
      'GET',
      '{{baseUrl}}/api/v1.0/category/public/list-province?version=2&parentCode=01',
      null,
      buildStandardHeaders(false),
      [
        'pm.test("Public API allows unauthenticated access (200 OK)", function () {',
        '    pm.response.to.have.status(200);',
        '});',
      ]
    ),
    makeRequest(
      'API_01_026: Từ chối HTTP Method POST trên endpoint GET - 405 Method Not Allowed / 4xx',
      'POST',
      '{{baseUrl}}/api/v1.0/category/public/list-province?version=2&parentCode=01',
      {},
      buildStandardHeaders(),
      [
        'pm.test("Mã lỗi KHÔNG ĐƯỢC LÀ 406 Not Acceptable", function () {',
        '    pm.expect(pm.response.code).to.not.equal(406);',
        '});',
        'pm.test("Kỳ vọng từ chối Method (405 Method Not Allowed hoặc 4xx)", function () {',
        '    pm.expect([405, 400, 404, 403, 401]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'API_01_029: Kiểm tra danh sách không bị trùng mã code phường/xã - 200 OK',
      'GET',
      '{{baseUrl}}/api/v1.0/category/public/list-province?version=2&parentCode=01',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.response.to.have.status(200);',
        '});',
        'pm.test("Codes are unique across wards", function () {',
        '    var json = pm.response.json();',
        '    var list = json.data || json;',
        '    var codes = list.map(function(item) { return item.code; });',
        '    var uniqueCodes = new Set(codes);',
        '    pm.expect(uniqueCodes.size).to.equal(codes.length);',
        '});',
      ]
    ),
  ],
};

// -------------------------------------------------------------
// FOLDER 2: BẢNG GIÁ ĐẤT - 02. TÌM KIẾM GIÁ ĐẤT
// -------------------------------------------------------------
const folderPriceSearch = {
  name: '02. Bảng giá đất - Tìm kiếm (/category/public/land-assess-prices/search)',
  item: [
    makeRequest(
      'PRICE_SEARCH_001: Tìm kiếm với payload hợp lệ đầy đủ (Hà Nội, 2026) - 200 OK',
      'POST',
      '{{baseUrl}}/api/v1.0/category/public/land-assess-prices/search',
      {
        year: 2026,
        codeProvince: '01',
        codeWard: null,
        codeType: null,
        fullTextSearch: '',
        page: 0,
        size: 10,
      },
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK (2xx)", function () {',
        '    pm.expect(pm.response.code).to.be.within(200, 299);',
        '});',
        'pm.test("Response contains paginated land price content", function () {',
        '    var json = pm.response.json();',
        '    pm.expect(json).to.have.property("data");',
        '    pm.expect(json.data).to.have.property("content");',
        '    pm.expect(json.data.content).to.be.an("array");',
        '    pm.expect(json.data.content.length).to.be.above(0);',
        '    pm.expect(json.data.content[0]).to.have.property("road");',
        '});',
      ]
    ),
    makeRequest(
      'PRICE_SEARCH_002: Tìm kiếm theo Phường/Xã cụ thể (codeWard=09552) - 200 OK',
      'POST',
      '{{baseUrl}}/api/v1.0/category/public/land-assess-prices/search',
      {
        year: 2026,
        codeProvince: '01',
        codeWard: '09552',
        codeType: null,
        fullTextSearch: '',
        page: 0,
        size: 10,
      },
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.response.to.have.status(200);',
        '});',
        'pm.test("Data content array exists", function () {',
        '    var json = pm.response.json();',
        '    pm.expect(json.data.content).to.be.an("array");',
        '});',
      ]
    ),
    makeRequest(
      'PRICE_SEARCH_003: Tìm kiếm theo từ khóa tên đường ("Nguyễn Trãi") - 200 OK',
      'POST',
      '{{baseUrl}}/api/v1.0/category/public/land-assess-prices/search',
      {
        year: 2026,
        codeProvince: '01',
        codeWard: null,
        codeType: null,
        fullTextSearch: 'Nguyễn Trãi',
        page: 0,
        size: 10,
      },
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.response.to.have.status(200);',
        '});',
      ]
    ),
    makeRequest(
      'PRICE_SEARCH_004: Kiểm tra khi year=null hoặc thiếu year - [Kỳ vọng 200 mặc định năm / 400 Bad Request]',
      'POST',
      '{{baseUrl}}/api/v1.0/category/public/land-assess-prices/search',
      {
        year: null,
        codeProvince: '01',
        codeWard: null,
        codeType: null,
        fullTextSearch: '',
        page: 0,
        size: 10,
      },
      buildStandardHeaders(),
      [
        'pm.test("Mã lỗi KHÔNG ĐƯỢC LÀ 406 Not Acceptable (Bug hệ thống)", function () {',
        '    pm.expect(pm.response.code).to.not.equal(406);',
        '});',
        'pm.test("Kỳ vọng 200 OK (Mặc định năm an toàn) hoặc 400 Bad Request", function () {',
        '    pm.expect([200, 400, 422]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'PRICE_SEARCH_005: Chặn request khi year="ABC" sai kiểu dữ liệu - [PHÁT HIỆN BUG BACKEND 406 (Kỳ vọng 400 Bad Request)]',
      'POST',
      '{{baseUrl}}/api/v1.0/category/public/land-assess-prices/search',
      {
        year: 'ABC',
        codeProvince: '01',
        page: 0,
        size: 10,
      },
      buildStandardHeaders(),
      [
        'pm.test("Mã lỗi KHÔNG ĐƯỢC LÀ 406 Not Acceptable (Bug backend trả 406 kèm 500)", function () {',
        '    pm.expect(pm.response.code).to.not.equal(406);',
        '});',
        'pm.test("Kỳ vọng chuẩn REST là 400 Bad Request / 422 khi field year sai kiểu dữ liệu", function () {',
        '    pm.expect([400, 422]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'PRICE_SEARCH_006: Kiểm tra khi codeProvince=null - [Kỳ vọng 200 toàn quốc / 400 Bad Request]',
      'POST',
      '{{baseUrl}}/api/v1.0/category/public/land-assess-prices/search',
      {
        year: 2026,
        codeProvince: null,
        page: 0,
        size: 10,
      },
      buildStandardHeaders(),
      [
        'pm.test("Mã lỗi KHÔNG ĐƯỢC LÀ 406 Not Acceptable (Bug hệ thống)", function () {',
        '    pm.expect(pm.response.code).to.not.equal(406);',
        '});',
        'pm.test("Kỳ vọng 200 OK (Xử lý toàn quốc) hoặc 400 Bad Request", function () {',
        '    pm.expect([200, 400, 422]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'PRICE_SEARCH_007: Kiểm tra phân trang page=1 - 200 OK',
      'POST',
      '{{baseUrl}}/api/v1.0/category/public/land-assess-prices/search',
      {
        year: 2026,
        codeProvince: '01',
        codeWard: null,
        codeType: null,
        fullTextSearch: '',
        page: 1,
        size: 10,
      },
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.response.to.have.status(200);',
        '});',
        'pm.test("Page number is 1", function () {',
        '    var json = pm.response.json();',
        '    pm.expect(json.data.number).to.equal(1);',
        '});',
      ]
    ),
    makeRequest(
      'PRICE_SEARCH_008: Giới hạn số bản ghi size=5 - 200 OK',
      'POST',
      '{{baseUrl}}/api/v1.0/category/public/land-assess-prices/search',
      {
        year: 2026,
        codeProvince: '01',
        page: 0,
        size: 5,
      },
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.response.to.have.status(200);',
        '});',
        'pm.test("Page size is 5 and content length <= 5", function () {',
        '    var json = pm.response.json();',
        '    pm.expect(json.data.size).to.equal(5);',
        '    pm.expect(json.data.content.length).to.be.at.most(5);',
        '});',
      ]
    ),
  ],
};

// -------------------------------------------------------------
// FOLDER 3: BẢNG GIÁ ĐẤT - 03. MAP GIÁ ĐẤT & LOẠI ĐẤT
// -------------------------------------------------------------
const folderMapAndCategory = {
  name: '03. Bảng giá đất - Bản đồ & Loại đất',
  item: [
    makeRequest(
      'PRICE_MAP_001: Bounding box hợp lệ (Map giá đất) - 200 OK / 401 kiểm tra quyền Gateway',
      'POST',
      '{{baseUrl}}/api/v1.0/category/public/land-assess-prices/map',
      {
        zoom: 15,
        north: 21.0380769,
        south: 21.0296651,
        east: 105.848897,
        west: 105.8292847,
        codeProvince: '01',
        codeType: null,
        year: 2026,
      },
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK hoặc 401 nếu Gateway chưa mở phân quyền /map", function () {',
        '    pm.expect([200, 401]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'PRICE_MAP_002: Kiểm tra khi thiếu zoom - 400 Bad Request / 4xx',
      'POST',
      '{{baseUrl}}/api/v1.0/category/public/land-assess-prices/map',
      {
        north: 21.0380769,
        south: 21.0296651,
        east: 105.848897,
        west: 105.8292847,
        codeProvince: '01',
        year: 2026,
      },
      buildStandardHeaders(),
      [
        'pm.test("Status code is 4xx (400 Bad Request / 422 / 401)", function () {',
        '    pm.expect([400, 422, 401]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'API_02_001: Lấy danh sách loại đất (/category/public/land-type) - 200 OK',
      'GET',
      '{{baseUrl}}/api/v1.0/category/public/land-type',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.response.to.have.status(200);',
        '});',
        'pm.test("Land types array is returned", function () {',
        '    var json = pm.response.json();',
        '    var list = json.data || json;',
        '    pm.expect(list).to.be.an("array");',
        '    pm.expect(list.length).to.be.above(0);',
        '});',
      ]
    ),
    makeRequest(
      'API_02_017: Từ chối POST trên endpoint land-type chỉ hỗ trợ GET - 405 / 4xx',
      'POST',
      '{{baseUrl}}/api/v1.0/category/public/land-type',
      {},
      buildStandardHeaders(),
      [
        'pm.test("Mã lỗi KHÔNG ĐƯỢC LÀ 406 Not Acceptable", function () {',
        '    pm.expect(pm.response.code).to.not.equal(406);',
        '});',
        'pm.test("Kỳ vọng từ chối Method (405 Method Not Allowed hoặc 4xx)", function () {',
        '    pm.expect([405, 400, 404, 403, 401]).to.include(pm.response.code);',
        '});',
      ]
    ),
  ],
};

// -------------------------------------------------------------
// FOLDER 4: BẤT ĐỘNG SẢN ĐÃ LƯU
// -------------------------------------------------------------
const folderSavedRealEstate = {
  name: '04. Bất động sản đã lưu (/real-estate/real-estate-storage & /detail)',
  item: [
    makeRequest(
      'API_SAVED_001: Lấy danh sách BĐS đã lưu (get-list-saved) - 200 OK',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/real-estate-storage/get-list-saved',
      {
        keySearch: '',
        page: 0,
        size: 8,
      },
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.expect(pm.response.code).to.be.within(200, 299);',
        '});',
        'pm.test("Data content array exists", function () {',
        '    var json = pm.response.json();',
        '    pm.expect(json).to.have.property("data");',
        '    pm.expect(json.data).to.have.property("content");',
        '    pm.expect(json.data.content).to.be.an("array");',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_002: Lấy trang kế tiếp (page=1, size=8) - 200 OK',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/real-estate-storage/get-list-saved',
      {
        keySearch: '',
        page: 1,
        size: 8,
      },
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.expect(pm.response.code).to.be.within(200, 299);',
        '});',
        'pm.test("Page number is 1", function () {',
        '    var json = pm.response.json();',
        '    pm.expect(json.data.number).to.equal(1);',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_003: Giới hạn số lượng (size=1) - 200 OK',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/real-estate-storage/get-list-saved',
      {
        keySearch: '',
        page: 0,
        size: 1,
      },
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.expect(pm.response.code).to.be.within(200, 299);',
        '});',
        'pm.test("Page size is 1", function () {',
        '    var json = pm.response.json();',
        '    pm.expect(json.data.size).to.equal(1);',
        '    pm.expect(json.data.content.length).to.be.at.most(1);',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_004: Chặn request khi thiếu Authentication Token - 401 Unauthorized',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/real-estate-storage/get-list-saved',
      {
        keySearch: '',
        page: 0,
        size: 8,
      },
      buildStandardHeaders(false),
      [
        'pm.test("Status code is 401 Unauthorized", function () {',
        '    pm.response.to.have.status(401);',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_005: Chặn Token giả mạo hoặc sai chữ ký - 401 / 403',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/real-estate-storage/get-list-saved',
      {
        keySearch: '',
        page: 0,
        size: 8,
      },
      buildStandardHeaders(true, {
        Authorization: 'Bearer fake_jwt_token_invalid_signature_test',
        'x-auth-token': 'fake_x_auth_token_99999',
        'x-session-ref': 'fake_session_ref_88888',
      }),
      [
        'pm.test("Status code is 401 Unauthorized / 403 Forbidden", function () {',
        '    pm.expect([401, 403]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_006: Header Contract thiếu clientmessageid & clienttime - 400 Bad Request',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/real-estate-storage/get-list-saved',
      {
        keySearch: '',
        page: 0,
        size: 8,
      },
      buildStandardHeaders(true, {
        clientmessageid: '',
        clienttime: '',
      }),
      [
        'pm.test("Status code is 400 Bad Request / 401", function () {',
        '    pm.expect([400, 401]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_007: Chi tiết tin rao vặt đã lưu (id hợp lệ: {{articleId}}) - 200 OK',
      'GET',
      '{{baseUrl}}/api/v1.0/elasticsearch/public/detail/{{articleId}}',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.expect(pm.response.code).to.be.within(200, 299);',
        '});',
        'pm.test("Response contains article details", function () {',
        '    var json = pm.response.json();',
        '    pm.expect(json).to.have.property("data");',
        '    pm.expect(String(json.data.id)).to.equal(pm.collectionVariables.get("articleId"));',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_009: Chi tiết tin khi articleId không tồn tại (id=99999999) - [PHÁT HIỆN BUG BACKEND 406 (Kỳ vọng 404 Not Found)]',
      'GET',
      '{{baseUrl}}/api/v1.0/elasticsearch/public/detail/99999999',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Mã lỗi KHÔNG ĐƯỢC LÀ 406 Not Acceptable (Bug backend trả 406 kèm code 400)", function () {',
        '    pm.expect(pm.response.code).to.not.equal(406);',
        '});',
        'pm.test("Kỳ vọng chuẩn REST là 404 Not Found hoặc 400 Bad Request khi articleId không tồn tại", function () {',
        '    pm.expect([404, 400]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_010: Chi tiết tin khi articleId sai định dạng (id=abc) - [PHÁT HIỆN BUG BACKEND 406 (Kỳ vọng 400 Bad Request)]',
      'GET',
      '{{baseUrl}}/api/v1.0/elasticsearch/public/detail/abc',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Mã lỗi KHÔNG ĐƯỢC LÀ 406 Not Acceptable (Bug backend trả 406 kèm code 400)", function () {',
        '    pm.expect(pm.response.code).to.not.equal(406);',
        '});',
        'pm.test("Kỳ vọng chuẩn REST là 400 Bad Request / 422 khi articleId sai định dạng số", function () {',
        '    pm.expect([400, 422]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_011: Chi tiết tin là Public API không cần Token - 200 OK',
      'GET',
      '{{baseUrl}}/api/v1.0/elasticsearch/public/detail/{{articleId}}',
      null,
      buildStandardHeaders(false),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.response.to.have.status(200);',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_014: Bỏ lưu tin rao vặt (POST /remove/{{listingSavedId}}) - 200 OK',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/real-estate-storage/remove/{{listingSavedId}}',
      {},
      buildStandardHeaders(),
      [
        'pm.test("Status code is 200 OK", function () {',
        '    pm.expect(pm.response.code).to.be.within(200, 299);',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_015: Chặn bỏ lưu khi không có Token - 401 Unauthorized',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/real-estate-storage/remove/{{listingSavedId}}',
      {},
      buildStandardHeaders(false),
      [
        'pm.test("Status code is 401 Unauthorized", function () {',
        '    pm.response.to.have.status(401);',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_016: Chặn bỏ lưu khi Token giả mạo - 401 / 403',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/real-estate-storage/remove/{{listingSavedId}}',
      {},
      buildStandardHeaders(true, {
        Authorization: 'Bearer fake_jwt_token_invalid_signature_test',
        'x-auth-token': 'fake_x_auth_token_99999',
        'x-session-ref': 'fake_session_ref_88888',
      }),
      [
        'pm.test("Status code is 401 Unauthorized / 403", function () {',
        '    pm.expect([401, 403]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_017: Header Contract thiếu messageId & clienttime khi bỏ lưu - 400 Bad Request',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/real-estate-storage/remove/{{listingSavedId}}',
      {},
      buildStandardHeaders(true, {
        clientmessageid: '',
        clienttime: '',
      }),
      [
        'pm.test("Status code is 400 Bad Request / 401", function () {',
        '    pm.expect([400, 401]).to.include(pm.response.code);',
        '});',
      ]
    ),
    makeRequest(
      'API_SAVED_018: Từ chối Method GET trên endpoint remove - [PHÁT HIỆN BUG BACKEND 406 (Kỳ vọng 405 Method Not Allowed)]',
      'GET',
      '{{baseUrl}}/api/v1.0/real-estate/real-estate-storage/remove/{{listingSavedId}}',
      null,
      buildStandardHeaders(),
      [
        'pm.test("Mã lỗi KHÔNG ĐƯỢC LÀ 406 Not Acceptable (Bug backend trả 406 khi gọi sai method)", function () {',
        '    pm.expect(pm.response.code).to.not.equal(406);',
        '});',
        'pm.test("Kỳ vọng từ chối Method (405 Method Not Allowed hoặc 4xx)", function () {',
        '    pm.expect([405, 400, 404, 403, 401]).to.include(pm.response.code);',
        '});',
      ]
    ),
  ],
};

// -------------------------------------------------------------
// FOLDER 5: PHONG THỦY - GEOMANCY SEARCH
// -------------------------------------------------------------
const folderGeomancy = {
  name: '05. Phong thủy (/real-estate/public/geomancy/search)',
  item: [
    makeRequest(
      'PHONGTHUY-01: Tìm kiếm phong thủy với payload mẫu hợp lệ - 200 OK',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/public/geomancy/search',
      {
        birth: '{{geomancyBirth}}',
        gender: 0,
        direction: '{{geomancyDirection}}',
        categoryCode: '{{geomancyCategoryCode}}',
      },
      buildStandardHeaders(false),
      [
        'pm.test("HTTP response is 2xx", function () {',
        '  pm.expect(pm.response.code).to.be.within(200, 299);',
        '});',
        'pm.test("Response body is not empty", function () {',
        '  pm.expect(pm.response.text()).to.not.be.empty;',
        '});',
        'pm.test("Response parses as JSON when server declares JSON", function () {',
        '  const ct = pm.response.headers.get("Content-Type") || "";',
        '  if (ct.toLowerCase().includes("json")) {',
        '    pm.expect(function () { return pm.response.json(); }).not.to.throw();',
        '  }',
        '});',
        'pm.test("Response contains valid geomancy structure", function () {',
        '  const body = pm.response.json();',
        '  pm.expect(body).to.have.property("path", "/api/v1.0/real-estate/public/geomancy/search");',
        '  pm.expect(body).to.have.property("status", 1);',
        '  pm.expect(body).to.have.property("data");',
        '  pm.expect(body.data).to.be.an("object");',
        '  pm.expect(body.data).to.have.property("id");',
        '  pm.expect(body.data).to.have.property("yearName");',
        '  pm.expect(body.data).to.have.property("destiny");',
        '  pm.expect(body.data).to.have.property("fiveElements");',
        '});',
      ]
    ),
    makeRequest(
      'PHONGTHUY-02: Kiểm tra birth không được truyền - Không phát sinh 5xx',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/public/geomancy/search',
      {
        gender: 0,
        direction: '{{geomancyDirection}}',
        categoryCode: '{{geomancyCategoryCode}}',
      },
      buildStandardHeaders(false),
      [
        'pm.test("Request does not cause an unhandled 5xx server error", function () {',
        '  pm.expect(pm.response.code).to.be.below(500);',
        '});',
      ]
    ),
    makeRequest(
      'PHONGTHUY-03: Kiểm tra birth sai định dạng ngày giờ - Không phát sinh 5xx',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/public/geomancy/search',
      {
        birth: 'not-a-date',
        gender: 0,
        direction: '{{geomancyDirection}}',
        categoryCode: '{{geomancyCategoryCode}}',
      },
      buildStandardHeaders(false),
      [
        'pm.test("Request does not cause an unhandled 5xx server error", function () {',
        '  pm.expect(pm.response.code).to.be.below(500);',
        '});',
      ]
    ),
    makeRequest(
      'PHONGTHUY-04: Kiểm tra gender sai kiểu dữ liệu - Không phát sinh 5xx',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/public/geomancy/search',
      {
        birth: '{{geomancyBirth}}',
        gender: 'ABC',
        direction: '{{geomancyDirection}}',
        categoryCode: '{{geomancyCategoryCode}}',
      },
      buildStandardHeaders(false),
      [
        'pm.test("Request does not cause an unhandled 5xx server error", function () {',
        '  pm.expect(pm.response.code).to.be.below(500);',
        '});',
      ]
    ),
    makeRequest(
      'PHONGTHUY-05: Kiểm tra direction với giá trị không xác định - Không phát sinh 5xx',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/public/geomancy/search',
      {
        birth: '{{geomancyBirth}}',
        gender: 0,
        direction: 'INVALID_DIRECTION',
        categoryCode: '{{geomancyCategoryCode}}',
      },
      buildStandardHeaders(false),
      [
        'pm.test("Request does not cause an unhandled 5xx server error", function () {',
        '  pm.expect(pm.response.code).to.be.below(500);',
        '});',
      ]
    ),
    makeRequest(
      'PHONGTHUY-06: Kiểm tra categoryCode không được truyền (Optional) - 200 OK / Không phát sinh 5xx',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/public/geomancy/search',
      {
        birth: '{{geomancyBirth}}',
        gender: 0,
        direction: '{{geomancyDirection}}',
      },
      buildStandardHeaders(false),
      [
        'pm.test("Request does not cause an unhandled 5xx server error", function () {',
        '  pm.expect(pm.response.code).to.be.below(500);',
        '});',
        'pm.test("HTTP response is 2xx", function () {',
        '  pm.expect(pm.response.code).to.be.within(200, 299);',
        '});',
      ]
    ),
    makeRequest(
      'PHONGTHUY-07: Kiểm tra categoryCode không tồn tại - 200 OK / Không phát sinh 5xx',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/public/geomancy/search',
      {
        birth: '{{geomancyBirth}}',
        gender: 0,
        direction: '{{geomancyDirection}}',
        categoryCode: 'INVALID_CODE',
      },
      buildStandardHeaders(false),
      [
        'pm.test("Request does not cause an unhandled 5xx server error", function () {',
        '  pm.expect(pm.response.code).to.be.below(500);',
        '});',
      ]
    ),
    makeRequest(
      'PHONGTHUY-08: Kiểm tra gender là null - Không phát sinh 5xx',
      'POST',
      '{{baseUrl}}/api/v1.0/real-estate/public/geomancy/search',
      {
        birth: '{{geomancyBirth}}',
        gender: null,
        direction: '{{geomancyDirection}}',
        categoryCode: '{{geomancyCategoryCode}}',
      },
      buildStandardHeaders(false),
      [
        'pm.test("Request does not cause an unhandled 5xx server error", function () {',
        '  pm.expect(pm.response.code).to.be.below(500);',
        '});',
      ]
    ),
  ],
};

// -------------------------------------------------------------
// POSTMAN COLLECTION ROOT
// -------------------------------------------------------------
const collection = {
  info: {
    _postman_id: crypto.randomUUID(),
    name: 'LandBase API Automation & Validation Tests',
    description: 'Bộ kiểm thử tự động toàn diện LandBase API (Bảng giá đất, BĐS đã lưu, Phong thủy). Đã chuẩn hóa toàn bộ mã lỗi HTTP (400, 404, 405, 422) và loại bỏ hoàn toàn mã lỗi 406 Not Acceptable để phát hiện chính xác lỗi của backend.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: baseUrl, type: 'string' },
    { key: 'webappUrl', value: webappUrl, type: 'string' },
    { key: 'accessToken', value: accessToken, type: 'string' },
    { key: 'xAuthToken', value: xAuthToken, type: 'string' },
    { key: 'xSessionRef', value: xSessionRef, type: 'string' },
    { key: 'articleId', value: '238622', type: 'string' },
    { key: 'listingSavedId', value: '238622', type: 'string' },
    { key: 'geomancyBirth', value: '2026-10-13T17:00:00.000Z', type: 'string' },
    { key: 'geomancyGender', value: '0', type: 'string' },
    { key: 'geomancyDirection', value: 'Bắc', type: 'string' },
    { key: 'geomancyCategoryCode', value: 'BDS00035', type: 'string' },
  ],
  item: [
    folderProvinceWard,
    folderPriceSearch,
    folderMapAndCategory,
    folderSavedRealEstate,
    folderGeomancy,
  ],
};

// -------------------------------------------------------------
// POSTMAN ENVIRONMENT ROOT
// -------------------------------------------------------------
const environment = {
  id: crypto.randomUUID(),
  name: 'LandBase DEV Environment',
  values: [
    { key: 'baseUrl', value: baseUrl, enabled: true },
    { key: 'webappUrl', value: webappUrl, enabled: true },
    { key: 'accessToken', value: accessToken, enabled: true },
    { key: 'xAuthToken', value: xAuthToken, enabled: true },
    { key: 'xSessionRef', value: xSessionRef, enabled: true },
    { key: 'articleId', value: '238622', enabled: true },
    { key: 'listingSavedId', value: '238622', enabled: true },
    { key: 'geomancyBirth', value: '2026-10-13T17:00:00.000Z', enabled: true },
    { key: 'geomancyGender', value: '0', enabled: true },
    { key: 'geomancyDirection', value: 'Bắc', enabled: true },
    { key: 'geomancyCategoryCode', value: 'BDS00035', enabled: true },
  ],
  _postman_variable_scope: 'environment',
};

const outputCollectionPath = path.join(__dirname, '..', 'LandBase_API_Tests.postman_collection.json');
const outputEnvironmentPath = path.join(__dirname, '..', 'LandBase_Environment.postman_environment.json');

fs.writeFileSync(outputCollectionPath, JSON.stringify(collection, null, 2), 'utf8');
fs.writeFileSync(outputEnvironmentPath, JSON.stringify(environment, null, 2), 'utf8');

console.log('✅ Đã tạo thành công Postman Collection tại:', outputCollectionPath);
console.log('✅ Đã tạo thành công Postman Environment tại:', outputEnvironmentPath);
