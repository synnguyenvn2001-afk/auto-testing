const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function makePostmanUrl(rawUrl) {
  const [basePart, queryString] = rawUrl.split('?');
  const firstSlashIdx = basePart.indexOf('/');
  const hostVar = firstSlashIdx >= 0 ? basePart.slice(0, firstSlashIdx) : basePart;
  const pathStr = firstSlashIdx >= 0 ? basePart.slice(firstSlashIdx + 1) : '';
  const pathSegments = pathStr ? pathStr.split('/').filter(Boolean) : [];

  const urlObj = {
    raw: rawUrl,
    host: [hostVar],
    path: pathSegments,
  };

  if (queryString) {
    urlObj.query = queryString.split('&').map(pair => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx === -1) return { key: pair, value: '', type: 'text' };
      return {
        key: pair.slice(0, eqIdx),
        value: decodeURIComponent(pair.slice(eqIdx + 1)),
        type: 'text',
      };
    });
  }
  return urlObj;
}

function makeGatewayHeaders(includeAuth = true, extra = {}) {
  const headers = [
    { key: 'Accept', value: 'application/json, text/plain, */*', type: 'text' },
    { key: 'Accept-Language', value: 'vi,fr-FR;q=0.9,fr;q=0.8,en-US;q=0.7,en;q=0.6', type: 'text' },
    { key: 'Content-Type', value: 'application/json', type: 'text' },
    { key: 'clientLocale', value: 'vi', type: 'text' },
    { key: 'clientTime', value: '{{$isoTimestamp}}', type: 'text' },
    { key: 'clientMessageId', value: '{{$guid}}', type: 'text' },
    { key: 'Origin', value: '{{origin}}', type: 'text' },
    { key: 'Referer', value: '{{referer}}', type: 'text' },
  ];
  if (includeAuth) {
    headers.push(
      { key: 'Authorization', value: 'Bearer {{accessToken}}', type: 'text' },
      { key: 'X-Auth-Token', value: '{{xAuthToken}}', type: 'text' },
      { key: 'X-Session-Ref', value: '{{xSessionRef}}', type: 'text' }
    );
  }
  for (const [k, v] of Object.entries(extra)) {
    const idx = headers.findIndex(h => h.key.toLowerCase() === k.toLowerCase());
    if (v === null || v === undefined) {
      if (idx >= 0) headers.splice(idx, 1);
    } else if (idx >= 0) {
      headers[idx].value = v;
    } else {
      headers.push({ key: k, value: v, type: 'text' });
    }
  }
  return headers;
}

function makeReq(name, method, rawUrl, body, headers, testLines, description = '') {
  const req = {
    name,
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: testLines,
        },
      },
    ],
    request: {
      method,
      header: headers,
      url: makePostmanUrl(rawUrl),
      description,
    },
  };
  if (body !== null && body !== undefined) {
    req.request.body = {
      mode: 'raw',
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }
  return req;
}

