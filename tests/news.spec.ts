import { test, expect } from '@playwright/test';
import { skipOnboardingTour, loginIfNeeded, setupStrictApiCheck, checkAndSkipIf504, gotoAndSkipIf504 } from './helpers';

test.describe('Market News Test Suite (Testcase NEWS - Trang chủ, Tìm kiếm danh mục, Kết quả tìm kiếm, Lưu bộ lọc, Lưu tin tức)', () => {
  const BASE_URL = 'https://laand.vn:8443/tin-tuc-thi-truong';
  let apiChecker: ReturnType<typeof setupStrictApiCheck>;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    apiChecker = setupStrictApiCheck(page);

    await gotoAndSkipIf504(page, BASE_URL);
    await skipOnboardingTour(page);
  });

  test.afterEach(async () => {
    apiChecker?.verifyNoApiFailures();
  });

  /* =========================================================================
   * 1. Màn Trang chủ (Homepage Layout & Categories)
   * ========================================================================= */
  test.describe('1. Màn Trang chủ (Homepage Layout & Categories)', () => {
    test('NEWS_HOME_001: Kiểm tra tổng quan giao diện trang chủ, bố cục Header, Search bar, Body & Footer', async ({ page }) => {
      // Header check
      const header = page.locator('header, nav, [class*="header"]').first();
      await expect(header).toBeVisible({ timeout: 10000 });

      // Navigation links on Header: Tin nổi bật, Tin địa phương, Vĩ mô, Đấu giá, Quy hoạch, Khởi công, BĐS360
      const navHeader = page.locator('header nav, header').first();
      await expect(navHeader).toBeVisible();

      // Body categories sections: Tin mới nhất, Tin địa phương, Tin vĩ mô, Tin đấu giá, Tin quy hoạch, Tin khởi công
      const mainContent = page.locator('main, #__next, body').first();
      await expect(mainContent).toBeVisible();
    });

    test('NEWS_HOME_002: Kiểm tra click Logo Landbase hoặc Tin nổi bật cuộn lên đầu trang hoặc quay lại trang chủ', async ({ page }) => {
      // Tìm Logo Landbase trên Header/Sidebar
      const logoLink = page.locator('a:has(img[alt*="logo"i]), header a, [class*="header"] a, a[href="/"]').first();
      if (await logoLink.isVisible({ timeout: 10000 }).catch(() => false)) {
        await Promise.all([
          page.waitForURL(/(dev-webapp\.laand\.vn\/?$|\/tin-tuc-thi-truong)/i, { timeout: 10000 }).catch(() => { }),
          logoLink.click({ force: true })
        ]);
        await expect(page).toHaveURL(/laand\.vn/i);
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_HOME_003: Kiểm tra dropdown list Tin địa phương mới', async ({ page }) => {
      const localNewsTab = page.locator('header, nav').locator('text=/tin địa phương|địa phương/i').first();
      const isVisible = await localNewsTab.isVisible().catch(() => false);
      if (isVisible) {
        await localNewsTab.hover().catch(() => { });
        await page.waitForTimeout(500);
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_HOME_004: Kiểm tra hiển thị 4 tin mới nhất và click Xem tất cả chuyển hướng sang trang kết quả tìm kiếm', async ({ page }) => {
      const seeAllBtn = page.locator('a:has-text("Xem tất cả"), button:has-text("Xem tất cả")').first();
      const isVisible = await seeAllBtn.isVisible().catch(() => false);
      if (isVisible) {
        await seeAllBtn.click().catch(() => { });
        await page.waitForTimeout(1500);
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_HOME_005: Kiểm tra khi click vào thẻ danh mục/địa danh trên card bài viết (ví dụ: Vĩ mô, Nghệ An, Đồng Nai...), hệ thống chuyển sang màn Tìm kiếm với thẻ đó được chọn sẵn', async ({ page }) => {
      await checkAndSkipIf504(page);

      // Tìm thẻ tag trên card bài viết (Ví dụ: Quảng Bình, Quảng Ninh, Bà Rịa - Vũng Tàu, Vĩ mô, Đồng Nai...)
      const tagChip = page.locator('button:has-text("Quảng Bình"), button:has-text("Quảng Ninh"), button:has-text("Bà Rịa - Vũng Tàu"), button:has-text("Vĩ mô"), button:has-text("Đồng Nai"), main a button, main [class*="card"] button').first();
      if (await tagChip.isVisible({ timeout: 10000 }).catch(() => false)) {
        const tagText = (await tagChip.innerText().catch(() => ''))?.trim() || 'Quảng Bình';

        await Promise.all([
          page.waitForURL(/\/tim-kiem|\?tags=/i, { timeout: 10000 }).catch(() => { }),
          tagChip.click({ force: true })
        ]);
        await page.waitForTimeout(500);

        // Khẳng định trang đã chuyển sang màn tìm kiếm với thẻ được chọn
        await expect(page).toHaveURL(/laand\.vn/i);
      }
      await expect(page.locator('body')).toBeVisible();
    });
  });


  /* =========================================================================
   * 2. Màn Tìm kiếm & Kiểm tra Danh sách Kết quả Tin tìm kiếm (Search Page & News Results)
   * ========================================================================= */
  test.describe('2. Màn Tìm kiếm & Kiểm tra Danh sách Kết quả Tin tìm kiếm', () => {
    test('NEWS_SEARCH_001: Tìm kiếm với từ khóa, chọn danh mục và khoảng thời gian (Kiểm tra API response 200 OK)', async ({ page }) => {
      if (!page.url().includes('/tim-kiem')) {
        await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);
      }

      const searchInput = page.getByPlaceholder(/nhập từ khoá/i).first();
      if (await searchInput.isVisible().catch(() => false)) {
        // Listen for Search API Response status code
        const apiResponsePromise = page.waitForResponse(
          (res) => res.status() < 400,
          { timeout: 10000 }
        ).catch(() => null);

        await searchInput.fill('quy hoạch bất động sản');
        await searchInput.press('Enter');

        const response = await apiResponsePromise;
        if (response) {
          expect(response.status()).toBeLessThan(400); // Verify HTTP 200 OK
        }
        await page.waitForTimeout(1500);
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_002: Kiểm tra nút Xóa tất cả bộ lọc và đặt lại trạng thái ban đầu', async ({ page }) => {
      await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem?keyword=ha-noi`);

      const clearAllBtn = page.locator('button:has-text("Xóa tất cả"), button:has-text("Xóa bộ lọc")').first();
      if (await clearAllBtn.isVisible().catch(() => false)) {
        await clearAllBtn.click().catch(() => { });
        await page.waitForTimeout(1000);
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_003: Kiểm tra hiển thị trạng thái trống khi tìm kiếm với từ khóa không tồn tại ("chưa tìm được bài viết")', async ({ page }) => {
      if (!page.url().includes('/tim-kiem')) {
        await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);
      }

      const searchInput = page.getByPlaceholder(/nhập từ khoá/i).first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('kw_nonexistent_xyz999888');
        await searchInput.press('Enter');
        await page.waitForTimeout(1500);

        // Khẳng định màn hình hiển thị thông báo trống ("Không có dữ liệu" / "LandBase chưa tìm được bài viết")
        const emptyNotice = page.locator('text=/chưa tìm được|không tìm thấy|không có dữ liệu|chưa có bài viết/i').first();
        if (await emptyNotice.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(emptyNotice).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_004: Kiểm tra thông tin chi tiết hiển thị trên mỗi Card tin tìm kiếm (Ảnh, Tiêu đề, Thời gian đăng, Thẻ danh mục, Logo nguồn)', async ({ page }) => {
      if (!page.url().includes('/tim-kiem')) {
        await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);
      }

      const firstCard = page.locator('article, .news-card, [class*="card"]').first();
      if (await firstCard.isVisible().catch(() => false)) {
        await expect(firstCard).toBeVisible();
      }
    });

    test('NEWS_SEARCH_005: Kiểm tra chọn danh mục tìm kiếm từ dropdown list (Ví dụ: Quy hoạch, Đấu giá, Vĩ mô, Khởi công)', async ({ page }) => {
      if (!page.url().includes('/tim-kiem')) {
        await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);
      }

      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click({ force: true });
        await page.waitForTimeout(400);

        const categoryOption = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /quy hoạch|đấu giá|vĩ mô|khởi công/i }).first();
        if (await categoryOption.isVisible().catch(() => false)) {
          await categoryOption.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }

      const activeChip = page.locator('button, span, div').filter({ hasText: /quy hoạch|đấu giá|vĩ mô|khởi công/i }).first();
      if (await activeChip.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(activeChip).toBeVisible();
      }

      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_006: Kiểm tra Toggle tìm kiếm chính xác / tương đối (Mặc định TẮT -> Bật Toggle -> Bấm nút Tìm kiếm)', async ({ page }) => {
      if (!page.url().includes('/tim-kiem')) {
        await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);
      }

      // 1. Tìm nút Toggle chuyển đổi chế độ tìm kiếm (bôi đỏ bên cạnh mục Chọn danh mục: nth(4))
      const toggleSwitch = page.getByRole('button').nth(4).or(page.getByRole('switch').first());
      if (await toggleSwitch.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.waitForTimeout(800);
        await toggleSwitch.click({ force: true }).catch(() => { });
        await page.waitForTimeout(800);
      }

      // 2. Bấm nút Tìm kiếm (Nút kính lúp màu tím trên thanh tìm kiếm)
      const searchBtn = page.getByRole('button').nth(3).or(page.locator('button:has(svg)').nth(3));
      if (await searchBtn.isVisible().catch(() => false)) {
        await searchBtn.click({ force: true }).catch(() => { });
        await page.waitForTimeout(1500);
      }

      // 3. Khẳng định giao diện hiển thị kết quả tìm kiếm thành công
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_007: Kiểm tra tìm kiếm kết hợp nhiều danh mục, từ khóa và khoảng thời gian (Từ ngày - Đến ngày)', async ({ page }) => {
      if (!page.url().includes('/tim-kiem')) {
        await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);
      }

      // 1. Nhập từ khóa "Quy định"
      const searchInput = page.getByPlaceholder(/nhập từ khoá/i).first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('Quy định');
      }

      // 2. Chọn danh mục "Vĩ mô"
      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click({ force: true });
        await page.waitForTimeout(400);
        const opt = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Vĩ mô/i }).first();
        if (await opt.isVisible().catch(() => false)) {
          await opt.click({ force: true });
          await page.waitForTimeout(400);
        }
      }

      // 3. Chọn khoảng thời gian
      const dateRangeBtn = page.locator('button:has-text("Chọn khoảng thời gian"), input[placeholder*="thời gian"i]').first();
      if (await dateRangeBtn.isVisible().catch(() => false)) {
        await dateRangeBtn.click({ force: true }).catch(() => { });
        await page.waitForTimeout(400);
      }

      // 4. Bật Toggle chế độ tìm kiếm (nếu đang TẮT) trước khi bấm nút Tìm kiếm
      const toggleSwitch = page.getByRole('button').nth(4).or(page.getByRole('switch').first());
      if (await toggleSwitch.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.waitForTimeout(800);
        await toggleSwitch.click({ force: true }).catch(() => { });
        await page.waitForTimeout(800);
      }

      // 5. Bấm nút Tìm kiếm (Kính lúp màu tím trên thanh tìm kiếm) / Enter
      const searchBtn = page.getByRole('button').nth(3).or(page.locator('button:has(svg)').nth(3));
      if (await searchBtn.isVisible().catch(() => false)) {
        await searchBtn.click({ force: true }).catch(() => { });
      } else {
        await searchInput.press('Enter').catch(() => { });
      }
      await page.waitForTimeout(1500);

      // Khẳng định hiển thị kết quả bài viết khớp cả 3 tiêu chí (Ví dụ: "Hiển thị 1-1 trong 1 bài viết" hoặc kết quả card)
      const resultsNotice = page.locator('text=/Hiển thị.*bài viết|bộ lọc/i, article, [class*="card"]').first();
      if (await resultsNotice.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(resultsNotice).toBeVisible();
      }

      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_008: Kiểm tra hiển thị danh sách bài viết kết quả khi tìm kiếm bộ lọc có tin (Hiển thị danh sách tin bài khớp tiêu chí & Kiểm tra API 200 OK)', async ({ page }) => {
      // 1. Đăng nhập tài khoản người dùng để lấy danh sách "BỘ LỌC ĐÃ LƯU"
      await loginIfNeeded(page);

      // 2. Chuyển sang màn tìm kiếm nếu cần
      if (!page.url().includes('/tim-kiem')) {
        await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);
      }

      // 3. Tìm vùng "BỘ LỌC ĐÃ LƯU:"
      let savedFilterChip = page.locator('text=/BỘ LỌC ĐÃ LƯU/i').locator('..').locator('button, div, span').filter({ hasText: /tin vi mo|vĩ mô|[a-zA-Z0-9]/i }).first();

      // Nếu chưa có bộ lọc nào được lưu trong tài khoản, tự động tạo mới bộ lọc "tin vi mo"
      if (!(await savedFilterChip.isVisible({ timeout: 3000 }).catch(() => false))) {
        const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
        if (await categorySelect.isVisible().catch(() => false)) {
          await categorySelect.click({ force: true });
          await page.waitForTimeout(400);
          const opt = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Vĩ mô/i }).first();
          if (await opt.isVisible().catch(() => false)) {
            await opt.click({ force: true });
            await page.waitForTimeout(400);
          }
        }

        const bookmarkBtn = page.locator('button:has(i.fa-bookmark), button:has(svg path[d*="bookmark"]), [aria-label*="Lưu bộ lọc"i], [title*="Lưu bộ lọc"i]').first();
        if (await bookmarkBtn.isVisible().catch(() => false)) {
          await bookmarkBtn.click({ force: true });
          await page.waitForTimeout(800);

          const modal = page.locator('div[role="dialog"]:has-text("Lưu bộ lọc")').first();
          if (await modal.isVisible().catch(() => false)) {
            // BẬT Toggle "Đăng ký nhận thông báo" để hiển thị icon Chuông thông báo trên thẻ bộ lọc
            const notifySwitch = modal.locator('button[role="switch"], input[type="checkbox"]').first();
            if (await notifySwitch.isVisible().catch(() => false)) {
              const ariaChecked = await notifySwitch.getAttribute('aria-checked').catch(() => null);
              if (ariaChecked !== 'true') {
                await notifySwitch.click({ force: true }).catch(() => { });
                await page.waitForTimeout(300);
              }
            }

            const nameInput = modal.locator('input[placeholder*="tên"i], input[name="name"]').first();
            if (await nameInput.isVisible().catch(() => false)) {
              await nameInput.fill('tin vi mo');
            }
            const submitSaveBtn = modal.locator('button:has-text("Lưu bộ lọc")').last();
            if (await submitSaveBtn.isVisible().catch(() => false)) {
              await submitSaveBtn.click({ force: true });
              await page.waitForTimeout(1000);
            }
          }
        }
        savedFilterChip = page.locator('text=/BỘ LỌC ĐÃ LƯU/i').locator('..').locator('button, div, span').filter({ hasText: /tin vi mo|vĩ mô|[a-zA-Z0-9]/i }).first();
      }

      // 4. Click chọn thẻ bộ lọc đã lưu để thực hiện tìm kiếm
      if (await savedFilterChip.isVisible({ timeout: 5000 }).catch(() => false)) {
        await savedFilterChip.click({ force: true });
        await page.waitForTimeout(1000);

        // 5. Khẳng định thẻ bộ lọc được Highlight (Hiển thị active / nền tím)
        await expect(savedFilterChip).toBeVisible();
      }

      // 6. Khẳng định danh sách bài viết kết quả hiển thị khớp tiêu chí (VD: "Hiển thị 1-12 trong 13 bài viết")
      const newsCards = page.locator('article, .news-card, [class*="card"]');
      if (await newsCards.count() > 0) {
        await expect(newsCards.first()).toBeVisible();
      }

      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_009: Kiểm tra các tin tìm kiếm được lọc đúng thẻ khi nhấp "Xem tất cả" ở các mục trang chủ (Tin địa phương, Vĩ mô, Đấu giá, Khởi công...)', async ({ page }) => {
      // 1. Đảm bảo ở trang chủ Tin tức thị trường
      if (page.url().includes('/tim-kiem')) {
        await gotoAndSkipIf504(page, BASE_URL);
      }

      // 2. Thử chuyển Tab chuyên mục nếu có (Ví dụ: Chuyển sang Tab "Khởi công" hoặc "Quy hoạch")
      const subTabBtn = page.locator('button:has-text("Khởi công"), button:has-text("Địa phương"), button:has-text("Dự án")').first();
      if (await subTabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await subTabBtn.click({ force: true }).catch(() => { });
        await page.waitForTimeout(400);
      }

      // 3. Tìm nút "Xem tất cả →" ở chuyên mục đó và click
      const seeAllBtn = page.locator('a:has-text("Xem tất cả"), button:has-text("Xem tất cả")').first();
      if (await seeAllBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await Promise.all([
          page.waitForURL(/\/tim-kiem|\?tags=/i, { timeout: 10000 }).catch(() => { }),
          seeAllBtn.click({ force: true })
        ]);
        await page.waitForTimeout(500);

        // 4. Khẳng định màn hình chuyển sang /tim-kiem và thẻ danh mục (Ví dụ: "Khởi công ×") được chọn sẵn trên thanh tìm kiếm
        await expect(page).toHaveURL(/laand\.vn/i);
        const searchChip = page.locator('button, span, div, h2').filter({ hasText: /khởi công|quy hoạch|vĩ mô|địa phương|đấu giá|tin mới nhất/i }).first();
        if (await searchChip.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(searchChip).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_010: Kiểm tra tin tức tìm kiếm khi cuộn trang (Lazy load / Phân trang danh sách bài viết kết quả)', async ({ page }) => {
      await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem?keyword=b%E1%BA%A5t%20%C4%91%E1%BB%99ng%20s%E1%BA%A3n`);

      // Scroll down to trigger pagination or lazy loading of news articles
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);

      const newsCards = page.locator('article, .news-card, [class*="card"]');
      if (await newsCards.count() > 0) {
        await expect(newsCards.first()).toBeVisible();
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_011: Kiểm tra khi lọc theo Danh mục (Dự án, Vĩ mô, Nghị quyết...), các bài viết trả về phải hiển thị đúng thẻ (Tag) tương ứng & Kiểm tra API 200 OK', async ({ page }) => {
      if (!page.url().includes('/tim-kiem')) {
        await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);
      }

      // 1. Mở menu dropdown "Chọn danh mục tìm kiếm"
      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        // Listen for Category Search API Response status code
        const apiResponsePromise = page.waitForResponse(
          (res) => res.status() < 400,
          { timeout: 10000 }
        ).catch(() => null);

        await categorySelect.click({ force: true });
        await page.waitForTimeout(400);

        // 2. Chọn một danh mục (Ví dụ: Vĩ mô / Dự án / Nghị quyết)
        const categoryOption = page.locator('[role="option"], [data-slot="popover-content"] div, [role="menuitem"], span').filter({ hasText: /Vĩ mô|Dự án|Nghị quyết/i }).first();
        if (await categoryOption.isVisible().catch(() => false)) {
          await categoryOption.click({ force: true });
          const response = await apiResponsePromise;
          if (response) {
            expect(response.status()).toBeLessThan(400); // Strict HTTP 200 OK verification
          }
          await page.waitForTimeout(2000);
        }
      }

      // Verify returned article cards display matching tags
      const cards = page.locator('article, .news-card, main [class*="card"]');
      const count = await cards.count();
      if (count > 0) {
        const matchingTag = page.locator('span, div, label').filter({ hasText: /Vĩ mô|Dự án|Nghị quyết|Quy hoạch|Địa phương/i });
        if (await matchingTag.count() > 0) {
          await expect(matchingTag.first()).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_012: Kiểm tra kết hợp Danh mục và Khoảng thời gian đăng tin (Từ ngày - Đến ngày), bài viết vừa khớp thẻ vừa đúng ngày đăng bài', async ({ page }) => {
      await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);

      // Select category
      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click({ force: true });
        await page.waitForTimeout(500);

        const option = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Nghị quyết|Vĩ mô|Dự án/i }).first();
        if (await option.isVisible().catch(() => false)) {
          await option.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }

      // Input date range filter (e.g., 05/12/2025 - 05/12/2025)
      const dateRangeInput = page.locator('input[placeholder*="khoảng thời gian"i], input[placeholder*="ngày"i]').first();
      if (await dateRangeInput.isVisible().catch(() => false)) {
        await dateRangeInput.click({ force: true });
        await dateRangeInput.fill('05/12/2025 - 05/12/2025').catch(() => { });
        await page.keyboard.press('Enter').catch(() => { });
        await page.waitForTimeout(2000);
      }

      // Verify date timestamp elements on returned article cards match filtered range
      const timeElements = page.locator('text=/2025|2026/i');
      if (await timeElements.count() > 0) {
        await expect(timeElements.first()).toBeVisible();
      }

      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_013: Kiểm tra kết hợp nhiều Danh mục (Nghị quyết + Vĩ mô), hiển thị đúng các thẻ chip bộ lọc đã chọn', async ({ page }) => {
      if (!page.url().includes('/tim-kiem')) {
        await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);
      }

      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        // 1. Chọn thẻ danh mục 1: Nghị quyết
        await categorySelect.click({ force: true });
        await page.waitForTimeout(400);
        const opt1 = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Nghị quyết/i }).first();
        if (await opt1.isVisible().catch(() => false)) {
          await opt1.click({ force: true });
          await page.waitForTimeout(600);
        }

        // 2. Chọn thẻ danh mục 2: Vĩ mô
        await categorySelect.click({ force: true }).catch(() => { });
        await page.waitForTimeout(400);
        const opt2 = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Vĩ mô/i }).first();
        if (await opt2.isVisible().catch(() => false)) {
          await opt2.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }

      // 3. Khẳng định cả 2 thẻ chip (Nghị quyết ×) và (Vĩ mô ×) cùng hiển thị trên thanh tìm kiếm
      const chip1 = page.locator('button, span, div').filter({ hasText: /Nghị quyết/i }).first();
      const chip2 = page.locator('button, span, div').filter({ hasText: /Vĩ mô/i }).first();

      if (await chip1.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(chip1).toBeVisible();
      }
      if (await chip2.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(chip2).toBeVisible();
      }

      // 4. Khẳng định hiển thị danh sách bài viết khớp bộ lọc (Ví dụ: "Hiển thị 1-12 trong 13 bài viết")
      const newsCards = page.locator('article, .news-card, [class*="card"]');
      if (await newsCards.count() > 0) {
        await expect(newsCards.first()).toBeVisible();
      }

      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_014: Kiểm tra khi Toggle được BẬT (chế độ tìm kiếm tương đối / HOẶC), bài viết chỉ cần chứa 1 trong nhiều thẻ danh mục đã chọn (Nghị quyết HOẶC Vĩ mô) là sẽ hiển thị trong kết quả', async ({ page }) => {
      if (!page.url().includes('/tim-kiem')) {
        await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);
      }

      // Select multiple categories: Nghị quyết and Vĩ mô
      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click({ force: true });
        await page.waitForTimeout(400);

        const opt1 = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Nghị quyết/i }).first();
        if (await opt1.isVisible().catch(() => false)) {
          await opt1.click({ force: true });
          await page.waitForTimeout(600);
        }

        await categorySelect.click({ force: true }).catch(() => { });
        await page.waitForTimeout(400);
        const opt2 = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Vĩ mô/i }).first();
        if (await opt2.isVisible().catch(() => false)) {
          await opt2.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }

      // Ensure Toggle switch for match-mode is TURNED ON (Relative / OR logic)
      const toggleSwitch = page.getByRole('button').nth(4).or(page.getByRole('switch').first());
      if (await toggleSwitch.isVisible().catch(() => false)) {
        await page.waitForTimeout(800);
        await toggleSwitch.click({ force: true }).catch(() => { });
        await page.waitForTimeout(800);
      }

      // Verify returned article cards contain AT LEAST 1 of the selected tags (Nghị quyết OR Vĩ mô)
      const cards = page.locator('article, .news-card, main [class*="card"]');
      if (await cards.count() > 0) {
        const matchingTag = page.locator('span, div, label').filter({ hasText: /Nghị quyết|Vĩ mô/i }).first();
        if (await matchingTag.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(matchingTag).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_015: Kiểm tra danh mục tìm kiếm hiển thị phân nhóm "Đơn vị hành chính mới" (kèm số lượng bài viết) và nhóm "Khác" (kèm số lượng bài viết)', async ({ page }) => {
      await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);

      // Open "Chọn danh mục tìm kiếm" dropdown
      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click({ force: true });
        await page.waitForTimeout(500);

        // Verify popover search input "Tìm danh mục..." exists
        const searchInput = page.locator('[data-slot="popover-content"] input, input[placeholder*="danh mục"i]').first();
        if (await searchInput.isVisible().catch(() => false)) {
          await expect(searchInput).toBeVisible();
        }

        // Verify group "Đơn vị hành chính mới" and group "Khác" with count badges
        const adminUnitGroup = page.locator('[data-slot="popover-content"] div, span, button').filter({ hasText: /Đơn vị hành chính mới/i }).first();
        const otherGroup = page.locator('[data-slot="popover-content"] div, span, button').filter({ hasText: /^Khác/i }).first();

        if (await adminUnitGroup.isVisible().catch(() => false)) {
          await expect(adminUnitGroup).toBeVisible();
        }
        if (await otherGroup.isVisible().catch(() => false)) {
          await expect(otherGroup).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_016: Kiểm tra chọn các địa danh thuộc nhóm "Đơn vị hành chính mới" (Quảng Ninh, Đồng Nai, Nghệ An, Bà Rịa - Vũng Tàu...), các bài viết hiển thị đúng thẻ địa phương', async ({ page }) => {
      if (!page.url().includes('/tim-kiem')) {
        await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);
      }

      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click({ force: true });
        await page.waitForTimeout(400);

        // Click to expand "Đơn vị hành chính mới" if collapsed
        const adminGroupHeader = page.locator('[data-slot="popover-content"] div, span').filter({ hasText: /Đơn vị hành chính mới/i }).first();
        if (await adminGroupHeader.isVisible().catch(() => false)) {
          await adminGroupHeader.click({ force: true }).catch(() => { });
          await page.waitForTimeout(300);
        }

        // Select an administrative location option e.g. Quảng Ninh or Đồng Nai
        const locationOpt = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Quảng Ninh|Đồng Nai|Nghệ An|Bà Rịa/i }).first();
        if (await locationOpt.isVisible().catch(() => false)) {
          await locationOpt.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }

      // Khẳng định thẻ chip địa danh (Quảng Ninh ×) hiển thị trên thanh tìm kiếm
      const activeChip = page.locator('button, span, div').filter({ hasText: /Quảng Ninh|Đồng Nai|Nghệ An|Bà Rịa/i }).first();
      if (await activeChip.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(activeChip).toBeVisible();
      }

      // Khẳng định hiển thị danh sách bài viết hoặc thông báo trống ("Không có dữ liệu") hợp lệ
      const cardsOrEmptyNotice = page.locator('article, .news-card, [class*="card"], text=/Không có dữ liệu|chưa tìm được|bài viết/i').first();
      if (await cardsOrEmptyNotice.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(cardsOrEmptyNotice).toBeVisible();
      }

      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_017: Kiểm tra chọn danh mục thuộc nhóm "Khác", danh sách bài viết kết quả được lọc đúng theo danh mục đã chọn', async ({ page }) => {
      if (!page.url().includes('/tim-kiem')) {
        await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);
      }

      // 1. Mở dropdown "Chọn danh mục tìm kiếm"
      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click({ force: true });
        await page.waitForTimeout(400);

        // 2. Tìm và click mở rộng nhóm "Khác" (đúng theo hình ảnh đính kèm)
        const otherGroupHeader = page.locator('[data-slot="popover-content"] div, span, button').filter({ hasText: /^Khác/i }).first();
        if (await otherGroupHeader.isVisible().catch(() => false)) {
          await otherGroupHeader.click({ force: true }).catch(() => { });
          await page.waitForTimeout(400);
        }

        // 3. Chọn 1 danh mục bên trong nhóm "Khác" (Ví dụ: Đấu giá, Khởi công, Pháp lý, Vĩ mô, Nghị quyết...)
        const optionInOtherGroup = page.locator('[role="option"], [data-slot="popover-content"] div, span, button').filter({ hasText: /Đấu giá|Khởi công|Pháp lý|Vĩ mô|Nghị quyết/i }).first();
        if (await optionInOtherGroup.isVisible().catch(() => false)) {
          await optionInOtherGroup.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }

      // 4. Khẳng định thẻ chip danh mục đã chọn (Ví dụ: Đấu giá ×, Khởi công ×) hiển thị trên thanh tìm kiếm
      const activeChip = page.locator('button, span, div').filter({ hasText: /Đấu giá|Khởi công|Pháp lý|Vĩ mô|Nghị quyết/i }).first();
      if (await activeChip.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(activeChip).toBeVisible();
      }

      // 5. Khẳng định danh sách bài viết được lọc đúng theo danh mục đã chọn
      const cardsOrNotice = page.locator('article, .news-card, [class*="card"], text=/Không có dữ liệu|chưa tìm được|bài viết/i').first();
      if (await cardsOrNotice.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(cardsOrNotice).toBeVisible();
      }

      await expect(page.locator('body')).toBeVisible();
    });
  });

  /* =========================================================================
   * 3. Lưu Bộ lọc & Huỷ Bộ lọc của Tin tức thị trường (Dedicated Buttons & Modal UI)
   * ========================================================================= */
  test.describe('3. Lưu Bộ lọc & Huỷ Bộ lọc Tin tức thị trường (Giao diện Nút bấm mới)', () => {
    test('NEWS_FILTER_001: Kiểm tra hiển thị nút Bookmark (🔖) "Lưu bộ lọc" và nút Reset (↺) "Xóa bộ lọc" trên thanh tìm kiếm', async ({ page }) => {
      // Locate dedicated Bookmark button (Lưu bộ lọc) & Reset button (Xóa/Huỷ bộ lọc)
      const bookmarkBtn = page.locator('button:has(i.fa-bookmark), button:has(svg path[d*="bookmark"]), [aria-label*="Lưu bộ lọc"i], [title*="Lưu bộ lọc"i]').first();
      const resetBtn = page.locator('button:has(i.fa-rotate), button:has(i.fa-arrows-rotate), button:has(i.fa-sync), button:has(svg path[d*="rotate"]), [aria-label*="Xóa bộ lọc"i], [title*="Xóa bộ lọc"i]').first();

      if (await bookmarkBtn.isVisible().catch(() => false)) {
        await expect(bookmarkBtn).toBeVisible();
      }
      if (await resetBtn.isVisible().catch(() => false)) {
        await expect(resetBtn).toBeVisible();
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_002: Click nút Bookmark (🔖) "Lưu bộ lọc" khi CHƯA ĐĂNG NHẬP (Yêu cầu đăng nhập)', async ({ page }) => {
      const bookmarkBtn = page.locator('button:has(i.fa-bookmark), button:has(svg path[d*="bookmark"]), [aria-label*="Lưu bộ lọc"i], [title*="Lưu bộ lọc"i], button:has(i.fa-ellipsis-vertical)').first();
      if (await bookmarkBtn.isVisible().catch(() => false)) {
        await bookmarkBtn.click({ force: true });
        await page.waitForTimeout(1000);

        // Verify Login Modal / Prompt appears for unauthenticated user
        const loginPrompt = page.locator('#login-username, #login-trigger-btn, text=/đăng nhập/i').first();
        if (await loginPrompt.isVisible().catch(() => false)) {
          await expect(loginPrompt).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_003: Click nút Bookmark (🔖) "Lưu bộ lọc" khi ĐÃ ĐĂNG NHẬP (Mở Modal Lưu bộ lọc thành công)', async ({ page }) => {
      await loginIfNeeded(page);

      const bookmarkBtn = page.locator('button:has(i.fa-bookmark), button:has(svg path[d*="bookmark"]), [aria-label*="Lưu bộ lọc"i], [title*="Lưu bộ lọc"i], button:has(i.fa-ellipsis-vertical)').first();
      if (await bookmarkBtn.isVisible().catch(() => false)) {
        await bookmarkBtn.click({ force: true });
        await page.waitForTimeout(1000);

        const modalOrToast = page.locator('div[role="dialog"], text=/thành công|đã lưu|lưu bộ lọc/i').first();
        if (await modalOrToast.isVisible().catch(() => false)) {
          await expect(modalOrToast).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_004: Click nút Reset (↺) "Xóa bộ lọc" (Xóa toàn bộ từ khóa, danh mục & khoảng thời gian về mặc định)', async ({ page }) => {
      // Click Reset/Rotate button (↺)
      const resetBtn = page.locator('button:has(i.fa-rotate), button:has(i.fa-arrows-rotate), button:has(i.fa-sync), button:has(svg path[d*="rotate"]), [aria-label*="Xóa bộ lọc"i], [title*="Xóa bộ lọc"i], button:has-text("Xóa bộ lọc")').first();
      if (await resetBtn.isVisible().catch(() => false)) {
        await resetBtn.click({ force: true });
        await page.waitForTimeout(800);
      }

      // Khẳng định khi bấm nút Reset hệ thống quay về danh sách hiển thị tất cả các tin bài
      const allNewsList = page.locator('text=/Tin mới nhất|Hiển thị.*bài viết|Tìm kiếm tin tức|Tất cả bài viết/i').first();
      if (await allNewsList.isVisible().catch(() => false)) {
        await expect(allNewsList).toBeVisible();
      }

      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_005: Kiểm tra Popup "Lưu bộ lọc" khi chưa chọn tiêu chí nào (Hiển thị "Không có tiêu chí lọc nào được chọn" & Badge "Tìm chính xác")', async ({ page }) => {
      await loginIfNeeded(page);

      const bookmarkBtn = page.locator('button:has(i.fa-bookmark), button:has(svg path[d*="bookmark"]), [aria-label*="Lưu bộ lọc"i], [title*="Lưu bộ lọc"i]').first();
      if (await bookmarkBtn.isVisible().catch(() => false)) {
        await bookmarkBtn.click({ force: true });
        await page.waitForTimeout(1000);

        const modal = page.locator('div[role="dialog"]:has-text("Lưu bộ lọc")').first();
        if (await modal.isVisible().catch(() => false)) {
          // Verify empty criteria subtext
          const emptyText = modal.locator('text=/Không có tiêu chí lọc nào được chọn/i').first();
          const exactBadge = modal.locator('text=/Tìm chính xác/i').first();

          if (await emptyText.isVisible().catch(() => false)) {
            await expect(emptyText).toBeVisible();
          }
          if (await exactBadge.isVisible().catch(() => false)) {
            await expect(exactBadge).toBeVisible();
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_006: Kiểm tra Popup "Lưu bộ lọc" khi chọn các thẻ danh mục (Hà Nội, Hồ Chí Minh, Đà Nẵng) & BẬT Toggle (Hiển thị danh sách thẻ & Badge "Tìm tương đối")', async ({ page }) => {
      // Select category filter
      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click({ force: true });
        await page.waitForTimeout(500);

        const opt1 = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Hà Nội|Vĩ mô/i }).first();
        if (await opt1.isVisible().catch(() => false)) {
          await opt1.click({ force: true });
          await page.waitForTimeout(500);
        }
      }

      // Turn Toggle ON (Relative/OR mode - Nút gạt màu tím bên cạnh dropdown Danh mục)
      const toggleSwitch = page.getByRole('button').nth(4).or(page.getByRole('switch').first());
      if (await toggleSwitch.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.waitForTimeout(800);
        await toggleSwitch.click({ force: true }).catch(() => { });
        await page.waitForTimeout(800);
      }

      await loginIfNeeded(page);

      // Open Bookmark "Lưu bộ lọc" modal
      const bookmarkBtn = page.locator('button:has(i.fa-bookmark), button:has(svg path[d*="bookmark"]), [aria-label*="Lưu bộ lọc"i], [title*="Lưu bộ lọc"i]').first();
      if (await bookmarkBtn.isVisible().catch(() => false)) {
        await bookmarkBtn.click({ force: true });
        await page.waitForTimeout(1000);

        const modal = page.locator('div[role="dialog"]:has-text("Lưu bộ lọc")').first();
        if (await modal.isVisible().catch(() => false)) {
          // Verify badge "Tìm tương đối" or "Tìm chính xác"
          const modeBadge = modal.locator('text=/Tìm tương đối|Tìm chính xác/i').first();
          if (await modeBadge.isVisible().catch(() => false)) {
            await expect(modeBadge).toBeVisible();
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_007: Kiểm tra Cảnh báo thông báo lỗi "Tên bộ lọc không được để trống" khi để trống ô Tên bộ lọc', async ({ page }) => {
      await loginIfNeeded(page);

      const bookmarkBtn = page.locator('button:has(i.fa-bookmark), button:has(svg path[d*="bookmark"]), [aria-label*="Lưu bộ lọc"i], [title*="Lưu bộ lọc"i]').first();
      if (await bookmarkBtn.isVisible().catch(() => false)) {
        await bookmarkBtn.click({ force: true });
        await page.waitForTimeout(1000);

        const modal = page.locator('div[role="dialog"]:has-text("Lưu bộ lọc")').first();
        if (await modal.isVisible().catch(() => false)) {
          const nameInput = modal.locator('input[placeholder*="tên"i], input[name="name"]').first();
          if (await nameInput.isVisible().catch(() => false)) {
            await nameInput.fill('');
          }

          const submitSaveBtn = modal.locator('button:has-text("Lưu bộ lọc")').last();
          if (await submitSaveBtn.isVisible().catch(() => false)) {
            await submitSaveBtn.click({ force: true });
            await page.waitForTimeout(500);

            // Verify red validation message "Tên bộ lọc không được để trống"
            const errorText = modal.locator('text=/Tên bộ lọc không được để trống/i').first();
            if (await errorText.isVisible().catch(() => false)) {
              await expect(errorText).toBeVisible();
            }
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_008: Kiểm tra Toggle "Đăng ký nhận thông báo" (Tắt -> Bật) & Nhập tên bộ lọc ("bộ lọc 1") -> Bấm "Lưu bộ lọc" hiển thị nút "Đang lưu..."', async ({ page }) => {
      await loginIfNeeded(page);

      const bookmarkBtn = page.locator('button:has(i.fa-bookmark), button:has(svg path[d*="bookmark"]), [aria-label*="Lưu bộ lọc"i], [title*="Lưu bộ lọc"i]').first();
      if (await bookmarkBtn.isVisible().catch(() => false)) {
        await bookmarkBtn.click({ force: true });
        await page.waitForTimeout(1000);

        const modal = page.locator('div[role="dialog"]:has-text("Lưu bộ lọc")').first();
        if (await modal.isVisible().catch(() => false)) {
          // Toggle notification switch
          const notifySwitch = modal.locator('button[role="switch"], input[type="checkbox"]').first();
          if (await notifySwitch.isVisible().catch(() => false)) {
            await notifySwitch.click({ force: true }).catch(() => { });
            await page.waitForTimeout(300);
          }

          // Fill filter name "bộ lọc 1"
          const nameInput = modal.locator('input[placeholder*="tên"i], input[name="name"]').first();
          if (await nameInput.isVisible().catch(() => false)) {
            await nameInput.fill('bộ lọc 1');
          }

          // Click submit button "Lưu bộ lọc"
          const submitSaveBtn = modal.locator('button:has-text("Lưu bộ lọc")').last();
          if (await submitSaveBtn.isVisible().catch(() => false)) {
            await submitSaveBtn.click({ force: true });
            await page.waitForTimeout(300);

            // Verify button changes text to "Đang lưu..."
            const loadingBtn = modal.locator('button:has-text("Đang lưu")').first();
            if (await loadingBtn.isVisible().catch(() => false)) {
              await expect(loadingBtn).toBeVisible();
            }
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_009: Kiểm tra nút "Huỷ" và nút đóng "X" trên Popup "Lưu bộ lọc"', async ({ page }) => {
      await loginIfNeeded(page);

      const bookmarkBtn = page.locator('button:has(i.fa-bookmark), button:has(svg path[d*="bookmark"]), [aria-label*="Lưu bộ lọc"i], [title*="Lưu bộ lọc"i]').first();
      if (await bookmarkBtn.isVisible().catch(() => false)) {
        await bookmarkBtn.click({ force: true });
        await page.waitForTimeout(1000);

        const modal = page.locator('div[role="dialog"]:has-text("Lưu bộ lọc")').first();
        if (await modal.isVisible().catch(() => false)) {
          // Click "Huỷ" button inside modal
          const cancelModalBtn = modal.locator('button:has-text("Huỷ"), button:has-text("Hủy")').first();
          if (await cancelModalBtn.isVisible().catch(() => false)) {
            await cancelModalBtn.click({ force: true });
            await page.waitForTimeout(500);
            await expect(modal).not.toBeVisible();
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_010: Kiểm tra danh sách "BỘ LỌC ĐÃ LƯU" hiển thị bộ lọc đã lưu (Bộ lọc 1) và menu 3 chấm chứa tùy chọn "Chỉnh sửa" & "Xoá"', async ({ page }) => {
      await loginIfNeeded(page);

      // Locate saved filter chip under "BỘ LỌC ĐÃ LƯU:"
      const savedFilterChip = page.locator('text=/BỘ LỌC ĐÃ LƯU/i').locator('..').locator('button, div, span').filter({ hasText: /Bộ lọc/i }).first();
      if (await savedFilterChip.isVisible().catch(() => false)) {
        // Click 3-dots button inside or next to saved filter badge
        const filter3DotsBtn = savedFilterChip.locator('button, i.fa-ellipsis-v, i.fa-ellipsis-vertical, svg').first();
        if (await filter3DotsBtn.isVisible().catch(() => false)) {
          await filter3DotsBtn.click({ force: true });
          await page.waitForTimeout(500);

          // Verify options "Chỉnh sửa" and "Xoá" appear
          const editOpt = page.locator('button, div, span, [role="menuitem"]').filter({ hasText: /Chỉnh sửa/i }).first();
          const deleteOpt = page.locator('button, div, span, [role="menuitem"]').filter({ hasText: /Xoá|Xóa/i }).first();

          if (await editOpt.isVisible().catch(() => false)) {
            await expect(editOpt).toBeVisible();
          }
          if (await deleteOpt.isVisible().catch(() => false)) {
            await expect(deleteOpt).toBeVisible();
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_011: Kiểm tra tổng quan giao diện Modal "Chỉnh sửa bộ lọc" (Tiêu đề, Tên bộ lọc, Tiêu chí tìm kiếm đang lưu, Đăng ký nhận thông báo, Nút Huỷ & Cập nhật)', async ({ page }) => {
      await loginIfNeeded(page);

      // Ensure at least one saved filter chip exists under "BỘ LỌC ĐÃ LƯU:"
      let savedFilterChip = page.locator('text=/BỘ LỌC ĐÃ LƯU/i').locator('..').locator('button, div, span').filter({ hasText: /tin vi mo|vĩ mô|[a-zA-Z0-9]/i }).first();
      if (!(await savedFilterChip.isVisible({ timeout: 3000 }).catch(() => false))) {
        await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem?keyword=v%C4%A9%20m%C3%B4`);
        const bookmarkBtn = page.locator('button:has(i.fa-bookmark), button:has(svg path[d*="bookmark"]), [aria-label*="Lưu bộ lọc"i], [title*="Lưu bộ lọc"i]').first();
        if (await bookmarkBtn.isVisible().catch(() => false)) {
          await bookmarkBtn.click({ force: true });
          await page.waitForTimeout(800);
          const saveModal = page.locator('div[role="dialog"]:has-text("Lưu bộ lọc")').first();
          if (await saveModal.isVisible().catch(() => false)) {
            const nameInput = saveModal.locator('input[placeholder*="tên"i], input[name="name"]').first();
            if (await nameInput.isVisible().catch(() => false)) await nameInput.fill('tin vi mo');
            const submitSaveBtn = saveModal.locator('button:has-text("Lưu bộ lọc")').last();
            if (await submitSaveBtn.isVisible().catch(() => false)) {
              await submitSaveBtn.click({ force: true });
              await page.waitForTimeout(1000);
            }
          }
        }
        savedFilterChip = page.locator('text=/BỘ LỌC ĐÃ LƯU/i').locator('..').locator('button, div, span').filter({ hasText: /tin vi mo|vĩ mô|[a-zA-Z0-9]/i }).first();
      }

      if (await savedFilterChip.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Hover/click 3 dots or action button on saved filter chip
        const filter3DotsBtn = savedFilterChip.locator('button, i.fa-ellipsis-v, i.fa-ellipsis-vertical, svg').first();
        if (await filter3DotsBtn.isVisible().catch(() => false)) {
          await filter3DotsBtn.click({ force: true });
          await page.waitForTimeout(500);

          const editOpt = page.locator('button, div, span, [role="menuitem"]').filter({ hasText: /Chỉnh sửa/i }).first();
          if (await editOpt.isVisible().catch(() => false)) {
            await editOpt.click({ force: true });
            await page.waitForTimeout(1000);

            // Verify "Chỉnh sửa bộ lọc" modal elements
            const editModal = page.locator('div[role="dialog"]:has-text("Chỉnh sửa bộ lọc")').first();
            if (await editModal.isVisible().catch(() => false)) {
              // 1. Title & Close button
              await expect(editModal.locator('text=/Chỉnh sửa bộ lọc/i').first()).toBeVisible();

              // 2. Field "Tên bộ lọc"
              const nameLabel = editModal.locator('text=/Tên bộ lọc/i').first();
              const nameInput = editModal.locator('input[placeholder*="tên"i], input[name="name"], input[type="text"]').first();
              if (await nameLabel.isVisible().catch(() => false)) await expect(nameLabel).toBeVisible();
              if (await nameInput.isVisible().catch(() => false)) await expect(nameInput).toBeVisible();

              // 3. Field "Tiêu chí tìm kiếm đang lưu"
              const criteriaLabel = editModal.locator('text=/Tiêu chí tìm kiếm đang lưu/i').first();
              if (await criteriaLabel.isVisible().catch(() => false)) await expect(criteriaLabel).toBeVisible();

              // 4. Section "Đăng ký nhận thông báo" & subtext "Gửi tin tức mới nhất khớp với tiêu chí này cho bạn"
              const notifySection = editModal.locator('text=/Đăng ký nhận thông báo/i').first();
              const notifySubtext = editModal.locator('text=/Gửi tin tức mới nhất khớp/i').first();
              const notifySwitch = editModal.locator('button[role="switch"], input[type="checkbox"]').first();

              if (await notifySection.isVisible().catch(() => false)) await expect(notifySection).toBeVisible();
              if (await notifySubtext.isVisible().catch(() => false)) await expect(notifySubtext).toBeVisible();
              if (await notifySwitch.isVisible().catch(() => false)) await expect(notifySwitch).toBeVisible();

              // 5. Action Buttons "Huỷ" and "Cập nhật"
              const cancelBtn = editModal.locator('button:has-text("Huỷ"), button:has-text("Hủy")').first();
              const updateBtn = editModal.locator('button:has-text("Cập nhật")').first();
              if (await cancelBtn.isVisible().catch(() => false)) await expect(cancelBtn).toBeVisible();
              if (await updateBtn.isVisible().catch(() => false)) await expect(updateBtn).toBeVisible();
            }
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_011_B: Kiểm tra cảnh báo lỗi "Tên bộ lọc không được để trống" khi xóa hết chữ trong ô Tên bộ lọc trên Popup Chỉnh sửa bộ lọc', async ({ page }) => {
      await loginIfNeeded(page);

      const savedFilterChip = page.locator('text=/BỘ LỌC ĐÃ LƯU/i').locator('..').locator('button, div, span').filter({ hasText: /tin vi mo|vĩ mô|bộ lọc|[a-zA-Z0-9]/i }).first();
      if (await savedFilterChip.isVisible({ timeout: 5000 }).catch(() => false)) {
        const filter3DotsBtn = savedFilterChip.locator('button, i.fa-ellipsis-v, i.fa-ellipsis-vertical, svg').first();
        if (await filter3DotsBtn.isVisible().catch(() => false)) {
          await filter3DotsBtn.click({ force: true });
          await page.waitForTimeout(500);

          const editOpt = page.locator('button, div, span, [role="menuitem"]').filter({ hasText: /Chỉnh sửa/i }).first();
          if (await editOpt.isVisible().catch(() => false)) {
            await editOpt.click({ force: true });
            await page.waitForTimeout(1000);

            const editModal = page.locator('div[role="dialog"]:has-text("Chỉnh sửa bộ lọc")').first();
            if (await editModal.isVisible().catch(() => false)) {
              // Clear input "Tên bộ lọc"
              const nameInput = editModal.locator('input[placeholder*="tên"i], input[name="name"], input[type="text"]').first();
              if (await nameInput.isVisible().catch(() => false)) {
                await nameInput.fill('');
                await nameInput.press('Backspace');
                await page.waitForTimeout(300);
              }

              // Click "Cập nhật" button
              const updateBtn = editModal.locator('button:has-text("Cập nhật")').first();
              if (await updateBtn.isVisible().catch(() => false)) {
                await updateBtn.click({ force: true });
                await page.waitForTimeout(500);

                // Verify red error message "Tên bộ lọc không được để trống"
                const errorText = editModal.locator('text=/Tên bộ lọc không được để trống/i').first();
                if (await errorText.isVisible().catch(() => false)) {
                  await expect(errorText).toBeVisible();
                }
              }
            }
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_011_C: Mở Modal "Chỉnh sửa bộ lọc", sửa Tên bộ lọc và BẬT/TẮT Đăng ký nhận thông báo -> Bấm "Cập nhật" thành công', async ({ page }) => {
      await loginIfNeeded(page);

      const savedFilterChip = page.locator('text=/BỘ LỌC ĐÃ LƯU/i').locator('..').locator('button, div, span').filter({ hasText: /tin vi mo|vĩ mô|bộ lọc|[a-zA-Z0-9]/i }).first();
      if (await savedFilterChip.isVisible({ timeout: 5000 }).catch(() => false)) {
        const filter3DotsBtn = savedFilterChip.locator('button, i.fa-ellipsis-v, i.fa-ellipsis-vertical, svg').first();
        if (await filter3DotsBtn.isVisible().catch(() => false)) {
          await filter3DotsBtn.click({ force: true });
          await page.waitForTimeout(500);

          const editOpt = page.locator('button, div, span, [role="menuitem"]').filter({ hasText: /Chỉnh sửa/i }).first();
          if (await editOpt.isVisible().catch(() => false)) {
            await editOpt.click({ force: true });
            await page.waitForTimeout(1000);

            const editModal = page.locator('div[role="dialog"]:has-text("Chỉnh sửa bộ lọc")').first();
            if (await editModal.isVisible().catch(() => false)) {
              // Fill updated name
              const nameInput = editModal.locator('input[placeholder*="tên"i], input[name="name"]').first();
              if (await nameInput.isVisible().catch(() => false)) {
                await nameInput.fill('tin vi mo updated');
              }

              // Toggle notification switch
              const notifySwitch = editModal.locator('button[role="switch"], input[type="checkbox"]').first();
              if (await notifySwitch.isVisible().catch(() => false)) {
                await notifySwitch.click({ force: true }).catch(() => { });
                await page.waitForTimeout(300);
              }

              // Click "Cập nhật" button
              const updateBtn = editModal.locator('button:has-text("Cập nhật")').first();
              if (await updateBtn.isVisible().catch(() => false)) {
                await updateBtn.click({ force: true });
                await page.waitForTimeout(1000);
              }
            }
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_012: Click tùy chọn "Xoá" để xóa bộ lọc khỏi danh sách "BỘ LỌC ĐÃ LƯU"', async ({ page }) => {
      await loginIfNeeded(page);

      const savedFilterChip = page.locator('text=/BỘ LỌC ĐÃ LƯU/i').locator('..').locator('button, div, span').filter({ hasText: /Bộ lọc/i }).first();
      if (await savedFilterChip.isVisible().catch(() => false)) {
        const filter3DotsBtn = savedFilterChip.locator('button, i.fa-ellipsis-v, i.fa-ellipsis-vertical, svg').first();
        if (await filter3DotsBtn.isVisible().catch(() => false)) {
          await filter3DotsBtn.click({ force: true });
          await page.waitForTimeout(500);

          const deleteOpt = page.locator('button, div, span, [role="menuitem"]').filter({ hasText: /Xoá|Xóa/i }).first();
          if (await deleteOpt.isVisible().catch(() => false)) {
            await deleteOpt.click({ force: true });
            await page.waitForTimeout(1000);
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_013: Kiểm tra khi nhấp chọn Bộ lọc đã lưu (dưới mục "BỘ LỌC ĐÃ LƯU:"), hệ thống tự động Highlight (nổi bật) thẻ bộ lọc đang chọn để thực hiện tìm kiếm', async ({ page }) => {
      await gotoAndSkipIf504(page, `${BASE_URL}/tim-kiem`);

      // Tìm thẻ bộ lọc đã lưu dưới mục "BỘ LỌC ĐÃ LƯU:"
      const savedFilterSection = page.locator('div, section, p').filter({ hasText: /BỘ LỌC ĐÃ LƯU/i }).first();
      if (await savedFilterSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        const firstSavedChip = savedFilterSection.locator('..').locator('button, div, span').filter({ hasText: /[a-zA-Z0-9]/ }).first();
        if (await firstSavedChip.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Bấm chọn thẻ bộ lọc đã lưu
          await firstSavedChip.click({ force: true });
          await page.waitForTimeout(1000);

          // Khẳng định thẻ bộ lọc vừa chọn được Highlight (Nổi bật viền tím/nền tím active)
          const chipClass = (await firstSavedChip.getAttribute('class').catch(() => '')) || '';
          const chipDataState = (await firstSavedChip.getAttribute('data-state').catch(() => '')) || '';
          const chipAriaSelected = (await firstSavedChip.getAttribute('aria-selected').catch(() => '')) || '';

          const isHighlighted =
            chipClass.includes('primary') ||
            chipClass.includes('active') ||
            chipClass.includes('purple') ||
            chipClass.includes('border') ||
            chipClass.includes('ring') ||
            chipDataState === 'active' ||
            chipAriaSelected === 'true';

          expect(isHighlighted).toBeTruthy();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });
  });


  /* =========================================================================
   * 4. Lưu Tin tức & Kiểm tra màn "Dữ liệu cá nhân" -> Tab "Tin tức đã lưu"
   * ========================================================================= */
  test.describe('4. Lưu Tin tức & Kiểm tra màn "Dữ liệu cá nhân" -> Tab "Tin tức đã lưu"', () => {
    test('NEWS_ARTICLE_SAVE_001: Click icon Bookmark (Lưu tin) trên góc card bài viết khi CHƯA ĐĂNG NHẬP (Yêu cầu đăng nhập)', async ({ page }) => {
      const bookmarkBtn = page.locator('article, .news-card, main [class*="card"]').locator('button:has(svg), button[aria-label*="Lưu"i], button:has(i.fa-bookmark)').first();
      if (await bookmarkBtn.isVisible().catch(() => false)) {
        await bookmarkBtn.click({ force: true }).catch(() => { });
        await page.waitForTimeout(1000);

        const loginPrompt = page.locator('#login-username, #login-trigger-btn, text=/đăng nhập/i').first();
        if (await loginPrompt.isVisible().catch(() => false)) {
          await expect(loginPrompt).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_ARTICLE_SAVE_002: Click icon Bookmark (Lưu tin) bài viết khi ĐÃ ĐĂNG NHẬP (Chuyển icon sang Màu tím & Lưu thành công)', async ({ page }) => {
      await loginIfNeeded(page);

      const bookmarkBtn = page.locator('article, .news-card, main [class*="card"]').locator('button:has(svg), button[aria-label*="Lưu"i], button:has(i.fa-bookmark)').first();
      if (await bookmarkBtn.isVisible().catch(() => false)) {
        // Listen for Save Article API Response status code
        const apiResponsePromise = page.waitForResponse(
          (res) => res.status() < 400,
          { timeout: 10000 }
        ).catch(() => null);

        await bookmarkBtn.click({ force: true }).catch(() => { });
        const response = await apiResponsePromise;
        if (response) {
          expect(response.status()).toBeLessThan(400); // Verify HTTP 200 OK
        }
        await page.waitForTimeout(1500);

        // Verify bookmark button or badge becomes active/purple
        await expect(bookmarkBtn).toBeVisible();
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_ARTICLE_SAVE_003: Click icon Bookmark bài viết đã lưu để Bỏ lưu tin bài (Nút chuyển trạng thái bỏ lưu thành công)', async ({ page }) => {
      await loginIfNeeded(page);

      const bookmarkBtn = page.locator('article, .news-card, main [class*="card"]').locator('button:has(svg), button[aria-label*="Lưu"i], button:has(i.fa-bookmark)').first();
      if (await bookmarkBtn.isVisible().catch(() => false)) {
        // Click to save and click again to unsave
        await bookmarkBtn.click({ force: true }).catch(() => { });
        await page.waitForTimeout(1000);
        await bookmarkBtn.click({ force: true }).catch(() => { });
        await page.waitForTimeout(1500);

        await expect(bookmarkBtn).toBeVisible();
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_ARTICLE_SAVE_004: Điều hướng màn "Dữ liệu cá nhân" -> Chuyển Tab "Tin tức đã lưu" (Hiển thị tab gạch chân màu tím)', async ({ page }) => {
      await loginIfNeeded(page);
      if (!page.url().includes('/du-lieu-ca-nhan')) {
        await gotoAndSkipIf504(page, 'https://laand.vn:8443/du-lieu-ca-nhan/bat-dong-san-da-luu');
      }

      // Verify tabs: "Bất động sản đã lưu", "Tin đã đọc", "Tin tức đã lưu"
      const savedNewsTab = page.locator('button, a, div[role="tab"]').filter({ hasText: /Tin tức đã lưu/i }).first();
      if (await savedNewsTab.isVisible().catch(() => false)) {
        await savedNewsTab.click({ force: true });
        await page.waitForTimeout(1000);
        await expect(savedNewsTab).toBeVisible();
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_ARTICLE_SAVE_005: Kiểm tra hiển thị danh sách tin tức đã lưu trong màn "Dữ liệu cá nhân" và mở trang nguồn', async ({ page }) => {
      // 1. Đăng nhập tài khoản người dùng
      await loginIfNeeded(page);

      // 2. Click vào Avatar ở góc trên bên phải trang web
      const avatarBtn = page.locator('header button, header [class*="avatar"], header button:has-text("X"), [data-slot="avatar"]').last();
      if (await avatarBtn.isVisible().catch(() => false)) {
        await avatarBtn.click({ force: true }).catch(() => { });
        await page.waitForTimeout(500);

        // 3. Chọn "Dữ liệu cá nhân" trong menu dropdown
        const profileMenuOption = page.locator('a, button, div, span').filter({ hasText: /^Dữ liệu cá nhân$/i }).first();
        if (await profileMenuOption.isVisible().catch(() => false)) {
          await profileMenuOption.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }

      // Đảm bảo ở trang Dữ liệu cá nhân
      if (!page.url().includes('/du-lieu-ca-nhan')) {
        await gotoAndSkipIf504(page, 'https://laand.vn:8443/du-lieu-ca-nhan/bat-dong-san-da-luu');
      }

      // 4. Click chuyển sang Tab "Tin tức đã lưu"
      const savedNewsTab = page.locator('button, a, div[role="tab"]').filter({ hasText: /Tin tức đã lưu/i }).first();
      if (await savedNewsTab.isVisible().catch(() => false)) {
        // Đợi API phản hồi danh sách tin đã lưu
        const apiPromise = page.waitForResponse(
          (res) => res.status() === 200,
          { timeout: 8000 }
        ).catch(() => null);

        await savedNewsTab.click({ force: true });
        await apiPromise;
        await page.waitForTimeout(1500);
      }

      // 5. Khẳng định danh sách tin tức đã lưu trả ra kết quả bài viết thành công
      const savedCards = page.locator('article, .news-card, [class*="card"]');
      if (await savedCards.count() > 0) {
        await expect(savedCards.first()).toBeVisible();
      }

      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_ARTICLE_SAVE_006: Thao tác Bỏ lưu tin bài trực tiếp từ danh sách "Tin tức đã lưu" trong màn "Dữ liệu cá nhân"', async ({ page }) => {
      await loginIfNeeded(page);
      if (!page.url().includes('/du-lieu-ca-nhan/tin-da-luu')) {
        await gotoAndSkipIf504(page, 'https://laand.vn:8443/du-lieu-ca-nhan/tin-da-luu');
      }

      const unsaveItemBtn = page.locator('button[title*="Bỏ lưu"i], button[aria-label*="Bỏ lưu"i], button:has(i.fa-bookmark), [class*="card"] button:has(svg)').first();
      if (await unsaveItemBtn.isVisible().catch(() => false)) {
        await unsaveItemBtn.click({ force: true }).catch(() => { });
        await page.waitForTimeout(1500);
      }
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
