import { test, expect, TestInfo } from '@playwright/test';
import { LandBaseApiClient } from './api-client';
import { recordApiEvidence } from './api-evidence';

/**
 * Bộ kiểm thử tự động API: Onboarding / Nhận thưởng (Reward)
 * Microservice Prefix: /api/v1.0/auth
 *
 * Bao gồm 6 nhóm chức năng theo Postman Collection `LandBase - Onboarding / Nhận thưởng API`
 * (ID: e7c7652d-3c13-4dd4-9359-214b02ef1957) & SRS_Nhan_thuong_Landbase.docx v1.1:
 *  1. Public onboarding: GET /api/v1.0/auth/public/rewards/onboarding (PUB-ONB-01 .. PUB-ONB-05)
 *  2. Onboarding đăng nhập: GET /api/v1.0/auth/rewards/onboarding (ONB-API-01 .. ONB-API-10)
 *  3. Claim nhiệm vụ: POST /api/v1.0/auth/rewards/onboarding/tasks/{taskCode}/claim (CLAIM-API-01 .. CLAIM-API-06)
 *  4. Lưu progress: POST /api/v1.0/auth/rewards/onboarding/tasks/{taskCode}/progress (PROGRESS-API-01 .. PROGRESS-API-06)
 *  5. Vị trí quan tâm: POST /api/v1.0/auth/users/interest-location (LOCATION-API-01 .. LOCATION-API-10)
 *  6. Đánh dấu tour: POST /api/v1.0/auth/users/seen-guide/ONBOARDING_TOUR (TOUR-API-01 .. TOUR-API-03)
 *  7. Cố tình truyền sai, Bảo mật & Hiệu năng bổ sung (ONB-NEG-01 .. ONB-PERF-01)
 */