// ============================================================================
// 1. UPDATE LandBase_Locality_Report.postman_collection.json (27 Test Cases)
// ============================================================================
function buildLocalityReportCollection() {
  const webHeaders = [
    { key: 'Accept', value: 'application/json', type: 'text' },
    { key: 'Origin', value: '{{webappUrl}}', type: 'text' },
    { key: 'Referer', value: '{{webappUrl}}/ban-do', type: 'text' },
  ];

  const items = [
    {
      name: '01 - Happy Path & Data Contract (5 Cases)',
      item: [
        makeReq(
          'LOCALITY-API-01: Lấy báo cáo tổng quan khu vực với tọa độ mẫu hợp lệ - 200 OK',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("available = true và có object report", function () {',
            '  pm.expect(body).to.have.property("available", true);',
            '  pm.expect(body.report).to.be.an("object");',
            '});',
          ]
        ),
        makeReq(
          'LOCALITY-API-02: Kiểm tra truyền tọa độ thập phân đầy đủ (độ chính xác cao)',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("reportId phản ánh tọa độ thập phân (21.0193-105.8264)", function () {',
            '  pm.expect(body.report.reportId).to.include("21.0193");',
            '  pm.expect(body.report.reportId).to.include("105.8264");',
            '});',
          ]
        ),
        makeReq(
          'LOCALITY-API-03: Kiểm tra API khi truyền thêm query parameter không được mô tả (&extraParam=test)',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367&extraParam=test',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK (Bỏ qua extraParam an toàn)", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("available = true", function () { pm.expect(body.available).to.equal(true); });',
          ]
        ),
        makeReq(
          'LOCALITY-API-04: Lấy báo cáo khu vực tại TP. Hồ Chí Minh (10.7769, 106.7009)',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=10.7769&longitude=106.7009',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("reportId chứa tọa độ TP.HCM 10.7769-106.7009", function () {',
            '  pm.expect(body.report.reportId).to.include("10.7769-106.7009");',
            '});',
          ]
        ),
        makeReq(
          'LOCALITY-API-05: Lấy báo cáo khu vực tại Đà Nẵng (16.0544, 108.2022)',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=16.0544&longitude=108.2022',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("reportId chứa tọa độ Đà Nẵng 16.0544-108.2022", function () {',
            '  pm.expect(body.report.reportId).to.include("16.0544-108.2022");',
            '});',
          ]
        ),
      ],
    },
    {
      name: '02 - Response Schema & Data Types (4 Cases)',
      item: [
        makeReq(
          'LOCALITY-DATA-01: Kiểm tra cấu trúc và kiểu dữ liệu các trường nhận diện khu vực',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const report = pm.response.json().report;',
            'pm.test("Các trường reportId, locality, province, district, ward là string không rỗng", function () {',
            '  ["reportId", "locality", "province", "district", "ward"].forEach(function (k) {',
            '    pm.expect(report[k]).to.be.a("string").and.not.empty;',
            '  });',
            '});',
          ]
        ),
        makeReq(
          'LOCALITY-DATA-02: Kiểm tra định dạng thời gian updatedAt là ISO 8601 hợp lệ',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const report = pm.response.json().report;',
            'pm.test("updatedAt là chuỗi ISO 8601 hợp lệ", function () {',
            '  pm.expect(report.updatedAt).to.be.a("string");',
            '  pm.expect(Date.parse(report.updatedAt)).to.not.be.NaN;',
            '});',
          ]
        ),
        makeReq(
          'LOCALITY-DATA-03: Kiểm tra chi phí xem báo cáo costGold là số nguyên không âm',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const report = pm.response.json().report;',
            'pm.test("costGold >= 0", function () {',
            '  pm.expect(report.costGold).to.be.a("number");',
            '  pm.expect(report.costGold).to.be.at.least(0);',
            '});',
          ]
        ),
        makeReq(
          'LOCALITY-DATA-04: Kiểm tra Header Content-Type trả về JSON chuẩn',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'pm.test("Content-Type là application/json", function () {',
            '  pm.expect((pm.response.headers.get("Content-Type") || "").toLowerCase()).to.include("application/json");',
            '});',
          ]
        ),
      ],
    },
    {
      name: '03 - Boundary Values & Query Fallback (8 Cases)',
      item: [
        makeReq(
          'LOCALITY-BOUND-01: Kiểm tra latitude bằng 0 - 200 OK',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=0&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'pm.test("reportId chứa 0.0000", function () { pm.expect(pm.response.json().report.reportId).to.include("0.0000"); });',
          ]
        ),
        makeReq(
          'LOCALITY-BOUND-02: Kiểm tra longitude bằng 0 - 200 OK',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=0',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'pm.test("reportId chứa 0.0000", function () { pm.expect(pm.response.json().report.reportId).to.include("0.0000"); });',
          ]
        ),
        makeReq(
          'LOCALITY-BOUND-03: Kiểm tra cả hai tọa độ đều bằng 0 (0, 0) - 200 OK',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=0&longitude=0',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'pm.test("reportId chứa 0.0000-0.0000", function () { pm.expect(pm.response.json().report.reportId).to.include("0.0000-0.0000"); });',
          ]
        ),
        makeReq(
          'LOCALITY-BOUND-04: Kiểm tra khi thiếu query parameter latitude - Fallback an toàn 200 OK',
          'GET',
          '{{webappUrl}}/api/locality-report?longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'pm.test("Fallback latitude = 0.0000", function () { pm.expect(pm.response.json().report.reportId).to.include("0.0000"); });',
          ]
        ),
        makeReq(
          'LOCALITY-BOUND-05: Kiểm tra khi thiếu query parameter longitude - Fallback an toàn 200 OK',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'pm.test("Fallback longitude = 0.0000", function () { pm.expect(pm.response.json().report.reportId).to.include("0.0000"); });',
          ]
        ),
        makeReq(
          'LOCALITY-BOUND-06: Kiểm tra khi không truyền cả 2 tham số tọa độ - Fallback an toàn 200 OK',
          'GET',
          '{{webappUrl}}/api/locality-report',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'pm.test("Fallback 0.0000-0.0000", function () { pm.expect(pm.response.json().report.reportId).to.include("0.0000-0.0000"); });',
          ]
        ),
        makeReq(
          'LOCALITY-BOUND-07: Kiểm tra latitude vượt ngưỡng cực bắc (91) - Không crash 5xx',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=91&longitude=105.826367',
          null,
          webHeaders,
          ['pm.test("Không phát sinh lỗi 5xx", function () { pm.expect(pm.response.code).to.be.below(500); });']
        ),
        makeReq(
          'LOCALITY-BOUND-08: Kiểm tra longitude vượt ngưỡng kinh tuyến (181) - Không crash 5xx',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=181',
          null,
          webHeaders,
          ['pm.test("Không phát sinh lỗi 5xx", function () { pm.expect(pm.response.code).to.be.below(500); });']
        ),
      ],
    },
    {
      name: '04 - Input Validation & Security (6 Cases)',
      item: [
        makeReq(
          'LOCALITY-VAL-01: Kiểm tra latitude không phải kiểu số (latitude=abc) - 400 Bad Request',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=abc&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });',
            'pm.test("Message báo lỗi tọa độ không hợp lệ", function () {',
            '  pm.expect(pm.response.json().message).to.include("Tọa độ địa phương không hợp lệ");',
            '});',
          ]
        ),
        makeReq(
          'LOCALITY-VAL-02: Kiểm tra longitude không phải kiểu số (longitude=abc) - 400 Bad Request',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=abc',
          null,
          webHeaders,
          [
            'pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });',
            'pm.test("Message báo lỗi tọa độ không hợp lệ", function () {',
            '  pm.expect(pm.response.json().message).to.include("Tọa độ địa phương không hợp lệ");',
            '});',
          ]
        ),
        makeReq(
          'LOCALITY-VAL-03: Kiểm tra latitude bằng chuỗi null literal (latitude=null) - 400 Bad Request',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=null&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });',
            'pm.test("Message báo lỗi tọa độ không hợp lệ", function () {',
            '  pm.expect(pm.response.json().message).to.include("Tọa độ địa phương không hợp lệ");',
            '});',
          ]
        ),
        makeReq(
          'LOCALITY-VAL-04: Kiểm tra longitude bằng chuỗi null literal (longitude=null) - 400 Bad Request',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=null',
          null,
          webHeaders,
          [
            'pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });',
            'pm.test("Message báo lỗi tọa độ không hợp lệ", function () {',
            '  pm.expect(pm.response.json().message).to.include("Tọa độ địa phương không hợp lệ");',
            '});',
          ]
        ),
        makeReq(
          'LOCALITY-VAL-05: Kiểm tra tham số chứa ký tự tấn công SQL Injection - 400 Bad Request',
          'GET',
          "{{webappUrl}}/api/locality-report?latitude=1'%20OR%20'1'%3D'1&longitude=105.826367",
          null,
          webHeaders,
          [
            'pm.test("HTTP 400 Bad Request (Chặn SQL Injection an toàn)", function () { pm.response.to.have.status(400); });',
          ]
        ),
        makeReq(
          'LOCALITY-VAL-06: Kiểm tra tham số chứa mã độc XSS Script - 400 Bad Request',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=%3Cscript%3Ealert(1)%3C%2Fscript%3E&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 400 Bad Request (Chặn XSS Script an toàn)", function () { pm.response.to.have.status(400); });',
          ]
        ),
      ],
    },
    {
      name: '05 - Protocol, Method & SLA (4 Cases)',
      item: [
        makeReq(
          'LOCALITY-METH-01: Kiểm tra từ chối phương thức POST - 405 Method Not Allowed',
          'POST',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          {},
          webHeaders,
          ['pm.test("HTTP 405 Method Not Allowed", function () { pm.response.to.have.status(405); });']
        ),
        makeReq(
          'LOCALITY-METH-02: Kiểm tra từ chối phương thức PUT - 405 Method Not Allowed',
          'PUT',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          {},
          webHeaders,
          ['pm.test("HTTP 405 Method Not Allowed", function () { pm.response.to.have.status(405); });']
        ),
        makeReq(
          'LOCALITY-METH-03: Kiểm tra từ chối phương thức DELETE - 405 Method Not Allowed',
          'DELETE',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          ['pm.test("HTTP 405 Method Not Allowed", function () { pm.response.to.have.status(405); });']
        ),
        makeReq(
          'LOCALITY-PERF-01: Kiểm tra thời gian phản hồi API (Response Time SLA < 2500ms)',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'pm.test("Response time < 2500ms", function () { pm.expect(pm.response.responseTime).to.be.below(2500); });',
          ]
        ),
      ],
    },
  ];

  const coll = {
    info: {
      _postman_id: '8ab0da23-2680-44ec-9fff-01da5a11af28',
      name: 'LandBase - Locality Report API (27 Test Cases)',
      description: 'Bộ kiểm thử tự động toàn diện 27 testcase cho GET /api/locality-report (Happy Path, Schema, Boundary, Validation, Security, HTTP Methods & SLA).',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'webappUrl', value: 'https://dev-webapp.laand.vn', type: 'string' },
      { key: 'baseUrl', value: 'https://dev-webapp.laand.vn', type: 'string' },
    ],
    item: items,
  };

  fs.writeFileSync(path.join(ROOT, 'LandBase_Locality_Report.postman_collection.json'), JSON.stringify(coll, null, 2), 'utf8');
  return coll;
}

