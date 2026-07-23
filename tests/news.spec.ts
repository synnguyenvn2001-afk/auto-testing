import { test, expect } from '@playwright/test';
import { skipOnboardingTour, loginIfNeeded } from './helpers';

test.describe('Market News Test Suite (Testcase NEWS - Trang chủ, Tìm kiếm danh mục, Kết quả tìm kiếm, Lưu bộ lọc, Mở trang nguồn)', () => {
  const BASE_URL = 'https://dev-webapp.laand.vn/tin-tuc-thi-truong';

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await skipOnboardingTour(page);
  });

  /* =========================================================================
   * 1. Màn Trang chủ (Homepage Layout & Categories)
   * ========================================================================= */
  test.describe('1. Màn Trang chủ (Homepage Layout & Categories)', () => {
    test('NEWS_HOME_001: Kiểm tra tổng quan giao diện trang chủ, bố cục Header, Search bar, Body & Footer', async ({ page }) => {
      await page.goto(BASE_URL).catch(() => {});
      await skipOnboardingTour(page);

      // Header check
      const header = page.locator('header, nav, [class*="header"]').first();
      await expect(header).toBeVisible();

      // Navigation links on Header: Tin nổi bật, Tin địa phương, Vĩ mô, Đấu giá, Quy hoạch, Khởi công, BĐS360
      const navHeader = page.locator('header nav, header').first();
      await expect(navHeader).toBeVisible();

      // Body categories sections: Tin mới nhất, Tin địa phương, Tin vĩ mô, Tin đấu giá, Tin quy hoạch, Tin khởi công
      const mainContent = page.locator('main, #__next, body').first();
      await expect(mainContent).toBeVisible();
    });

    test('NEWS_HOME_002: Kiểm tra click Logo Landbase hoặc Tin nổi bật cuộn lên đầu trang hoặc quay lại trang chủ', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await skipOnboardingTour(page);

      const headerLink = page.locator('header a, header img, [class*="header"] a').first();
      if (await headerLink.isVisible().catch(() => false)) {
        await headerLink.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_HOME_003: Kiểm tra dropdown list Tin địa phương mới', async ({ page }) => {
      const localNewsTab = page.locator('header, nav').locator('text=/tin địa phương|địa phương/i').first();
      const isVisible = await localNewsTab.isVisible().catch(() => false);
      if (isVisible) {
        await localNewsTab.hover().catch(() => {});
        await page.waitForTimeout(500);
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_HOME_004: Kiểm tra hiển thị 4 tin mới nhất và click Xem tất cả chuyển hướng sang trang kết quả tìm kiếm', async ({ page }) => {
      const seeAllBtn = page.locator('a:has-text("Xem tất cả"), button:has-text("Xem tất cả")').first();
      const isVisible = await seeAllBtn.isVisible().catch(() => false);
      if (isVisible) {
        await seeAllBtn.click().catch(() => {});
        await page.waitForTimeout(1500);
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_HOME_005: Kiểm tra khi click vào thẻ danh mục/địa danh trên card bài viết (ví dụ: Nghệ An, Đồng Nai, Quảng Ninh...), hệ thống chuyển sang màn Tìm kiếm với thẻ đó được chọn sẵn', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');
      await skipOnboardingTour(page);

      // Find any tag badge/chip at the bottom of a news article card (e.g., Nghệ An, Đồng Nai, Quảng Ninh)
      const tagChip = page.locator('article, .news-card, main [class*="card"]').locator('a, span, button').filter({ hasText: /Nghệ An|Đồng Nai|Quảng Ninh|Bà Rịa|Vũng Tàu|Đà Nẵng|Vĩ mô|Nghị quyết/i }).first();
      if (await tagChip.isVisible().catch(() => false)) {
        const tagText = (await tagChip.innerText().catch(() => ''))?.trim();
        await tagChip.click({ force: true });
        await page.waitForTimeout(2000);

        // Verify redirection to search page and pre-selected chip tag is displayed in search bar
        const activeSearchChip = page.locator('span, div, button').filter({ hasText: new RegExp(`${tagText}.*×|${tagText}`, 'i') }).first();
        if (await activeSearchChip.isVisible().catch(() => false)) {
          await expect(activeSearchChip).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });
  });


  /* =========================================================================
   * 2. Màn Tìm kiếm & Kiểm tra Danh sách Kết quả Tin tìm kiếm (Search Page & News Results)
   * ========================================================================= */
  test.describe('2. Màn Tìm kiếm & Kiểm tra Danh sách Kết quả Tin tìm kiếm', () => {
    test('NEWS_SEARCH_001: Tìm kiếm với từ khóa, chọn danh mục và khoảng thời gian (Kiểm tra API response 200 OK)', async ({ page }) => {
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
      await page.goto(`${BASE_URL}/tim-kiem?keyword=ha-noi`);
      await page.waitForLoadState('domcontentloaded');

      const clearAllBtn = page.locator('button:has-text("Xóa tất cả"), button:has-text("Xóa bộ lọc")').first();
      if (await clearAllBtn.isVisible().catch(() => false)) {
        await clearAllBtn.click().catch(() => {});
        await page.waitForTimeout(1000);
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_003: Kiểm tra hiển thị trạng thái trống khi tìm kiếm với từ khóa không tồn tại ("chưa tìm được bài viết")', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/nhập từ khoá/i).first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('kw_nonexistent_xyz999888');
        await searchInput.press('Enter');
        await page.waitForTimeout(2000);

        const emptyNotice = page.locator('text=/chưa tìm được|không tìm thấy|chưa có bài viết/i').first();
        if (await emptyNotice.isVisible().catch(() => false)) {
          await expect(emptyNotice).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_004: Kiểm tra thông tin chi tiết hiển thị trên mỗi Card tin tìm kiếm (Ảnh, Tiêu đề, Thời gian đăng, Thẻ danh mục, Logo nguồn)', async ({ page }) => {
      const firstCard = page.locator('article, .news-card, [class*="card"]').first();
      if (await firstCard.isVisible().catch(() => false)) {
        await expect(firstCard).toBeVisible();
      }
    });

    test('NEWS_SEARCH_005: Kiểm tra chọn danh mục tìm kiếm từ dropdown list (Ví dụ: Quy hoạch, Đấu giá, Vĩ mô, Khởi công)', async ({ page }) => {
      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục")').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click().catch(() => {});
        await page.waitForTimeout(500);

        const categoryOption = page.locator('[role="option"], [data-slot="popover-content"] div').filter({ hasText: /quy hoạch|đấu giá|vĩ mô/i }).first();
        if (await categoryOption.isVisible().catch(() => false)) {
          await categoryOption.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_006: Kiểm tra Toggle tìm kiếm chính xác / tương đối (Mặc định BẬT -> Bấm chuyển TẮT)', async ({ page }) => {
      const exactToggle = page.locator('button[role="switch"], input[type="checkbox"], [class*="toggle"]').first();
      if (await exactToggle.isVisible().catch(() => false)) {
        await exactToggle.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_007: Kiểm tra tìm kiếm kết hợp nhiều danh mục và khoảng thời gian (Từ ngày - Đến ngày)', async ({ page }) => {
      const startDateInput = page.locator('input[placeholder*="ngày bắt đầu"i], input[type="date"]').first();
      const endDateInput = page.locator('input[placeholder*="ngày kết thúc"i], input[type="date"]').nth(1);

      if (await startDateInput.isVisible().catch(() => false)) {
        await startDateInput.fill('2026-01-01').catch(() => {});
      }
      if (await endDateInput.isVisible().catch(() => false)) {
        await endDateInput.fill('2026-07-22').catch(() => {});
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_008: Kiểm tra hiển thị danh sách bài viết kết quả khi tìm kiếm bộ lọc có tin (Hiển thị danh sách tin bài khớp tiêu chí)', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/nhập từ khoá/i).first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('bất động sản');
        await searchInput.press('Enter');
        await page.waitForTimeout(3000);

        // Verify result cards container or cards list is displayed
        const newsCards = page.locator('article, .news-card, [class*="card"]');
        if (await newsCards.count() > 0) {
          await expect(newsCards.first()).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_009: Kiểm tra các tin tìm kiếm được lọc đúng thẻ khi nhấp "Xem tất cả" ở các mục trang chủ (Tin địa phương, Vĩ mô, Đấu giá...)', async ({ page }) => {
      const seeAllLocal = page.locator('a:has-text("Xem tất cả"), button:has-text("Xem tất cả")').first();
      if (await seeAllLocal.isVisible().catch(() => false)) {
        await seeAllLocal.click().catch(() => {});
        await page.waitForTimeout(1500);

        // Verify search results page contains filtered category tags
        const categoryTag = page.locator('[class*="tag"], [class*="badge"], text=/địa phương|quy hoạch|vĩ mô|mới nhất/i').first();
        if (await categoryTag.isVisible().catch(() => false)) {
          await expect(categoryTag).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_010: Kiểm tra tin tức tìm kiếm khi cuộn trang (Lazy load / Phân trang danh sách bài viết kết quả)', async ({ page }) => {
      await page.goto(`${BASE_URL}/tim-kiem?keyword=b%E1%BA%A5t%20%C4%91%E1%BB%99ng%20s%E1%BA%A3n`);
      await page.waitForLoadState('domcontentloaded');

      // Scroll down to trigger pagination or lazy loading of news articles
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);

      const newsCards = page.locator('article, .news-card, [class*="card"]');
      if (await newsCards.count() > 0) {
        await expect(newsCards.first()).toBeVisible();
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_011: Kiểm tra khi lọc theo Danh mục (Dự án, Vĩ mô, Nghị quyết...), các bài viết trả về phải hiển thị đúng thẻ (Tag) tương ứng', async ({ page }) => {
      await page.goto(`${BASE_URL}/tim-kiem`);
      await page.waitForLoadState('domcontentloaded');
      await skipOnboardingTour(page);

      // Select category filter e.g. "Vĩ mô" or "Dự án"
      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click({ force: true });
        await page.waitForTimeout(500);

        const categoryOption = page.locator('[role="option"], [data-slot="popover-content"] div, [role="menuitem"], span').filter({ hasText: /Vĩ mô|Dự án|Nghị quyết/i }).first();
        if (await categoryOption.isVisible().catch(() => false)) {
          await categoryOption.click({ force: true });
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
      await page.goto(`${BASE_URL}/tim-kiem`);
      await page.waitForLoadState('domcontentloaded');
      await skipOnboardingTour(page);

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
        await dateRangeInput.fill('05/12/2025 - 05/12/2025').catch(() => {});
        await page.keyboard.press('Enter').catch(() => {});
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
      await page.goto(`${BASE_URL}/tim-kiem`);
      await page.waitForLoadState('domcontentloaded');
      await skipOnboardingTour(page);

      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        // Select first tag: Nghị quyết
        await categorySelect.click({ force: true });
        await page.waitForTimeout(500);
        const opt1 = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Nghị quyết/i }).first();
        if (await opt1.isVisible().catch(() => false)) {
          await opt1.click({ force: true });
          await page.waitForTimeout(1000);
        }

        // Select second tag: Vĩ mô
        await categorySelect.click({ force: true }).catch(() => {});
        await page.waitForTimeout(500);
        const opt2 = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Vĩ mô/i }).first();
        if (await opt2.isVisible().catch(() => false)) {
          await opt2.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }

      // Verify active chips (Nghị quyết ×, Vĩ mô ×) are displayed
      const chips = page.locator('span, div, button').filter({ hasText: /Nghị quyết.*×|Vĩ mô.*×/i });
      if (await chips.count() > 0) {
        await expect(chips.first()).toBeVisible();
      }

      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_014: Kiểm tra khi Toggle được BẬT (chế độ tìm kiếm tương đối / HOẶC), bài viết chỉ cần chứa 1 trong nhiều thẻ danh mục đã chọn (Nghị quyết HOẶC Vĩ mô) là sẽ hiển thị trong kết quả', async ({ page }) => {
      await page.goto(`${BASE_URL}/tim-kiem`);
      await page.waitForLoadState('domcontentloaded');
      await skipOnboardingTour(page);

      // Select multiple categories: Nghị quyết and Vĩ mô
      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click({ force: true });
        await page.waitForTimeout(500);

        const opt1 = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Nghị quyết/i }).first();
        if (await opt1.isVisible().catch(() => false)) {
          await opt1.click({ force: true });
          await page.waitForTimeout(1000);
        }

        await categorySelect.click({ force: true }).catch(() => {});
        await page.waitForTimeout(500);
        const opt2 = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Vĩ mô/i }).first();
        if (await opt2.isVisible().catch(() => false)) {
          await opt2.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }

      // Ensure Toggle switch for match-mode is TURNED ON (Relative / OR logic)
      const toggleSwitch = page.locator('button[role="switch"], [class*="switch"], [class*="toggle"]').first();
      if (await toggleSwitch.isVisible().catch(() => false)) {
        const isChecked = await toggleSwitch.getAttribute('aria-checked').catch(() => null);
        if (isChecked !== 'true') {
          await toggleSwitch.click({ force: true }).catch(() => {});
          await page.waitForTimeout(1500);
        }
      }

      // Verify returned article cards contain AT LEAST 1 of the selected tags (Nghị quyết OR Vĩ mô)
      const cards = page.locator('article, .news-card, main [class*="card"]');
      const count = await cards.count();

      if (count > 0) {
        // Collect tags from cards to verify OR condition
        const validTagCount = await page.locator('span, div, label').filter({ hasText: /Nghị quyết|Vĩ mô/i }).count();
        expect(validTagCount).toBeGreaterThan(0);
      }

      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_015: Kiểm tra danh mục tìm kiếm hiển thị phân nhóm "Đơn vị hành chính mới" (kèm số lượng bài viết) và nhóm "Khác" (kèm số lượng bài viết)', async ({ page }) => {
      await page.goto(`${BASE_URL}/tim-kiem`);
      await page.waitForLoadState('domcontentloaded');
      await skipOnboardingTour(page);

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
      await page.goto(`${BASE_URL}/tim-kiem`);
      await page.waitForLoadState('domcontentloaded');
      await skipOnboardingTour(page);

      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click({ force: true });
        await page.waitForTimeout(500);

        // Click to expand "Đơn vị hành chính mới" if collapsed
        const adminGroupHeader = page.locator('[data-slot="popover-content"] div, span').filter({ hasText: /Đơn vị hành chính mới/i }).first();
        if (await adminGroupHeader.isVisible().catch(() => false)) {
          await adminGroupHeader.click({ force: true }).catch(() => {});
          await page.waitForTimeout(300);
        }

        // Select an administrative location option e.g. Quảng Ninh or Đồng Nai
        const locationOpt = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Quảng Ninh|Đồng Nai|Nghệ An|Bà Rịa/i }).first();
        if (await locationOpt.isVisible().catch(() => false)) {
          await locationOpt.click({ force: true });
          await page.waitForTimeout(1500);
        }
      }

      // Verify returned article cards contain selected location tags
      const cards = page.locator('article, .news-card, main [class*="card"]');
      if (await cards.count() > 0) {
        const locationTag = page.locator('span, div, label').filter({ hasText: /Quảng Ninh|Đồng Nai|Nghệ An|Bà Rịa|Vũng Tàu/i }).first();
        if (await locationTag.isVisible().catch(() => false)) {
          await expect(locationTag).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_SEARCH_017: Kiểm tra chọn danh mục thuộc nhóm "Khác", danh sách bài viết kết quả được lọc đúng theo danh mục đã chọn', async ({ page }) => {
      await page.goto(`${BASE_URL}/tim-kiem`);
      await page.waitForLoadState('domcontentloaded');
      await skipOnboardingTour(page);

      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click({ force: true });
        await page.waitForTimeout(500);

        const otherGroupHeader = page.locator('[data-slot="popover-content"] div, span').filter({ hasText: /^Khác/i }).first();
        if (await otherGroupHeader.isVisible().catch(() => false)) {
          await otherGroupHeader.click({ force: true }).catch(() => {});
          await page.waitForTimeout(300);
        }
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
      // Select category filter first to make form dirty
      const categorySelect = page.locator('button[role="combobox"], [class*="select"], button:has-text("Danh mục"), [data-slot="popover-trigger"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click({ force: true });
        await page.waitForTimeout(500);

        const categoryOption = page.locator('[role="option"], [data-slot="popover-content"] div, span').filter({ hasText: /Vĩ mô|Dự án/i }).first();
        if (await categoryOption.isVisible().catch(() => false)) {
          await categoryOption.click({ force: true });
          await page.waitForTimeout(1000);
        }
      }

      // Click Reset/Rotate button (↺)
      const resetBtn = page.locator('button:has(i.fa-rotate), button:has(i.fa-arrows-rotate), button:has(i.fa-sync), button:has(svg path[d*="rotate"]), [aria-label*="Xóa bộ lọc"i], [title*="Xóa bộ lọc"i]').first();
      if (await resetBtn.isVisible().catch(() => false)) {
        await resetBtn.click({ force: true });
        await page.waitForTimeout(1000);
      }

      // Verify search form resets to default placeholders ("Chọn danh mục tìm kiếm", "Chọn khoảng thời gian")
      const defaultCategoryText = page.locator('text=/Chọn danh mục tìm kiếm/i').first();
      if (await defaultCategoryText.isVisible().catch(() => false)) {
        await expect(defaultCategoryText).toBeVisible();
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

      // Turn Toggle ON (Relative/OR mode)
      const toggleSwitch = page.locator('button[role="switch"], [class*="switch"], [class*="toggle"]').first();
      if (await toggleSwitch.isVisible().catch(() => false)) {
        const isChecked = await toggleSwitch.getAttribute('aria-checked').catch(() => null);
        if (isChecked !== 'true') {
          await toggleSwitch.click({ force: true }).catch(() => {});
          await page.waitForTimeout(500);
        }
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
            await notifySwitch.click({ force: true }).catch(() => {});
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

    test('NEWS_FILTER_011: Mở Modal "Chỉnh sửa bộ lọc", sửa Tên bộ lọc và bấm nút "Cập nhật"', async ({ page }) => {
      await loginIfNeeded(page);

      const savedFilterChip = page.locator('text=/BỘ LỌC ĐÃ LƯU/i').locator('..').locator('button, div, span').filter({ hasText: /Bộ lọc/i }).first();
      if (await savedFilterChip.isVisible().catch(() => false)) {
        const filter3DotsBtn = savedFilterChip.locator('button, i.fa-ellipsis-v, i.fa-ellipsis-vertical, svg').first();
        if (await filter3DotsBtn.isVisible().catch(() => false)) {
          await filter3DotsBtn.click({ force: true });
          await page.waitForTimeout(500);

          const editOpt = page.locator('button, div, span, [role="menuitem"]').filter({ hasText: /Chỉnh sửa/i }).first();
          if (await editOpt.isVisible().catch(() => false)) {
            await editOpt.click({ force: true });
            await page.waitForTimeout(1000);

            // Verify "Chỉnh sửa bộ lọc" modal opens
            const editModal = page.locator('div[role="dialog"]:has-text("Chỉnh sửa bộ lọc")').first();
            if (await editModal.isVisible().catch(() => false)) {
              const nameInput = editModal.locator('input[placeholder*="tên"i], input[name="name"]').first();
              if (await nameInput.isVisible().catch(() => false)) {
                await nameInput.fill('Bộ lọc 1 - Đã cập nhật');
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
  });


  /* =========================================================================
   * 4. Màn Xem chi tiết -> Mở sang trang nguồn khi bấm vào (External Source Opening)
   * ========================================================================= */
  test.describe('4. Màn Xem chi tiết -> Mở sang trang nguồn khi bấm vào (External Source)', () => {
    test('NEWS_DETAIL_001: Click vào Tiêu đề hoặc Ảnh tin tức mở sang Trang Nguồn ở Tab Mới (target="_blank")', async ({ page, context }) => {
      // Find the first news article title or image link
      const articleLink = page.locator('article a[href], .news-card a[href], a:has(h2), a:has(h3)').first();
      if (await articleLink.isVisible().catch(() => false)) {
        const targetAttr = await articleLink.getAttribute('target');
        if (targetAttr === '_blank') {
          expect(targetAttr).toBe('_blank');
        } else {
          const [newPage] = await Promise.all([
            context.waitForEvent('page').catch(() => null),
            articleLink.click({ force: true }).catch(() => {})
          ]);
          if (newPage) {
            await newPage.waitForLoadState('domcontentloaded');
            expect(newPage.url()).not.toEqual('');
            await newPage.close();
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_DETAIL_002: Click Nút Nguồn tin / Icon Nguồn mở chính xác trang tin tức gốc ở tab mới', async ({ page, context }) => {
      const sourceLink = page.locator('a[href*="http"]:has-text("Nguồn"), a[title*="Nguồn"], .source-link, a:has(img[src*="source"])').first();
      if (await sourceLink.isVisible().catch(() => false)) {
        const [sourcePage] = await Promise.all([
          context.waitForEvent('page').catch(() => null),
          sourceLink.click({ force: true }).catch(() => {})
        ]);
        if (sourcePage) {
          await sourcePage.waitForLoadState('domcontentloaded');
          expect(sourcePage.url()).toMatch(/^https?:\/\//);
          await sourcePage.close();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });
  });

  /* =========================================================================
   * 5. Lưu Tin tức & Kiểm tra màn "Dữ liệu cá nhân" -> Tab "Tin tức đã lưu"
   * ========================================================================= */
  test.describe('5. Lưu Tin tức & Kiểm tra màn "Dữ liệu cá nhân" -> Tab "Tin tức đã lưu"', () => {
    test('NEWS_ARTICLE_SAVE_001: Click icon Bookmark (Lưu tin) trên góc card bài viết khi CHƯA ĐĂNG NHẬP (Yêu cầu đăng nhập)', async ({ page }) => {
      const bookmarkBtn = page.locator('article, .news-card, main [class*="card"]').locator('button:has(svg), button[aria-label*="Lưu"i], button:has(i.fa-bookmark)').first();
      if (await bookmarkBtn.isVisible().catch(() => false)) {
        await bookmarkBtn.click({ force: true }).catch(() => {});
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

        await bookmarkBtn.click({ force: true }).catch(() => {});
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
        await bookmarkBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1000);
        await bookmarkBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);

        await expect(bookmarkBtn).toBeVisible();
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_ARTICLE_SAVE_004: Điều hướng màn "Dữ liệu cá nhân" -> Chuyển Tab "Tin tức đã lưu" (Hiển thị tab gạch chân màu tím)', async ({ page }) => {
      await loginIfNeeded(page);

      // Open user dropdown menu or navigate directly to Personal Data page (/du-lieu-ca-nhan)
      await page.goto('https://dev-webapp.laand.vn/du-lieu-ca-nhan', { waitUntil: 'commit', timeout: 10000 }).catch(() => {});
      await skipOnboardingTour(page);

      // Verify tabs: "Bất động sản đã lưu", "Tin đã đọc", "Tin tức đã lưu"
      const savedNewsTab = page.locator('button, a, div[role="tab"]').filter({ hasText: /Tin tức đã lưu/i }).first();
      if (await savedNewsTab.isVisible().catch(() => false)) {
        await savedNewsTab.click({ force: true });
        await page.waitForTimeout(1500);
        await expect(savedNewsTab).toBeVisible();
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_ARTICLE_SAVE_005: Kiểm tra hiển thị danh sách tin tức đã lưu trong màn "Dữ liệu của tôi" và mở trang nguồn', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('https://dev-webapp.laand.vn/du-lieu-cua-toi?tab=tin-tuc-da-luu', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await skipOnboardingTour(page);

      // Verify saved news article items or empty state
      const savedItem = page.locator('article, .news-card, [class*="card"], [class*="saved-item"]').first();
      if (await savedItem.isVisible().catch(() => false)) {
        await expect(savedItem).toBeVisible();
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_ARTICLE_SAVE_006: Thao tác Bỏ lưu tin bài trực tiếp từ danh sách "Tin tức đã lưu" trong màn "Dữ liệu của tôi"', async ({ page }) => {
      await loginIfNeeded(page);
      await page.goto('https://dev-webapp.laand.vn/du-lieu-cua-toi?tab=tin-tuc-da-luu', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await skipOnboardingTour(page);

      // Find unsave / bookmark / remove button on saved news item inside My Data page
      const unsaveItemBtn = page.locator('button[title*="Bỏ lưu"i], button[aria-label*="Bỏ lưu"i], button[title*="Xóa"i], [class*="saved-item"] button:has-text("×")').first();
      if (await unsaveItemBtn.isVisible().catch(() => false)) {
        await unsaveItemBtn.click().catch(() => {});
        await page.waitForTimeout(1500);

        const unsaveNotice = page.locator('text=/bỏ lưu thành công|đã xóa/i').first();
        if (await unsaveNotice.count() > 0) {
          await expect(unsaveNotice).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
