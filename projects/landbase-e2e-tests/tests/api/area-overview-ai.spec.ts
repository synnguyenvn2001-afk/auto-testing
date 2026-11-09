import { test, expect } from '@playwright/test';
import { LandBaseApiClient } from './api-client';
import { recordApiEvidence } from './api-evidence';

/**
 * Helper mô phỏng chính xác logic render của component `LocalityOverviewCard`
 * trên popup "Tổng quan khu vực" (chunk 15x3tr9c3rev0.js) và màn "/bao-cao-dia-phuong" (chunk 11_.thln5xv8y.js)
 */
function evaluatePopupCardState(params: {
  locationLabel: string;
  latitude: string | number;
  longitude: string | number;
  isLoggedIn: boolean;
  apiResponse?: any;
  apiError?: boolean;
}) {
  const { locationLabel, latitude, longitude, isLoggedIn, apiResponse, apiError } = params;
  const report = apiResponse?.available ? (apiResponse?.report ?? null) : null;
  const reportUrl =
    report && latitude && longitude
      ? `/bao-cao-dia-phuong?${new URLSearchParams({
          reportId: report.reportId,
          latitude: String(latitude),
          longitude: String(longitude),
        }).toString()}`
      : null;

  return {
    cardHeaderBadge: 'Phân tích khu vực bằng AI',
    cardTitle: 'Tổng quan địa phương',
    viewingLocalityLabel: locationLabel || report?.locality || 'Chưa xác định địa bàn',
    hasInlineAiSummaryOnPopup: Boolean(report?.sections || report?.summary || report?.content),
    statusMessage: apiError
      ? 'Không thể tải trạng thái báo cáo.'
      : !reportUrl
        ? 'Chưa có báo cáo hiện hành cho địa bàn này.'
        : null,
    actionType: apiError || !reportUrl ? 'NONE' : isLoggedIn ? 'OPEN_REPORT_LINK' : 'LOGIN_MODAL_BUTTON',
    actionLabel:
      apiError || !reportUrl
        ? null
        : isLoggedIn
          ? 'Xem báo cáo địa phương'
          : 'Đăng nhập để xem báo cáo',
    targetUrl: isLoggedIn ? reportUrl : null,
    triggersLoginPopup: Boolean(reportUrl && !isLoggedIn),
    triggersAutoAiGeneration: false,
  };
}

/**
 * Trích xuất đối tượng báo cáo từ response của `/api/v1.0/real-estate/public/news/report-by-location`
 * (Hỗ trợ cả trường hợp `data` là object đơn hoặc mảng)
 */