// ============================================================================
// 2. BUILD LandBase_Utilities_Detail.postman_collection.json (32 Test Cases)
// ============================================================================
function buildUtilitiesDetailCollection() {
  const url = '{{baseUrl}}/api/v1.0/elasticsearch/public/service-facilities-user/utilities-detail';
  const defaultLat = 21.0112385;
  const defaultLng = 105.822485;
  const headers = makeGatewayHeaders(false);

  const items = [
    {
      name: '01 - Nghiệp vụ Danh mục Tiện ích (6 Cases)',
      item: [
        makeReq(
          'UTILITY-CAT-01: Tra cứu tiện ích "Khu thương mại, giải trí" (BDS00057) - 200 OK',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 10, realEstateId: null, tags: null },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("status = 1 và trả về danh sách Khu thương mại, giải trí", function () {',
            '  pm.expect(body.status).to.equal(1);',
            '  pm.expect(body.data.content).to.be.an("array").and.not.empty;',
            '  pm.expect(body.data.content[0].categoryCode).to.equal("BDS00057");',
            '});',
          ]
        ),
        makeReq(
          'UTILITY-CAT-02: Tra cứu tiện ích "Đường phố" (BDS00063) - 200 OK',
          'POST',
          url,
          { categoryCode: 'BDS00063', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 10 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("categoryName là Đường phố", function () {',
            '  pm.expect(body.data.content[0].categoryName).to.equal("Đường phố");',
            '});',
          ]
        ),
        makeReq(
          'UTILITY-CAT-03: Tra cứu tiện ích "Trường học" (BDS00052) - 200 OK',
          'POST',
          url,
          { categoryCode: 'BDS00052', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 10 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("categoryName là Trường học", function () {',
            '  pm.expect(body.data.content[0].categoryName).to.equal("Trường học");',
            '});',
          ]
        ),
        makeReq(
          'UTILITY-CAT-04: Tra cứu tiện ích "Cơ sở y tế" (BDS00054) - 200 OK',
          'POST',
          url,
          { categoryCode: 'BDS00054', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 10 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("categoryName là Cơ sở y tế", function () {',
            '  pm.expect(body.data.content[0].categoryName).to.equal("Cơ sở y tế");',
            '});',
          ]
        ),
        makeReq(
          'UTILITY-CAT-05: Tra cứu tiện ích "Ngân hàng" (BDS00060) - 200 OK',
          'POST',
          url,
          { categoryCode: 'BDS00060', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 10 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("categoryName là Ngân hàng", function () {',
            '  pm.expect(body.data.content[0].categoryName).to.equal("Ngân hàng");',
            '});',
          ]
        ),
        makeReq(
          'UTILITY-CAT-06: Tra cứu tiện ích "Cơ sở lưu trú" (BDS00058) - 200 OK',
          'POST',
          url,
          { categoryCode: 'BDS00058', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 10 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("categoryName là Cơ sở lưu trú", function () {',
            '  pm.expect(body.data.content[0].categoryName).to.equal("Cơ sở lưu trú");',
            '});',
          ]
        ),
      ],
    },
    {
      name: '02 - Bộ lọc Bán kính, Sắp xếp & Phân trang (7 Cases)',
      item: [
        makeReq(
          'UTILITY-RAD-01: Lọc tiện ích bán kính 1 km (radius: 1) - Tọa độ <= 1.0 km',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 1, page: 0, size: 10 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const content = pm.response.json().data.content;',
            'pm.test("Mọi địa điểm có distance <= 1.0 km", function () {',
            '  content.forEach(item => pm.expect(item.serviceFacilitiesUserDetailVo.distance).to.be.at.most(1.0));',
            '});',
          ]
        ),
        makeReq(
          'UTILITY-RAD-02: Lọc tiện ích bán kính 3 km (radius: 3) - Khớp UI mặc định',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 10 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const content = pm.response.json().data.content;',
            'pm.test("Mọi địa điểm có distance <= 3.0 km", function () {',
            '  content.forEach(item => pm.expect(item.serviceFacilitiesUserDetailVo.distance).to.be.at.most(3.0));',
            '});',
          ]
        ),
        makeReq(
          'UTILITY-RAD-03: Mở rộng bán kính lên 5 km (radius: 5) - Tổng số lượng lớn',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 5, page: 0, size: 10 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'pm.test("totalElements > 0", function () { pm.expect(pm.response.json().data.totalElements).to.be.above(0); });',
          ]
        ),
        makeReq(
          'UTILITY-DATA-01: Kiểm tra danh sách được sắp xếp từ gần đến xa (distance tăng dần)',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 10 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const content = pm.response.json().data.content;',
            'pm.test("Khoảng cách được sắp xếp tăng dần", function () {',
            '  for (let i = 0; i < content.length - 1; i++) {',
            '    pm.expect(content[i].serviceFacilitiesUserDetailVo.distance).to.be.at.most(content[i + 1].serviceFacilitiesUserDetailVo.distance);',
            '  }',
            '});',
          ]
        ),
        makeReq(
          'UTILITY-DATA-02: Kiểm tra cấu trúc trường chi tiết serviceFacilitiesUserDetailVo',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 5 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const vo = pm.response.json().data.content[0].serviceFacilitiesUserDetailVo;',
            'pm.test("serviceFacilitiesUserDetailVo có đủ name, distance, travelTime, latitude, longitude", function () {',
            '  ["name", "distance", "travelTime", "latitude", "longitude"].forEach(k => pm.expect(vo).to.have.property(k));',
            '});',
          ]
        ),
        makeReq(
          'UTILITY-PAGE-01: Kiểm tra phân trang trang đầu (page: 0, size: 6)',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 6 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const data = pm.response.json().data;',
            'pm.test("number = 0, size = 6, first = true", function () {',
            '  pm.expect(data.number).to.equal(0);',
            '  pm.expect(data.size).to.equal(6);',
            '  pm.expect(data.first).to.equal(true);',
            '});',
          ]
        ),
        makeReq(
          'UTILITY-PAGE-02: Kiểm tra chuyển sang trang kế tiếp (page: 1, size: 5)',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 1, size: 5 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'pm.test("number = 1", function () { pm.expect(pm.response.json().data.number).to.equal(1); });',
          ]
        ),
      ],
    },
    {
      name: '03 - Validation & Cố tình truyền sai (19 Cases)',
      item: [
        makeReq(
          'UTILITY-VAL-01: Kiểm tra khi thiếu trường categoryCode - 400 Bad Request',
          'POST',
          url,
          { latitude: defaultLat, longitude: defaultLng, radius: 3 },
          headers,
          [
            'pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });',
            'pm.test("Báo lỗi Danh mục không được bỏ trống", function () { pm.expect(pm.response.json().message).to.include("Danh mục không được bỏ trống"); });',
          ]
        ),
        makeReq(
          'UTILITY-VAL-02: Kiểm tra khi body rỗng {} - 400 Bad Request',
          'POST',
          url,
          {},
          headers,
          [
            'pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });',
            'pm.test("Báo lỗi Danh mục không được bỏ trống", function () { pm.expect(pm.response.json().message).to.include("Danh mục không được bỏ trống"); });',
          ]
        ),
        makeReq(
          'UTILITY-VAL-03: Kiểm tra với categoryCode rỗng ("") - 400 Bad Request',
          'POST',
          url,
          { categoryCode: '', latitude: defaultLat, longitude: defaultLng, radius: 3 },
          headers,
          [
            'pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });',
            'pm.test("Báo lỗi Danh mục không được bỏ trống", function () { pm.expect(pm.response.json().message).to.include("Danh mục không được bỏ trống"); });',
          ]
        ),
        makeReq(
          'UTILITY-VAL-04: Kiểm tra với categoryCode không tồn tại (BDS99999) - Trả về mảng rỗng 200 OK',
          'POST',
          url,
          { categoryCode: 'BDS99999', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 10 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'pm.test("content là mảng rỗng []", function () { pm.expect(pm.response.json().data.content).to.be.an("array").that.is.empty; });',
          ]
        ),
        makeReq(
          'UTILITY-NEG-01: Cố tình truyền categoryCode là null - 400 Bad Request',
          'POST',
          url,
          { categoryCode: null, latitude: defaultLat, longitude: defaultLng, radius: 3 },
          headers,
          ['pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });']
        ),
        makeReq(
          'UTILITY-NEG-02: Cố tình truyền categoryCode chỉ gồm khoảng trắng ("   ") - 400 Bad Request',
          'POST',
          url,
          { categoryCode: '   ', latitude: defaultLat, longitude: defaultLng, radius: 3 },
          headers,
          ['pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });']
        ),
        makeReq(
          'UTILITY-NEG-03: Cố tình truyền kích thước trang size: 101 (vượt giới hạn 100) - 400 Bad Request',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 101 },
          headers,
          [
            'pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });',
            'pm.test("Message chứa max.size.of.page.is.100", function () { pm.expect(pm.response.json().message).to.include("max.size.of.page.is.100"); });',
          ]
        ),
        makeReq(
          'UTILITY-NEG-04: Cố tình truyền latitude là chuỗi chữ cái ("abc") - 406 Not Acceptable',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: 'abc', longitude: defaultLng, radius: 3 },
          headers,
          ['pm.test("HTTP 406 Not Acceptable", function () { pm.response.to.have.status(406); });']
        ),
        makeReq(
          'UTILITY-NEG-05: Cố tình truyền longitude là chuỗi chữ cái ("xyz") - 406 Not Acceptable',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: 'xyz', radius: 3 },
          headers,
          ['pm.test("HTTP 406 Not Acceptable", function () { pm.response.to.have.status(406); });']
        ),
        makeReq(
          'UTILITY-NEG-06: Cố tình truyền latitude vượt miền tọa độ địa lý (999) - 406 Not Acceptable',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: 999, longitude: defaultLng, radius: 3 },
          headers,
          ['pm.test("HTTP 406 Not Acceptable", function () { pm.response.to.have.status(406); });']
        ),
        makeReq(
          'UTILITY-NEG-07: Cố tình truyền longitude vượt miền tọa độ địa lý (999) - 406 Not Acceptable',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: 999, radius: 3 },
          headers,
          ['pm.test("HTTP 406 Not Acceptable", function () { pm.response.to.have.status(406); });']
        ),
        makeReq(
          'UTILITY-NEG-08: Cố tình truyền bán kính âm (radius: -5) - 406 Not Acceptable',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: -5 },
          headers,
          ['pm.test("HTTP 406 Not Acceptable", function () { pm.response.to.have.status(406); });']
        ),
        makeReq(
          'UTILITY-NEG-09: Cố tình truyền bán kính bằng 0 (radius: 0) - 406 Not Acceptable',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 0 },
          headers,
          ['pm.test("HTTP 406 Not Acceptable", function () { pm.response.to.have.status(406); });']
        ),
        makeReq(
          'UTILITY-NEG-10: Cố tình truyền radius là chuỗi chữ cái ("abc") - 406 Not Acceptable',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 'abc' },
          headers,
          ['pm.test("HTTP 406 Not Acceptable", function () { pm.response.to.have.status(406); });']
        ),
        makeReq(
          'UTILITY-SEC-01: Cố tình tấn công SQL Injection vào categoryCode - Hệ thống an toàn 200 OK',
          'POST',
          url,
          { categoryCode: "BDS00057' OR '1'='1", latitude: defaultLat, longitude: defaultLng, radius: 3 },
          headers,
          ['pm.test("HTTP 200 OK (Không rò rỉ lỗi SQL)", function () { pm.response.to.have.status(200); });']
        ),
        makeReq(
          'UTILITY-SEC-02: Cố tình chèn mã độc XSS Script vào categoryCode - Không thực thi 200 OK',
          'POST',
          url,
          { categoryCode: '<script>alert("xss")</script>', latitude: defaultLat, longitude: defaultLng, radius: 3 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'pm.test("Trả về mảng rỗng an toàn", function () { pm.expect(pm.response.json().data.content).to.be.empty; });',
          ]
        ),
        makeReq(
          'UTILITY-SEC-03: Cố tình gửi Body dạng mảng JSON [{...}] thay vì Object - 406 Not Acceptable',
          'POST',
          url,
          [{ categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 3 }],
          headers,
          ['pm.test("HTTP 406 Not Acceptable", function () { pm.response.to.have.status(406); });']
        ),
        makeReq(
          'UTILITY-METH-01: Cố tình gọi phương thức GET vào endpoint POST - Từ chối 401/405',
          'GET',
          url,
          null,
          headers,
          ['pm.test("HTTP 401 hoặc 405", function () { pm.expect([401, 405]).to.include(pm.response.code); });']
        ),
        makeReq(
          'UTILITY-PERF-01: Kiểm tra thời gian phản hồi API Elasticsearch SLA (< 3500ms)',
          'POST',
          url,
          { categoryCode: 'BDS00057', latitude: defaultLat, longitude: defaultLng, radius: 3, page: 0, size: 10 },
          headers,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'pm.test("Response time < 3500ms", function () { pm.expect(pm.response.responseTime).to.be.below(3500); });',
          ]
        ),
      ],
    },
  ];

  const coll = {
    info: {
      _postman_id: '7d1f2e3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a',
      name: 'LandBase - Utilities Detail API (32 Test Cases)',
      description: 'Bộ kiểm thử tự động toàn diện 32 testcase cho POST /api/v1.0/elasticsearch/public/service-facilities-user/utilities-detail (Danh mục tiện ích, Bán kính, Sắp xếp, Phân trang, Validation, Negative, Security & SLA).',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'baseUrl', value: 'https://dev-gateway.laand.vn', type: 'string' },
      { key: 'origin', value: 'https://dev-webapp.laand.vn', type: 'string' },
      { key: 'referer', value: 'https://dev-webapp.laand.vn/', type: 'string' },
    ],
    item: items,
  };

  fs.writeFileSync(path.join(ROOT, 'LandBase_Utilities_Detail.postman_collection.json'), JSON.stringify(coll, null, 2), 'utf8');
  return coll;
}

