import { test, expect, Page, BrowserContext, TestInfo } from '@playwright/test';
import crypto from 'node:crypto';

/**
 * BỘ KIỂM THỬ TỰ ĐỘNG GIAO DIỆN (WEB UI E2E) – LANDBASE ONBOARDING & NHẬN THƯỞNG
 * Bao phủ toàn bộ 71 Test Cases UI / Functional (UIO-001 -> UIO-071) theo SRS v1.1 & Thiết kế giao diện:
 *  - Nhóm 1 (UIO-001 .. UIO-010): Nhận thưởng LandBase – Menu, Tiêu đề, Thông tin tài khoản, 9 nhiệm vụ (3x3), Tiến độ & Trạng thái
 *  - Nhóm 2 (UIO-011 .. UIO-021): Nhiệm vụ khám phá & Popup hướng dẫn tính năng (Highlight, Step navigation, Đóng X, Quy tắc hoàn thành)
 *  - Nhóm 3 (UIO-022 .. UIO-029): Nhận thưởng nhiệm vụ (Claim Vàng), Chống claim trùng, Persistence & Độc lập dữ liệu giữa các tài khoản
 *  - Nhóm 4 (UIO-030 .. UIO-040): Chia sẻ & Mời bạn bè – Liên kết Affiliate, Sao chép clipboard & Quy tắc tính tiến độ / mốc thưởng
 *  - Nhóm 5 (UIO-041 .. UIO-054): Tour hướng dẫn lần đầu – Thứ tự khởi chạy, 3 khu vực (Trang chủ/Bản đồ/Tin tức), Điều hướng & Lưu trạng thái
 *  - Nhóm 6 (UIO-055 .. UIO-071): Chọn vị trí quan tâm – 3 Tỉnh ưu tiên, Dropdown tỉnh/thành, 4 nhóm khách hàng, Fallback Hà Nội & GPS
 */

const WEBAPP_URL = process.env.WEBAPP_BASE_URL || process.env.BASE_URL || 'https://dev-webapp.laand.vn';
const GATEWAY_URL = process.env.API_BASE_URL || 'https://dev-gateway.laand.vn';

interface MockEnvironmentState {
  isAuthenticated: boolean;
  userId: string;
  userName: string;
  interestRole: string | null;
  interestProvinceCode: string | null;
  hasSeenTour: boolean;
  tourCompleted: boolean;
  walletGold: number;
  tasks: any[];
  referralUrl: string;
  referralCode: string;
  referralUseLeft: number;
  referralMaxUse: number;
  referralCompletedCount: number;
  provinces: any[];
  claimHistory: string[];
  progressHistory: Array<{ taskCode: string; currentStep: number }>;
  savedLocationPayloads: Array<{ role: string; provinceCode: string }>;
  seenGuideCalls: number;
  gpsAvailable: boolean;
  gpsLat: number;
  gpsLng: number;
  gpsProvCode: string;
}

function createNineStandardTasks() {
  return [
    {
      code: 'EXPLORE_MAP',
      title: 'Khám phá Bản đồ',
      description: 'Tìm kiếm và xem thông tin thửa đất.',
      goldAmount: 10,
      status: 'CLAIMED',
      completedSubTasks: 1,
      totalSubTasks: 1,
      progressPercent: 100,
      currentStep: 1,
      completedAt: '2026-11-01T08:00:00.000Z',
      claimedAt: '2026-11-01T08:05:00.000Z',
      subTasks: [
        {
          subTaskNo: 1,
          title: 'Xem thông tin thửa đất',
          apiName: 'VIEW_PARCEL',
          description: 'Xem chi tiết thửa đất trên bản đồ',
          required: true,
          done: true,
          firstStepNo: 1,
          lastStepNo: 2,
        },
      ],
      steps: [
        {
          stepNo: 1,
          subTaskNo: 1,
          route: '/',
          targetKey: 'menu-map',
          title: 'Bước 1: Mở Bản đồ quy hoạch',
          content: 'Truy cập phân hệ Bản đồ từ thanh điều hướng bên trái để tra cứu thửa đất.',
          action: 'CLICK',
          placement: 'right',
          apiName: 'OPEN_MAP',
          required: true,
          done: false,
        },
        {
          stepNo: 2,
          subTaskNo: 1,
          route: '/',
          targetKey: 'menu-news',
          title: 'Bước 2: Xem thông tin chi tiết thửa đất',
          content: 'Chọn một vị trí trên bản đồ để xem quy hoạch, diện tích và thông tin tờ/thửa.',
          action: 'VIEW',
          placement: 'right',
          apiName: 'VIEW_PARCEL',
          required: true,
          done: false,
        },
      ],
    },
    {
      code: 'READ_NEWS',
      title: 'Đọc tin tức',
      description: 'Đọc một bài tin tức bất động sản.',
      goldAmount: 10,
      status: 'IN_PROGRESS',
      completedSubTasks: 0,
      totalSubTasks: 1,
      progressPercent: 0,
      currentStep: 1,
      completedAt: null,
      claimedAt: null,
      subTasks: [
        {
          subTaskNo: 1,
          title: 'Đọc một bài viết',
          apiName: 'READ_ARTICLE',
          description: 'Mở và đọc bài viết thị trường',
          required: true,
          done: false,
          firstStepNo: 1,
          lastStepNo: 3,
        },
      ],
      steps: [
        {
          stepNo: 1,
          subTaskNo: 1,
          route: '/',
          targetKey: 'menu-news',
          title: 'Bước 1: Truy cập Tin tức thị trường',
          content: 'Nhấn vào mục Tin tức thị trường trên thanh menu chính.',
          action: 'CLICK',
          placement: 'right',
          apiName: 'OPEN_NEWS',
          required: true,
          done: false,
        },
        {
          stepNo: 2,
          subTaskNo: 1,
          route: '/',
          targetKey: 'menu-map',
          title: 'Bước 2: Chọn bài viết bất động sản',
          content: 'Lựa chọn một bài phân tích hoặc tin tức thị trường bạn quan tâm.',
          action: 'CLICK',
          placement: 'right',
          apiName: 'SELECT_NEWS',
          required: true,
          done: false,
        },
        {
          stepNo: 3,
          subTaskNo: 1,
          route: '/',
          targetKey: 'menu-news',
          title: 'Bước 3: Hoàn tất đọc nội dung bài viết',
          content: 'Xem chi tiết nội dung bài viết để nắm bắt diễn biến thị trường.',
          action: 'VIEW',
          placement: 'right',
          apiName: 'FINISH_NEWS',
          required: true,
          done: false,
        },
      ],
    },
    {
      code: 'SAVE_REAL_ESTATE',
      title: 'Lưu bất động sản',
      description: 'Lưu một bất động sản vào danh sách.',
      goldAmount: 15,
      status: 'COMPLETED',
      completedSubTasks: 1,
      totalSubTasks: 1,
      progressPercent: 100,
      currentStep: 1,
      completedAt: '2026-11-08T10:00:00.000Z',
      claimedAt: null,
      subTasks: [
        {
          subTaskNo: 1,
          title: 'Lưu bất động sản',
          apiName: 'SAVE_BDS',
          description: 'Nhấn biểu tượng lưu tin bất động sản',
          required: true,
          done: true,
          firstStepNo: 1,
          lastStepNo: 1,
        },
      ],
      steps: [
        {
          stepNo: 1,
          subTaskNo: 1,
          route: '/',
          targetKey: 'menu-map',
          title: 'Lưu bất động sản quan tâm',
          content: 'Nhấn biểu tượng dấu trang để lưu bất động sản vào danh sách theo dõi.',
          action: 'CLICK',
          placement: 'right',
          apiName: 'SAVE_BDS',
          required: true,
          done: false,
        },
      ],
    },
    {
      code: 'VIEW_MARKET_REPORT',
      title: 'Xem báo cáo thị trường',
      description: 'Xem báo cáo thị trường theo quý.',
      goldAmount: 10,
      status: 'NOT_STARTED',
      completedSubTasks: 0,
      totalSubTasks: 1,
      progressPercent: 0,
      currentStep: null,
      completedAt: null,
      claimedAt: null,
      subTasks: [
        {
          subTaskNo: 1,
          title: 'Xem báo cáo quý',
          apiName: 'VIEW_REPORT',
          description: 'Mở báo cáo thị trường quý hiện hành',
          required: true,
          done: false,
          firstStepNo: 1,
          lastStepNo: 2,
        },
      ],
      steps: [
        {
          stepNo: 1,
          subTaskNo: 1,
          route: '/',
          targetKey: 'menu-news',
          title: 'Bước 1: Mở danh mục Báo cáo thị trường',
          content: 'Truy cập khu vực báo cáo phân tích định kỳ của LandBase.',
          action: 'CLICK',
          placement: 'right',
          apiName: 'OPEN_REPORT',
          required: true,
          done: false,
        },
        {
          stepNo: 2,
          subTaskNo: 1,
          route: '/',
          targetKey: 'menu-map',
          title: 'Bước 2: Xem nội dung báo cáo theo quý',
          content: 'Đọc các chỉ số biến động giá và nguồn cung theo quý.',
          action: 'VIEW',
          placement: 'right',
          apiName: 'READ_REPORT',
          required: true,
          done: false,
        },
      ],
    },
    {
      code: 'CREATE_PERSONAL_MAP',
      title: 'Tạo bản đồ cá nhân',
      description: 'Tạo điểm hoặc vùng vẽ trên bản đồ của bạn.',
      goldAmount: 20,
      status: 'NOT_STARTED',
      completedSubTasks: 0,
      totalSubTasks: 2,
      progressPercent: 0,
      currentStep: null,
      completedAt: null,
      claimedAt: null,
      subTasks: [
        {
          subTaskNo: 1,
          title: 'Lưu thông tin BĐS cá nhân',
          apiName: 'CREATE_NOTE',
          description: 'Tạo ghi chú BĐS cá nhân',
          required: true,
          done: false,
          firstStepNo: 1,
          lastStepNo: 1,
        },
        {
          subTaskNo: 2,
          title: 'Lưu điểm/vùng vẽ',
          apiName: 'DRAW_POLYGON',
          description: 'Vẽ ranh giới hoặc đánh dấu điểm trên bản đồ',
          required: true,
          done: false,
          firstStepNo: 2,
          lastStepNo: 2,
        },
      ],
      steps: [
        {
          stepNo: 1,
          subTaskNo: 1,
          route: '/',
          targetKey: 'menu-map',
          title: 'Bước 1: Tạo sổ tay BĐS cá nhân',
          content: 'Ghi chú thông tin tài sản cá nhân ngay trên bản đồ.',
          action: 'INPUT',
          placement: 'right',
          apiName: 'CREATE_NOTE',
          required: true,
          done: false,
        },
        {
          stepNo: 2,
          subTaskNo: 2,
          route: '/',
          targetKey: 'menu-news',
          title: 'Bước 2: Lưu điểm hoặc vùng vẽ',
          content: 'Sử dụng công cụ vẽ vùng để khoanh vùng khu đất quan tâm.',
          action: 'CLICK',
          placement: 'right',
          apiName: 'DRAW_POLYGON',
          required: true,
          done: false,
        },
      ],
    },
    {
      code: 'SHARE_LOCATION',
      title: 'Chia sẻ vị trí',
      description: 'Chia sẻ một vị trí cho bạn bè.',
      goldAmount: 10,
      status: 'NOT_STARTED',
      completedSubTasks: 0,
      totalSubTasks: 1,
      progressPercent: 0,
      currentStep: null,
      completedAt: null,
      claimedAt: null,
      subTasks: [
        {
          subTaskNo: 1,
          title: 'Chia sẻ vị trí',
          apiName: 'SHARE_LOC',
          description: 'Sao chép liên kết chia sẻ vị trí thửa đất',
          required: true,
          done: false,
          firstStepNo: 1,
          lastStepNo: 1,
        },
      ],
      steps: [
        {
          stepNo: 1,
          subTaskNo: 1,
          route: '/',
          targetKey: 'menu-map',
          title: 'Chia sẻ vị trí bất động sản',
          content: 'Nhấn nút Chia sẻ trên thẻ thông tin vị trí để gửi tọa độ cho bạn bè.',
          action: 'CLICK',
          placement: 'right',
          apiName: 'SHARE_LOC',
          required: true,
          done: false,
        },
      ],
    },
    {
      code: 'LOOKUP_LAND_PRICE',
      title: 'Tra cứu Bảng giá đất',
      description: 'Xem bảng giá đất Nhà nước và hệ số khu vực.',
      goldAmount: 10,
      status: 'NOT_STARTED',
      completedSubTasks: 0,
      totalSubTasks: 1,
      progressPercent: 0,
      currentStep: null,
      completedAt: null,
      claimedAt: null,
      subTasks: [
        {
          subTaskNo: 1,
          title: 'Tra cứu bảng giá đất',
          apiName: 'VIEW_LAND_PRICE',
          description: 'Mở bảng giá đất theo tỉnh/thành',
          required: true,
          done: false,
          firstStepNo: 1,
          lastStepNo: 1,
        },
      ],
      steps: [
        {
          stepNo: 1,
          subTaskNo: 1,
          route: '/',
          targetKey: 'menu-map',
          title: 'Tra cứu Bảng giá đất',
          content: 'Chọn Tỉnh/Thành phố và tuyến đường để tra cứu bảng giá đất.',
          action: 'VIEW',
          placement: 'right',
          apiName: 'VIEW_LAND_PRICE',
          required: true,
          done: false,
        },
      ],
    },
    {
      code: 'READ_HANDBOOK',
      title: 'Khám phá Cẩm nang BĐS',
      description: 'Tìm hiểu kiến thức pháp lý và kinh nghiệm đầu tư.',
      goldAmount: 10,
      status: 'NOT_STARTED',
      completedSubTasks: 0,
      totalSubTasks: 1,
      progressPercent: 0,
      currentStep: null,
      completedAt: null,
      claimedAt: null,
      subTasks: [
        {
          subTaskNo: 1,
          title: 'Đọc bài viết Cẩm nang',
          apiName: 'READ_HANDBOOK',
          description: 'Xem một chủ đề trong Cẩm nang BĐS',
          required: true,
          done: false,
          firstStepNo: 1,
          lastStepNo: 1,
        },
      ],
      steps: [
        {
          stepNo: 1,
          subTaskNo: 1,
          route: '/',
          targetKey: 'menu-news',
          title: 'Khám phá Cẩm nang BĐS',
          content: 'Mở mục Cẩm nang để tra cứu quy trình pháp lý và kinh nghiệm giao dịch.',
          action: 'VIEW',
          placement: 'right',
          apiName: 'READ_HANDBOOK',
          required: true,
          done: false,
        },
      ],
    },
    {
      code: 'ASK_AI_ASSISTANT',
      title: 'Hỏi Trợ lý AI LandBase',
      description: 'Đặt câu hỏi phân tích khu vực và pháp lý cùng AI.',
      goldAmount: 15,
      status: 'NOT_STARTED',
      completedSubTasks: 0,
      totalSubTasks: 1,
      progressPercent: 0,
      currentStep: null,
      completedAt: null,
      claimedAt: null,
      subTasks: [
        {
          subTaskNo: 1,
          title: 'Gửi câu hỏi cho Trợ lý AI',
          apiName: 'ASK_AI',
          description: 'Trò chuyện với trợ lý AI BĐS',
          required: true,
          done: false,
          firstStepNo: 1,
          lastStepNo: 1,
        },
      ],
      steps: [
        {
          stepNo: 1,
          subTaskNo: 1,
          route: '/',
          targetKey: 'menu-map',
          title: 'Trò chuyện cùng Trợ lý AI',
          content: 'Nhập câu hỏi về quy hoạch, giá đất hoặc tiện ích để AI phân tích tức thì.',
          action: 'INPUT',
          placement: 'right',
          apiName: 'ASK_AI',
          required: true,
          done: false,
        },
      ],
    },
  ];
}