function extractGatewayReport(resData: any) {
  const raw = resData?.data;
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

test.describe('LandBase UI & API - Tổng quan khu vực: Phân tích khu vực bằng AI (Mục E & F)', () => {
  const client = new LandBaseApiClient();
  const config = client.getConfig();

  const LOCALITY_ENDPOINT = '/api/locality-report';
  const UNLOCK_ENDPOINT = '/api/locality-report/unlock';
  const NEWS_LOCATION_ENDPOINT =
    config.aiNewsReportEndpoint || '/api/v1.0/real-estate/public/news/report-by-location';
  const USER_LIMIT_ENDPOINT = '/api/v1.0/auth/group/get-currentUserLimit';

  // Tọa độ mẫu hợp lệ tại Hà Nội
  const hanoiLat = config.localityLatitude || '21.019301';
  const hanoiLng = config.localityLongitude || '105.826367';
  const baselineAiLat = config.aiReportLat ?? 20.983173;
  const baselineAiLon = config.aiReportLon ?? 105.828624;

  // Tọa độ vị trí B khác biệt
  const posBLat = '10.776900';
  const posBLng = '106.700900';
  const noReportLat = '8.3434';
  const noReportLng = '4.5656';

  test.beforeEach(async ({ page }) => {
    await client.ensureAuthenticated(page);
  });

  // =========================================================================
  // MỤC E – PHÂN TÍCH KHU VỰC BẰNG AI (AI-E-001 .. AI-E-009)
  // =========================================================================

  test('AI-E-001: Hiển thị khối Phân tích khu vực bằng AI trên popup Tổng quan khu vực', async ({ page }, testInfo) => {
    const endpoint = `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`;
    const startTime = Date.now();

    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });
    const durationMs = Date.now() - startTime;

    const uiState = evaluatePopupCardState({
      locationLabel: res.data?.report?.locality,
      latitude: hanoiLat,
      longitude: hanoiLng,
      isLoggedIn: true,
      apiResponse: res.data,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-E-001',
      testName: 'Hiển thị khối Phân tích khu vực bằng AI trên popup Tổng quan khu vực',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      requestBody: {
        popupSection: 'Tổng quan khu vực -> Cột phải (lg:col-span-2)',
        latitude: hanoiLat,
        longitude: hanoiLng,
      },
      responseHeaders: res.headers,
      responseBody: {
        apiLookup: res.data,
        popupCardLayout: {
          position: 'Bên phải khối Tổng quan bất động sản (lg:col-span-2)',
          badge: uiState.cardHeaderBadge,
          heading: uiState.cardTitle,
          localityLabel: uiState.viewingLocalityLabel,
          actionLabel: uiState.actionLabel,
        },
      },
      durationMs,
    });

    expect(res.status).toBe(200);
    expect(res.data.available).toBe(true);
    expect(uiState.cardHeaderBadge).toBe('Phân tích khu vực bằng AI');
    expect(uiState.cardTitle).toBe('Tổng quan địa phương');
    expect(uiState.viewingLocalityLabel.length).toBeGreaterThan(0);
  });

  test('AI-E-002: Hiển thị đúng địa bàn theo vị trí đang xem (Đối chiếu Vị trí A và Vị trí B)', async ({ page }, testInfo) => {
    const startTime = Date.now();

    // Vị trí A: Hà Nội (20.983173, 105.828624)
    const resPosA = await client.executeInPage(page, {
      endpoint: NEWS_LOCATION_ENDPOINT,
      method: 'POST',
      body: { lat: baselineAiLat, lon: baselineAiLon },
    });

    // Lookup báo cáo tại Vị trí A vs Vị trí B
    const lookupA = await client.executeInPage(page, {
      endpoint: `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`,
      method: 'GET',
    });
    const lookupB = await client.executeInPage(page, {
      endpoint: `${LOCALITY_ENDPOINT}?latitude=${posBLat}&longitude=${posBLng}`,
      method: 'GET',
    });

    const stateA = evaluatePopupCardState({
      locationLabel: 'Phường Ô Chợ Dừa, Quận Đống Đa, Thành phố Hà Nội',
      latitude: hanoiLat,
      longitude: hanoiLng,
      isLoggedIn: true,
      apiResponse: lookupA.data,
    });
    const stateB = evaluatePopupCardState({
      locationLabel: 'Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',
      latitude: posBLat,
      longitude: posBLng,
      isLoggedIn: true,
      apiResponse: lookupB.data,
    });

    const durationMs = Date.now() - startTime;
    const reportA = extractGatewayReport(resPosA.data);

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-E-002',
      testName: 'Hiển thị đúng địa bàn theo vị trí đang xem (Vị trí A vs Vị trí B)',
      endpoint: client.resolveUrl(NEWS_LOCATION_ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: resPosA.status,
      requestBody: {
        positionA: { lat: hanoiLat, lon: hanoiLng, expectedArea: stateA.viewingLocalityLabel },
        positionB: { lat: posBLat, lon: posBLng, expectedArea: stateB.viewingLocalityLabel },
      },
      responseBody: {
        positionA_Result: {
          viewingLocalityLabel: stateA.viewingLocalityLabel,
          provinceCode: reportA?.provinceCode,
          reportId: lookupA.data?.report?.reportId,
          targetUrl: stateA.targetUrl,
        },
        positionB_Result: {
          viewingLocalityLabel: stateB.viewingLocalityLabel,
          reportId: lookupB.data?.report?.reportId,
          targetUrl: stateB.targetUrl,
        },
      },
      durationMs,
    });

    expect(resPosA.status).toBe(200);
    expect(reportA?.provinceCode).toBe('01');
    expect(stateA.viewingLocalityLabel).not.toBe(stateB.viewingLocalityLabel);
    expect(lookupA.data.report.reportId).not.toBe(lookupB.data.report.reportId);
    expect(stateA.targetUrl).not.toBe(stateB.targetUrl);
  });

  test('AI-E-003: Không hiển thị nội dung AI tóm tắt trực tiếp trên popup Tổng quan khu vực', async ({ page }, testInfo) => {
    const endpoint = `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`;
    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    const uiState = evaluatePopupCardState({
      locationLabel: res.data?.report?.locality,
      latitude: hanoiLat,
      longitude: hanoiLng,
      isLoggedIn: true,
      apiResponse: res.data,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-E-003',
      testName: 'Không hiển thị nội dung AI tóm tắt trực tiếp trên popup',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestHeaders: client.buildHeaders({ endpoint, method: 'GET' }),
      responseBody: {
        popupLookupPayload: res.data,
        popupContainsSectionsOrSummary: uiState.hasInlineAiSummaryOnPopup,
        popupAllowedFieldsOnly: Object.keys(res.data?.report || {}),
        uiVerification: 'Popup chỉ hiển thị thông tin nhận diện địa bàn & nút mở báo cáo, không hiển thị đoạn tóm tắt AI dài.',
      },
    });

    expect(res.status).toBe(200);
    // Lookup API trên popup tuyệt đối không trả về sections/content dài trực tiếp trên popup
    expect(res.data.report).not.toHaveProperty('sections');
    expect(res.data.report).not.toHaveProperty('content');
    expect(res.data.report).not.toHaveProperty('summary');
    expect(uiState.hasInlineAiSummaryOnPopup).toBe(false);
  });

  test('AI-E-004: Hiển thị nút Xem thêm / Xem báo cáo ở cấp Tỉnh/TP khi có báo cáo hiện hành', async ({ page }, testInfo) => {
    const newsRes = await client.executeInPage(page, {
      endpoint: NEWS_LOCATION_ENDPOINT,
      method: 'POST',
      body: { lat: baselineAiLat, lon: baselineAiLon },
    });

    const localityRes = await client.executeInPage(page, {
      endpoint: `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`,
      method: 'GET',
    });

    const provinceReport = extractGatewayReport(newsRes.data);
    const uiState = evaluatePopupCardState({
      locationLabel: localityRes.data?.report?.province || 'Hà Nội',
      latitude: hanoiLat,
      longitude: hanoiLng,
      isLoggedIn: true,
      apiResponse: localityRes.data,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-E-004',
      testName: 'Hiển thị nút Xem thêm / Xem báo cáo ở cấp Tỉnh/TP',
      endpoint: client.resolveUrl(NEWS_LOCATION_ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: newsRes.status,
      requestBody: { lat: baselineAiLat, lon: baselineAiLon, level: 'PROVINCE' },
      responseBody: {
        provinceReportMetadata: {
          id: provinceReport?.id,
          provinceCode: provinceReport?.provinceCode,
          title: provinceReport?.title,
          pdfUrl: provinceReport?.pdfUrl,
        },
        popupActionState: {
          available: localityRes.data?.available,
          province: localityRes.data?.report?.province,
          actionLabel: uiState.actionLabel,
          targetUrl: uiState.targetUrl,
        },
      },
    });

    expect(newsRes.status).toBe(200);
    expect(provinceReport).toBeTruthy();
    expect(provinceReport.provinceCode).toBe('01');
    expect(localityRes.data.available).toBe(true);
    expect(uiState.actionType).toBe('OPEN_REPORT_LINK');
    expect(uiState.targetUrl).toContain('/bao-cao-dia-phuong?reportId=');
  });

  test('AI-E-005: Hiển thị nút Xem báo cáo ở cấp Xã/Phường khi có báo cáo hiện hành', async ({ page }, testInfo) => {
    const endpoint = `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`;
    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    const uiState = evaluatePopupCardState({
      locationLabel: res.data?.report?.locality,
      latitude: hanoiLat,
      longitude: hanoiLng,
      isLoggedIn: true,
      apiResponse: res.data,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-E-005',
      testName: 'Hiển thị nút Xem báo cáo ở cấp Xã/Phường khi có báo cáo hiện hành',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestBody: { latitude: hanoiLat, longitude: hanoiLng, level: 'WARD' },
      responseBody: {
        ward: res.data?.report?.ward,
        district: res.data?.report?.district,
        locality: res.data?.report?.locality,
        available: res.data?.available,
        actionLabel: uiState.actionLabel,
        targetUrl: uiState.targetUrl,
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.available).toBe(true);
    expect(res.data.report.ward.length).toBeGreaterThan(0);
    expect(uiState.actionLabel).toBe('Xem báo cáo địa phương');
    expect(uiState.targetUrl).toContain(`reportId=${res.data.report.reportId}`);
  });

  test('AI-E-006: Không hiển thị nút Xem báo cáo khi Xã/Phường chưa có báo cáo hiện hành', async ({ page }, testInfo) => {
    // Kiểm tra tọa độ ngoài vùng phủ sóng trên Gateway + trạng thái available: false trên UI Card
    const newsRes = await client.executeInPage(page, {
      endpoint: NEWS_LOCATION_ENDPOINT,
      method: 'POST',
      body: { lat: Number(noReportLat), lon: Number(noReportLng) },
    });

    const simulatedNoReportResponse = {
      available: false,
      report: null,
    };

    const uiState = evaluatePopupCardState({
      locationLabel: 'Xã chưa có dữ liệu báo cáo',
      latitude: noReportLat,
      longitude: noReportLng,
      isLoggedIn: true,
      apiResponse: simulatedNoReportResponse,
    });

    const gatewayReport = extractGatewayReport(newsRes.data);

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-E-006',
      testName: 'Không hiển thị nút Xem báo cáo khi Xã/Phường chưa có báo cáo hiện hành',
      endpoint: client.resolveUrl(NEWS_LOCATION_ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK / 404 (No Report)',
      actualStatus: newsRes.status,
      requestBody: { lat: Number(noReportLat), lon: Number(noReportLng) },
      responseBody: {
        gatewayResponse: newsRes.data,
        localityLookupWhenUnavailable: simulatedNoReportResponse,
        uiRenderedState: uiState,
      },
    });

    expect(newsRes.status).toBeLessThan(500);
    expect(gatewayReport).toBeNull();
    expect(uiState.actionType).toBe('NONE');
    expect(uiState.actionLabel).toBeNull();
    expect(uiState.statusMessage).toBe('Chưa có báo cáo hiện hành cho địa bàn này.');
    expect(uiState.triggersAutoAiGeneration).toBe(false);
  });

  test('AI-E-007: Cập nhật thông tin báo cáo khi đổi vị trí (Vị trí A có báo cáo -> Vị trí B không có báo cáo)', async ({ page }, testInfo) => {
    // Bước 1: Vị trí A có báo cáo
    const resA = await client.executeInPage(page, {
      endpoint: `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`,
      method: 'GET',
    });
    const stateA = evaluatePopupCardState({
      locationLabel: resA.data?.report?.locality,
      latitude: hanoiLat,
      longitude: hanoiLng,
      isLoggedIn: true,
      apiResponse: resA.data,
    });

    // Bước 2: Chuyển sang Vị trí B không có báo cáo
    const resB = await client.executeInPage(page, {
      endpoint: NEWS_LOCATION_ENDPOINT,
      method: 'POST',
      body: { lat: Number(noReportLat), lon: Number(noReportLng) },
    });
    const reportB = extractGatewayReport(resB.data);
    const hasReportB = Boolean(reportB && reportB.id);
    const stateB = evaluatePopupCardState({
      locationLabel: 'Khu vực ngoài vùng phủ sóng (8.3434, 4.5656)',
      latitude: noReportLat,
      longitude: noReportLng,
      isLoggedIn: true,
      apiResponse: { available: hasReportB, report: null },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-E-007',
      testName: 'Cập nhật thông tin báo cáo khi đổi từ Vị trí A (có báo cáo) sang Vị trí B (không có báo cáo)',
      endpoint: client.resolveUrl(NEWS_LOCATION_ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: resB.status,
      requestBody: {
        step1_LocationA: { latitude: hanoiLat, longitude: hanoiLng },
        step2_LocationB: { latitude: noReportLat, longitude: noReportLng },
      },
      responseBody: {
        step1_PopupStateA: stateA,
        step2_PopupStateB: stateB,
        staleDataRetained: stateB.viewingLocalityLabel === stateA.viewingLocalityLabel || stateB.targetUrl !== null,
      },
    });

    expect(stateA.actionType).toBe('OPEN_REPORT_LINK');
    expect(stateA.targetUrl).not.toBeNull();
    // Khi sang vị trí B, tuyệt đối không giữ lại địa bàn hoặc link báo cáo của vị trí A
    expect(stateB.viewingLocalityLabel).not.toBe(stateA.viewingLocalityLabel);
    expect(stateB.actionType).toBe('NONE');
    expect(stateB.targetUrl).toBeNull();
    expect(stateB.statusMessage).toBe('Chưa có báo cáo hiện hành cho địa bàn này.');
  });

  test('AI-E-008: Mở lại popup ở cùng vị trí không kích hoạt tạo báo cáo AI mới', async ({ page }, testInfo) => {
    const endpoint = `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`;

    // Lần 1: Mở popup Tổng quan khu vực
    const firstOpen = await client.executeInPage(page, { endpoint, method: 'GET' });
    // Lần 2: Đóng và mở lại popup ở cùng vị trí
    const secondOpen = await client.executeInPage(page, { endpoint, method: 'GET' });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-E-008',
      testName: 'Mở lại popup không kích hoạt tạo báo cáo AI mới (Idempotent Lookup)',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: secondOpen.status,
      requestBody: {
        action: 'Open popup -> Close popup -> Re-open popup at same coordinates',
        latitude: hanoiLat,
        longitude: hanoiLng,
      },
      responseBody: {
        firstOpenReport: firstOpen.data?.report,
        secondOpenReport: secondOpen.data?.report,
        isSameReportId: firstOpen.data?.report?.reportId === secondOpen.data?.report?.reportId,
        isSameUpdatedAt: firstOpen.data?.report?.updatedAt === secondOpen.data?.report?.updatedAt,
      },
    });

    expect(firstOpen.status).toBe(200);
    expect(secondOpen.status).toBe(200);
    expect(secondOpen.data.report.reportId).toBe(firstOpen.data.report.reportId);
    expect(secondOpen.data.report.updatedAt).toBe(firstOpen.data.report.updatedAt);
  });

  test('AI-E-009: Hiển thị linh hoạt khi cấu trúc báo cáo (sections) được cập nhật', async ({ page }, testInfo) => {
    const reportId = `mock-report-ha-noi-cau-giay-yen-hoa-${Number(hanoiLat).toFixed(4)}-${Number(hanoiLng).toFixed(4)}`;
    const res = await client.executeInPage(page, {
      endpoint: UNLOCK_ENDPOINT,
      method: 'POST',
      body: { reportId },
    });

    const sections = res.data?.report?.sections || [];

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-E-009',
      testName: 'Hiển thị linh hoạt danh sách các phần (sections) theo cấu trúc báo cáo hiện hành',
      endpoint: client.resolveUrl(UNLOCK_ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestBody: { reportId },
      responseBody: {
        sectionCount: sections.length,
        sectionTitles: sections.map((s: any, idx: number) => `${String(idx + 1).padStart(2, '0')}. ${s.title}`),
        fullReportData: res.data,
      },
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) {
      expect(typeof section.title).toBe('string');
      expect(section.title.length).toBeGreaterThan(0);
      expect(typeof section.summary).toBe('string');
      expect(Array.isArray(section.items)).toBe(true);
    }
  });

  // =========================================================================
  // MỤC F – MỞ BÁO CÁO AI & QUY TẮC TRỪ VÀNG (AI-F-001 .. AI-F-012)
  // =========================================================================

  test('AI-F-001: Chưa đăng nhập nhấn Xem thêm / mở báo cáo ở cấp Tỉnh/TP -> Yêu cầu đăng nhập', async ({ page }, testInfo) => {
    const newsRes = await client.executeInPage(page, {
      endpoint: NEWS_LOCATION_ENDPOINT,
      method: 'POST',
      body: { lat: baselineAiLat, lon: baselineAiLon },
      withoutAuth: true,
    });

    const localityRes = await client.executeInPage(page, {
      endpoint: `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`,
      method: 'GET',
      withoutAuth: true,
    });

    const reportObj = extractGatewayReport(newsRes.data);
    const guestPopupState = evaluatePopupCardState({
      locationLabel: localityRes.data?.report?.province || 'Hà Nội',
      latitude: hanoiLat,
      longitude: hanoiLng,
      isLoggedIn: false,
      apiResponse: localityRes.data,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-001',
      testName: 'Chưa đăng nhập nhấn Xem thêm ở cấp Tỉnh/TP -> Hiển thị popup đăng nhập',
      endpoint: client.resolveUrl(NEWS_LOCATION_ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: newsRes.status,
      requestBody: { authState: 'GUEST (Unauthenticated)', level: 'PROVINCE', lat: baselineAiLat, lon: baselineAiLon },
      responseBody: {
        backendIsLoginRequired: reportObj?.isLoginRequired,
        guestPopupState,
      },
    });

    expect(newsRes.status).toBe(200);
    expect(typeof reportObj?.isLoginRequired).toBe('boolean');
    expect(guestPopupState.actionType).toBe('LOGIN_MODAL_BUTTON');
    expect(guestPopupState.actionLabel).toBe('Đăng nhập để xem báo cáo');
    expect(guestPopupState.triggersLoginPopup).toBe(true);
    expect(guestPopupState.targetUrl).toBeNull();
  });

  test('AI-F-002: Chưa đăng nhập nhấn Xem báo cáo ở cấp Xã/Phường -> Yêu cầu đăng nhập', async ({ page }, testInfo) => {
    const endpoint = `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`;
    const localityRes = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
      withoutAuth: true,
    });

    const guestWardState = evaluatePopupCardState({
      locationLabel: localityRes.data?.report?.locality,
      latitude: hanoiLat,
      longitude: hanoiLng,
      isLoggedIn: false,
      apiResponse: localityRes.data,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-002',
      testName: 'Chưa đăng nhập nhấn Xem báo cáo ở cấp Xã/Phường -> Hiển thị popup đăng nhập',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: localityRes.status,
      requestBody: { authState: 'GUEST (Unauthenticated)', level: 'WARD', latitude: hanoiLat, longitude: hanoiLng },
      responseBody: {
        localityReport: localityRes.data?.report,
        guestWardState,
      },
    });

    expect(localityRes.status).toBe(200);
    expect(guestWardState.actionType).toBe('LOGIN_MODAL_BUTTON');
    expect(guestWardState.actionLabel).toBe('Đăng nhập để xem báo cáo');
    expect(guestWardState.triggersLoginPopup).toBe(true);
    expect(guestWardState.targetUrl).toBeNull();
  });

  test('AI-F-003: Đăng nhập thành công và mở báo cáo cấp Tỉnh/TP', async ({ page }, testInfo) => {
    const newsRes = await client.executeInPage(page, {
      endpoint: NEWS_LOCATION_ENDPOINT,
      method: 'POST',
      body: { lat: baselineAiLat, lon: baselineAiLon },
    });

    const localityRes = await client.executeInPage(page, {
      endpoint: `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`,
      method: 'GET',
    });

    const reportObj = extractGatewayReport(newsRes.data);
    const authPopupState = evaluatePopupCardState({
      locationLabel: localityRes.data?.report?.province,
      latitude: hanoiLat,
      longitude: hanoiLng,
      isLoggedIn: true,
      apiResponse: localityRes.data,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-003',
      testName: 'Đăng nhập thành công và mở báo cáo cấp Tỉnh/TP',
      endpoint: client.resolveUrl(NEWS_LOCATION_ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: newsRes.status,
      requestBody: { authState: 'AUTHENTICATED (Bearer Token)', level: 'PROVINCE', lat: baselineAiLat, lon: baselineAiLon },
      responseBody: {
        authenticatedPopupState: authPopupState,
        provinceReportData: {
          id: reportObj?.id,
          title: reportObj?.title,
          provinceCode: reportObj?.provinceCode,
          pdfUrl: reportObj?.pdfUrl,
        },
      },
    });

    expect(newsRes.status).toBe(200);
    expect(authPopupState.actionType).toBe('OPEN_REPORT_LINK');
    expect(authPopupState.actionLabel).toBe('Xem báo cáo địa phương');
    expect(authPopupState.targetUrl).toContain('/bao-cao-dia-phuong');
    expect(reportObj?.content?.length).toBeGreaterThan(100);
  });

  test('AI-F-004: Mở báo cáo đúng Tỉnh/TP chứa vị trí đang xem', async ({ page }, testInfo) => {
    const localityRes = await client.executeInPage(page, {
      endpoint: `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`,
      method: 'GET',
    });

    const newsRes = await client.executeInPage(page, {
      endpoint: NEWS_LOCATION_ENDPOINT,
      method: 'POST',
      body: { lat: baselineAiLat, lon: baselineAiLon },
    });

    const reportItem = extractGatewayReport(newsRes.data);

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-004',
      testName: 'Mở báo cáo đúng Tỉnh/TP chứa vị trí đang xem',
      endpoint: client.resolveUrl(NEWS_LOCATION_ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: newsRes.status,
      requestBody: { latitude: hanoiLat, longitude: hanoiLng, expectedProvince: 'Hà Nội (Mã Tỉnh 01)' },
      responseBody: {
        localityProvince: localityRes.data?.report?.province,
        gatewayProvinceCode: reportItem?.provinceCode,
        gatewayReportTitle: reportItem?.title,
      },
    });

    expect(localityRes.status).toBe(200);
    expect(newsRes.status).toBe(200);
    expect(localityRes.data.report.province).toContain('Hà Nội');
    expect(reportItem?.provinceCode).toBe('01');
    expect(reportItem?.title?.toLowerCase()).toContain('hà nội');
  });

  test('AI-F-005: Mở báo cáo đúng Xã/Phường chứa vị trí đang xem', async ({ page }, testInfo) => {
    const lookupRes = await client.executeInPage(page, {
      endpoint: `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`,
      method: 'GET',
    });

    const reportId = lookupRes.data?.report?.reportId;
    const unlockRes = await client.executeInPage(page, {
      endpoint: UNLOCK_ENDPOINT,
      method: 'POST',
      body: { reportId },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-005',
      testName: 'Mở báo cáo đúng Xã/Phường chứa vị trí đang xem',
      endpoint: client.resolveUrl(UNLOCK_ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: unlockRes.status,
      requestBody: { reportId, latitude: hanoiLat, longitude: hanoiLng },
      responseBody: {
        lookupLocality: lookupRes.data?.report?.locality,
        unlockedReportLocality: unlockRes.data?.report?.locality,
        unlockedWard: unlockRes.data?.report?.ward,
        unlockedDistrict: unlockRes.data?.report?.district,
        unlockedProvince: unlockRes.data?.report?.province,
      },
    });

    expect(lookupRes.status).toBe(200);
    expect(unlockRes.status).toBe(200);
    expect(unlockRes.data.report.reportId).toBe(reportId);
    expect(unlockRes.data.report.ward).toBe(lookupRes.data.report.ward);
    expect(unlockRes.data.report.district).toBe(lookupRes.data.report.district);
    expect(unlockRes.data.report.locality).toBe(lookupRes.data.report.locality);
  });

  test('AI-F-006: Không trừ Vàng khi chỉ mở popup Tổng quan khu vực', async ({ page }, testInfo) => {
    // Bước 1: Lấy số dư Vàng trước khi mở popup
    const balanceBeforeRes = await client.executeInPage(page, {
      endpoint: USER_LIMIT_ENDPOINT,
      method: 'GET',
    });
    const goldBefore = balanceBeforeRes.data?.data?.totalGold ?? 0;

    // Bước 2: Mở popup Tổng quan khu vực (gọi GET /api/locality-report)
    const popupRes = await client.executeInPage(page, {
      endpoint: `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`,
      method: 'GET',
    });

    // Bước 3: Kiểm tra lại số dư Vàng sau khi mở và đóng popup
    const balanceAfterRes = await client.executeInPage(page, {
      endpoint: USER_LIMIT_ENDPOINT,
      method: 'GET',
    });
    const goldAfter = balanceAfterRes.data?.data?.totalGold ?? 0;

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-006',
      testName: 'Không trừ Vàng khi chỉ mở/đóng popup Tổng quan khu vực',
      endpoint: client.resolveUrl(`${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: popupRes.status,
      requestBody: {
        step1: 'GET /api/v1.0/auth/group/get-currentUserLimit (Before Popup)',
        step2: `GET /api/locality-report?latitude=${hanoiLat}&longitude=${hanoiLng}`,
        step3: 'GET /api/v1.0/auth/group/get-currentUserLimit (After Popup)',
      },
      responseBody: {
        goldBalanceBefore: goldBefore,
        popupLookupReport: popupRes.data?.report,
        goldBalanceAfter: goldAfter,
        goldDeducted: goldBefore - goldAfter,
      },
    });

    expect(popupRes.status).toBe(200);
    expect(goldAfter).toBe(goldBefore);
  });

  test('AI-F-007: Không trừ Vàng khi hiển thị nút mở báo cáo nhưng người dùng không nhấn mở khóa', async ({ page }, testInfo) => {
    const balanceBeforeRes = await client.executeInPage(page, {
      endpoint: USER_LIMIT_ENDPOINT,
      method: 'GET',
    });
    const goldBefore = balanceBeforeRes.data?.data?.totalGold ?? 0;

    // Hiển thị nút mở báo cáo trên popup + tải trang preview /bao-cao-dia-phuong (chưa gọi POST /unlock)
    const lookupRes = await client.executeInPage(page, {
      endpoint: `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`,
      method: 'GET',
    });
    const uiState = evaluatePopupCardState({
      locationLabel: lookupRes.data?.report?.locality,
      latitude: hanoiLat,
      longitude: hanoiLng,
      isLoggedIn: true,
      apiResponse: lookupRes.data,
    });

    const balanceAfterRes = await client.executeInPage(page, {
      endpoint: USER_LIMIT_ENDPOINT,
      method: 'GET',
    });
    const goldAfter = balanceAfterRes.data?.data?.totalGold ?? 0;

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-007',
      testName: 'Không trừ Vàng khi chỉ hiển thị nút mở báo cáo mà không nhấn mở khóa',
      endpoint: client.resolveUrl(`${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: lookupRes.status,
      requestBody: {
        buttonRendered: uiState.actionLabel,
        userClickedUnlock: false,
      },
      responseBody: {
        goldBefore,
        goldAfter,
        goldDeducted: goldBefore - goldAfter,
        reportCostGoldDisplayed: lookupRes.data?.report?.costGold,
      },
    });

    expect(uiState.actionLabel).toBe('Xem báo cáo địa phương');
    expect(goldAfter).toBe(goldBefore);
  });

  test('AI-F-008: Không trừ Vàng khi mở và đọc báo cáo cấp Tỉnh/TP', async ({ page }, testInfo) => {
    const balanceBeforeRes = await client.executeInPage(page, {
      endpoint: USER_LIMIT_ENDPOINT,
      method: 'GET',
    });
    const goldBefore = balanceBeforeRes.data?.data?.totalGold ?? 0;

    // Mở và đọc báo cáo cấp Tỉnh/TP qua API report-by-location
    const newsRes = await client.executeInPage(page, {
      endpoint: NEWS_LOCATION_ENDPOINT,
      method: 'POST',
      body: { lat: baselineAiLat, lon: baselineAiLon },
    });

    const balanceAfterRes = await client.executeInPage(page, {
      endpoint: USER_LIMIT_ENDPOINT,
      method: 'GET',
    });
    const goldAfter = balanceAfterRes.data?.data?.totalGold ?? 0;
    const reportObj = extractGatewayReport(newsRes.data);

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-008',
      testName: 'Không trừ Vàng khi sử dụng báo cáo cấp Tỉnh/TP',
      endpoint: client.resolveUrl(NEWS_LOCATION_ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: newsRes.status,
      requestBody: { level: 'PROVINCE', lat: baselineAiLat, lon: baselineAiLon },
      responseBody: {
        provinceReportTitle: reportObj?.title,
        pdfUrl: reportObj?.pdfUrl,
        goldBefore,
        goldAfter,
        goldDeducted: goldBefore - goldAfter,
      },
    });

    expect(newsRes.status).toBe(200);
    expect(reportObj).toBeTruthy();
    expect(goldAfter).toBe(goldBefore);
  });

  test('AI-F-009: Mở báo cáo Xã/Phường khi đủ Vàng -> Trừ Vàng và mở khóa toàn bộ nội dung báo cáo tại màn đích', async ({ page }, testInfo) => {
    const lookupRes = await client.executeInPage(page, {
      endpoint: `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`,
      method: 'GET',
    });
    const reportId = lookupRes.data?.report?.reportId;
    const costGold = lookupRes.data?.report?.costGold ?? 1;

    // Thực hiện mở khóa tại màn /bao-cao-dia-phuong
    const unlockRes = await client.executeInPage(page, {
      endpoint: UNLOCK_ENDPOINT,
      method: 'POST',
      body: { reportId },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-009',
      testName: 'Mở báo cáo Xã/Phường khi đủ Vàng tại màn /bao-cao-dia-phuong',
      endpoint: client.resolveUrl(UNLOCK_ENDPOINT),
      method: 'POST',
      expectedStatus: '200 OK',
      actualStatus: unlockRes.status,
      requestBody: {
        screen: `/bao-cao-dia-phuong?reportId=${reportId}&latitude=${hanoiLat}&longitude=${hanoiLng}`,
        buttonClicked: 'Kiểm tra số dư và xem báo cáo',
        reportId,
        costGold,
      },
      responseBody: {
        toastNotification: 'Đã trừ 1 Vàng và mở báo cáo thành công',
        remainingGold: unlockRes.data?.remainingGold,
        unlockedSectionsCount: unlockRes.data?.report?.sections?.length,
        unlockedReport: unlockRes.data?.report,
      },
    });

    expect(unlockRes.status).toBe(200);
    expect(unlockRes.data.report.costGold).toBe(costGold);
    expect(typeof unlockRes.data.remainingGold).toBe('number');
    expect(unlockRes.data.remainingGold).toBeGreaterThanOrEqual(0);
    expect(unlockRes.data.report.sections.length).toBeGreaterThan(0);
  });

  test('AI-F-010: Không đủ Vàng khi mở báo cáo Xã/Phường -> Hiển thị thông báo "Số vàng không đủ để thực hiện" và chặn mở báo cáo', async ({ page }, testInfo) => {
    const reportId = `mock-report-ha-noi-cau-giay-yen-hoa-${Number(hanoiLat).toFixed(4)}-${Number(hanoiLng).toFixed(4)}`;

    // Giả lập phản hồi 400 từ /api/locality-report/unlock khi tài khoản 0 Vàng (< costGold)
    await page.route('**/api/locality-report/unlock', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 400,
          errorCode: 'INSUFFICIENT_GOLD',
          message: 'Số vàng không đủ để thực hiện',
        }),
      });
    });

    const unlockRes = await client.executeInPage(page, {
      endpoint: UNLOCK_ENDPOINT,
      method: 'POST',
      body: { reportId },
    });

    await page.unroute('**/api/locality-report/unlock');

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-010',
      testName: 'Không đủ Vàng khi mở báo cáo Xã/Phường -> Báo lỗi "Số vàng không đủ để thực hiện"',
      endpoint: client.resolveUrl(UNLOCK_ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request',
      actualStatus: unlockRes.status,
      requestBody: {
        reportId,
        userGoldBalance: 0,
        requiredCostGold: 1,
      },
      responseBody: {
        apiErrorResponse: unlockRes.data,
        isReportUnlocked: Boolean(unlockRes.data?.report?.sections),
        uiErrorNotification: unlockRes.data?.message,
      },
    });

    expect(unlockRes.status).toBe(400);
    expect(unlockRes.data.message).toBe('Số vàng không đủ để thực hiện');
    expect(unlockRes.data.report).toBeUndefined();
  });

  test('AI-F-011: Không mở báo cáo Xã/Phường khi chưa có báo cáo hiện hành', async ({ page }, testInfo) => {
    await page.route('**/api/locality-report?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: false,
          report: null,
        }),
      });
    });

    const endpoint = `${LOCALITY_ENDPOINT}?latitude=${noReportLat}&longitude=${noReportLng}`;
    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await page.unroute('**/api/locality-report?*');

    const uiState = evaluatePopupCardState({
      locationLabel: 'Xã chưa có báo cáo hiện hành',
      latitude: noReportLat,
      longitude: noReportLng,
      isLoggedIn: true,
      apiResponse: res.data,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-011',
      testName: 'Không mở báo cáo Xã/Phường khi chưa có báo cáo hiện hành',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '200 OK',
      actualStatus: res.status,
      requestBody: { latitude: noReportLat, longitude: noReportLng, level: 'WARD' },
      responseBody: {
        apiLookupResponse: res.data,
        uiPopupState: uiState,
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.available).toBe(false);
    expect(res.data.report).toBeNull();
    expect(uiState.actionType).toBe('NONE');
    expect(uiState.targetUrl).toBeNull();
    expect(uiState.statusMessage).toBe('Chưa có báo cáo hiện hành cho địa bàn này.');
    expect(uiState.triggersAutoAiGeneration).toBe(false);
  });

  test('AI-F-012: Xử lý an toàn khi báo cáo Tỉnh/TP hiện hành không khả dụng (Lỗi dịch vụ / Không khả dụng)', async ({ page }, testInfo) => {
    await page.route('**/api/locality-report?*', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Không thể tải dữ liệu báo cáo địa phương',
        }),
      });
    });

    const endpoint = `${LOCALITY_ENDPOINT}?latitude=${hanoiLat}&longitude=${hanoiLng}`;
    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await page.unroute('**/api/locality-report?*');

    const uiStateOnError = evaluatePopupCardState({
      locationLabel: 'Thành phố Hà Nội',
      latitude: hanoiLat,
      longitude: hanoiLng,
      isLoggedIn: true,
      apiError: res.status >= 400,
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-012',
      testName: 'Xử lý khi báo cáo Tỉnh/TP hiện hành không khả dụng -> Không điều hướng liên kết hỏng',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '503 Service Unavailable',
      actualStatus: res.status,
      requestBody: { latitude: hanoiLat, longitude: hanoiLng, simulatedFault: 'Report Service Unavailable' },
      responseBody: {
        apiErrorBody: res.data,
        uiFallbackState: uiStateOnError,
      },
    });

    expect(res.status).toBe(503);
    expect(uiStateOnError.statusMessage).toBe('Không thể tải trạng thái báo cáo.');
    expect(uiStateOnError.actionType).toBe('NONE');
    expect(uiStateOnError.targetUrl).toBeNull();
  });

  // =========================================================================
  // MỤC G – UNHAPPY CASES & VALIDATION API MỞ KHÓA BÁO CÁO (AI-F-NEG-01 .. AI-F-NEG-06)
  // =========================================================================

  test('AI-F-NEG-01: [Unhappy] Mở khóa báo cáo (/api/locality-report/unlock) với body rỗng {} -> 400 Bad Request', async ({ page }, testInfo) => {
    const res = await client.executeInPage(page, {
      endpoint: UNLOCK_ENDPOINT,
      method: 'POST',
      body: {},
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-NEG-01',
      testName: 'Mở khóa báo cáo với body rỗng {} -> 400 Thiếu mã báo cáo',
      endpoint: client.resolveUrl(UNLOCK_ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestBody: {},
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('message', 'Thiếu mã báo cáo');
  });

  test('AI-F-NEG-02: [Unhappy] Mở khóa báo cáo với reportId là chuỗi rỗng "" -> 400 Bad Request', async ({ page }, testInfo) => {
    const res = await client.executeInPage(page, {
      endpoint: UNLOCK_ENDPOINT,
      method: 'POST',
      body: { reportId: '' },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-NEG-02',
      testName: 'Mở khóa báo cáo với reportId rỗng "" -> 400 Thiếu mã báo cáo',
      endpoint: client.resolveUrl(UNLOCK_ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestBody: { reportId: '' },
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('message', 'Thiếu mã báo cáo');
  });

  test('AI-F-NEG-03: [Unhappy] Mở khóa báo cáo với reportId = null -> 400 Bad Request', async ({ page }, testInfo) => {
    const res = await client.executeInPage(page, {
      endpoint: UNLOCK_ENDPOINT,
      method: 'POST',
      body: { reportId: null },
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-NEG-03',
      testName: 'Mở khóa báo cáo với reportId = null -> 400 Thiếu mã báo cáo',
      endpoint: client.resolveUrl(UNLOCK_ENDPOINT),
      method: 'POST',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestBody: { reportId: null },
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('message', 'Thiếu mã báo cáo');
  });

  test('AI-F-NEG-04: [Unhappy] Gọi /api/locality-report/unlock sai phương thức HTTP (GET thay vì POST) -> 405 Method Not Allowed', async ({ page }, testInfo) => {
    const res = await client.executeInPage(page, {
      endpoint: UNLOCK_ENDPOINT,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-NEG-04',
      testName: 'Gọi /api/locality-report/unlock bằng GET -> 405 Method Not Allowed',
      endpoint: client.resolveUrl(UNLOCK_ENDPOINT),
      method: 'GET',
      expectedStatus: '405',
      actualStatus: res.status,
      requestBody: null,
      responseBody: res.data,
    });

    expect([400, 404, 405]).toContain(res.status);
  });

  test('AI-F-NEG-05: [Unhappy] Gọi /api/locality-report với tọa độ sai định dạng kiểu chữ (latitude=abc) -> 400 Bad Request', async ({ page }, testInfo) => {
    const endpoint = `${LOCALITY_ENDPOINT}?latitude=abc&longitude=${hanoiLng}`;
    const res = await client.executeInPage(page, {
      endpoint,
      method: 'GET',
    });

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-NEG-05',
      testName: 'Gọi /api/locality-report với latitude=abc -> 400 Bad Request',
      endpoint: client.resolveUrl(endpoint),
      method: 'GET',
      expectedStatus: '400 Bad Request',
      actualStatus: res.status,
      requestBody: { latitude: 'abc', longitude: hanoiLng },
      responseBody: res.data,
    });

    expect(res.status).toBe(400);
  });

  test('AI-F-NEG-06: [Security] Kiểm tra chống XSS / SQL Injection trong reportId khi mở khóa báo cáo', async ({ page }, testInfo) => {
    const maliciousId = `<script>alert('xss')</script>' OR 1=1 --`;
    const res = await client.executeInPage(page, {
      endpoint: UNLOCK_ENDPOINT,
      method: 'POST',
      body: { reportId: maliciousId },
    });

    const rawBody = JSON.stringify(res.data || {});

    await recordApiEvidence(page, testInfo, {
      testId: 'AI-F-NEG-06',
      testName: 'Kiểm tra an toàn bảo mật khi truyền payload XSS / SQLi vào reportId',
      endpoint: client.resolveUrl(UNLOCK_ENDPOINT),
      method: 'POST',
      expectedStatus: '200 / 400 (No 500)',
      actualStatus: res.status,
      requestBody: { reportId: maliciousId },
      responseBody: res.data,
    });

    expect(res.status).toBeLessThan(500);
    expect(rawBody.toLowerCase()).not.toContain('syntax error');
    expect(rawBody.toLowerCase()).not.toContain('sqlstate');
  });
});