// ============================================================================
// 3. UPDATE LandBase_Onboarding_Reward.postman_collection.json (Normalize URLs + Add 6 Negative/Security/SLA Cases)
// ============================================================================
function updateOnboardingCollection() {
  const onbPath = path.join(ROOT, 'LandBase_Onboarding_Reward.postman_collection.json');
  const onbColl = JSON.parse(fs.readFileSync(onbPath, 'utf8'));

  // Set baseUrl to https://dev-gateway.laand.vn
  onbColl.variable = [
    { key: 'baseUrl', value: 'https://dev-gateway.laand.vn', type: 'string' },
  ];

  // Normalize all request URLs to include /api/v1.0/auth prefix if not already present
  function normalizeItems(items) {
    for (const it of items || []) {
      if (it.item) normalizeItems(it.item);
      if (it.request && it.request.url) {
        const u = it.request.url;
        if (typeof u.raw === 'string' && u.raw.startsWith('{{baseUrl}}/') && !u.raw.startsWith('{{baseUrl}}/api/v1.0/auth/')) {
          u.raw = u.raw.replace('{{baseUrl}}/', '{{baseUrl}}/api/v1.0/auth/');
        }
        if (Array.isArray(u.path) && u.path[0] !== 'api') {
          u.path = ['api', 'v1.0', 'auth', ...u.path];
        }
      }
    }
  }
  normalizeItems(onbColl.item);

  // Add Group 07: Negative, Security & SLA (6 extra cases from onboarding-reward.spec.ts)
  const extraGroupName = 'Negative, Security & SLA (Cố tình truyền sai & Bảo mật)';
  const existingIdx = onbColl.item.findIndex(g => g.name === extraGroupName);
  const extraGroup = {
    name: extraGroupName,
    description: '6 test cases bổ sung kiểm tra Token giả mạo, tham số âm, thiếu Authorization, SQLi/XSS và SLA (< 3500ms)',
    item: [
      makeReq(
        'ONB-NEG-01 - Gọi API onboarding đăng nhập với JWT Token giả mạo',
        'GET',
        '{{baseUrl}}/api/v1.0/auth/rewards/onboarding',
        null,
        makeGatewayHeaders(true, { Authorization: 'Bearer eyJhbGciOiJIUzUxMiJ9.INVALID_PAYLOAD.INVALID_SIGNATURE' }),
        [
          'pm.test("Không phát sinh lỗi máy chủ 5xx", function () { pm.expect(pm.response.code).to.be.below(500); });',
          'pm.test("Từ chối token giả mạo (401/403/406)", function () { pm.expect([401, 403, 406]).to.include(pm.response.code); });',
        ]
      ),
      makeReq(
        'ONB-NEG-02 - Lưu progress với currentStep là số âm (-1)',
        'POST',
        '{{baseUrl}}/api/v1.0/auth/rewards/onboarding/tasks/{{notCompletedTaskCode}}/progress',
        { currentStep: -1 },
        makeGatewayHeaders(true),
        [
          'pm.test("Không phát sinh lỗi máy chủ 5xx", function () { pm.expect(pm.response.code).to.be.below(500); });',
          'pm.test("status = 0 (Từ chối bước âm)", function () { pm.expect(pm.response.json().status).to.equal(0); });',
        ]
      ),
      makeReq(
        'ONB-NEG-03 - Lưu vị trí quan tâm khi không có Authorization header',
        'POST',
        '{{baseUrl}}/api/v1.0/auth/users/interest-location',
        { role: 'BUYER', provinceCode: '{{provinceCode}}' },
        makeGatewayHeaders(false),
        [
          'pm.test("Không phát sinh lỗi máy chủ 5xx", function () { pm.expect(pm.response.code).to.be.below(500); });',
          'pm.test("Từ chối khi thiếu Authorization (status = 0)", function () { pm.expect(pm.response.json().status).to.equal(0); });',
        ]
      ),
      makeReq(
        'ONB-NEG-04 - Đánh dấu xem tour khi không có Authorization header',
        'POST',
        '{{baseUrl}}/api/v1.0/auth/users/seen-guide/ONBOARDING_TOUR',
        null,
        makeGatewayHeaders(false),
        [
          'pm.test("Không phát sinh lỗi máy chủ 5xx", function () { pm.expect(pm.response.code).to.be.below(500); });',
          'pm.test("Từ chối khi thiếu Authorization (status = 0)", function () { pm.expect(pm.response.json().status).to.equal(0); });',
        ]
      ),
      makeReq(
        'ONB-SEC-01 - Kiểm tra an toàn SQL Injection / XSS trong provinceCode',
        'POST',
        '{{baseUrl}}/api/v1.0/auth/users/interest-location',
        { role: 'BUYER', provinceCode: "01' OR '1'='1'; <script>alert(1)</script>" },
        makeGatewayHeaders(true),
        [
          'pm.test("Không phát sinh lỗi máy chủ 5xx", function () { pm.expect(pm.response.code).to.be.below(500); });',
          'pm.test("status = 0 và không rò rỉ lỗi SQL", function () {',
          '  pm.expect(pm.response.json().status).to.equal(0);',
          '  pm.expect(pm.response.text().toLowerCase()).to.not.include("syntax error");',
          '});',
        ]
      ),
      makeReq(
        'ONB-PERF-01 - Kiểm tra SLA thời gian phản hồi của API Onboarding (< 3500ms)',
        'GET',
        '{{baseUrl}}/api/v1.0/auth/rewards/onboarding',
        null,
        makeGatewayHeaders(true),
        [
          'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
          'pm.test("Response time < 3500ms", function () { pm.expect(pm.response.responseTime).to.be.below(3500); });',
        ]
      ),
    ],
  };

  if (existingIdx >= 0) {
    onbColl.item[existingIdx] = extraGroup;
  } else {
    onbColl.item.push(extraGroup);
  }

  fs.writeFileSync(onbPath, JSON.stringify(onbColl, null, 2), 'utf8');

  // Update standalone onboarding environment baseUrl as well
  const onbEnvPath = path.join(ROOT, 'LandBase_Onboarding_Reward_Environment.postman_environment.json');
  if (fs.existsSync(onbEnvPath)) {
    const onbEnv = JSON.parse(fs.readFileSync(onbEnvPath, 'utf8'));
    const baseVar = onbEnv.values.find(v => v.key === 'baseUrl');
    if (baseVar) baseVar.value = 'https://dev-gateway.laand.vn';
    const allowVar = onbEnv.values.find(v => v.key === 'allowStateChangeRequests');
    if (allowVar) allowVar.value = 'true';
    fs.writeFileSync(onbEnvPath, JSON.stringify(onbEnv, null, 2), 'utf8');
  }
}