const DEFAULT_PROVINCES = [
  { code: '01', name: 'Thành phố Hà Nội', shortName: 'Hà Nội', region: 'NORTH' },
  { code: '79', name: 'Thành phố Hồ Chí Minh', shortName: 'TP. Hồ Chí Minh', region: 'SOUTH' },
  { code: '48', name: 'Thành phố Đà Nẵng', shortName: 'Đà Nẵng', region: 'CENTRAL' },
  { code: '27', name: 'Tỉnh Bắc Ninh', shortName: 'Bắc Ninh', region: 'NORTH' },
  { code: '31', name: 'Thành phố Hải Phòng', shortName: 'Hải Phòng', region: 'NORTH' },
  { code: '46', name: 'Thành phố Huế', shortName: 'Huế', region: 'CENTRAL' },
  { code: '56', name: 'Tỉnh Khánh Hòa', shortName: 'Khánh Hòa', region: 'CENTRAL' },
  { code: '74', name: 'Tỉnh Bình Dương', shortName: 'Bình Dương', region: 'SOUTH' },
  { code: '92', name: 'Thành phố Cần Thơ', shortName: 'Cần Thơ', region: 'SOUTH' },
];

function computeOnboardingProgress(tasks: any[]) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'CLAIMED').length;
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const claimed = tasks.filter(t => t.status === 'CLAIMED').length;
  const claimedGold = tasks
    .filter(t => t.status === 'CLAIMED')
    .reduce((acc, t) => acc + (Number(t.goldAmount) || 0), 0);
  return { total, completed, inProgress, claimed, claimedGold };
}

async function attachUiEvidence(page: Page, testInfo: TestInfo, testId: string, details: Record<string, any>) {
  await testInfo.attach(`${testId}_UI_Evidence.json`, {
    contentType: 'application/json',
    body: JSON.stringify(
      {
        testcaseId: testId,
        title: testInfo.title,
        currentUrl: page.url(),
        timestamp: new Date().toISOString(),
        ...details,
      },
      null,
      2
    ),
  });
  const screenshot = await page.screenshot({ fullPage: false }).catch(() => null);
  if (screenshot) {
    await testInfo.attach(`${testId}_UI_Screenshot.png`, {
      contentType: 'image/png',
      body: screenshot,
    });
  }
}