test.describe('LandBase API - Onboarding & Nhận thưởng (/api/v1.0/auth/rewards/onboarding)', () => {
  const client = new LandBaseApiClient();
  const config = client.getConfig();

  const PUBLIC_ONBOARDING_ENDPOINT = '/api/v1.0/auth/public/rewards/onboarding';
  const AUTH_ONBOARDING_ENDPOINT = '/api/v1.0/auth/rewards/onboarding';
  const INTEREST_LOCATION_ENDPOINT = '/api/v1.0/auth/users/interest-location';
  const SEEN_GUIDE_ENDPOINT = '/api/v1.0/auth/users/seen-guide/ONBOARDING_TOUR';

  const isProd =
    (config.gatewayUrl.includes('landbase.vn') && !config.gatewayUrl.includes('dev-')) ||
    process.env.TEST_ENV === 'prod';

  const allowStateChange = config.onboardingAllowStateChange ?? !isProd;
  const defaultTaskCode = config.onboardingTaskCode || 'EXPLORE_MAP';
  const invalidTaskCode = config.onboardingInvalidTaskCode || 'INVALID_TASK_CODE_FOR_TEST';
  const defaultNotCompletedTaskCode = config.onboardingNotCompletedTaskCode || 'READ_NEWS';
  const defaultCurrentStep = config.onboardingCurrentStep || 2;
  const validProvinceCode = config.onboardingProvinceCode || '01';
  const invalidProvinceCode = config.onboardingInvalidProvinceCode || 'INVALID_PROVINCE_CODE';
  const anotherProvinceCode = config.onboardingAnotherProvinceCode || '29';

  function verifyStateChangeGuard(testInfo: TestInfo) {
    if (process.env.ALLOW_STATE_CHANGE_REQUESTS === 'false') {
      testInfo.skip(
        true,
        'Request skipped: ALLOW_STATE_CHANGE_REQUESTS=false được thiết lập qua biến môi trường.'
      );
    }
    if (isProd && !allowStateChange) {
      testInfo.skip(
        true,
        'Request skipped for safety on PROD: set ALLOW_STATE_CHANGE_REQUESTS=true only with an authorized test user.'
      );
    }
  }

  function extractPayload(root: any): any {
    if (root && typeof root === 'object' && Object.prototype.hasOwnProperty.call(root, 'data')) {
      return root.data;
    }
    return root;
  }

  function assertNoServerCrash(res: any, testcaseId: string) {
    expect(res.status, `${testcaseId}: Không được phát sinh lỗi máy chủ 5xx`).toBeLessThan(500);
    expect(typeof res.rawText, `${testcaseId}: Response body phải là string`).toBe('string');
  }

  // ============================================================================
  // NHÓM 1: PUBLIC ONBOARDING — GET /api/v1.0/auth/public/rewards/onboarding
  // ============================================================================
  test.describe('Nhóm 1: Public Onboarding (Khách chưa đăng nhập)', () => {
    test('PUB-ONB-01: Lấy danh sách nhiệm vụ onboarding khi chưa đăng nhập', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: PUBLIC_ONBOARDING_ENDPOINT,
        method: 'GET',
        overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
        customHeaders: { Authorization: undefined as any },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'PUB-ONB-01',
        testName: 'Lấy danh sách nhiệm vụ onboarding khi chưa đăng nhập',
        endpoint: client.resolveUrl(PUBLIC_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);

      const payload = extractPayload(res.data);
      expect(payload).toBeTruthy();
      expect(typeof payload).toBe('object');

      for (const key of ['campaign', 'tasks', 'progress', 'wallet', 'tourCompleted']) {
        expect(payload, `PUB-ONB-01: Phải có thuộc tính '${key}'`).toHaveProperty(key);
      }
    });

    test('PUB-ONB-02: Kiểm tra wallet của khách chưa đăng nhập (wallet = null)', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: PUBLIC_ONBOARDING_ENDPOINT,
        method: 'GET',
        overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
        customHeaders: { Authorization: undefined as any },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'PUB-ONB-02',
        testName: 'Kiểm tra wallet của khách chưa đăng nhập',
        endpoint: client.resolveUrl(PUBLIC_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);
      expect(payload.wallet).toBeNull();
    });

    test('PUB-ONB-03: Kiểm tra tourCompleted của khách chưa đăng nhập (tourCompleted = false)', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: PUBLIC_ONBOARDING_ENDPOINT,
        method: 'GET',
        overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
        customHeaders: { Authorization: undefined as any },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'PUB-ONB-03',
        testName: 'Kiểm tra tourCompleted của khách chưa đăng nhập',
        endpoint: client.resolveUrl(PUBLIC_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);
      expect(payload.tourCompleted).toBe(false);
    });

    test('PUB-ONB-04: Kiểm tra trạng thái tất cả nhiệm vụ của khách chưa đăng nhập (NOT_STARTED)', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: PUBLIC_ONBOARDING_ENDPOINT,
        method: 'GET',
        overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
        customHeaders: { Authorization: undefined as any },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'PUB-ONB-04',
        testName: 'Kiểm tra trạng thái tất cả nhiệm vụ của khách chưa đăng nhập',
        endpoint: client.resolveUrl(PUBLIC_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);
      expect(Array.isArray(payload.tasks)).toBe(true);
      expect(payload.tasks.length).toBeGreaterThan(0);

      for (const task of payload.tasks) {
        expect(task.status, `Task ${task.code} của guest phải có status = NOT_STARTED`).toBe('NOT_STARTED');
      }
    });

    test('PUB-ONB-05: Kiểm tra cấu trúc response public không có dữ liệu cá nhân của ví', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: PUBLIC_ONBOARDING_ENDPOINT,
        method: 'GET',
        overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
        customHeaders: { Authorization: undefined as any },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'PUB-ONB-05',
        testName: 'Kiểm tra cấu trúc response public không có dữ liệu cá nhân của ví',
        endpoint: client.resolveUrl(PUBLIC_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);
      expect(payload).toHaveProperty('wallet', null);
      expect(Array.isArray(payload.tasks)).toBe(true);
      expect(payload.progress.completed).toBe(0);
      expect(payload.progress.claimed).toBe(0);
      expect(payload.progress.claimedGold).toBe(0);
    });
  });

  // ============================================================================
  // NHÓM 2: ONBOARDING ĐĂNG NHẬP — GET /api/v1.0/auth/rewards/onboarding
  // ============================================================================
  test.describe('Nhóm 2: Onboarding Đăng nhập (Authenticated User)', () => {
    test.beforeEach(async ({ page }) => {
      await client.ensureAuthenticated(page);
    });

    test('ONB-API-01: Lấy thông tin onboarding của người dùng đã đăng nhập', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-API-01',
        testName: 'Lấy thông tin onboarding của người dùng đã đăng nhập',
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);

      const payload = extractPayload(res.data);
      expect(payload).toBeTruthy();
      expect(typeof payload).toBe('object');
      expect(Array.isArray(payload.tasks)).toBe(true);
      for (const key of ['campaign', 'tasks', 'progress', 'wallet', 'tourCompleted']) {
        expect(payload).toHaveProperty(key);
      }
    });

    test('ONB-API-02: Kiểm tra cấu trúc campaign (code, name, description, status, startAt, endAt)', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-API-02',
        testName: 'Kiểm tra cấu trúc campaign',
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);
      expect(payload.campaign).toBeTruthy();
      expect(typeof payload.campaign).toBe('object');

      for (const key of ['code', 'name', 'description', 'status', 'startAt', 'endAt']) {
        expect(payload.campaign, `campaign phải có trường '${key}'`).toHaveProperty(key);
      }
      expect(typeof payload.campaign.code).toBe('string');
      expect(typeof payload.campaign.name).toBe('string');
      expect(typeof payload.campaign.status).toBe('string');
    });

    test('ONB-API-03: Kiểm tra số lượng nhiệm vụ khám phá khớp với progress.total', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-API-03',
        testName: 'Kiểm tra số lượng nhiệm vụ khám phá',
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);
      expect(Array.isArray(payload.tasks)).toBe(true);
      expect(payload.tasks.length).toBe(payload.progress.total);
      // SRS FR-KP-02 định nghĩa lưới 9 nhiệm vụ; DEV campaign ONBOARDING_2026 hiện cấu hình 6 nhiệm vụ
      expect([6, 9]).toContain(payload.tasks.length);
    });

    test('ONB-API-03-BUG [DEFECT_SRS_FR-KP-02]: Kiểm tra sự đầy đủ 9 nhiệm vụ khám phá theo đặc tả SRS FR-KP-02', async ({ page }, testInfo) => {
      test.fail(true, 'DEFECT: API Backend DEV hiện chỉ trả 6 nhiệm vụ, thiếu 3 nhiệm vụ so với đặc tả SRS FR-KP-02.');
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const durationMs = Date.now() - startTime;
      const payload = extractPayload(res.data);
      const actualCount = Array.isArray(payload?.tasks) ? payload.tasks.length : 0;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-API-03-BUG',
        testName: '[DEFECT_SRS_FR-KP-02] Số lượng nhiệm vụ khám phá phải đủ 9 theo SRS',
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '9 tasks',
        actualStatus: `${actualCount} tasks`,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: { actualCount, taskCodes: payload?.tasks?.map((t: any) => t.code) },
        durationMs,
      });

      expect(actualCount, 'DEFECT: Backend phải trả về đúng 9 nhiệm vụ theo SRS FR-KP-02').toBe(9);
    });

    test('ONB-API-04: Kiểm tra enum status của từng nhiệm vụ (NOT_STARTED, IN_PROGRESS, COMPLETED, CLAIMED)', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-API-04',
        testName: 'Kiểm tra enum status của từng nhiệm vụ',
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);
      const allowedStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CLAIMED'];

      for (const task of payload.tasks) {
        expect(allowedStatuses, `Task ${task.code} có status không hợp lệ: ${task.status}`).toContain(task.status);
      }
    });

    test('ONB-API-05: Kiểm tra cấu trúc trường tiến độ của từng nhiệm vụ', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-API-05',
        testName: 'Kiểm tra cấu trúc trường tiến độ của từng nhiệm vụ',
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);

      const requiredProps = [
        'requiredCount',
        'accessedCount',
        'completedAt',
        'claimedAt',
        'completedSubTasks',
        'totalSubTasks',
        'progressPercent',
        'currentStep',
      ];
      const numericProps = [
        'requiredCount',
        'accessedCount',
        'completedSubTasks',
        'totalSubTasks',
        'progressPercent',
      ];

      for (const task of payload.tasks) {
        for (const prop of requiredProps) {
          expect(task, `Task ${task.code} thiếu trường '${prop}'`).toHaveProperty(prop);
        }
        for (const numProp of numericProps) {
          expect(typeof task[numProp], `Task ${task.code}.${numProp} phải là number`).toBe('number');
        }
        // currentStep là number khi đang làm/chưa bắt đầu, hoặc null khi đã hoàn thành/claimed
        expect(
          task.currentStep === null || typeof task.currentStep === 'number',
          `Task ${task.code}.currentStep phải là number hoặc null`
        ).toBe(true);
      }
    });

    test('ONB-API-06: Kiểm tra cấu trúc subTasks và steps của từng nhiệm vụ', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-API-06',
        testName: 'Kiểm tra cấu trúc subTasks và steps',
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);

      const subTaskKeys = [
        'subTaskNo',
        'title',
        'apiName',
        'description',
        'required',
        'done',
        'firstStepNo',
        'lastStepNo',
      ];
      const stepKeys = [
        'stepNo',
        'subTaskNo',
        'route',
        'targetKey',
        'title',
        'content',
        'action',
        'placement',
        'apiName',
        'required',
        'done',
      ];

      for (const task of payload.tasks) {
        expect(Array.isArray(task.subTasks)).toBe(true);
        expect(Array.isArray(task.steps)).toBe(true);

        for (const subTask of task.subTasks) {
          for (const k of subTaskKeys) {
            expect(subTask, `Task ${task.code} subTask thiếu '${k}'`).toHaveProperty(k);
          }
        }
        for (const step of task.steps) {
          for (const k of stepKeys) {
            expect(step, `Task ${task.code} step thiếu '${k}'`).toHaveProperty(k);
          }
        }
      }
    });

    test('ONB-API-07: Kiểm tra enum action và placement của các step', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-API-07',
        testName: 'Kiểm tra enum action và placement của các step',
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);
      const allowedActions = ['CLICK', 'INPUT', 'VIEW', 'NAVIGATE'];
      const allowedPlacements = ['top', 'bottom', 'left', 'right'];

      for (const task of payload.tasks) {
        for (const step of task.steps) {
          expect(allowedActions, `Step action không hợp lệ: ${step.action}`).toContain(step.action);
          expect(allowedPlacements, `Step placement không hợp lệ: ${step.placement}`).toContain(step.placement);
        }
      }
    });

    test('ONB-API-08: Kiểm tra tổng tiến độ (progress) và ví Vàng (wallet.gold)', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-API-08',
        testName: 'Kiểm tra tổng tiến độ và ví Vàng',
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);

      for (const k of ['total', 'completed', 'inProgress', 'claimed', 'claimedGold']) {
        expect(typeof payload.progress[k], `progress.${k} phải là number`).toBe('number');
      }
      expect(payload.wallet).toBeTruthy();
      expect(typeof payload.wallet.gold).toBe('number');
      expect(payload.wallet.gold).toBeGreaterThanOrEqual(0);
    });

    test('ONB-API-09: Gọi API onboarding đăng nhập khi thiếu thông tin xác thực', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
        overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
        customHeaders: { Authorization: undefined as any },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-API-09',
        testName: 'Gọi API onboarding đăng nhập khi thiếu thông tin xác thực',
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '401 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'ONB-API-09');
      const payload = extractPayload(res.data);
      const hasPersonal = Boolean(
        payload && typeof payload === 'object' && payload.wallet && payload.tasks && payload.progress
      );
      expect(hasPersonal, 'ONB-API-09: Không được trả dữ liệu cá nhân khi thiếu xác thực').toBe(false);
    });

    test('ONB-API-09-BUG [DEFECT_SECURITY_401]: Onboarding thiếu xác thực phải trả về mã 401 Unauthorized (không dùng 406 kèm code 500)', async ({ page }, testInfo) => {
      test.fail(true, 'DEFECT: Backend DEV hiện trả về HTTP 406 kèm code 500 thay vì chuẩn an ninh HTTP 401 Unauthorized.');
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
        overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
        customHeaders: { Authorization: undefined as any },
      });
      expect([401, 403], 'DEFECT: Request thiếu Authorization bắt buộc phải trả về mã 401 hoặc 403').toContain(res.status);
    });

    test('ONB-API-10: Kiểm tra các trường thông tin cơ bản của từng nhiệm vụ (title, description, goldAmount, sortOrder, status)', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-API-10',
        testName: 'Kiểm tra các trường thông tin cơ bản của từng nhiệm vụ',
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);

      for (const task of payload.tasks) {
        expect(typeof task.code).toBe('string');
        expect(typeof task.title).toBe('string');
        expect(typeof task.description).toBe('string');
        expect(typeof task.goldAmount).toBe('number');
        expect(typeof task.sortOrder).toBe('number');
        expect(typeof task.status).toBe('string');
      }
    });
  });

  // ============================================================================
  // NHÓM 3: CLAIM NHIỆM VỤ — POST /api/v1.0/auth/rewards/onboarding/tasks/{taskCode}/claim
  // ============================================================================
  test.describe('Nhóm 3: Claim Nhiệm vụ (Nhận thưởng)', () => {
    test.beforeEach(async ({ page }) => {
      await client.ensureAuthenticated(page);
    });

    test('CLAIM-API-01: Nhận thưởng một nhiệm vụ đủ điều kiện (COMPLETED / CLAIMED)', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      // 1. HELPER - Lấy wallet và trạng thái task trước claim
      const beforeRes = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      expect(beforeRes.status).toBe(200);
      const beforePayload = extractPayload(beforeRes.data);
      const walletGoldBefore = Number(beforePayload?.wallet?.gold ?? 0);

      // Tìm task đã COMPLETED hoặc CLAIMED (ưu tiên COMPLETED, fallback sang CLAIMED hoặc defaultTaskCode)
      const eligibleTask =
        beforePayload?.tasks?.find((t: any) => t.status === 'COMPLETED') ||
        beforePayload?.tasks?.find((t: any) => t.status === 'CLAIMED') ||
        beforePayload?.tasks?.find((t: any) => t.code === defaultTaskCode);

      const targetTaskCode = eligibleTask?.code || defaultTaskCode;
      const wasAlreadyClaimed = eligibleTask?.status === 'CLAIMED';
      const claimEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${targetTaskCode}/claim`;

      // 2. Thực hiện POST claim
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: claimEndpoint,
        method: 'POST',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'CLAIM-API-01',
        testName: `Nhận thưởng nhiệm vụ đủ điều kiện (${targetTaskCode})`,
        endpoint: client.resolveUrl(claimEndpoint),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: { taskCode: targetTaskCode, walletGoldBefore, initialStatus: eligibleTask?.status },
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);
      expect(payload.status).toBe('CLAIMED');
      expect(payload.taskCode).toBe(targetTaskCode);
      expect(typeof payload.goldAwarded).toBe('number');
      expect(typeof payload.balanceAfter).toBe('number');
      expect(payload).toHaveProperty('transactionId');

      if (!wasAlreadyClaimed) {
        expect(payload.balanceAfter).toBe(walletGoldBefore + payload.goldAwarded);
      } else {
        // Nếu nhiệm vụ đã CLAIMED từ trước thì API trả lại snapshot cũ và không cộng Vàng lần 2
        expect(payload.balanceAfter).toBeLessThanOrEqual(walletGoldBefore);
      }
    });

    test('CLAIM-API-02: Gọi lại claim với nhiệm vụ đã CLAIMED (Idempotent - không cộng Vàng lần hai)', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      const claimEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${defaultTaskCode}/claim`;

      // Lần gọi 1 để lấy snapshot
      const firstRes = await client.executeInPage(page, {
        endpoint: claimEndpoint,
        method: 'POST',
      });
      expect(firstRes.status).toBe(200);
      const firstSnapshot = extractPayload(firstRes.data);

      // Lần gọi 2 (lặp lại)
      const startTime = Date.now();
      const secondRes = await client.executeInPage(page, {
        endpoint: claimEndpoint,
        method: 'POST',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'CLAIM-API-02',
        testName: 'Gọi lại claim với nhiệm vụ đã CLAIMED (Idempotent)',
        endpoint: client.resolveUrl(claimEndpoint),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: secondRes.status,
        requestBody: { firstSnapshot },
        responseHeaders: secondRes.headers,
        responseBody: secondRes.data,
        durationMs,
      });

      expect(secondRes.status).toBe(200);
      const secondPayload = extractPayload(secondRes.data);
      expect(secondPayload.status).toBe('CLAIMED');
      expect(secondPayload.taskCode).toBe(firstSnapshot.taskCode);
      expect(secondPayload.goldAwarded).toBe(firstSnapshot.goldAwarded);
      expect(secondPayload.balanceAfter).toBe(firstSnapshot.balanceAfter);
      expect(secondPayload.transactionId).toBe(firstSnapshot.transactionId);
    });

    test('CLAIM-API-02-BUG [DEFECT_BACKEND_DUPLICATE_CLAIM]: Chặn gọi claim lần hai cho nhiệm vụ đã CLAIMED (Không được tiếp tục cấp Vàng)', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);
      test.fail(true, 'DEFECT: Backend DEV hiện tại vẫn trả về status: 1 và goldAwarded: 10 khi claim lần hai thay vì chặn hoặc trả goldAwarded = 0.');
      const claimEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${defaultTaskCode}/claim`;
      const res = await client.executeInPage(page, {
        endpoint: claimEndpoint,
        method: 'POST',
      });
      const payload = extractPayload(res.data);
      // Kỳ vọng chuẩn SRS: Khi đã CLAIMED, lần gọi tiếp theo không được trả goldAwarded > 0
      expect(payload?.goldAwarded ?? 0, 'DEFECT: Backend không được tiếp tục cấp Vàng (goldAwarded phải bằng 0 hoặc báo lỗi)').toBe(0);
    });

    test('CLAIM-API-03: Kiểm tra các trường response contract khi claim thành công & đối chiếu ví sau claim', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      const claimEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${defaultTaskCode}/claim`;
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: claimEndpoint,
        method: 'POST',
      });
      const durationMs = Date.now() - startTime;

      // HELPER - Kiểm tra wallet sau claim
      const afterRes = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const afterPayload = extractPayload(afterRes.data);

      await recordApiEvidence(page, testInfo, {
        testId: 'CLAIM-API-03',
        testName: 'Kiểm tra các trường response khi claim thành công & đối chiếu wallet',
        endpoint: client.resolveUrl(claimEndpoint),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: { walletAfterCheck: afterPayload?.wallet },
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);

      for (const k of ['taskCode', 'status', 'goldAwarded', 'balanceAfter', 'transactionId']) {
        expect(payload, `Claim response thiếu trường '${k}'`).toHaveProperty(k);
      }
      expect(payload.status).toBe('CLAIMED');
      expect(typeof payload.goldAwarded).toBe('number');
      expect(typeof payload.balanceAfter).toBe('number');
      expect(payload.transactionId === null || typeof payload.transactionId === 'string').toBe(true);
      expect(typeof afterPayload?.wallet?.gold).toBe('number');
    });

    test('CLAIM-API-04: Claim với taskCode không tồn tại', async ({ page }, testInfo) => {
      const claimEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${invalidTaskCode}/claim`;
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: claimEndpoint,
        method: 'POST',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'CLAIM-API-04',
        testName: 'Claim với taskCode không tồn tại',
        endpoint: client.resolveUrl(claimEndpoint),
        method: 'POST',
        expectedStatus: '404 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: { taskCode: invalidTaskCode },
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'CLAIM-API-04');
      expect(res.data?.status).toBe(0);
      expect(res.data?.message).toContain('Nhiệm vụ không tồn tại');
    });

    test('CLAIM-API-05: Claim nhiệm vụ chưa hoàn thành (NOT_STARTED / IN_PROGRESS)', async ({ page }, testInfo) => {
      // Tìm một task chưa hoàn thành từ danh sách
      const onbRes = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const onbPayload = extractPayload(onbRes.data);
      const incompleteTask = onbPayload?.tasks?.find(
        (t: any) => t.status === 'NOT_STARTED' || t.status === 'IN_PROGRESS'
      );
      const targetNotCompletedCode = incompleteTask?.code || defaultNotCompletedTaskCode;

      const claimEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${targetNotCompletedCode}/claim`;
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: claimEndpoint,
        method: 'POST',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'CLAIM-API-05',
        testName: `Claim nhiệm vụ chưa hoàn thành (${targetNotCompletedCode})`,
        endpoint: client.resolveUrl(claimEndpoint),
        method: 'POST',
        expectedStatus: '400 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: { taskCode: targetNotCompletedCode, currentTaskStatus: incompleteTask?.status },
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'CLAIM-API-05');
      expect(res.data?.status).toBe(0);
      expect(res.data?.message).toContain('chưa hoàn thành');
    });

    test('CLAIM-API-05-BUG [DEFECT_REST_STATUS]: Claim nhiệm vụ chưa hoàn thành phải trả về mã lỗi 400 Bad Request (không dùng 406)', async ({ page }, testInfo) => {
      test.fail(true, 'DEFECT: Backend DEV hiện trả về HTTP 406 Not Acceptable thay vì chuẩn RESTful HTTP 400 Bad Request.');
      const claimEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${defaultNotCompletedTaskCode}/claim`;
      const res = await client.executeInPage(page, {
        endpoint: claimEndpoint,
        method: 'POST',
      });
      expect([400, 422], 'DEFECT: Mã HTTP trả về phải là 400 Bad Request hoặc 422 Unprocessable Entity').toContain(res.status);
    });

    test('CLAIM-API-06: Claim khi không có Authorization', async ({ page }, testInfo) => {
      const claimEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${defaultTaskCode}/claim`;
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: claimEndpoint,
        method: 'POST',
        overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
        customHeaders: { Authorization: undefined as any },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'CLAIM-API-06',
        testName: 'Claim khi không có Authorization',
        endpoint: client.resolveUrl(claimEndpoint),
        method: 'POST',
        expectedStatus: '401 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'CLAIM-API-06');
      expect(res.data?.status).toBe(0);
    });

    test('CLAIM-API-06-BUG [DEFECT_SECURITY_401]: Claim khi không có Authorization phải trả về 401 Unauthorized (không dùng 406)', async ({ page }, testInfo) => {
      test.fail(true, 'DEFECT: Backend DEV hiện trả về HTTP 406 Not Acceptable thay vì chuẩn an ninh HTTP 401 Unauthorized.');
      const claimEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${defaultTaskCode}/claim`;
      const res = await client.executeInPage(page, {
        endpoint: claimEndpoint,
        method: 'POST',
        overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
        customHeaders: { Authorization: undefined as any },
      });
      expect([401, 403], 'DEFECT: Request thiếu Authorization bắt buộc phải trả về mã 401 hoặc 403').toContain(res.status);
    });
  });

  // ============================================================================
  // NHÓM 4: LƯU PROGRESS — POST /api/v1.0/auth/rewards/onboarding/tasks/{taskCode}/progress
  // ============================================================================
  test.describe('Nhóm 4: Lưu Progress (Tiến độ bước hướng dẫn)', () => {
    test.beforeEach(async ({ page }) => {
      await client.ensureAuthenticated(page);
    });

    test('PROGRESS-API-01: Lưu bước hướng dẫn đang làm với currentStep hợp lệ', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      const progressEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${defaultNotCompletedTaskCode}/progress`;
      const reqBody = { currentStep: defaultCurrentStep };

      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: progressEndpoint,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'PROGRESS-API-01',
        testName: 'Lưu bước hướng dẫn đang làm với currentStep hợp lệ',
        endpoint: client.resolveUrl(progressEndpoint),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);
      expect(payload).toBeTruthy();
      expect(typeof payload).toBe('object');
      expect(payload.currentStep).toBe(defaultCurrentStep);
      expect(Array.isArray(payload.subTasks)).toBe(true);
      expect(Array.isArray(payload.steps)).toBe(true);
    });

    test('PROGRESS-API-02: Kiểm tra cấu trúc task trả về sau khi lưu progress', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      const progressEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${defaultNotCompletedTaskCode}/progress`;
      const reqBody = { currentStep: defaultCurrentStep };

      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: progressEndpoint,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'PROGRESS-API-02',
        testName: 'Kiểm tra cấu trúc task trả về sau khi lưu progress',
        endpoint: client.resolveUrl(progressEndpoint),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);

      const expectedTaskProps = [
        'code',
        'title',
        'description',
        'goldAmount',
        'sortOrder',
        'status',
        'requiredCount',
        'accessedCount',
        'completedSubTasks',
        'totalSubTasks',
        'progressPercent',
        'currentStep',
        'subTasks',
        'steps',
      ];
      for (const prop of expectedTaskProps) {
        expect(payload, `Progress task response thiếu trường '${prop}'`).toHaveProperty(prop);
      }
    });

    test('PROGRESS-API-03: Kiểm tra currentStep tương ứng stepNo trong danh sách steps', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      const progressEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${defaultNotCompletedTaskCode}/progress`;
      const reqBody = { currentStep: defaultCurrentStep };

      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: progressEndpoint,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'PROGRESS-API-03',
        testName: 'Kiểm tra currentStep tương ứng stepNo trong danh sách steps',
        endpoint: client.resolveUrl(progressEndpoint),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);
      expect(payload.currentStep).toBe(defaultCurrentStep);

      const matchingStep = payload.steps?.find((s: any) => s.stepNo === defaultCurrentStep);
      expect(matchingStep, `Phải tồn tại phần tử step có stepNo=${defaultCurrentStep}`).toBeTruthy();

      // Khôi phục lại step 1 sau khi kiểm tra
      await client.executeInPage(page, {
        endpoint: progressEndpoint,
        method: 'POST',
        body: { currentStep: 1 },
      });
    });

    test('PROGRESS-API-04: Lưu progress khi thiếu currentStep (Body rỗng {})', async ({ page }, testInfo) => {
      const progressEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${defaultNotCompletedTaskCode}/progress`;
      const reqBody = {};

      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: progressEndpoint,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'PROGRESS-API-04',
        testName: 'Lưu progress khi thiếu currentStep',
        endpoint: client.resolveUrl(progressEndpoint),
        method: 'POST',
        expectedStatus: '400 / 404 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'PROGRESS-API-04');
      expect(res.data?.status).toBe(0);
    });

    test('PROGRESS-API-05: Lưu progress với currentStep không tồn tại trong steps (999999)', async ({ page }, testInfo) => {
      const progressEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${defaultNotCompletedTaskCode}/progress`;
      const reqBody = { currentStep: 999999 };

      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: progressEndpoint,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'PROGRESS-API-05',
        testName: 'Lưu progress với currentStep không tồn tại trong steps',
        endpoint: client.resolveUrl(progressEndpoint),
        method: 'POST',
        expectedStatus: '404 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'PROGRESS-API-05');
      expect(res.data?.status).toBe(0);
      expect(res.data?.message).toContain('Bước hướng dẫn không tồn tại');
    });

    test('PROGRESS-API-06: Lưu progress với taskCode không tồn tại', async ({ page }, testInfo) => {
      const progressEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${invalidTaskCode}/progress`;
      const reqBody = { currentStep: defaultCurrentStep };

      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: progressEndpoint,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'PROGRESS-API-06',
        testName: 'Lưu progress với taskCode không tồn tại',
        endpoint: client.resolveUrl(progressEndpoint),
        method: 'POST',
        expectedStatus: '404 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'PROGRESS-API-06');
      expect(res.data?.status).toBe(0);
      expect(res.data?.message).toContain('Nhiệm vụ không tồn tại');
    });
  });

  // ============================================================================
  // NHÓM 5: VỊ TRÍ QUAN TÂM — POST /api/v1.0/auth/users/interest-location
  // ============================================================================
  test.describe('Nhóm 5: Vị trí Quan tâm (/api/v1.0/auth/users/interest-location)', () => {
    test.beforeEach(async ({ page }) => {
      await client.ensureAuthenticated(page);
    });

    test('LOCATION-API-01: Lưu vị trí quan tâm với role BUYER (Người mua)', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      const reqBody = { role: 'BUYER', provinceCode: validProvinceCode };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: INTEREST_LOCATION_ENDPOINT,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'LOCATION-API-01',
        testName: 'Lưu vị trí quan tâm với role BUYER (Người mua)',
        endpoint: client.resolveUrl(INTEREST_LOCATION_ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');
      expect(typeof res.data.data).toBe('string');
      expect(res.data.data.length).toBeGreaterThan(0);
    });

    test('LOCATION-API-02: Lưu vị trí quan tâm với role RENTER (Người thuê)', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      const reqBody = { role: 'RENTER', provinceCode: validProvinceCode };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: INTEREST_LOCATION_ENDPOINT,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'LOCATION-API-02',
        testName: 'Lưu vị trí quan tâm với role RENTER (Người thuê)',
        endpoint: client.resolveUrl(INTEREST_LOCATION_ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');
      expect(typeof res.data.data).toBe('string');
      expect(res.data.data.length).toBeGreaterThan(0);
    });

    test('LOCATION-API-03: Lưu vị trí quan tâm với role INVESTOR (Nhà đầu tư)', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      const reqBody = { role: 'INVESTOR', provinceCode: validProvinceCode };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: INTEREST_LOCATION_ENDPOINT,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'LOCATION-API-03',
        testName: 'Lưu vị trí quan tâm với role INVESTOR (Nhà đầu tư)',
        endpoint: client.resolveUrl(INTEREST_LOCATION_ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');
      expect(typeof res.data.data).toBe('string');
      expect(res.data.data.length).toBeGreaterThan(0);
    });

    test('LOCATION-API-04: Lưu vị trí quan tâm với role BROKER (Môi giới)', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      const reqBody = { role: 'BROKER', provinceCode: validProvinceCode };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: INTEREST_LOCATION_ENDPOINT,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'LOCATION-API-04',
        testName: 'Lưu vị trí quan tâm với role BROKER (Môi giới)',
        endpoint: client.resolveUrl(INTEREST_LOCATION_ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');
      expect(typeof res.data.data).toBe('string');
      expect(res.data.data.length).toBeGreaterThan(0);
    });

    test('LOCATION-API-05: Lưu vị trí quan tâm khi thiếu role', async ({ page }, testInfo) => {
      const reqBody = { provinceCode: validProvinceCode };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: INTEREST_LOCATION_ENDPOINT,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'LOCATION-API-05',
        testName: 'Lưu vị trí quan tâm khi thiếu role',
        endpoint: client.resolveUrl(INTEREST_LOCATION_ENDPOINT),
        method: 'POST',
        expectedStatus: '400 Bad Request',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'LOCATION-API-05');
      expect(res.status).toBe(400);
      expect(res.data?.status).toBe(0);
    });

    test('LOCATION-API-06: Lưu vị trí quan tâm với role không thuộc enum ("ADMIN")', async ({ page }, testInfo) => {
      const reqBody = { role: 'ADMIN', provinceCode: validProvinceCode };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: INTEREST_LOCATION_ENDPOINT,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'LOCATION-API-06',
        testName: 'Lưu vị trí quan tâm với role không thuộc enum',
        endpoint: client.resolveUrl(INTEREST_LOCATION_ENDPOINT),
        method: 'POST',
        expectedStatus: '400 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'LOCATION-API-06');
      expect(res.data?.status).toBe(0);
    });

    test('LOCATION-API-07: Lưu vị trí quan tâm khi thiếu provinceCode', async ({ page }, testInfo) => {
      const reqBody = { role: 'BUYER' };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: INTEREST_LOCATION_ENDPOINT,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'LOCATION-API-07',
        testName: 'Lưu vị trí quan tâm khi thiếu provinceCode',
        endpoint: client.resolveUrl(INTEREST_LOCATION_ENDPOINT),
        method: 'POST',
        expectedStatus: '400 Bad Request',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'LOCATION-API-07');
      expect(res.status).toBe(400);
      expect(res.data?.status).toBe(0);
    });

    test('LOCATION-API-08: Kiểm tra provinceCode vượt độ dài tối đa 50 ký tự (51 ký tự)', async ({ page }, testInfo) => {
      const reqBody = { role: 'BUYER', provinceCode: 'A'.repeat(51) };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: INTEREST_LOCATION_ENDPOINT,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'LOCATION-API-08',
        testName: 'Kiểm tra provinceCode vượt độ dài tối đa 50 ký tự',
        endpoint: client.resolveUrl(INTEREST_LOCATION_ENDPOINT),
        method: 'POST',
        expectedStatus: '400 Bad Request',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'LOCATION-API-08');
      expect(res.status).toBe(400);
      expect(res.data?.status).toBe(0);
      expect(res.data?.message).toContain('size must be between 0 and 50');
    });

    test('LOCATION-API-09: Kiểm tra provinceCode không tồn tại trong danh mục tỉnh/thành', async ({ page }, testInfo) => {
      const reqBody = { role: 'BUYER', provinceCode: invalidProvinceCode };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: INTEREST_LOCATION_ENDPOINT,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'LOCATION-API-09',
        testName: 'Kiểm tra provinceCode không tồn tại trong danh mục tỉnh/thành',
        endpoint: client.resolveUrl(INTEREST_LOCATION_ENDPOINT),
        method: 'POST',
        expectedStatus: '400 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'LOCATION-API-09');
      expect(res.data?.status).toBe(0);
      expect(res.data?.message).toContain('Khu vực không hợp lệ');
    });

    test('LOCATION-API-10: Thử thay đổi vị trí sau khi đã xác nhận (anotherProvinceCode)', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      const reqBody = { role: 'BUYER', provinceCode: anotherProvinceCode };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: INTEREST_LOCATION_ENDPOINT,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'LOCATION-API-10',
        testName: 'Thử thay đổi vị trí sau khi đã xác nhận',
        endpoint: client.resolveUrl(INTEREST_LOCATION_ENDPOINT),
        method: 'POST',
        expectedStatus: '200 / 400 (No 5xx)',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'LOCATION-API-10');

      // Khôi phục lại provinceCode mặc định ('01') cho tài khoản test
      await client.executeInPage(page, {
        endpoint: INTEREST_LOCATION_ENDPOINT,
        method: 'POST',
        body: { role: 'BUYER', provinceCode: validProvinceCode },
      });
    });
  });

  // ============================================================================
  // NHÓM 6: ĐÁNH DẤU TOUR — POST /api/v1.0/auth/users/seen-guide/ONBOARDING_TOUR
  // ============================================================================
  test.describe('Nhóm 6: Đánh dấu Tour (/api/v1.0/auth/users/seen-guide/ONBOARDING_TOUR)', () => {
    test.beforeEach(async ({ page }) => {
      await client.ensureAuthenticated(page);
    });

    test('TOUR-API-01: Đánh dấu user đã xem tour onboarding (data = true)', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: SEEN_GUIDE_ENDPOINT,
        method: 'POST',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'TOUR-API-01',
        testName: 'Đánh dấu user đã xem tour onboarding',
        endpoint: client.resolveUrl(SEEN_GUIDE_ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data', true);
    });

    test('TOUR-API-02: Xác minh tourCompleted chuyển thành true sau khi đánh dấu', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'TOUR-API-02',
        testName: 'Xác minh tourCompleted chuyển thành true sau khi đánh dấu',
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      const payload = extractPayload(res.data);
      expect(payload.tourCompleted).toBe(true);
    });

    test('TOUR-API-03: Gọi lại API đánh dấu đã xem tour (Idempotent)', async ({ page }, testInfo) => {
      verifyStateChangeGuard(testInfo);

      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: SEEN_GUIDE_ENDPOINT,
        method: 'POST',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'TOUR-API-03',
        testName: 'Gọi lại API đánh dấu đã xem tour',
        endpoint: client.resolveUrl(SEEN_GUIDE_ENDPOINT),
        method: 'POST',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'TOUR-API-03');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data', true);
    });
  });

  // ============================================================================
  // NHÓM 7: CỐ TÌNH TRUYỀN SAI, BẢO MẬT & HIỆU NĂNG BỔ SUNG
  // ============================================================================
  test.describe('Nhóm 7: Cố tình truyền sai, Bảo mật & Hiệu năng (Negative / Security / SLA)', () => {
    test.beforeEach(async ({ page }) => {
      await client.ensureAuthenticated(page);
    });

    test('ONB-NEG-01: Gọi API onboarding đăng nhập với JWT Token giả mạo', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
        overrideTokens: {
          accessToken: 'eyJhbGciOiJIUzUxMiJ9.INVALID_PAYLOAD.INVALID_SIGNATURE',
        },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-NEG-01',
        testName: 'Gọi API onboarding đăng nhập với JWT Token giả mạo',
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '401 / 406 (Unauthorized)',
        actualStatus: res.status,
        requestBody: { token: 'INVALID_JWT_TOKEN' },
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'ONB-NEG-01');
      expect([401, 403, 406]).toContain(res.status);
    });

    test('ONB-NEG-02: Lưu progress với currentStep là số âm (-1)', async ({ page }, testInfo) => {
      const progressEndpoint = `/api/v1.0/auth/rewards/onboarding/tasks/${defaultNotCompletedTaskCode}/progress`;
      const reqBody = { currentStep: -1 };

      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: progressEndpoint,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-NEG-02',
        testName: 'Lưu progress với currentStep là số âm (-1)',
        endpoint: client.resolveUrl(progressEndpoint),
        method: 'POST',
        expectedStatus: '400 / 404 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'ONB-NEG-02');
      expect(res.data?.status).toBe(0);
    });

    test('ONB-NEG-03: Lưu vị trí quan tâm khi không có Authorization header', async ({ page }, testInfo) => {
      const reqBody = { role: 'BUYER', provinceCode: validProvinceCode };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: INTEREST_LOCATION_ENDPOINT,
        method: 'POST',
        body: reqBody,
        overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
        customHeaders: { Authorization: undefined as any },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-NEG-03',
        testName: 'Lưu vị trí quan tâm khi không có Authorization header',
        endpoint: client.resolveUrl(INTEREST_LOCATION_ENDPOINT),
        method: 'POST',
        expectedStatus: '401 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'ONB-NEG-03');
      expect(res.data?.status).toBe(0);
    });

    test('ONB-NEG-04: Đánh dấu xem tour khi không có Authorization header', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: SEEN_GUIDE_ENDPOINT,
        method: 'POST',
        overrideTokens: { accessToken: '', xAuthToken: '', xSessionRef: '' },
        customHeaders: { Authorization: undefined as any },
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-NEG-04',
        testName: 'Đánh dấu xem tour khi không có Authorization header',
        endpoint: client.resolveUrl(SEEN_GUIDE_ENDPOINT),
        method: 'POST',
        expectedStatus: '401 / 406 (Rejected)',
        actualStatus: res.status,
        requestBody: null,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'ONB-NEG-04');
      expect(res.data?.status).toBe(0);
    });

    test('ONB-SEC-01: Kiểm tra an toàn SQL Injection / XSS trong provinceCode', async ({ page }, testInfo) => {
      const reqBody = {
        role: 'BUYER',
        provinceCode: "01' OR '1'='1'; <script>alert(1)</script>",
      };
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: INTEREST_LOCATION_ENDPOINT,
        method: 'POST',
        body: reqBody,
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-SEC-01',
        testName: 'Kiểm tra an toàn SQL Injection / XSS trong provinceCode',
        endpoint: client.resolveUrl(INTEREST_LOCATION_ENDPOINT),
        method: 'POST',
        expectedStatus: '400 / 406 (Rejected Safely)',
        actualStatus: res.status,
        requestBody: reqBody,
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      assertNoServerCrash(res, 'ONB-SEC-01');
      expect(res.data?.status).toBe(0);
      expect(res.rawText.toLowerCase()).not.toContain('syntax error');
      expect(res.rawText.toLowerCase()).not.toContain('sqlstate');
    });

    test('ONB-PERF-01: Kiểm tra SLA thời gian phản hồi của API Onboarding (< 3500ms)', async ({ page }, testInfo) => {
      const startTime = Date.now();
      const res = await client.executeInPage(page, {
        endpoint: AUTH_ONBOARDING_ENDPOINT,
        method: 'GET',
      });
      const durationMs = Date.now() - startTime;

      await recordApiEvidence(page, testInfo, {
        testId: 'ONB-PERF-01',
        testName: `Kiểm tra SLA thời gian phản hồi (${durationMs}ms < 3500ms)`,
        endpoint: client.resolveUrl(AUTH_ONBOARDING_ENDPOINT),
        method: 'GET',
        expectedStatus: '200 OK',
        actualStatus: res.status,
        requestBody: { slaThresholdMs: 3500, actualDurationMs: durationMs },
        responseHeaders: res.headers,
        responseBody: res.data,
        durationMs,
      });

      expect(res.status).toBe(200);
      expect(durationMs, `Thời gian phản hồi ${durationMs}ms vượt ngưỡng 3500ms`).toBeLessThan(3500);
      if (typeof res.data?.duration === 'number') {
        expect(res.data.duration).toBeLessThan(1000);
      }
    });
  });
});