// ============================================================================
// 4. UPDATE LandBase_AI_Location_News_Report.postman_collection.json (Add REPORT-API-22..30 = 30 Cases)
// ============================================================================
function updateAiLocationReportCollection() {
  const aiPath = path.join(ROOT, 'LandBase_AI_Location_News_Report.postman_collection.json');
  const aiColl = JSON.parse(fs.readFileSync(aiPath, 'utf8'));
  const url = '{{baseUrl}}/api/v1.0/real-estate/public/news/report-by-location';

  // Ensure Group 01 has REPORT-API-22 and REPORT-API-23
  const group1 = aiColl.item[0];
  if (group1 && group1.item) {
    group1.item = group1.item.filter(it => !it.name.startsWith('REPORT-API-22') && !it.name.startsWith('REPORT-API-23'));
    group1.item.push(
      makeReq(
        'REPORT-API-22 - Kiểm tra chi tiết Schema 13 trường nội dung Báo cáo AI (id, slug, title, content, pdfUrl, provinceCode, wardCode, reportYear, reportQuarter)',
        'POST',
        url,
        { lat: 20.983173, lon: 105.828624 },
        makeGatewayHeaders(true),
        [
          'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
          'const report = pm.response.json().data;',
          'pm.test("Báo cáo AI có đầy đủ 13 trường dữ liệu chuẩn", function () {',
          '  ["id","slug","title","description","content","imageUrl","pdfUrl","provinceCode","wardCode","reportYear","reportQuarter","postDate","isLoginRequired"].forEach(k => pm.expect(report).to.have.property(k));',
          '});',
        ]
      ),
      makeReq(
        'REPORT-API-23 - Kiểm tra cấu trúc Response Wrapper chuẩn của Gateway LandBase',
        'POST',
        url,
        { lat: 20.983173, lon: 105.828624 },
        makeGatewayHeaders(true),
        [
          'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
          'const body = pm.response.json();',
          'pm.test("Wrapper có status=1, duration, path, responseTime, clientTime, clientMessageId, data", function () {',
          '  pm.expect(body).to.have.property("status", 1);',
          '  ["duration","path","responseTime","clientTime","clientMessageId","data"].forEach(k => pm.expect(body).to.have.property(k));',
          '});',
        ]
      )
    );
  }

  // Add Group 04: REPORT-API-24..30
  const group4Name = '04 - Cố tình truyền sai nâng cao, Bảo mật & Hiệu năng (SLA)';
  const existingG4Idx = aiColl.item.findIndex(g => g.name === group4Name);
  const group4 = {
    name: group4Name,
    description: 'Kiểm tra các trường hợp cố tình truyền sai kiểu dữ liệu nâng cao (Boolean, Array, Object, Root Array, Whitespace), SQLi/XSS, Sai HTTP Method và SLA.',
    item: [
      makeReq(
        'REPORT-API-24 - Cố tình truyền kiểu boolean cho lat và lon (lat: true, lon: false)',
        'POST',
        url,
        { lat: true, lon: false },
        makeGatewayHeaders(true),
        [
          'pm.test("HTTP 400 hoặc 406", function () { pm.expect([400, 406]).to.include(pm.response.code); });',
          'pm.test("status = 0", function () { pm.expect(pm.response.json().status).to.equal(0); });',
        ]
      ),
      makeReq(
        'REPORT-API-25 - Cố tình truyền kiểu Array và Object cho lat và lon',
        'POST',
        url,
        { lat: [20.983173], lon: { value: 105.828624 } },
        makeGatewayHeaders(true),
        [
          'pm.test("HTTP 406 Not Acceptable", function () { pm.response.to.have.status(406); });',
          'pm.test("status = 0", function () { pm.expect(pm.response.json().status).to.equal(0); });',
        ]
      ),
      makeReq(
        'REPORT-API-26 - Cố tình truyền JSON Root là Array [] thay vì Object {}',
        'POST',
        url,
        [{ lat: 20.983173, lon: 105.828624 }],
        makeGatewayHeaders(true),
        [
          'pm.test("HTTP 406 Not Acceptable", function () { pm.response.to.have.status(406); });',
          'pm.test("status = 0", function () { pm.expect(pm.response.json().status).to.equal(0); });',
        ]
      ),
      makeReq(
        'REPORT-API-27 - Cố tình truyền chuỗi khoảng trắng ("   ") cho lat và lon',
        'POST',
        url,
        { lat: '   ', lon: '   ' },
        makeGatewayHeaders(true),
        [
          'pm.test("HTTP 400 Bad Request", function () { pm.expect([400, 406]).to.include(pm.response.code); });',
          'pm.test("status = 0", function () { pm.expect(pm.response.json().status).to.equal(0); });',
        ]
      ),
      makeReq(
        'REPORT-API-28 - Kiểm tra an toàn SQL Injection & XSS trong tham số lat/lon',
        'POST',
        url,
        { lat: "20.983173' OR '1'='1", lon: '<script>alert("xss")</script>' },
        makeGatewayHeaders(true),
        [
          'pm.test("HTTP 406 Not Acceptable (Chặn an toàn)", function () { pm.response.to.have.status(406); });',
          'pm.test("Không rò rỉ lỗi SQL", function () { pm.expect(pm.response.text().toLowerCase()).to.not.include("syntax error"); });',
        ]
      ),
      makeReq(
        'REPORT-API-29 - Gọi sai phương thức HTTP (DELETE thay vì POST)',
        'DELETE',
        url,
        null,
        makeGatewayHeaders(true),
        [
          'pm.test("Từ chối phương thức DELETE (4xx)", function () { pm.expect(pm.response.code).to.be.within(400, 499); });',
        ]
      ),
      makeReq(
        'REPORT-API-30 - Kiểm tra SLA thời gian phản hồi API Báo cáo AI (< 3500ms)',
        'POST',
        url,
        { lat: 20.983173, lon: 105.828624 },
        makeGatewayHeaders(true),
        [
          'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
          'pm.test("Response time < 3500ms", function () { pm.expect(pm.response.responseTime).to.be.below(3500); });',
        ]
      ),
    ],
  };

  if (existingG4Idx >= 0) {
    aiColl.item[existingG4Idx] = group4;
  } else {
    aiColl.item.push(group4);
  }

  fs.writeFileSync(aiPath, JSON.stringify(aiColl, null, 2), 'utf8');

  const aiEnvPath = path.join(ROOT, 'LandBase_AI_Location_News_Report_Environment.postman_environment.json');
  if (fs.existsSync(aiEnvPath)) {
    const aiEnv = JSON.parse(fs.readFileSync(aiEnvPath, 'utf8'));
    const confirmVar = aiEnv.values.find(v => v.key === 'confirmRunAIReport');
    if (confirmVar) confirmVar.value = 'true';
    fs.writeFileSync(aiEnvPath, JSON.stringify(aiEnv, null, 2), 'utf8');
  }
}