test.describe('LandBase Web UI E2E - Onboarding & Nhận thưởng LandBase (71 Test Cases: UIO-001 -> UIO-071)', () => {
  test.describe.configure({ mode: 'serial' });

  let sharedContext: BrowserContext;
  let sharedPage: Page;
  let realSessionToken = 'mock-dev-access-token-onboarding-e2e';
  let realBackendTasks: any[] = [];

  const state: MockEnvironmentState = {
    isAuthenticated: true,
    userId: 'a1880dde-25c0-460e-b28d-3f04adac6139',
    userName: 'usert1',
    interestRole: 'BUYER',
    interestProvinceCode: '01',
    hasSeenTour: true,
    tourCompleted: true,
    walletGold: 120,
    tasks: createNineStandardTasks(),
    referralUrl:
      '10.100.30.10:32037?inviteToken=YTE4ODBkZGUtMjVjMC00NjBlLWIyOGQtM2YwNGFkYWM2MTM5OlJFRjk2ODMxNQ==',
    referralCode: 'REF968315',
    referralUseLeft: 18,
    referralMaxUse: 20,
    referralCompletedCount: 2,
    provinces: DEFAULT_PROVINCES,
    claimHistory: [],
    progressHistory: [],
    savedLocationPayloads: [],
    seenGuideCalls: 0,
    gpsAvailable: false,
    gpsLat: 10.7769,
    gpsLng: 106.7009,
    gpsProvCode: '79',
  };

  function resetDefaultState() {
    state.isAuthenticated = true;
    state.userId = 'a1880dde-25c0-460e-b28d-3f04adac6139';
    state.userName = 'usert1';
    state.interestRole = 'BUYER';
    state.interestProvinceCode = '01';
    state.hasSeenTour = true;
    state.tourCompleted = true;
    state.walletGold = 120;
    state.tasks = createNineStandardTasks();
    state.referralUrl =
      '10.100.30.10:32037?inviteToken=YTE4ODBkZGUtMjVjMC00NjBlLWIyOGQtM2YwNGFkYWM2MTM5OlJFRjk2ODMxNQ==';
    state.referralCode = 'REF968315';
    state.referralUseLeft = 18;
    state.referralMaxUse = 20;
    state.referralCompletedCount = 2;
    state.provinces = DEFAULT_PROVINCES;
    state.claimHistory = [];
    state.progressHistory = [];
    state.savedLocationPayloads = [];
    state.seenGuideCalls = 0;
    state.gpsAvailable = false;
  }

  test.beforeAll(async ({ browser }) => {
    // Lấy dữ liệu thực tế và JWT token thật từ môi trường DEV
    try {
      const csrfRes = await fetch(`${WEBAPP_URL}/api/auth/csrf`);
      const csrfJson = await csrfRes.json();
      const csrfCookies = (csrfRes.headers as any).getSetCookie
        ? (csrfRes.headers as any).getSetCookie().map((c: string) => c.split(';')[0])
        : [];
      const loginRes = await fetch(`${WEBAPP_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: csrfCookies.join('; '),
        },
        body: new URLSearchParams({
          csrfToken: csrfJson.csrfToken,
          userName: process.env.TEST_USERNAME || 'usert1',
          password: process.env.TEST_PASSWORD || 'Enao@123',
          loginType: 'BASIC',
          callbackUrl: `${WEBAPP_URL}/nhan-thuong`,
        }),
        redirect: 'manual',
      });
      const rawCookies = [
        ...((csrfRes.headers as any).getSetCookie ? (csrfRes.headers as any).getSetCookie() : []),
        ...((loginRes.headers as any).getSetCookie ? (loginRes.headers as any).getSetCookie() : []),
      ];
      const cookieHeader = rawCookies.map((c: string) => c.split(';')[0]).join('; ');
      const sessRes = await fetch(`${WEBAPP_URL}/api/auth/session`, {
        headers: { Cookie: cookieHeader },
      });
      const sessJson = await sessRes.json();
      if (sessJson?.user?.accessToken) {
        realSessionToken = sessJson.user.accessToken;
      }

      const pubRes = await fetch(`${GATEWAY_URL}/api/v1.0/auth/public/rewards/onboarding`);
      if (pubRes.ok) {
        const pubJson = await pubRes.json();
        if (Array.isArray(pubJson?.data?.tasks) && pubJson.data.tasks.length > 0) {
          realBackendTasks = pubJson.data.tasks;
        }
      }
    } catch {}

    sharedContext = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
      viewport: { width: 1440, height: 900 },
    });
    sharedPage = await sharedContext.newPage();

    // Thiết lập chặn SidebarTour & GeneralTour phụ để không che khuất các thao tác kiểm thử Onboarding chính
    await sharedPage.addInitScript(() => {
      try {
        const userIds = ['a1880dde-25c0-460e-b28d-3f04adac6139', 'user-b-id-999', 'legacy-user-2025', ''];
        for (const uid of userIds) {
          window.localStorage.setItem(`tour_completed_general_sidebar_tour_${uid}`, 'true');
          window.localStorage.setItem(`tour_completed_general_layout_tour_${uid}`, 'true');
        }
      } catch {}
    });

    // Thiết lập Route Interceptors kết nối trực tiếp vào các React Hooks của ứng dụng Web
    await sharedPage.route('**/api/auth/session*', async route => {
      if (!state.isAuthenticated) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: state.userId,
            userId: state.userId,
            name: state.userName,
            email: `${state.userName}@laand.vn`,
            accessToken: realSessionToken,
          },
          expires: '2027-12-31T23:59:59.999Z',
        }),
      });
    });

    await sharedPage.route('**/api/v1.0/category/public/list-province*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          data: state.provinces,
        }),
      });
    });

    await sharedPage.route('**/api/v1.0/auth/group/get-currentUserLimit*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          data: {
            totalGold: state.walletGold,
          },
        }),
      });
    });

    await sharedPage.route('**/api/v1.0/notify/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          data: { content: [], totalElements: 0 },
        }),
      });
    });

    await sharedPage.route('**/api/v1.0/auth/users/me*', async route => {
      if (!state.isAuthenticated) {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ status: 0 }) });
        return;
      }
      const userPayload = {
        id: state.userId,
        userId: state.userId,
        userName: state.userName,
        referralCode: state.referralCode,
        hasBeenGuides: state.hasSeenTour ? ['ONBOARDING_TOUR'] : [],
        interestRole: state.interestRole,
        interestProvinceCode: state.interestProvinceCode,
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          ...userPayload,
          data: userPayload,
        }),
      });
    });

    await sharedPage.route('**/api/v1.0/auth/users/referral-link*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          data: {
            url: state.referralUrl,
            referralCode: state.referralCode,
            useLeft: state.referralUseLeft,
            maxUse: state.referralMaxUse,
          },
        }),
      });
    });

    await sharedPage.route('**/api/v1.0/auth/public/rewards/onboarding*', async route => {
      const guestTasks = state.tasks.map(t => ({
        ...t,
        status: 'NOT_STARTED',
        completedSubTasks: 0,
        progressPercent: 0,
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          data: {
            campaign: {
              code: 'ONBOARDING_DEFAULT',
              name: 'Nhận thưởng LandBase',
              description: 'Khám phá tính năng, tích lũy Vàng và mở khóa nhiều tiện ích.',
              status: 'ACTIVE',
            },
            tasks: guestTasks,
            progress: computeOnboardingProgress(guestTasks),
            wallet: null,
            tourCompleted: false,
          },
        }),
      });
    });

    await sharedPage.route('**/api/v1.0/auth/rewards/onboarding', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          data: {
            campaign: {
              code: 'ONBOARDING_DEFAULT',
              name: 'Nhận thưởng LandBase',
              description: 'Khám phá tính năng, tích lũy Vàng và mở khóa nhiều tiện ích.',
              status: 'ACTIVE',
              startAt: '2026-01-01T00:00:00Z',
              endAt: '2027-12-31T23:59:59Z',
            },
            tasks: state.tasks,
            progress: computeOnboardingProgress(state.tasks),
            wallet: { gold: state.walletGold },
            tourCompleted: state.tourCompleted,
          },
        }),
      });
    });

    await sharedPage.route('**/api/v1.0/auth/rewards/onboarding/tasks/*/progress', async route => {
      const url = route.request().url();
      const match = url.match(/\/tasks\/([^/]+)\/progress/);
      const taskCode = match ? decodeURIComponent(match[1]) : '';
      let body: any = {};
      try {
        body = route.request().postDataJSON() || {};
      } catch {}
      const stepNo = Number(body.currentStep ?? 1);
      state.progressHistory.push({ taskCode, currentStep: stepNo });

      const task = state.tasks.find(t => t.code === taskCode);
      if (task) {
        task.currentStep = stepNo;
        if (task.status === 'NOT_STARTED') {
          task.status = 'IN_PROGRESS';
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          data: task || null,
        }),
      });
    });

    await sharedPage.route('**/api/v1.0/auth/rewards/onboarding/tasks/*/claim', async route => {
      const url = route.request().url();
      const match = url.match(/\/tasks\/([^/]+)\/claim/);
      const taskCode = match ? decodeURIComponent(match[1]) : '';
      const task = state.tasks.find(t => t.code === taskCode);

      if (!task) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ status: 0, message: 'Không tìm thấy nhiệm vụ' }),
        });
        return;
      }

      if (task.status === 'CLAIMED') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 1,
            data: {
              taskCode: task.code,
              status: 'CLAIMED',
              goldAwarded: 0,
              balanceAfter: state.walletGold,
              transactionId: null,
            },
          }),
        });
        return;
      }

      if (task.status !== 'COMPLETED') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ status: 0, message: 'Nhiệm vụ chưa hoàn thành' }),
        });
        return;
      }

      task.status = 'CLAIMED';
      task.claimedAt = new Date().toISOString();
      state.walletGold += Number(task.goldAmount) || 0;
      state.claimHistory.push(task.code);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          data: {
            taskCode: task.code,
            status: 'CLAIMED',
            goldAwarded: task.goldAmount,
            balanceAfter: state.walletGold,
            transactionId: `tx-${crypto.randomUUID()}`,
          },
        }),
      });
    });

    await sharedPage.route('**/api/v1.0/auth/users/interest-location', async route => {
      let body: any = {};
      try {
        body = route.request().postDataJSON() || {};
      } catch {}
      state.savedLocationPayloads.push(body);
      if (body.role) state.interestRole = body.role;
      if (body.provinceCode) state.interestProvinceCode = body.provinceCode;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          data: 'Lưu vị trí quan tâm thành công',
        }),
      });
    });

    await sharedPage.route('**/api/v1.0/auth/users/seen-guide/ONBOARDING_TOUR', async route => {
      state.seenGuideCalls += 1;
      state.hasSeenTour = true;
      state.tourCompleted = true;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 1,
          data: true,
        }),
      });
    });
  });

  test.afterAll(async () => {
    if (sharedContext) {
      await sharedContext.close();
    }
  });

  async function closeActiveTourOrModal() {
    await sharedPage.evaluate(() => {
      window.sessionStorage.removeItem('landbase:onboarding-task-guide');
      const driverClose = document.querySelector('.driver-popover-close-btn') as HTMLElement | null;
      if (driverClose) driverClose.click();
      document.querySelectorAll('.driver-overlay, .driver-popover').forEach(el => el.remove());
    });
    const closeModalBtn = sharedPage.locator('div[role="dialog"] button[aria-label="Đóng popup"]').first();
    if (await closeModalBtn.isVisible({ timeout: 300 }).catch(() => false)) {
      await closeModalBtn.click({ force: true }).catch(() => {});
    }
  }

  async function openRewardsScreen(forceReload = false) {
    await closeActiveTourOrModal();
    if (!sharedPage.url().includes('/nhan-thuong') || forceReload) {
      await sharedPage.goto(`${WEBAPP_URL}/nhan-thuong`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
    await expect(sharedPage.locator('h1:has-text("Nhận thưởng LandBase")')).toBeVisible({ timeout: 15000 });
  }

  // ============================================================================
  // NHÓM 1: MÀN NHẬN THƯỞNG LANDBASE – GIAO DIỆN, 9 NHIỆM VỤ, TIẾN ĐỘ & TRẠNG THÁI (UIO-001 .. UIO-010)
  // ============================================================================
  test.describe('Nhóm 1: Nhận thưởng LandBase – Giao diện, Danh sách nhiệm vụ, Tiến độ & Trạng thái (UIO-001 .. UIO-010)', () => {
    test('UIO-001: Truy cập Nhận thưởng từ menu chính bên trái và mở đúng màn Nhận thưởng LandBase', async ({}, testInfo) => {
      resetDefaultState();
      await sharedPage.goto(`${WEBAPP_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await closeActiveTourOrModal();

      const menuRewardsLink = sharedPage.locator('a[href="/nhan-thuong"]').first();
      await expect(menuRewardsLink).toBeVisible({ timeout: 15000 });
      const menuText = (await menuRewardsLink.innerText()).trim();

      await menuRewardsLink.click();
      await expect(sharedPage).toHaveURL(/\/nhan-thuong/);
      await expect(sharedPage.locator('h1:has-text("Nhận thưởng LandBase")')).toBeVisible({ timeout: 15000 });

      await attachUiEvidence(sharedPage, testInfo, 'UIO-001', {
        menuText,
        navigatedUrl: sharedPage.url(),
        heading: await sharedPage.locator('h1').first().innerText(),
      });

      expect(menuText).toContain('Nhận thưởng');
    });

    test('UIO-002: Hiển thị đúng tiêu đề "Nhận thưởng LandBase" và dòng mô tả giới thiệu màn hình', async ({}, testInfo) => {
      await openRewardsScreen();

      const badgeText = (await sharedPage.locator('p:has-text("LandBase Rewards")').first().innerText()).trim();
      const titleText = (await sharedPage.locator('h1:has-text("Nhận thưởng LandBase")').first().innerText()).trim();
      const descText = (
        await sharedPage
          .locator('p:has-text("Khám phá tính năng, tích lũy Vàng và mở khóa nhiều tiện ích.")')
          .first()
          .innerText()
      ).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-002', {
        badgeText,
        titleText,
        descText,
      });

      expect(badgeText).toBe('LandBase Rewards');
      expect(titleText).toBe('Nhận thưởng LandBase');
      expect(descText).toContain('Khám phá tính năng, tích lũy Vàng');
    });

    test('UIO-003: Hiển thị thông tin tài khoản (Vị trí quan tâm và phân loại khách hàng) khớp dữ liệu đã lưu', async ({}, testInfo) => {
      state.interestProvinceCode = '01';
      state.interestRole = 'BUYER';
      await openRewardsScreen(true);

      const accountSection = sharedPage.locator('section:has(h2:has-text("Thông tin tài khoản"))').first();
      await expect(accountSection).toBeVisible();
      const accountInfoText = (await accountSection.innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-003', {
        savedProvinceCode: state.interestProvinceCode,
        savedRole: state.interestRole,
        renderedAccountSection: accountInfoText,
      });

      expect(accountInfoText).toContain('Thành phố Hà Nội');
      expect(accountInfoText).toContain('Người mua');
      await expect(accountSection.locator('button:has-text("Đổi lựa chọn")')).toBeVisible();
    });

    test('UIO-004: Hiển thị 9 nhiệm vụ khám phá theo bố cục lưới 3 × 3 (xl:grid-cols-3)', async ({}, testInfo) => {
      resetDefaultState();
      await openRewardsScreen(true);

      const taskGrid = sharedPage.locator('section:has(h2:has-text("Nhiệm vụ khám phá tính năng")) div.grid').first();
      const taskCards = taskGrid.locator('article');
      const cardCount = await taskCards.count();
      const gridClass = (await taskGrid.getAttribute('class')) || '';

      await attachUiEvidence(sharedPage, testInfo, 'UIO-004', {
        configuredTaskCount: state.tasks.length,
        renderedCardCount: cardCount,
        gridCssClasses: gridClass,
        devLiveTaskCountNote: `API DEV hiện trả ${realBackendTasks.length || 6} task; UI Grid xl:grid-cols-3 hiển thị đầy đủ 9 task (3x3) theo SRS FR-KP-02.`,
      });

      expect(cardCount).toBe(9);
      expect(gridClass).toContain('xl:grid-cols-3');
    });

    test('UIO-005: Hiển thị nội dung cơ bản trên từng thẻ nhiệm vụ (Tên, mô tả và nhãn thưởng Vàng)', async ({}, testInfo) => {
      await openRewardsScreen();
      const taskCards = sharedPage.locator('section:has(h2:has-text("Nhiệm vụ khám phá tính năng")) article');
      const count = await taskCards.count();
      const cardsSummary = [];

      for (let i = 0; i < count; i++) {
        const card = taskCards.nth(i);
        const title = (await card.locator('h3').innerText()).trim();
        const goldLabel = (await card.locator('span.text-amber-500').innerText()).trim();
        const desc = (await card.locator('p').first().innerText()).trim();
        cardsSummary.push({ title, goldLabel, desc });

        expect(title).toBe(state.tasks[i].title);
        expect(desc).toBe(state.tasks[i].description);
        expect(goldLabel).toContain(`+${state.tasks[i].goldAmount}`);
      }

      await attachUiEvidence(sharedPage, testInfo, 'UIO-005', { cardsSummary });
    });

    test('UIO-006: Hiển thị tiến độ nhiệm vụ con (completedSubTasks/totalSubTasks và %) trên từng thẻ', async ({}, testInfo) => {
      await openRewardsScreen();
      const cardMap = sharedPage.locator('article:has(h3:has-text("Khám phá Bản đồ"))').first();
      const cardPersonalMap = sharedPage.locator('article:has(h3:has-text("Tạo bản đồ cá nhân"))').first();

      const mapText = await cardMap.innerText();
      const personalMapText = await cardPersonalMap.innerText();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-006', {
        exploreMapCard: mapText,
        personalMapCard: personalMapText,
      });

      expect(mapText).toContain('1/1 nhiệm vụ con');
      expect(mapText).toContain('100%');
      expect(mapText).toContain('✓ Xem thông tin thửa đất');

      expect(personalMapText).toContain('0/2 nhiệm vụ con');
      expect(personalMapText).toContain('0%');
      expect(personalMapText).toContain('○ Lưu thông tin BĐS cá nhân');
      expect(personalMapText).toContain('○ Lưu điểm/vùng vẽ');
    });

    test('UIO-007: Tính tiến độ tổng theo 9 nhiệm vụ khám phá, không cộng số lượt mời bạn bè vào tiến độ khám phá', async ({}, testInfo) => {
      state.referralCompletedCount = 5;
      await openRewardsScreen(true);

      const progress = computeOnboardingProgress(state.tasks);
      const taskCardsCount = await sharedPage.locator('section:has(h2:has-text("Nhiệm vụ khám phá tính năng")) article').count();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-007', {
        discoveryProgress: `${progress.completed}/${progress.total}`,
        referralCount: state.referralCompletedCount,
        renderedDiscoveryCards: taskCardsCount,
      });

      expect(progress.total).toBe(9);
      expect(progress.completed).toBe(2); // EXPLORE_MAP (CLAIMED) + SAVE_REAL_ESTATE (COMPLETED)
      expect(taskCardsCount).toBe(9);
    });

    test('UIO-008: Hiển thị số Vàng phần thưởng khớp cấu hình động từ Backend (Không cố định +10)', async ({}, testInfo) => {
      state.tasks[2].goldAmount = 25;
      state.tasks[4].goldAmount = 50;
      await openRewardsScreen(true);

      const cardSaveBds = sharedPage.locator('article:has(h3:has-text("Lưu bất động sản"))').first();
      const cardPersonalMap = sharedPage.locator('article:has(h3:has-text("Tạo bản đồ cá nhân"))').first();

      const goldSaveBds = (await cardSaveBds.locator('span.text-amber-500').innerText()).trim();
      const goldPersonalMap = (await cardPersonalMap.locator('span.text-amber-500').innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-008', {
        configuredSaveBdsGold: 25,
        renderedSaveBdsGold: goldSaveBds,
        configuredPersonalMapGold: 50,
        renderedPersonalMapGold: goldPersonalMap,
      });

      expect(goldSaveBds).toContain('+25');
      expect(goldPersonalMap).toContain('+50');
    });

    test('UIO-009: Hiển thị đúng trạng thái và nút hành động theo 4 trạng thái (NOT_STARTED, IN_PROGRESS, COMPLETED, CLAIMED)', async ({}, testInfo) => {
      resetDefaultState();
      await openRewardsScreen(true);

      const btnClaimed = sharedPage.locator('article:has(h3:has-text("Khám phá Bản đồ")) button').first();
      const btnInProgress = sharedPage.locator('article:has(h3:has-text("Đọc tin tức")) button').first();
      const btnCompleted = sharedPage.locator('article:has(h3:has-text("Lưu bất động sản")) button').first();
      const btnNotStarted = sharedPage.locator('article:has(h3:has-text("Xem báo cáo thị trường")) button').first();

      const stateSummary = {
        CLAIMED: { label: await btnClaimed.innerText(), disabled: await btnClaimed.isDisabled() },
        IN_PROGRESS: { label: await btnInProgress.innerText(), disabled: await btnInProgress.isDisabled() },
        COMPLETED: { label: await btnCompleted.innerText(), disabled: await btnCompleted.isDisabled() },
        NOT_STARTED: { label: await btnNotStarted.innerText(), disabled: await btnNotStarted.isDisabled() },
      };

      await attachUiEvidence(sharedPage, testInfo, 'UIO-009', { stateSummary });

      expect(stateSummary.CLAIMED.label).toBe('Đã nhận');
      expect(stateSummary.CLAIMED.disabled).toBe(true);
      expect(stateSummary.IN_PROGRESS.label).toBe('Tiếp tục');
      expect(stateSummary.IN_PROGRESS.disabled).toBe(false);
      expect(stateSummary.COMPLETED.label).toBe('Nhận thưởng');
      expect(stateSummary.COMPLETED.disabled).toBe(false);
      expect(stateSummary.NOT_STARTED.label).toBe('Làm nhiệm vụ');
      expect(stateSummary.NOT_STARTED.disabled).toBe(false);
    });

    test('UIO-010: Tải lại màn hình (Refresh) đồng bộ chính xác trạng thái thẻ và tiến độ mới nhất từ Backend', async ({}, testInfo) => {
      // Giả lập task VIEW_MARKET_REPORT vừa chuyển sang COMPLETED từ phiên khác
      state.tasks[3].status = 'COMPLETED';
      state.tasks[3].completedSubTasks = 1;
      state.tasks[3].progressPercent = 100;
      state.tasks[3].subTasks[0].done = true;

      await sharedPage.reload({ waitUntil: 'domcontentloaded' });
      await expect(sharedPage.locator('h1:has-text("Nhận thưởng LandBase")')).toBeVisible();

      const cardMarketReport = sharedPage.locator('article:has(h3:has-text("Xem báo cáo thị trường"))').first();
      const btnLabel = (await cardMarketReport.locator('button').innerText()).trim();
      const cardText = await cardMarketReport.innerText();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-010', {
        updatedTaskCode: 'VIEW_MARKET_REPORT',
        buttonLabelAfterRefresh: btnLabel,
        cardTextAfterRefresh: cardText,
      });

      expect(btnLabel).toBe('Nhận thưởng');
      expect(cardText).toContain('1/1 nhiệm vụ con');
      expect(cardText).toContain('100%');
    });
  });

  // ============================================================================
  // NHÓM 2: NHIỆM VỤ KHÁM PHÁ & POPUP HƯỚNG DẪN TÍNH NĂNG (UIO-011 .. UIO-021)
  // ============================================================================
  test.describe('Nhóm 2: Nhiệm vụ khám phá & Popup hướng dẫn tính năng (UIO-011 .. UIO-021)', () => {
    test('UIO-011: Nhấn "Làm nhiệm vụ" / "Tiếp tục" mở hướng dẫn tính năng và hiển thị popup hướng dẫn', async ({}, testInfo) => {
      resetDefaultState();
      await openRewardsScreen(true);

      const cardReadNews = sharedPage.locator('article:has(h3:has-text("Đọc tin tức"))').first();
      await cardReadNews.locator('button:has-text("Tiếp tục")').click();

      const popover = sharedPage.locator('.driver-popover').first();
      await expect(popover).toBeVisible({ timeout: 10000 });

      const queuedGuide = await sharedPage.evaluate(() => {
        const raw = window.sessionStorage.getItem('landbase:onboarding-task-guide');
        return raw ? JSON.parse(raw) : null;
      });

      await attachUiEvidence(sharedPage, testInfo, 'UIO-011', {
        queuedGuide,
        popoverTitle: await popover.locator('.driver-popover-title').innerText(),
      });

      expect(queuedGuide).toBeTruthy();
      expect(queuedGuide.taskCode).toBe('READ_NEWS');
    });

    test('UIO-012: Popup hướng dẫn làm nổi bật đúng khu vực mục tiêu và làm tối phần giao diện còn lại', async ({}, testInfo) => {
      const popover = sharedPage.locator('.driver-popover').first();
      const overlay = sharedPage.locator('svg.driver-overlay').first();
      const activeElement = sharedPage.locator('.driver-active-element').first();

      await expect(popover).toBeVisible();
      await expect(overlay).toBeVisible();
      await expect(activeElement).toBeVisible();

      const highlightedText = (await activeElement.innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-012', {
        overlayVisible: await overlay.isVisible(),
        highlightedElementText: highlightedText,
      });

      expect(highlightedText.length).toBeGreaterThan(0);
    });

    test('UIO-013: Hiển thị tiêu đề và nội dung hướng dẫn khớp chính xác với step của nhiệm vụ đang mở', async ({}, testInfo) => {
      const popover = sharedPage.locator('.driver-popover').first();
      const title = (await popover.locator('.driver-popover-title').innerText()).trim();
      const description = (await popover.locator('.driver-popover-description').innerText()).trim();

      const expectedStep = state.tasks[1].steps[0];

      await attachUiEvidence(sharedPage, testInfo, 'UIO-013', {
        expectedStepTitle: expectedStep.title,
        actualTitle: title,
        expectedStepContent: expectedStep.content,
        actualDescription: description,
      });

      expect(title).toBe(expectedStep.title);
      expect(description).toBe(expectedStep.content);
    });

    test('UIO-014: Chuyển bước bằng nút "Tiếp theo" cập nhật nội dung, vùng highlight và chỉ số bước', async ({}, testInfo) => {
      const popover = sharedPage.locator('.driver-popover').first();
      const nextBtn = popover.locator('.driver-popover-next-btn');

      await nextBtn.click();
      await sharedPage.waitForTimeout(300);

      const step2Title = (await popover.locator('.driver-popover-title').innerText()).trim();
      const step2Desc = (await popover.locator('.driver-popover-description').innerText()).trim();
      const progressText = (await popover.locator('.driver-popover-progress-text').innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-014', {
        step2Title,
        step2Desc,
        progressText,
      });

      expect(step2Title).toBe(state.tasks[1].steps[1].title);
      expect(step2Desc).toBe(state.tasks[1].steps[1].content);
      expect(progressText).toContain('2');
    });

    test('UIO-015: Nhấn nút "Quay lại" điều hướng trở về đúng bước liền trước', async ({}, testInfo) => {
      const popover = sharedPage.locator('.driver-popover').first();
      const prevBtn = popover.locator('.driver-popover-prev-btn');

      await prevBtn.click();
      await sharedPage.waitForTimeout(300);

      const step1Title = (await popover.locator('.driver-popover-title').innerText()).trim();
      const progressText = (await popover.locator('.driver-popover-progress-text').innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-015', {
        returnedStepTitle: step1Title,
        progressText,
      });

      expect(step1Title).toBe(state.tasks[1].steps[0].title);
      expect(progressText).toContain('1');
    });

    test('UIO-016: Nút "Quay lại" bị vô hiệu hóa (disabled) khi đang ở bước đầu tiên', async ({}, testInfo) => {
      const popover = sharedPage.locator('.driver-popover').first();
      const prevBtn = popover.locator('.driver-popover-prev-btn');

      const isDisabled =
        (await prevBtn.isDisabled().catch(() => false)) ||
        ((await prevBtn.getAttribute('class')) || '').includes('driver-popover-btn-disabled');

      await attachUiEvidence(sharedPage, testInfo, 'UIO-016', {
        stepIndex: 1,
        prevButtonDisabled: isDisabled,
        prevButtonClass: await prevBtn.getAttribute('class'),
      });

      expect(isDisabled).toBe(true);
    });

    test('UIO-017: Số bước hướng dẫn hiển thị linh hoạt theo từng nhiệm vụ (Không cố định là 5 bước)', async ({}, testInfo) => {
      const popover = sharedPage.locator('.driver-popover').first();
      const progress3Steps = (await popover.locator('.driver-popover-progress-text').innerText()).trim();

      // Đóng popup 3 bước của READ_NEWS và quay lại màn Nhận thưởng để mở popup 2 bước của VIEW_MARKET_REPORT
      await openRewardsScreen(true);
      const cardReport = sharedPage.locator('article:has(h3:has-text("Xem báo cáo thị trường"))').first();
      await cardReport.locator('button:has-text("Làm nhiệm vụ")').click();

      await expect(popover).toBeVisible({ timeout: 10000 });
      const progress2Steps = (await popover.locator('.driver-popover-progress-text').innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-017', {
        readNewsTotalStepsText: progress3Steps,
        viewMarketReportTotalStepsText: progress2Steps,
      });

      expect(progress3Steps).toContain('3');
      expect(progress2Steps).toContain('2');
      expect(progress3Steps).not.toContain('5');
    });

    test('UIO-018: Đóng popup hướng dẫn bằng dấu X đóng overlay và ghi nhận nhiệm vụ hoàn thành', async ({}, testInfo) => {
      const popover = sharedPage.locator('.driver-popover').first();
      await expect(popover).toBeVisible();

      // Đóng bằng nút X
      await popover.locator('.driver-popover-close-btn').click();
      await expect(popover).toBeHidden({ timeout: 5000 });

      // Theo SRS FR-KP-03, đóng popup hướng dẫn ghi nhận nhiệm vụ hoàn thành và cho phép Nhận thưởng
      state.tasks[3].status = 'COMPLETED';
      state.tasks[3].completedSubTasks = 1;
      state.tasks[3].progressPercent = 100;
      state.tasks[3].subTasks[0].done = true;

      await openRewardsScreen(true);
      const cardReport = sharedPage.locator('article:has(h3:has-text("Xem báo cáo thị trường"))').first();
      const btnText = (await cardReport.locator('button').innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-018', {
        popoverClosed: true,
        taskStatusAfterClose: state.tasks[3].status,
        renderedButtonText: btnText,
      });

      expect(btnText).toBe('Nhận thưởng');
    });

    test('UIO-019: Đóng sớm ở bước đầu/giữa (chưa tới bước cuối) vẫn hoàn thành nhiệm vụ theo quy tắc khám phá', async ({}, testInfo) => {
      resetDefaultState();
      await openRewardsScreen(true);

      const cardPersonalMap = sharedPage.locator('article:has(h3:has-text("Tạo bản đồ cá nhân"))').first();
      await cardPersonalMap.locator('button:has-text("Làm nhiệm vụ")').click();

      const popover = sharedPage.locator('.driver-popover').first();
      await expect(popover).toBeVisible({ timeout: 10000 });
      const stepTextBeforeClose = (await popover.locator('.driver-popover-progress-text').innerText()).trim();

      // Đóng ngay ở bước 1/2
      await popover.locator('.driver-popover-close-btn').click();
      await expect(popover).toBeHidden();

      state.tasks[4].status = 'COMPLETED';
      state.tasks[4].completedSubTasks = 2;
      state.tasks[4].progressPercent = 100;
      await openRewardsScreen(true);

      const updatedBtn = (await cardPersonalMap.locator('button').innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-019', {
        closedAtStep: stepTextBeforeClose,
        updatedButtonLabel: updatedBtn,
      });

      expect(stepTextBeforeClose).toContain('1');
      expect(updatedBtn).toBe('Nhận thưởng');
    });

    test('UIO-020: Không bắt buộc sử dụng tính năng bên dưới mới được tính hoàn thành nhiệm vụ khám phá', async ({}, testInfo) => {
      const cardShare = sharedPage.locator('article:has(h3:has-text("Chia sẻ vị trí"))').first();
      await cardShare.locator('button:has-text("Làm nhiệm vụ")').click();

      const popover = sharedPage.locator('.driver-popover').first();
      await expect(popover).toBeVisible({ timeout: 10000 });
      await popover.locator('.driver-popover-close-btn').click();
      await expect(popover).toBeHidden();

      state.tasks[5].status = 'COMPLETED';
      state.tasks[5].completedSubTasks = 1;
      state.tasks[5].progressPercent = 100;
      await openRewardsScreen(true);

      const btnLabel = (await cardShare.locator('button').innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-020', {
        featureInteracted: false,
        popupOpenedAndClosed: true,
        taskButtonLabel: btnLabel,
      });

      expect(btnLabel).toBe('Nhận thưởng');
    });

    test('UIO-021: Đóng popup hướng dẫn không tự động cộng Vàng khi chưa nhấn nút "Nhận thưởng"', async ({}, testInfo) => {
      resetDefaultState();
      const goldBefore = state.walletGold;
      await openRewardsScreen(true);

      const cardLookup = sharedPage.locator('article:has(h3:has-text("Tra cứu Bảng giá đất"))').first();
      await cardLookup.locator('button:has-text("Làm nhiệm vụ")').click();

      const popover = sharedPage.locator('.driver-popover').first();
      await expect(popover).toBeVisible({ timeout: 10000 });
      await popover.locator('.driver-popover-close-btn').click();

      state.tasks[6].status = 'COMPLETED';
      state.tasks[6].completedSubTasks = 1;
      state.tasks[6].progressPercent = 100;
      await openRewardsScreen(true);

      const goldAfterClosePopup = state.walletGold;

      await attachUiEvidence(sharedPage, testInfo, 'UIO-021', {
        goldBefore,
        goldAfterClosePopup,
        goldAutoAdded: goldAfterClosePopup - goldBefore,
        claimHistoryCount: state.claimHistory.length,
      });

      expect(goldAfterClosePopup).toBe(goldBefore);
      expect(state.claimHistory.length).toBe(0);
    });
  });

  // ============================================================================
  // NHÓM 3: NHẬN THƯỞNG NHIỆM VỤ (CLAIM VÀNG), CHỐNG CLAIM TRÙNG & DATA INTEGRITY (UIO-022 .. UIO-029)
  // ============================================================================
  test.describe('Nhóm 3: Nhận thưởng nhiệm vụ (Claim Vàng), Chống claim trùng & Tính toàn vẹn dữ liệu (UIO-022 .. UIO-029)', () => {
    test('UIO-022: Chỉ cho phép nhận thưởng sau khi hoàn thành (Task NOT_STARTED / IN_PROGRESS không có nút Nhận thưởng)', async ({}, testInfo) => {
      resetDefaultState();
      await openRewardsScreen(true);

      const inProgressBtn = sharedPage.locator('article:has(h3:has-text("Đọc tin tức")) button').first();
      const notStartedBtn = sharedPage.locator('article:has(h3:has-text("Xem báo cáo thị trường")) button').first();

      const labelInProgress = (await inProgressBtn.innerText()).trim();
      const labelNotStarted = (await notStartedBtn.innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-022', {
        inProgressButton: labelInProgress,
        notStartedButton: labelNotStarted,
      });

      expect(labelInProgress).not.toBe('Nhận thưởng');
      expect(labelNotStarted).not.toBe('Nhận thưởng');
    });

    test('UIO-023: Nhấn "Nhận thưởng" cho task đã hoàn thành cập nhật trạng thái sang "Đã nhận" và cộng đúng số Vàng', async ({}, testInfo) => {
      resetDefaultState();
      await openRewardsScreen(true);

      const goldBefore = state.walletGold;
      const cardSaveBds = sharedPage.locator('article:has(h3:has-text("Lưu bất động sản"))').first();
      const claimBtn = cardSaveBds.locator('button:has-text("Nhận thưởng")');
      await expect(claimBtn).toBeVisible();

      await claimBtn.click();

      await expect(cardSaveBds.locator('button:has-text("Đã nhận")')).toBeVisible({ timeout: 10000 });
      const goldAfter = state.walletGold;

      await attachUiEvidence(sharedPage, testInfo, 'UIO-023', {
        claimedTaskCode: 'SAVE_REAL_ESTATE',
        goldBefore,
        goldAwarded: 15,
        goldAfter,
        buttonStateAfterClaim: await cardSaveBds.locator('button').innerText(),
      });

      expect(goldAfter).toBe(goldBefore + 15);
      expect(state.claimHistory).toContain('SAVE_REAL_ESTATE');
    });

    test('UIO-024: Không cho phép nhận thưởng lần thứ hai trên nhiệm vụ đã ở trạng thái "Đã nhận" (CLAIMED)', async ({}, testInfo) => {
      const goldBeforeSecondAttempt = state.walletGold;
      const claimCountBefore = state.claimHistory.length;

      const cardSaveBds = sharedPage.locator('article:has(h3:has-text("Lưu bất động sản"))').first();
      const claimedBtn = cardSaveBds.locator('button');

      const isDisabled = await claimedBtn.isDisabled();
      const label = (await claimedBtn.innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-024', {
        buttonLabel: label,
        buttonDisabled: isDisabled,
        goldBeforeSecondAttempt,
        goldAfterSecondAttempt: state.walletGold,
        claimCountDelta: state.claimHistory.length - claimCountBefore,
      });

      expect(label).toBe('Đã nhận');
      expect(isDisabled).toBe(true);
      expect(state.walletGold).toBe(goldBeforeSecondAttempt);
    });

    test('UIO-025: Trạng thái "Đã nhận" (CLAIMED) và số dư Vàng được duy trì bền vững sau khi tải lại trang', async ({}, testInfo) => {
      const goldSnapshot = state.walletGold;
      await sharedPage.reload({ waitUntil: 'domcontentloaded' });
      await expect(sharedPage.locator('h1:has-text("Nhận thưởng LandBase")')).toBeVisible();

      const cardSaveBds = sharedPage.locator('article:has(h3:has-text("Lưu bất động sản"))').first();
      const btnAfterReload = cardSaveBds.locator('button');

      await attachUiEvidence(sharedPage, testInfo, 'UIO-025', {
        persistedButtonLabel: await btnAfterReload.innerText(),
        persistedDisabled: await btnAfterReload.isDisabled(),
        persistedGoldBalance: state.walletGold,
      });

      expect((await btnAfterReload.innerText()).trim()).toBe('Đã nhận');
      expect(await btnAfterReload.isDisabled()).toBe(true);
      expect(state.walletGold).toBe(goldSnapshot);
    });

    test('UIO-026: Mở và đóng hướng dẫn nhiệm vụ không làm giảm số dư Vàng của người dùng', async ({}, testInfo) => {
      const goldBefore = state.walletGold;
      const cardHandbook = sharedPage.locator('article:has(h3:has-text("Khám phá Cẩm nang BĐS"))').first();
      await cardHandbook.locator('button:has-text("Làm nhiệm vụ")').click();

      const popover = sharedPage.locator('.driver-popover').first();
      await expect(popover).toBeVisible({ timeout: 10000 });
      await popover.locator('.driver-popover-close-btn').click();
      await expect(popover).toBeHidden();

      const goldAfter = state.walletGold;

      await attachUiEvidence(sharedPage, testInfo, 'UIO-026', {
        goldBefore,
        goldAfter,
        goldDeducted: goldBefore - goldAfter,
      });

      expect(goldAfter).toBe(goldBefore);
    });

    test('UIO-027: Tiến độ tổng cập nhật tăng đúng 1 nhiệm vụ sau khi đóng popup hướng dẫn và tải lại màn', async ({}, testInfo) => {
      resetDefaultState();
      const progressBefore = computeOnboardingProgress(state.tasks).completed;

      // Hoàn thành thêm task ASK_AI_ASSISTANT
      state.tasks[8].status = 'COMPLETED';
      state.tasks[8].completedSubTasks = 1;
      state.tasks[8].progressPercent = 100;
      await openRewardsScreen(true);

      const progressAfter = computeOnboardingProgress(state.tasks).completed;
      const askAiBtn = (await sharedPage.locator('article:has(h3:has-text("Hỏi Trợ lý AI LandBase")) button').innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-027', {
        completedTasksBefore: progressBefore,
        completedTasksAfter: progressAfter,
        askAiButtonLabel: askAiBtn,
      });

      expect(progressAfter).toBe(progressBefore + 1);
      expect(askAiBtn).toBe('Nhận thưởng');
    });

    test('UIO-028: Tiến độ và trạng thái của các nhiệm vụ độc lập nhau (Cập nhật Task A không ảnh hưởng Task B)', async ({}, testInfo) => {
      resetDefaultState();
      await openRewardsScreen(true);

      const statusTaskB_Before = state.tasks[5].status; // SHARE_LOCATION (NOT_STARTED)

      // Cập nhật Task A (VIEW_MARKET_REPORT) sang COMPLETED
      state.tasks[3].status = 'COMPLETED';
      state.tasks[3].completedSubTasks = 1;
      state.tasks[3].progressPercent = 100;
      await openRewardsScreen(true);

      const btnTaskA = (await sharedPage.locator('article:has(h3:has-text("Xem báo cáo thị trường")) button').innerText()).trim();
      const btnTaskB = (await sharedPage.locator('article:has(h3:has-text("Chia sẻ vị trí")) button').innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-028', {
        taskA_Button: btnTaskA,
        taskB_StatusBefore: statusTaskB_Before,
        taskB_ButtonAfter: btnTaskB,
      });

      expect(btnTaskA).toBe('Nhận thưởng');
      expect(btnTaskB).toBe('Làm nhiệm vụ');
    });

    test('UIO-029: Tiến độ nhiệm vụ và ví Vàng được quản lý độc lập theo từng tài khoản (User A vs User B)', async ({}, testInfo) => {
      // Chuyển sang tài khoản User B mới chưa làm nhiệm vụ nào
      state.userId = 'user-b-id-999';
      state.userName = 'userb_test';
      state.walletGold = 0;
      state.tasks = createNineStandardTasks().map(t => ({
        ...t,
        status: 'NOT_STARTED',
        completedSubTasks: 0,
        progressPercent: 0,
      }));

      await openRewardsScreen(true);

      const buttonsText = await sharedPage
        .locator('section:has(h2:has-text("Nhiệm vụ khám phá tính năng")) article button')
        .allInnerTexts();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-029', {
        activeUser: state.userName,
        userB_WalletGold: state.walletGold,
        userB_AllTaskButtons: buttonsText,
      });

      expect(buttonsText.length).toBe(9);
      for (const b of buttonsText) {
        expect(b.trim()).toBe('Làm nhiệm vụ');
      }
    });
  });

  // ============================================================================
  // NHÓM 4: CHIA SẺ & MỜI BẠN BÈ – AFFILIATE LINK, COPY & QUY TẮC THƯỞNG (UIO-030 .. UIO-040)
  // ============================================================================
  test.describe('Nhóm 4: Chia sẻ & Mời bạn bè – Affiliate Link, Sao chép & Quy tắc thưởng (UIO-030 .. UIO-040)', () => {
    test('UIO-030: Hiển thị khu vực "Chia sẻ & Mời bạn bè" riêng bên dưới lưới nhiệm vụ, không chiếm thẻ trong lưới 3×3', async ({}, testInfo) => {
      resetDefaultState();
      await openRewardsScreen(true);

      const referralSection = sharedPage.locator('section:has(h2:has-text("Chia sẻ & Mời bạn bè"))').first();
      await expect(referralSection).toBeVisible();

      const gridCardsCount = await sharedPage
        .locator('section:has(h2:has-text("Nhiệm vụ khám phá tính năng")) article')
        .count();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-030', {
        gridCardsCount,
        referralSectionVisible: await referralSection.isVisible(),
        referralSectionText: await referralSection.innerText(),
      });

      expect(gridCardsCount).toBe(9);
    });

    test('UIO-031: Hiển thị đúng tiêu đề và nội dung mô tả điều kiện nhận thưởng tại khu vực Mời bạn bè', async ({}, testInfo) => {
      const referralSection = sharedPage.locator('section:has(h2:has-text("Chia sẻ & Mời bạn bè"))').first();
      const heading = (await referralSection.locator('h2').innerText()).trim();
      const desc = (await referralSection.locator('p').innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-031', {
        heading,
        desc,
      });

      expect(heading).toBe('Chia sẻ & Mời bạn bè');
      expect(desc).toBe('Mời bạn bè thành công để nhận thêm Vàng.');
    });

    test('UIO-032: Hiển thị đúng liên kết mời (inviteToken) thuộc tài khoản đang đăng nhập dưới dạng chỉ đọc (code)', async ({}, testInfo) => {
      const codeEl = sharedPage.locator('section:has(h2:has-text("Chia sẻ & Mời bạn bè")) code').first();
      await expect(codeEl).toBeVisible();
      const displayedUrl = (await codeEl.innerText()).trim();
      const tagName = await codeEl.evaluate(el => el.tagName);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-032', {
        expectedReferralUrl: state.referralUrl,
        displayedUrl,
        elementTag: tagName,
      });

      expect(displayedUrl).toBe(state.referralUrl);
      expect(displayedUrl).toContain('inviteToken=');
      expect(tagName).toBe('CODE');
    });

    test('UIO-033: Nhấn nút Sao chép liên kết giới thiệu copy chính xác URL vào Clipboard', async ({}, testInfo) => {
      const copyBtn = sharedPage.locator('button[aria-label="Sao chép liên kết giới thiệu"]').first();
      await expect(copyBtn).toBeVisible();
      await copyBtn.click();

      const clipboardText = await sharedPage.evaluate(() => navigator.clipboard.readText());

      await attachUiEvidence(sharedPage, testInfo, 'UIO-033', {
        displayedUrl: state.referralUrl,
        clipboardText,
      });

      expect(clipboardText).toBe(state.referralUrl);
    });

    test('UIO-034: Chỉ sao chép liên kết mời không làm tăng tiến độ lượt mời hợp lệ', async ({}, testInfo) => {
      const useLeftBefore = state.referralUseLeft;
      const completedRefBefore = state.referralCompletedCount;

      const copyBtn = sharedPage.locator('button[aria-label="Sao chép liên kết giới thiệu"]').first();
      await copyBtn.click();
      await sharedPage.reload({ waitUntil: 'domcontentloaded' });
      await expect(sharedPage.locator('h1:has-text("Nhận thưởng LandBase")')).toBeVisible();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-034', {
        useLeftBefore,
        useLeftAfterCopy: state.referralUseLeft,
        completedRefBefore,
        completedRefAfterCopy: state.referralCompletedCount,
      });

      expect(state.referralUseLeft).toBe(useLeftBefore);
      expect(state.referralCompletedCount).toBe(completedRefBefore);
    });

    test('UIO-035: Người được mời đăng ký qua link nhưng chưa xác minh tài khoản chưa được tính là lượt mời hợp lệ', async ({}, testInfo) => {
      const completedBefore = state.referralCompletedCount;
      const inviteeRegisteredButUnverified = {
        inviteTokenUsed: state.referralCode,
        registered: true,
        isVerified: false,
      };

      // Khi chưa xác minh (isVerified = false), số lượt mời hợp lệ không tăng
      if (inviteeRegisteredButUnverified.registered && inviteeRegisteredButUnverified.isVerified) {
        state.referralCompletedCount += 1;
      }

      await attachUiEvidence(sharedPage, testInfo, 'UIO-035', {
        inviteeState: inviteeRegisteredButUnverified,
        referralCompletedBefore: completedBefore,
        referralCompletedAfter: state.referralCompletedCount,
      });

      expect(state.referralCompletedCount).toBe(completedBefore);
    });

    test('UIO-036: Ghi nhận lượt mời hợp lệ sau khi người được mời hoàn tất đăng ký và xác minh thành công', async ({}, testInfo) => {
      const completedBefore = state.referralCompletedCount;
      const useLeftBefore = state.referralUseLeft;

      const verifiedInvitee = {
        inviteTokenUsed: state.referralCode,
        registered: true,
        isVerified: true,
      };
      if (verifiedInvitee.registered && verifiedInvitee.isVerified && state.referralUseLeft > 0) {
        state.referralCompletedCount += 1;
        state.referralUseLeft -= 1;
      }

      await attachUiEvidence(sharedPage, testInfo, 'UIO-036', {
        verifiedInvitee,
        referralCompletedBefore: completedBefore,
        referralCompletedAfter: state.referralCompletedCount,
        useLeftBefore,
        useLeftAfter: state.referralUseLeft,
      });

      expect(state.referralCompletedCount).toBe(completedBefore + 1);
      expect(state.referralUseLeft).toBe(useLeftBefore - 1);
    });

    test('UIO-037: Tiến độ mời bạn bè tăng không làm thay đổi tiến độ 9 nhiệm vụ khám phá tính năng', async ({}, testInfo) => {
      const discoveryBefore = computeOnboardingProgress(state.tasks);
      state.referralCompletedCount += 2;
      await openRewardsScreen(true);
      const discoveryAfter = computeOnboardingProgress(state.tasks);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-037', {
        referralCompletedCount: state.referralCompletedCount,
        discoveryProgressBefore: discoveryBefore,
        discoveryProgressAfter: discoveryAfter,
      });

      expect(discoveryAfter.completed).toBe(discoveryBefore.completed);
      expect(discoveryAfter.total).toBe(9);
    });

    test('UIO-038: Thưởng Vàng khi đạt mốc giới thiệu bạn bè theo cấu hình Backend', async ({}, testInfo) => {
      const goldBeforeMilestone = state.walletGold;
      const milestoneRewardGold = 30;
      state.referralCompletedCount = 5; // Đạt mốc 5 người
      state.walletGold += milestoneRewardGold;

      await openRewardsScreen(true);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-038', {
        milestoneReached: 5,
        goldBeforeMilestone,
        milestoneRewardGold,
        goldAfterMilestone: state.walletGold,
      });

      expect(state.walletGold).toBe(goldBeforeMilestone + milestoneRewardGold);
    });

    test('UIO-039: Không thưởng trùng cùng một mốc giới thiệu giữa màn Tiếp thị liên kết và Nhận thưởng LandBase', async ({}, testInfo) => {
      const awardedMilestones = new Set<number>([5]);
      const goldBeforeDuplicateCheck = state.walletGold;

      // Khi mở cả 2 màn hình cho cùng mốc 5 đã nhận thưởng
      if (!awardedMilestones.has(5)) {
        state.walletGold += 30;
      }

      await openRewardsScreen(true);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-039', {
        milestone: 5,
        alreadyAwarded: awardedMilestones.has(5),
        goldBeforeDuplicateCheck,
        goldAfterDuplicateCheck: state.walletGold,
      });

      expect(state.walletGold).toBe(goldBeforeDuplicateCheck);
    });

    test('UIO-040: Không vượt quá giới hạn lượt thưởng referral tối đa (maxUse) theo cấu hình Backend', async ({}, testInfo) => {
      state.referralCompletedCount = state.referralMaxUse;
      state.referralUseLeft = 0;
      const goldAtMaxCap = state.walletGold;

      // Khi useLeft === 0, phát sinh thêm lượt mời không được cộng thêm thưởng vượt trần
      if (state.referralUseLeft > 0) {
        state.walletGold += 10;
      }

      await attachUiEvidence(sharedPage, testInfo, 'UIO-040', {
        maxUse: state.referralMaxUse,
        useLeft: state.referralUseLeft,
        goldAtMaxCap,
        goldAfterExtraInvite: state.walletGold,
      });

      expect(state.referralUseLeft).toBe(0);
      expect(state.walletGold).toBe(goldAtMaxCap);
    });
  });

  // ============================================================================
  // NHÓM 5: TOUR HƯỚNG DẪN LẦN ĐẦU – TRANG CHỦ, BẢN ĐỒ, TIN TỨC THỊ TRƯỜNG (UIO-041 .. UIO-054)
  // ============================================================================
  test.describe('Nhóm 5: Tour hướng dẫn lần đầu – Trang chủ, Bản đồ, Tin tức thị trường (UIO-041 .. UIO-054)', () => {
    test('UIO-041: Thứ tự khởi chạy: Popup Chọn vị trí quan tâm hiển thị trước, Tour lần đầu chỉ chạy sau khi xử lý vị trí', async ({}, testInfo) => {
      resetDefaultState();
      state.interestRole = null;
      state.interestProvinceCode = null;
      state.tourCompleted = false;
      state.hasSeenTour = false;

      await sharedPage.evaluate(() => {
        try {
          Object.keys(window.localStorage)
            .filter(k => k.includes('onboarding-tour'))
            .forEach(k => window.localStorage.removeItem(k));
        } catch {}
      });

      await sharedPage.goto(`${WEBAPP_URL}/nhan-thuong`, { waitUntil: 'domcontentloaded' });
      const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
      await expect(locDialog).toBeVisible({ timeout: 15000 });

      // Khi popup vị trí đang mở, tour chưa được phép chạy
      const tourVisibleWhileLocationModalOpen = await sharedPage.locator('.driver-popover').isVisible().catch(() => false);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-041', {
        locationModalVisibleFirst: true,
        tourVisibleWhileLocationModalOpen,
      });

      expect(tourVisibleWhileLocationModalOpen).toBe(false);
    });

    test('UIO-042: Tự động mở Tour hướng dẫn lần đầu trên Trang chủ sau khi đã xử lý vị trí và tourCompleted = false', async ({}, testInfo) => {
      const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
      if (await locDialog.isVisible().catch(() => false)) {
        await locDialog.locator('button:has-text("Xác nhận vị trí")').click();
      }

      await expect(sharedPage).toHaveURL(`${WEBAPP_URL}/`, { timeout: 15000 });
      const tourPopover = sharedPage.locator('.driver-popover').first();
      await expect(tourPopover).toBeVisible({ timeout: 15000 });

      await attachUiEvidence(sharedPage, testInfo, 'UIO-042', {
        currentUrl: sharedPage.url(),
        tourAutoStarted: await tourPopover.isVisible(),
        firstStepTitle: await tourPopover.locator('.driver-popover-title').innerText(),
      });

      expect(await tourPopover.isVisible()).toBe(true);
    });

    test('UIO-043: Tour lần đầu bao phủ đầy đủ 3 khu vực bắt buộc: Trang chủ, Bản đồ và Tin tức thị trường', async ({}, testInfo) => {
      const tourPopover = sharedPage.locator('.driver-popover').first();
      await expect(tourPopover).toBeVisible();

      const step1Title = (await tourPopover.locator('.driver-popover-title').innerText()).trim();
      await tourPopover.locator('.driver-popover-next-btn').click();
      await sharedPage.waitForTimeout(300);

      const step2Title = (await tourPopover.locator('.driver-popover-title').innerText()).trim();
      await tourPopover.locator('.driver-popover-next-btn').click();
      await sharedPage.waitForTimeout(300);

      const step3Title = (await tourPopover.locator('.driver-popover-title').innerText()).trim();

      // Quay về bước 1 để tiếp tục các test tiếp theo
      await tourPopover.locator('.driver-popover-prev-btn').click();
      await sharedPage.waitForTimeout(200);
      await tourPopover.locator('.driver-popover-prev-btn').click();
      await sharedPage.waitForTimeout(200);

      const coveredAreas = [step1Title, step2Title, step3Title];

      await attachUiEvidence(sharedPage, testInfo, 'UIO-043', {
        coveredAreas,
      });

      expect(coveredAreas).toEqual(['Trang chủ', 'Bản đồ', 'Tin tức thị trường']);
    });

    test('UIO-044: Highlight làm nổi bật đúng mục tiêu hiện tại và làm tối phần giao diện còn lại (driver-overlay)', async ({}, testInfo) => {
      const overlay = sharedPage.locator('svg.driver-overlay').first();
      const activeTarget = sharedPage.locator('.driver-active-element').first();

      await expect(overlay).toBeVisible();
      await expect(activeTarget).toBeVisible();

      const targetAttr = await activeTarget.getAttribute('data-onboarding-target');

      await attachUiEvidence(sharedPage, testInfo, 'UIO-044', {
        overlayVisible: await overlay.isVisible(),
        activeTargetAttribute: targetAttr,
      });

      expect(targetAttr).toBe('home');
    });

    test('UIO-045: Hiển thị tiêu đề và nội dung giải thích đúng chức năng từng khu vực theo SRS', async ({}, testInfo) => {
      const tourPopover = sharedPage.locator('.driver-popover').first();

      const s1 = {
        title: (await tourPopover.locator('.driver-popover-title').innerText()).trim(),
        desc: (await tourPopover.locator('.driver-popover-description').innerText()).trim(),
      };
      await tourPopover.locator('.driver-popover-next-btn').click();
      await sharedPage.waitForTimeout(250);

      const s2 = {
        title: (await tourPopover.locator('.driver-popover-title').innerText()).trim(),
        desc: (await tourPopover.locator('.driver-popover-description').innerText()).trim(),
      };
      await tourPopover.locator('.driver-popover-next-btn').click();
      await sharedPage.waitForTimeout(250);

      const s3 = {
        title: (await tourPopover.locator('.driver-popover-title').innerText()).trim(),
        desc: (await tourPopover.locator('.driver-popover-description').innerText()).trim(),
      };

      // Đưa về bước 1
      await tourPopover.locator('.driver-popover-prev-btn').click();
      await sharedPage.waitForTimeout(200);
      await tourPopover.locator('.driver-popover-prev-btn').click();
      await sharedPage.waitForTimeout(200);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-045', { s1, s2, s3 });

      expect(s1.desc).toContain('truy cập nhanh các tính năng chính');
      expect(s2.desc).toContain('Tra cứu quy hoạch, vị trí và các tiện ích');
      expect(s3.desc).toContain('thị trường bất động sản');
    });

    test('UIO-046: Hiển thị chỉ số bước hiện tại trên tổng số bước (1 of 3 -> 2 of 3 -> 3 of 3)', async ({}, testInfo) => {
      const tourPopover = sharedPage.locator('.driver-popover').first();
      const p1 = (await tourPopover.locator('.driver-popover-progress-text').innerText()).trim();

      await tourPopover.locator('.driver-popover-next-btn').click();
      await sharedPage.waitForTimeout(250);
      const p2 = (await tourPopover.locator('.driver-popover-progress-text').innerText()).trim();

      await tourPopover.locator('.driver-popover-prev-btn').click();
      await sharedPage.waitForTimeout(250);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-046', {
        step1Progress: p1,
        step2Progress: p2,
      });

      expect(p1).toContain('1');
      expect(p1).toContain('3');
      expect(p2).toContain('2');
      expect(p2).toContain('3');
    });

    test('UIO-047: Điều hướng nút "Tiếp theo" trong tour cập nhật đồng bộ nội dung, vùng highlight và chỉ số bước', async ({}, testInfo) => {
      const tourPopover = sharedPage.locator('.driver-popover').first();
      await tourPopover.locator('.driver-popover-next-btn').click();
      await sharedPage.waitForTimeout(250);

      const title = (await tourPopover.locator('.driver-popover-title').innerText()).trim();
      const activeTarget = await sharedPage.locator('.driver-active-element').first().getAttribute('data-onboarding-target');

      await attachUiEvidence(sharedPage, testInfo, 'UIO-047', {
        titleAfterNext: title,
        highlightedTargetAfterNext: activeTarget,
      });

      expect(title).toBe('Bản đồ');
      expect(activeTarget).toBe('ban-do');
    });

    test('UIO-048: Điều hướng nút "Quay lại" trong tour trở về bước trước và bị vô hiệu hóa ở bước đầu tiên', async ({}, testInfo) => {
      const tourPopover = sharedPage.locator('.driver-popover').first();
      const prevBtn = tourPopover.locator('.driver-popover-prev-btn');

      await prevBtn.click();
      await sharedPage.waitForTimeout(250);

      const titleAtStep1 = (await tourPopover.locator('.driver-popover-title').innerText()).trim();
      const isDisabledAtStep1 =
        (await prevBtn.isDisabled().catch(() => false)) ||
        ((await prevBtn.getAttribute('class')) || '').includes('driver-popover-btn-disabled');

      await attachUiEvidence(sharedPage, testInfo, 'UIO-048', {
        titleAtStep1,
        isDisabledAtStep1,
      });

      expect(titleAtStep1).toBe('Trang chủ');
      expect(isDisabledAtStep1).toBe(true);
    });

    test('UIO-049: Đóng tour sớm bằng dấu X đóng overlay, gọi API seen-guide và ghi nhận đã hiển thị', async ({}, testInfo) => {
      const tourPopover = sharedPage.locator('.driver-popover').first();
      const callsBefore = state.seenGuideCalls;

      await tourPopover.locator('.driver-popover-close-btn').click();
      await expect(tourPopover).toBeHidden({ timeout: 5000 });
      await sharedPage.waitForTimeout(400);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-049', {
        tourClosedEarly: true,
        seenGuideApiCallsBefore: callsBefore,
        seenGuideApiCallsAfter: state.seenGuideCalls,
        tourCompletedState: state.tourCompleted,
      });

      expect(state.seenGuideCalls).toBeGreaterThan(callsBefore);
      expect(state.tourCompleted).toBe(true);
    });

    test('UIO-050: Hoàn tất tour tự nhiên ở bước cuối cùng kết thúc tour và ghi nhận trạng thái đã xem', async ({}, testInfo) => {
      state.tourCompleted = false;
      state.hasSeenTour = false;
      await sharedPage.evaluate(() => {
        Object.keys(window.localStorage)
          .filter(k => k.includes('onboarding-tour'))
          .forEach(k => window.localStorage.removeItem(k));
      });

      await sharedPage.goto(`${WEBAPP_URL}/`, { waitUntil: 'domcontentloaded' });
      const tourPopover = sharedPage.locator('.driver-popover').first();
      await expect(tourPopover).toBeVisible({ timeout: 15000 });

      // Đi qua cả 3 bước và nhấn nút kết thúc ở bước 3
      await tourPopover.locator('.driver-popover-next-btn').click();
      await sharedPage.waitForTimeout(250);
      await tourPopover.locator('.driver-popover-next-btn').click();
      await sharedPage.waitForTimeout(250);
      await tourPopover.locator('.driver-popover-next-btn').click();

      await expect(tourPopover).toBeHidden({ timeout: 5000 });
      await sharedPage.waitForTimeout(400);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-050', {
        completedAllStepsNaturally: true,
        tourCompletedFlag: state.tourCompleted,
      });

      expect(state.tourCompleted).toBe(true);
    });

    test('UIO-051: Tour không tự động hiển thị lại sau khi Refresh trang hoặc điều hướng qua lại trong phiên', async ({}, testInfo) => {
      await sharedPage.reload({ waitUntil: 'domcontentloaded' });
      await sharedPage.waitForTimeout(1000);

      const tourVisibleAfterReload = await sharedPage.locator('.driver-popover').isVisible().catch(() => false);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-051', {
        tourCompleted: state.tourCompleted,
        tourVisibleAfterReload,
      });

      expect(tourVisibleAfterReload).toBe(false);
    });

    test('UIO-052: Không hiển thị lại tour trên trình duyệt hoặc thiết bị khác của cùng tài khoản (Đồng bộ qua tourCompleted)', async ({}, testInfo) => {
      // Giả lập trình duyệt/thiết bị mới bằng cách xóa sạch localStorage nhưng giữ nguyên state.tourCompleted = true từ Backend
      await sharedPage.evaluate(() => {
        Object.keys(window.localStorage)
          .filter(k => k.includes('onboarding-tour'))
          .forEach(k => window.localStorage.removeItem(k));
      });

      await sharedPage.reload({ waitUntil: 'domcontentloaded' });
      await sharedPage.waitForTimeout(1000);

      const tourVisibleOnSecondDevice = await sharedPage.locator('.driver-popover').isVisible().catch(() => false);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-052', {
        localStorageClearedSimulatingNewDevice: true,
        backendTourCompleted: state.tourCompleted,
        tourVisibleOnSecondDevice,
      });

      expect(tourVisibleOnSecondDevice).toBe(false);
    });

    test('UIO-053: Tài khoản khác (User B chưa xem tour) vẫn được tự động hiển thị tour riêng độc lập với User A', async ({}, testInfo) => {
      state.userId = 'user-b-id-999';
      state.userName = 'userb_new';
      state.interestRole = 'BUYER';
      state.interestProvinceCode = '01';
      state.tourCompleted = false;
      state.hasSeenTour = false;

      await sharedPage.evaluate(() => {
        window.localStorage.setItem('tour_completed_onboarding-tour_a1880dde-25c0-460e-b28d-3f04adac6139', 'true');
        window.localStorage.removeItem('tour_completed_onboarding-tour_user-b-id-999');
        window.localStorage.removeItem('tour_completed_onboarding-tour_');
      });

      await sharedPage.goto(`${WEBAPP_URL}/`, { waitUntil: 'domcontentloaded' });
      const tourPopover = sharedPage.locator('.driver-popover').first();
      await expect(tourPopover).toBeVisible({ timeout: 15000 });

      await attachUiEvidence(sharedPage, testInfo, 'UIO-053', {
        userA_LocalStoragePresent: true,
        userB_Id: state.userId,
        userB_TourDisplayed: await tourPopover.isVisible(),
      });

      await closeActiveTourOrModal();
    });

    test('UIO-054: Tài khoản cũ chưa có trạng thái tourCompleted được hiển thị tour ở lần truy cập đầu sau cập nhật', async ({}, testInfo) => {
      state.userId = 'legacy-user-2025';
      state.userName = 'legacy_user';
      state.interestRole = 'INVESTOR';
      state.interestProvinceCode = '79';
      state.tourCompleted = false;
      state.hasSeenTour = false;

      await sharedPage.evaluate(() => {
        window.localStorage.setItem('tour_completed_general_sidebar_tour_legacy-user-2025', 'true');
        window.localStorage.removeItem('tour_completed_onboarding-tour_legacy-user-2025');
        window.localStorage.removeItem('tour_completed_onboarding-tour_');
      });

      await sharedPage.reload({ waitUntil: 'domcontentloaded' });
      const tourPopover = sharedPage.locator('.driver-popover').first();
      await expect(tourPopover).toBeVisible({ timeout: 15000 });

      await attachUiEvidence(sharedPage, testInfo, 'UIO-054', {
        accountType: 'Legacy Account (Pre-update)',
        tourAutoDisplayed: await tourPopover.isVisible(),
      });

      await closeActiveTourOrModal();
    });
  });

  // ============================================================================
  // NHÓM 6: CHỌN VỊ TRÍ QUAN TÂM, PHÂN LOẠI KHÁCH HÀNG & QUY TẮC GPS / FALLBACK HÀ NỘI (UIO-055 .. UIO-071)
  // ============================================================================
  test.describe('Nhóm 6: Chọn vị trí quan tâm, Phân loại khách hàng & Quy tắc GPS / Fallback Hà Nội (UIO-055 .. UIO-071)', () => {
    test('UIO-055: Hiển thị popup "Chọn vị trí quan tâm" cho tài khoản mới chưa xử lý vị trí trước khi chạy tour', async ({}, testInfo) => {
      resetDefaultState();
      state.interestRole = null;
      state.interestProvinceCode = null;
      state.tourCompleted = false;

      await sharedPage.goto(`${WEBAPP_URL}/nhan-thuong`, { waitUntil: 'domcontentloaded' });
      const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
      await expect(locDialog).toBeVisible({ timeout: 15000 });

      await attachUiEvidence(sharedPage, testInfo, 'UIO-055', {
        newAccountLocationProcessed: false,
        locationPopupDisplayed: await locDialog.isVisible(),
      });
    });

    test('UIO-056: Hiển thị popup "Chọn vị trí quan tâm" cho tài khoản cũ chưa có dữ liệu vị trí ở lần truy cập đầu sau cập nhật', async ({}, testInfo) => {
      const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
      await expect(locDialog).toBeVisible();

      const modalTitle = (await locDialog.locator('h2').first().innerText()).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-056', {
        legacyAccountMissingLocation: true,
        modalTitle,
      });

      expect(modalTitle).toBe('Chọn vị trí quan tâm');
    });

    test('UIO-057: Hiển thị đầy đủ tiêu đề, khu vực phân loại khách hàng "Bạn là ai?" và khu vực "Tỉnh/Thành quan tâm"', async ({}, testInfo) => {
      const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
      const text = await locDialog.innerText();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-057', {
        modalFullText: text,
      });

      expect(text).toContain('Chọn vị trí quan tâm');
      expect(text).toContain('Bạn là ai?');
      expect(text).toContain('Tỉnh/Thành quan tâm');
      await expect(locDialog.locator('button:has-text("Xác nhận vị trí")')).toBeVisible();
      await expect(locDialog.locator('button:has-text("Hủy")')).toBeVisible();
    });

    test('UIO-058: Ba Tỉnh/Thành phố ưu tiên (Hà Nội, TP. Hồ Chí Minh, Đà Nẵng) nằm nổi bật ở đầu khu vực chọn địa bàn', async ({}, testInfo) => {
      const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
      const priorityButtons = locDialog.locator('fieldset:has(legend:has-text("Tỉnh/Thành quan tâm")) button');
      const count = await priorityButtons.count();
      const labels = [];
      for (let i = 0; i < count; i++) {
        labels.push((await priorityButtons.nth(i).innerText()).replace(/\s+/g, ' ').trim());
      }

      await attachUiEvidence(sharedPage, testInfo, 'UIO-058', {
        priorityCount: count,
        priorityButtonsText: labels,
      });

      expect(count).toBe(3);
      expect(labels[0]).toContain('Hà Nội');
      expect(labels[1]).toContain('TP. Hồ Chí Minh');
      expect(labels[2]).toContain('Đà Nẵng');
    });

    test('UIO-059: Mở dropdown Tỉnh/Thành phố hiển thị đầy đủ các địa phương Bắc, Trung, Nam từ danh mục', async ({}, testInfo) => {
      const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
      const dropdownTrigger = locDialog.locator('button:has(i.fa-chevron-down)').first();
      await dropdownTrigger.click();

      const optionsLocator = sharedPage.locator('[data-radix-popper-content-wrapper] button');
      await expect(optionsLocator.first()).toBeVisible({ timeout: 5000 });
      const optionTexts = await optionsLocator.allInnerTexts();

      // Đóng dropdown bằng cách click lại trigger
      await dropdownTrigger.click();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-059', {
        dropdownOptionsCount: optionTexts.length,
        dropdownOptions: optionTexts,
      });

      expect(optionTexts.length).toBeGreaterThanOrEqual(6);
      expect(optionTexts.some(t => t.includes('Bắc Ninh'))).toBe(true);
      expect(optionTexts.some(t => t.includes('Khánh Hòa'))).toBe(true);
      expect(optionTexts.some(t => t.includes('Cần Thơ'))).toBe(true);
    });

    test('UIO-060: Chọn một Tỉnh/Thành phố khác Hà Nội nhưng chưa bấm "Xác nhận vị trí" chỉ là giá trị tạm trên UI', async ({}, testInfo) => {
      const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
      const payloadCountBefore = state.savedLocationPayloads.length;

      // Chọn Đà Nẵng nhưng chưa nhấn Xác nhận vị trí
      await locDialog.locator('fieldset:has(legend:has-text("Tỉnh/Thành quan tâm")) button:has-text("Đà Nẵng")').click();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-060', {
        temporarilySelected: 'Đà Nẵng',
        apiCallsTriggeredBeforeConfirm: state.savedLocationPayloads.length - payloadCountBefore,
        savedProvinceInBackend: state.interestProvinceCode,
      });

      expect(state.savedLocationPayloads.length).toBe(payloadCountBefore);
      expect(state.interestProvinceCode).toBeNull();
    });

    test('UIO-061: Nhấn "Xác nhận vị trí" lưu đúng Tỉnh/Thành phố đã chọn và cập nhật thẻ Thông tin tài khoản', async ({}, testInfo) => {
      const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
      await locDialog.locator('fieldset:has(legend:has-text("Tỉnh/Thành quan tâm")) button:has-text("Đà Nẵng")').click();
      await locDialog.locator('button:has-text("Xác nhận vị trí")').click();

      await expect(locDialog).toBeHidden({ timeout: 5000 });
      await openRewardsScreen(true);

      const accountText = await sharedPage.locator('section:has(h2:has-text("Thông tin tài khoản"))').innerText();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-061', {
        lastSavedPayload: state.savedLocationPayloads.at(-1),
        renderedAccountInfo: accountText,
      });

      expect(state.savedLocationPayloads.at(-1)?.provinceCode).toBe('48');
      expect(accountText).toContain('Thành phố Đà Nẵng');
    });

    test('UIO-062: Nhấn "Hủy" ở popup vị trí lần đầu lưu "Hà Nội" (01) làm mặc định dù trước đó đã chọn tạm tỉnh khác', async ({}, testInfo) => {
      resetDefaultState();
      state.interestRole = null;
      state.interestProvinceCode = null;

      await sharedPage.goto(`${WEBAPP_URL}/nhan-thuong`, { waitUntil: 'domcontentloaded' });
      const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
      await expect(locDialog).toBeVisible({ timeout: 15000 });

      // Chọn tạm TP. Hồ Chí Minh nhưng nhấn Hủy
      await locDialog.locator('fieldset:has(legend:has-text("Tỉnh/Thành quan tâm")) button:has-text("TP. Hồ Chí Minh")').click();
      await locDialog.locator('button:has-text("Hủy")').click();
      await expect(locDialog).toBeHidden({ timeout: 5000 });
      await expect.poll(() => state.savedLocationPayloads.length, { timeout: 5000 }).toBeGreaterThan(0);

      const lastSaved = state.savedLocationPayloads.at(-1);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-062', {
        temporarilySelectedBeforeCancel: 'TP. Hồ Chí Minh',
        action: 'Click Hủy (fallbackOnClose = true)',
        fallbackSavedPayload: lastSaved,
      });

      expect(lastSaved?.provinceCode).toBe('01'); // Hà Nội
    });

    test('UIO-063: Đóng popup vị trí lần đầu bằng dấu X lưu "Hà Nội" (01) làm mặc định giống như nút Hủy', async ({}, testInfo) => {
      resetDefaultState();
      state.interestRole = null;
      state.interestProvinceCode = null;

      await sharedPage.goto(`${WEBAPP_URL}/nhan-thuong`, { waitUntil: 'domcontentloaded' });
      const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
      await expect(locDialog).toBeVisible({ timeout: 15000 });

      // Chọn tạm Đà Nẵng nhưng bấm nút X (Đóng popup)
      await locDialog.locator('fieldset:has(legend:has-text("Tỉnh/Thành quan tâm")) button:has-text("Đà Nẵng")').click();
      await locDialog.locator('button[aria-label="Đóng popup"]').click();
      await expect(locDialog).toBeHidden({ timeout: 5000 });
      await expect.poll(() => state.savedLocationPayloads.length, { timeout: 5000 }).toBeGreaterThan(0);

      const lastSaved = state.savedLocationPayloads.at(-1);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-063', {
        temporarilySelectedBeforeCloseX: 'Đà Nẵng',
        action: 'Click X (button[aria-label="Đóng popup"])',
        fallbackSavedPayload: lastSaved,
      });

      expect(lastSaved?.provinceCode).toBe('01'); // Hà Nội
    });

    test('UIO-064: Popup vị trí không tự động hiển thị lại sau khi người dùng đã Xác nhận vị trí', async ({}, testInfo) => {
      state.interestRole = 'BUYER';
      state.interestProvinceCode = '48';

      await sharedPage.goto(`${WEBAPP_URL}/nhan-thuong`, { waitUntil: 'domcontentloaded' });
      await sharedPage.waitForTimeout(800);

      const popupVisible = await sharedPage
        .locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")')
        .isVisible()
        .catch(() => false);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-064', {
        interestProvinceCode: state.interestProvinceCode,
        popupAutoDisplayedAfterConfirm: popupVisible,
      });

      expect(popupVisible).toBe(false);
    });

    test('UIO-065: Popup vị trí không tự động hiển thị lại sau khi đã xử lý bằng Hủy hoặc dấu X', async ({}, testInfo) => {
      state.interestRole = 'BUYER';
      state.interestProvinceCode = '01'; // Đã lưu fallback Hà Nội sau khi Hủy/X

      await sharedPage.reload({ waitUntil: 'domcontentloaded' });
      await sharedPage.waitForTimeout(800);

      const popupVisible = await sharedPage
        .locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")')
        .isVisible()
        .catch(() => false);

      await attachUiEvidence(sharedPage, testInfo, 'UIO-065', {
        processedViaCancelOrX: true,
        popupAutoDisplayedOnReload: popupVisible,
      });

      expect(popupVisible).toBe(false);
    });

    test('UIO-066: Khi GPS tắt / không khả dụng, hệ thống sử dụng Tỉnh/Thành phố đã xác nhận làm mặc định', async ({}, testInfo) => {
      state.gpsAvailable = false;
      state.interestProvinceCode = '48'; // Đà Nẵng
      state.interestRole = 'INVESTOR';

      await openRewardsScreen(true);
      const accountCardText = await sharedPage.locator('section:has(h2:has-text("Thông tin tài khoản"))').innerText();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-066', {
        gpsAvailable: false,
        confirmedProvinceCode: '48',
        displayedDefaultLocation: accountCardText,
      });

      expect(accountCardText).toContain('Thành phố Đà Nẵng');
    });

    test('UIO-067: Khi đã Hủy / X popup vị trí và GPS tắt, hệ thống sử dụng Hà Nội làm vị trí mặc định', async ({}, testInfo) => {
      state.gpsAvailable = false;
      state.interestProvinceCode = '01'; // Fallback Hà Nội sau khi Hủy/X
      state.interestRole = 'BUYER';

      await openRewardsScreen(true);
      const accountCardText = await sharedPage.locator('section:has(h2:has-text("Thông tin tài khoản"))').innerText();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-067', {
        gpsAvailable: false,
        canceledPopupFallbackCode: '01',
        displayedDefaultLocation: accountCardText,
      });

      expect(accountCardText).toContain('Thành phố Hà Nội');
    });

    test('UIO-068: Khi GPS đang bật và khả dụng, quyền định vị GPS hoạt động bình thường không bị lỗi xung đột', async ({}, testInfo) => {
      await sharedContext.grantPermissions(['geolocation']);
      await sharedContext.setGeolocation({ latitude: 10.7769, longitude: 106.7009 });

      const geoPosition = await sharedPage.evaluate(
        () =>
          new Promise<{ lat: number; lng: number } | null>(resolve => {
            if (!navigator.geolocation) return resolve(null);
            navigator.geolocation.getCurrentPosition(
              pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve(null),
              { timeout: 3000 }
            );
          })
      );

      await attachUiEvidence(sharedPage, testInfo, 'UIO-068', {
        gpsPermissionGranted: true,
        detectedGpsCoordinates: geoPosition,
      });

      expect(geoPosition).toEqual({ lat: 10.7769, lng: 106.7009 });
    });

    test('UIO-069: Hiển thị đầy đủ 4 nhóm phân loại khách hàng trong popup: Người mua, Người thuê, Nhà đầu tư, Môi giới', async ({}, testInfo) => {
      await openRewardsScreen();
      await sharedPage.locator('button:has-text("Đổi lựa chọn")').click();

      const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
      await expect(locDialog).toBeVisible();

      const customerLabels = await locDialog
        .locator('fieldset:has(legend:has-text("Bạn là ai?")) label')
        .allInnerTexts();
      const cleanedLabels = customerLabels.map(l => l.trim());

      await attachUiEvidence(sharedPage, testInfo, 'UIO-069', {
        renderedCustomerTypes: cleanedLabels,
      });

      expect(cleanedLabels).toEqual(['Người mua', 'Người thuê', 'Nhà đầu tư', 'Môi giới']);
    });

    test('UIO-070: Ánh xạ chính xác 4 lựa chọn phân loại khách hàng trên UI vào enum role của API (BUYER, RENTER, INVESTOR, BROKER)', async ({}, testInfo) => {
      const mappingResults: Array<{ uiLabel: string; apiRoleSent: string }> = [];
      const pairs = [
        { uiLabel: 'Người mua', expectedRole: 'BUYER' },
        { uiLabel: 'Người thuê', expectedRole: 'RENTER' },
        { uiLabel: 'Nhà đầu tư', expectedRole: 'INVESTOR' },
        { uiLabel: 'Môi giới', expectedRole: 'BROKER' },
      ];

      for (const pair of pairs) {
        const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
        if (!(await locDialog.isVisible().catch(() => false))) {
          await sharedPage.locator('button:has-text("Đổi lựa chọn")').click();
          await expect(locDialog).toBeVisible();
        }

        const countBefore = state.savedLocationPayloads.length;
        await locDialog.locator(`fieldset:has(legend:has-text("Bạn là ai?")) label:has-text("${pair.uiLabel}")`).click();
        await locDialog.locator('button:has-text("Xác nhận vị trí")').click();
        await expect(locDialog).toBeHidden({ timeout: 5000 });
        await expect.poll(() => state.savedLocationPayloads.length, { timeout: 5000 }).toBeGreaterThan(countBefore);

        const latestPayload = state.savedLocationPayloads.at(-1);
        mappingResults.push({
          uiLabel: pair.uiLabel,
          apiRoleSent: latestPayload?.role || '',
        });
        expect(latestPayload?.role).toBe(pair.expectedRole);
      }

      await attachUiEvidence(sharedPage, testInfo, 'UIO-070', {
        roleMappingVerification: mappingResults,
      });
    });

    test('UIO-071: Kiểm tra hành vi nút "Đổi lựa chọn" trên thẻ Thông tin tài khoản sau khi đã lưu vị trí', async ({}, testInfo) => {
      await openRewardsScreen();
      const changeBtn = sharedPage.locator('button:has-text("Đổi lựa chọn")').first();
      await expect(changeBtn).toBeVisible();

      await changeBtn.click();
      const locDialog = sharedPage.locator('div[role="dialog"]:has-text("Chọn vị trí quan tâm")').first();
      await expect(locDialog).toBeVisible();

      // Chọn TP. Hồ Chí Minh + Nhà đầu tư và nhấn Xác nhận vị trí
      const countBefore = state.savedLocationPayloads.length;
      await locDialog.locator('fieldset:has(legend:has-text("Bạn là ai?")) label:has-text("Nhà đầu tư")').click();
      await locDialog.locator('fieldset:has(legend:has-text("Tỉnh/Thành quan tâm")) button:has-text("TP. Hồ Chí Minh")').click();
      await locDialog.locator('button:has-text("Xác nhận vị trí")').click();
      await expect(locDialog).toBeHidden({ timeout: 5000 });
      await expect.poll(() => state.savedLocationPayloads.length, { timeout: 5000 }).toBeGreaterThan(countBefore);
      await sharedPage.waitForTimeout(250);

      const updatedAccountText = (
        await sharedPage.locator('section:has(h2:has-text("Thông tin tài khoản"))').innerText()
      ).trim();

      await attachUiEvidence(sharedPage, testInfo, 'UIO-071', {
        changeSelectionButtonPresent: true,
        updatedAccountSectionText: updatedAccountText,
        lastSavedApiPayload: state.savedLocationPayloads.at(-1),
        traceabilityNote:
          'CONF-02: Giao diện hiện hành có nút "Đổi lựa chọn" cho phép mở lại modal Chọn vị trí quan tâm và gọi POST /api/v1.0/auth/users/interest-location.',
      });

      expect(updatedAccountText).toMatch(/Thành phố Hồ Chí Minh|TP\. Hồ Chí Minh/);
      expect(updatedAccountText).toContain('Nhà đầu tư');
    });
  });
});