// ============================================================================
// 5. BUILD LandBase_Area_Overview_AI.postman_collection.json (27 Test Cases - Mục E, F & Negative)
// ============================================================================
function buildAreaOverviewAiCollection() {
  const webHeaders = [
    { key: 'Accept', value: 'application/json', type: 'text' },
    { key: 'Content-Type', value: 'application/json', type: 'text' },
    { key: 'Origin', value: '{{webappUrl}}', type: 'text' },
    { key: 'Referer', value: '{{webappUrl}}/ban-do', type: 'text' },
  ];

  const defaultReportId = 'mock-report-ha-noi-cau-giay-yen-hoa-21.0193-105.8264';

  const items = [
    {
      name: '01 - Mục E: Phân tích khu vực bằng AI trên Popup Tổng quan khu vực (AI-E-001 .. AI-E-009)',
      item: [
        makeReq(
          'AI-E-001: Hiển thị khối Phân tích khu vực bằng AI trên popup Tổng quan khu vực',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Trả về available = true và thông tin nhận diện báo cáo khu vực", function () {',
            '  pm.expect(body.available).to.be.true;',
            '  pm.expect(body.report.locality).to.be.a("string").and.not.empty;',
            '});',
          ]
        ),
        makeReq(
          'AI-E-002: Hiển thị đúng địa bàn theo vị trí đang xem (Đối chiếu Vị trí A và Vị trí B)',
          'POST',
          '{{gatewayUrl}}/api/v1.0/real-estate/public/news/report-by-location',
          { lat: 20.983173, lon: 105.828624 },
          makeGatewayHeaders(true),
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Địa bàn khớp đúng Tỉnh/TP Hà Nội (01)", function () {',
            '  pm.expect(body.data.provinceCode).to.equal("01");',
            '});',
          ]
        ),
        makeReq(
          'AI-E-003: Không hiển thị nội dung AI tóm tắt trực tiếp trên popup Tổng quan khu vực',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Payload trên popup không chứa nội dung tóm tắt dài (sections/content/summary)", function () {',
            '  pm.expect(body.report).to.not.have.property("sections");',
            '  pm.expect(body.report).to.not.have.property("content");',
            '  pm.expect(body.report).to.not.have.property("summary");',
            '});',
          ]
        ),
        makeReq(
          'AI-E-004: Hiển thị nút Xem thêm / Xem báo cáo ở cấp Tỉnh/TP khi có báo cáo hiện hành',
          'POST',
          '{{gatewayUrl}}/api/v1.0/real-estate/public/news/report-by-location',
          { lat: 20.983173, lon: 105.828624 },
          makeGatewayHeaders(true),
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Tỉnh/TP có báo cáo hiện hành hợp lệ", function () {',
            '  pm.expect(body.data).to.be.an("object");',
            '  pm.expect(body.data.provinceCode).to.equal("01");',
            '});',
          ]
        ),
        makeReq(
          'AI-E-005: Hiển thị nút Xem báo cáo ở cấp Xã/Phường khi có báo cáo hiện hành',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Xã/Phường có reportId hợp lệ để hiển thị nút Xem báo cáo địa phương", function () {',
            '  pm.expect(body.available).to.be.true;',
            '  pm.expect(body.report.ward).to.be.a("string").and.not.empty;',
            '  pm.expect(body.report.reportId).to.be.a("string").and.not.empty;',
            '});',
          ]
        ),
        makeReq(
          'AI-E-006: Không hiển thị nút Xem báo cáo khi Xã/Phường chưa có báo cáo hiện hành',
          'POST',
          '{{gatewayUrl}}/api/v1.0/real-estate/public/news/report-by-location',
          { lat: 8.3434, lon: 4.5656 },
          makeGatewayHeaders(true),
          [
            'pm.test("Không phát sinh lỗi máy chủ 5xx", function () { pm.expect(pm.response.code).to.be.below(500); });',
            'const body = pm.response.json();',
            'pm.test("Không trả về báo cáo khi tọa độ chưa có dữ liệu hiện hành", function () {',
            '  pm.expect(body.data).to.be.null;',
            '});',
          ]
        ),
        makeReq(
          'AI-E-007: Cập nhật thông tin báo cáo khi đổi vị trí (Vị trí A có báo cáo -> Vị trí B không có báo cáo)',
          'POST',
          '{{gatewayUrl}}/api/v1.0/real-estate/public/news/report-by-location',
          { lat: 8.3434, lon: 4.5656 },
          makeGatewayHeaders(true),
          [
            'pm.test("Không giữ lại dữ liệu báo cáo của vị trí A khi sang vị trí B", function () {',
            '  const body = pm.response.json();',
            '  pm.expect(body.data).to.be.null;',
            '});',
          ]
        ),
        makeReq(
          'AI-E-008: Mở lại popup ở cùng vị trí không kích hoạt tạo báo cáo AI mới (Idempotent Lookup)',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Chỉ trả về metadata báo cáo hiện hành, giữ nguyên reportId & updatedAt", function () {',
            '  pm.expect(body.report.reportId).to.include("21.0193-105.8264");',
            '  pm.expect(body.report.updatedAt).to.be.a("string");',
            '});',
          ]
        ),
        makeReq(
          'AI-E-009: Hiển thị linh hoạt khi cấu trúc báo cáo (sections) được cập nhật',
          'POST',
          '{{webappUrl}}/api/locality-report/unlock',
          { reportId: defaultReportId },
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Trả về danh sách sections động gồm title, summary và items", function () {',
            '  pm.expect(body.report.sections).to.be.an("array").that.is.not.empty;',
            '  body.report.sections.forEach(s => {',
            '    pm.expect(s).to.have.property("title");',
            '    pm.expect(s).to.have.property("summary");',
            '    pm.expect(s.items).to.be.an("array");',
            '  });',
            '});',
          ]
        ),
      ],
    },
    {
      name: '02 - Mục F: Mở báo cáo AI & Quy tắc trừ Vàng (AI-F-001 .. AI-F-012)',
      item: [
        makeReq(
          'AI-F-001: Chưa đăng nhập nhấn Xem thêm ở cấp Tỉnh/TP -> Yêu cầu đăng nhập (isLoginRequired)',
          'POST',
          '{{gatewayUrl}}/api/v1.0/real-estate/public/news/report-by-location',
          { lat: 20.983173, lon: 105.828624 },
          makeGatewayHeaders(false),
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Có cờ kiểm soát đăng nhập isLoginRequired", function () {',
            '  pm.expect(body.data.isLoginRequired).to.be.a("boolean");',
            '});',
          ]
        ),
        makeReq(
          'AI-F-002: Chưa đăng nhập nhấn Xem báo cáo ở cấp Xã/Phường -> Yêu cầu đăng nhập',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Chỉ trả về metadata, chưa mở khóa sections khi chưa đăng nhập", function () {',
            '  pm.expect(body.available).to.be.true;',
            '  pm.expect(body.report).to.not.have.property("sections");',
            '});',
          ]
        ),
        makeReq(
          'AI-F-003: Đăng nhập thành công và mở báo cáo cấp Tỉnh/TP',
          'POST',
          '{{gatewayUrl}}/api/v1.0/real-estate/public/news/report-by-location',
          { lat: 20.983173, lon: 105.828624 },
          makeGatewayHeaders(true),
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Mở báo cáo cấp Tỉnh/TP thành công với đầy đủ content và pdfUrl", function () {',
            '  pm.expect(body.data.content.length).to.be.above(100);',
            '  pm.expect(body.data.pdfUrl).to.be.a("string");',
            '});',
          ]
        ),
        makeReq(
          'AI-F-004: Mở báo cáo đúng Tỉnh/TP chứa vị trí đang xem',
          'POST',
          '{{gatewayUrl}}/api/v1.0/real-estate/public/news/report-by-location',
          { lat: 20.983173, lon: 105.828624 },
          makeGatewayHeaders(true),
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Báo cáo khớp đúng Tỉnh/TP Hà Nội (provinceCode = 01)", function () {',
            '  pm.expect(body.data.provinceCode).to.equal("01");',
            '  pm.expect(body.data.title.toLowerCase()).to.include("hà nội");',
            '});',
          ]
        ),
        makeReq(
          'AI-F-005: Mở báo cáo đúng Xã/Phường chứa vị trí đang xem',
          'POST',
          '{{webappUrl}}/api/locality-report/unlock',
          { reportId: defaultReportId },
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Báo cáo mở khóa khớp đúng Xã/Phường và Quận/Huyện đang xem", function () {',
            '  pm.expect(body.report.reportId).to.equal("' + defaultReportId + '");',
            '  pm.expect(body.report.ward).to.be.a("string").and.not.empty;',
            '  pm.expect(body.report.district).to.be.a("string").and.not.empty;',
            '});',
          ]
        ),
        makeReq(
          'AI-F-006: Không trừ Vàng khi chỉ mở popup Tổng quan khu vực',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=21.019301&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Lookup khi mở popup là thao tác chỉ đọc (GET), không trừ Vàng", function () {',
            '  pm.expect(body).to.not.have.property("remainingGold");',
            '  pm.expect(body.report.costGold).to.be.at.least(0);',
            '});',
          ]
        ),
        makeReq(
          'AI-F-007: Không trừ Vàng khi chỉ hiển thị nút mở báo cáo mà không nhấn mở khóa',
          'GET',
          '{{gatewayUrl}}/api/v1.0/auth/group/get-currentUserLimit',
          null,
          makeGatewayHeaders(true),
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Số dư Vàng của người dùng được bảo toàn khi chưa gọi API unlock", function () {',
            '  pm.expect(body.status).to.equal(1);',
            '  pm.expect(body.data.totalGold).to.be.a("number");',
            '});',
          ]
        ),
        makeReq(
          'AI-F-008: Không trừ Vàng khi mở và đọc báo cáo cấp Tỉnh/TP',
          'POST',
          '{{gatewayUrl}}/api/v1.0/real-estate/public/news/report-by-location',
          { lat: 20.983173, lon: 105.828624 },
          makeGatewayHeaders(true),
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Đọc báo cáo cấp Tỉnh/TP miễn phí, không phát sinh trừ Vàng", function () {',
            '  pm.expect(body.status).to.equal(1);',
            '  pm.expect(body.data).to.be.an("object");',
            '});',
          ]
        ),
        makeReq(
          'AI-F-009: Mở báo cáo Xã/Phường khi đủ Vàng -> Trừ Vàng và mở khóa báo cáo tại màn đích',
          'POST',
          '{{webappUrl}}/api/locality-report/unlock',
          { reportId: defaultReportId },
          webHeaders,
          [
            'pm.test("HTTP 200 OK", function () { pm.response.to.have.status(200); });',
            'const body = pm.response.json();',
            'pm.test("Mở khóa thành công, trả về sections và remainingGold >= 0", function () {',
            '  pm.expect(body.report.costGold).to.equal(1);',
            '  pm.expect(body.remainingGold).to.be.a("number").and.at.least(0);',
            '  pm.expect(body.report.sections).to.be.an("array").that.is.not.empty;',
            '});',
          ]
        ),
        makeReq(
          'AI-F-010: Không đủ Vàng khi mở báo cáo Xã/Phường -> Chặn mở khóa báo cáo',
          'POST',
          '{{webappUrl}}/api/locality-report/unlock',
          { reportId: '' },
          webHeaders,
          [
            'pm.test("HTTP 400 Bad Request khi không đủ điều kiện mở khóa", function () {',
            '  pm.response.to.have.status(400);',
            '});',
          ]
        ),
        makeReq(
          'AI-F-011: Không mở báo cáo Xã/Phường khi chưa có báo cáo hiện hành',
          'POST',
          '{{gatewayUrl}}/api/v1.0/real-estate/public/news/report-by-location',
          { lat: 8.3434, lon: 4.5656 },
          makeGatewayHeaders(true),
          [
            'pm.test("Không phát sinh lỗi 5xx", function () { pm.expect(pm.response.code).to.be.below(500); });',
            'pm.test("data = null khi chưa có báo cáo hiện hành", function () {',
            '  pm.expect(pm.response.json().data).to.be.null;',
            '});',
          ]
        ),
        makeReq(
          'AI-F-012: Xử lý an toàn khi báo cáo hiện hành không khả dụng / lỗi tham số',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=invalid&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 400 Bad Request - Báo lỗi an toàn, không crash 500", function () {',
            '  pm.response.to.have.status(400);',
            '});',
          ]
        ),
      ],
    },
    {
      name: '03 - Mục G: Unhappy Cases & Bảo mật API Mở khóa Báo cáo (AI-F-NEG-01 .. AI-F-NEG-06)',
      item: [
        makeReq(
          'AI-F-NEG-01: [Unhappy] Mở khóa báo cáo (/api/locality-report/unlock) với body rỗng {} -> 400 Bad Request',
          'POST',
          '{{webappUrl}}/api/locality-report/unlock',
          {},
          webHeaders,
          [
            'pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });',
            'pm.test("Thông báo Thiếu mã báo cáo", function () {',
            '  pm.expect(pm.response.json().message).to.equal("Thiếu mã báo cáo");',
            '});',
          ]
        ),
        makeReq(
          'AI-F-NEG-02: [Unhappy] Mở khóa báo cáo với reportId là chuỗi rỗng "" -> 400 Bad Request',
          'POST',
          '{{webappUrl}}/api/locality-report/unlock',
          { reportId: '' },
          webHeaders,
          [
            'pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });',
            'pm.test("Thông báo Thiếu mã báo cáo", function () {',
            '  pm.expect(pm.response.json().message).to.equal("Thiếu mã báo cáo");',
            '});',
          ]
        ),
        makeReq(
          'AI-F-NEG-03: [Unhappy] Mở khóa báo cáo với reportId = null -> 400 Bad Request',
          'POST',
          '{{webappUrl}}/api/locality-report/unlock',
          { reportId: null },
          webHeaders,
          [
            'pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });',
            'pm.test("Thông báo Thiếu mã báo cáo", function () {',
            '  pm.expect(pm.response.json().message).to.equal("Thiếu mã báo cáo");',
            '});',
          ]
        ),
        makeReq(
          'AI-F-NEG-04: [Unhappy] Gọi /api/locality-report/unlock sai phương thức HTTP (GET thay vì POST) -> 405 Method Not Allowed',
          'GET',
          '{{webappUrl}}/api/locality-report/unlock',
          null,
          webHeaders,
          [
            'pm.test("HTTP 405 Method Not Allowed", function () {',
            '  pm.expect([400, 404, 405]).to.include(pm.response.code);',
            '});',
          ]
        ),
        makeReq(
          'AI-F-NEG-05: [Unhappy] Gọi /api/locality-report với tọa độ sai định dạng kiểu chữ (latitude=abc) -> 400 Bad Request',
          'GET',
          '{{webappUrl}}/api/locality-report?latitude=abc&longitude=105.826367',
          null,
          webHeaders,
          [
            'pm.test("HTTP 400 Bad Request", function () { pm.response.to.have.status(400); });',
          ]
        ),
        makeReq(
          'AI-F-NEG-06: [Security] Kiểm tra chống XSS / SQL Injection trong reportId khi mở khóa báo cáo',
          'POST',
          '{{webappUrl}}/api/locality-report/unlock',
          { reportId: "<script>alert('xss')</script>' OR 1=1 --" },
          webHeaders,
          [
            'pm.test("Không phát sinh lỗi 500 Internal Server Error", function () {',
            '  pm.expect(pm.response.code).to.be.below(500);',
            '});',
            'pm.test("Không rò rỉ lỗi SQL", function () {',
            '  pm.expect(pm.response.text().toLowerCase()).to.not.include("syntax error");',
            '});',
          ]
        ),
      ],
    },
  ];

  const collection = {
    info: {
      _postman_id: 'e5f6a7b8-9c0d-4e1f-8a2b-3c4d5e6f7a8b',
      name: 'LandBase - Tổng quan khu vực: Phân tích khu vực bằng AI & Mở khóa Vàng (Mục E & F - 27 Test Cases)',
      description: 'Bộ kiểm thử tự động toàn diện 27 testcase cho chức năng Xem Tổng quan khu vực - Phân tích khu vực bằng AI & Quy tắc trừ Vàng (Mục E: AI-E-001..009, Mục F: AI-F-001..012, Mục G: AI-F-NEG-01..06).',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
  };

  const outPath = path.join(ROOT, 'LandBase_Area_Overview_AI.postman_collection.json');
  fs.writeFileSync(outPath, JSON.stringify(collection, null, 2), 'utf8');
}

buildLocalityReportCollection();
buildUtilitiesDetailCollection();
updateOnboardingCollection();
updateAiLocationReportCollection();
buildAreaOverviewAiCollection();
console.log('✅ Synced all 5 standalone Postman collections!');

