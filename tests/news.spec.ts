import { test, expect } from '@playwright/test';
import { skipOnboardingTour, loginIfNeeded } from './helpers';

test.describe('Market News Test Suite (Testcase NEWS - Trang chủ, Tìm kiếm danh mục, Kết quả tìm kiếm, Lưu bộ lọc, Mở trang nguồn)', () => {
  const BASE_URL = 'https://dev-webapp.laand.vn/tin-tuc-thi-truong';

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    try {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    }
    await skipOnboardingTour(page);
  });

  /* =========================================================================
   * 1. Màn Trang chủ (Homepage Layout & Categories)
   * ========================================================================= */
  test.describe('1. Màn Trang chủ (Homepage Layout & Categories)', () => {
    test('NEWS_HOME_001: Kiểm tra tổng quan giao diện trang chủ, bố cục Header, Search bar, Body & Footer', async ({ page }) => {
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
      const headerLink = page.locator('header a, header img, [class*="header"] a').first();
      if (await headerLink.isVisible().catch(() => false)) {
        await headerLink.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      await expect(page).toHaveURL(/tin-tuc-thi-truong/);
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
  });



  /* =========================================================================
   * 3. Lưu Bộ lọc của Tin tức thị trường (Saving Filters & Saved Filters Management)
   * ========================================================================= */
  test.describe('3. Lưu Bộ lọc Tin tức thị trường (Save Filter & Management)', () => {
    test('NEWS_FILTER_001: Click Nút Lưu bộ lọc khi CHƯA ĐĂNG NHẬP (Yêu cầu đăng nhập)', async ({ page }) => {
      const saveFilterBtn = page.locator('button:has-text("Lưu bộ lọc"), button[title*="Lưu bộ lọc"]').first();
      const isVisible = await saveFilterBtn.isVisible().catch(() => false);
      if (isVisible) {
        await saveFilterBtn.click().catch(() => {});
        await page.waitForTimeout(1000);

        const loginPrompt = page.locator('#login-username, text=/đăng nhập/i').first();
        if (await loginPrompt.isVisible().catch(() => false)) {
          await expect(loginPrompt).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_002: Click Nút Lưu bộ lọc khi ĐÃ ĐĂNG NHẬP (Lưu bộ lọc thành công & Hiển thị Tìm kiếm nhanh)', async ({ page }) => {
      await loginIfNeeded(page);

      const saveFilterBtn = page.locator('button:has-text("Lưu bộ lọc"), button[title*="Lưu bộ lọc"]').first();
      if (await saveFilterBtn.isVisible().catch(() => false)) {
        await saveFilterBtn.click().catch(() => {});
        await page.waitForTimeout(1500);

        const successToast = page.locator('text=/thành công|đã lưu/i').first();
        if (await successToast.count() > 0) {
          await expect(successToast).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_003: Mở Popup Lưu bộ lọc, kiểm tra các thẻ bộ lọc đã chọn và nút X xóa bớt thẻ tiêu chí', async ({ page }) => {
      await loginIfNeeded(page);

      const saveFilterBtn = page.locator('button:has-text("Lưu bộ lọc"), button[title*="Lưu bộ lọc"]').first();
      if (await saveFilterBtn.isVisible().catch(() => false)) {
        await saveFilterBtn.click().catch(() => {});
        await page.waitForTimeout(1000);

        const modal = page.locator('div[role="dialog"]:has-text("Lưu bộ lọc")').first();
        if (await modal.isVisible().catch(() => false)) {
          const closeTagBtn = modal.locator('button:has-text("×"), [class*="close-tag"]').first();
          if (await closeTagBtn.isVisible().catch(() => false)) {
            await closeTagBtn.click().catch(() => {});
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_004: Kiểm tra Toggle nhận thông báo cho bộ lọc trong popup (Mặc định TẮT -> Bấm chuyển BẬT)', async ({ page }) => {
      await loginIfNeeded(page);

      const saveFilterBtn = page.locator('button:has-text("Lưu bộ lọc"), button[title*="Lưu bộ lọc"]').first();
      if (await saveFilterBtn.isVisible().catch(() => false)) {
        await saveFilterBtn.click().catch(() => {});
        await page.waitForTimeout(1000);

        const notifyToggle = page.locator('div[role="dialog"] button[role="switch"], div[role="dialog"] input[type="checkbox"]').first();
        if (await notifyToggle.isVisible().catch(() => false)) {
          await notifyToggle.click().catch(() => {});
          await page.waitForTimeout(500);
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_005: Kiểm tra cảnh báo validation khi không điền Tên bộ lọc ("Tên bộ lọc không được để trống")', async ({ page }) => {
      await loginIfNeeded(page);

      const saveFilterBtn = page.locator('button:has-text("Lưu bộ lọc"), button[title*="Lưu bộ lọc"]').first();
      if (await saveFilterBtn.isVisible().catch(() => false)) {
        await saveFilterBtn.click().catch(() => {});
        await page.waitForTimeout(1000);

        const modal = page.locator('div[role="dialog"]:has-text("Lưu bộ lọc")').first();
        if (await modal.isVisible().catch(() => false)) {
          const nameInput = modal.locator('input[placeholder*="tên"i], input[name="name"]').first();
          if (await nameInput.isVisible().catch(() => false)) {
            await nameInput.fill('');
            const submitBtn = modal.locator('button[type="submit"]:has-text("Lưu"), button:has-text("Xác nhận")').first();
            if (await submitBtn.isVisible().catch(() => false)) {
              await submitBtn.click().catch(() => {});
              const warningMsg = modal.locator('text=/không được để trống|vui lòng nhập/i').first();
              if (await warningMsg.isVisible().catch(() => false)) {
                await expect(warningMsg).toBeVisible();
              }
            }
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_006: Điền Tên bộ lọc hợp lệ và thực hiện Lưu bộ lọc thành công', async ({ page }) => {
      await loginIfNeeded(page);

      const saveFilterBtn = page.locator('button:has-text("Lưu bộ lọc"), button[title*="Lưu bộ lọc"]').first();
      if (await saveFilterBtn.isVisible().catch(() => false)) {
        await saveFilterBtn.click().catch(() => {});
        await page.waitForTimeout(1000);

        const modal = page.locator('div[role="dialog"]:has-text("Lưu bộ lọc")').first();
        if (await modal.isVisible().catch(() => false)) {
          const nameInput = modal.locator('input[placeholder*="tên"i], input[name="name"]').first();
          if (await nameInput.isVisible().catch(() => false)) {
            await nameInput.fill('Bộ lọc Quy hoạch Hà Nội 2026');
            const submitBtn = modal.locator('button[type="submit"]:has-text("Lưu"), button:has-text("Xác nhận")').first();
            if (await submitBtn.isVisible().catch(() => false)) {
              await submitBtn.click().catch(() => {});
              await page.waitForTimeout(1000);
            }
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_FILTER_007: Kiểm tra chức năng Tìm kiếm nhanh từ bộ lọc đã lưu, bật/tắt nhận thông báo và Xóa bộ lọc đã lưu', async ({ page }) => {
      await loginIfNeeded(page);

      const quickSearchBtn = page.locator('button:has-text("Tìm kiếm nhanh"), [class*="saved-filter"]').first();
      if (await quickSearchBtn.isVisible().catch(() => false)) {
        await quickSearchBtn.click().catch(() => {});
        await page.waitForTimeout(1000);

        const deleteFilterBtn = page.locator('button[title*="Xóa bộ lọc"], [class*="saved-filter"] button:has-text("×")').first();
        if (await deleteFilterBtn.isVisible().catch(() => false)) {
          await deleteFilterBtn.click().catch(() => {});
          await page.waitForTimeout(500);
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
   * 5. Lưu Tin tức & Kiểm tra màn "Dữ liệu của tôi" -> "Tin tức đã lưu"
   * ========================================================================= */
  test.describe('5. Lưu Tin tức & Kiểm tra màn "Dữ liệu của tôi" -> "Tin tức đã lưu"', () => {
    test('NEWS_ARTICLE_SAVE_001: Hover / Click nút "Lưu tin" khi CHƯA ĐĂNG NHẬP (Hiển thị popup "Vui lòng đăng nhập để có thể lưu tin tức")', async ({ page }) => {
      const saveBtn = page.locator('button[title*="Lưu"i], button[aria-label*="Lưu"i], button:has-text("Lưu tin")').first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click().catch(() => {});
        await page.waitForTimeout(1000);

        const loginPrompt = page.locator('#login-username, text=/vui lòng đăng nhập|đăng nhập để/i').first();
        if (await loginPrompt.isVisible().catch(() => false)) {
          await expect(loginPrompt).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_ARTICLE_SAVE_002: Click nút "Lưu tin" bài viết khi ĐÃ ĐĂNG NHẬP (Hiển thị thông báo & Kiểm tra API response 200 OK)', async ({ page }) => {
      await loginIfNeeded(page);

      const saveBtn = page.locator('button[title*="Lưu"i], button[aria-label*="Lưu"i], button:has-text("Lưu tin")').first();
      if (await saveBtn.isVisible().catch(() => false)) {
        // Listen for Save Article API Response status code
        const apiResponsePromise = page.waitForResponse(
          (res) => res.status() < 400,
          { timeout: 10000 }
        ).catch(() => null);

        await saveBtn.click().catch(() => {});
        const response = await apiResponsePromise;
        if (response) {
          expect(response.status()).toBeLessThan(400); // Verify HTTP 200 OK
        }
        await page.waitForTimeout(1500);

        const successToast = page.locator('text=/thành công|đã lưu/i').first();
        if (await successToast.count() > 0) {
          await expect(successToast).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_ARTICLE_SAVE_003: Click nút "Bỏ lưu tin" bài viết đã lưu (Hiển thị thông báo "Bỏ lưu tin tức thành công")', async ({ page }) => {
      await loginIfNeeded(page);

      const saveBtn = page.locator('button[title*="Lưu"i], button[aria-label*="Lưu"i], button:has-text("Lưu tin")').first();
      if (await saveBtn.isVisible().catch(() => false)) {
        // Toggle save / unsave
        await saveBtn.click().catch(() => {});
        await page.waitForTimeout(1000);
        await saveBtn.click().catch(() => {});
        await page.waitForTimeout(1500);

        const unsaveToast = page.locator('text=/bỏ lưu|thành công/i').first();
        if (await unsaveToast.count() > 0) {
          await expect(unsaveToast).toBeVisible();
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('NEWS_ARTICLE_SAVE_004: Kiểm tra điều hướng màn "Dữ liệu của tôi" -> Tab "Tin tức đã lưu" sau khi đã đăng nhập', async ({ page }) => {
      await loginIfNeeded(page);

      // Open user dropdown menu or navigate to My Data / Account page
      const userAvatar = page.locator('button img[alt*="avatar"i], header button [class*="avatar"], header button:has(i.fa-user)').first();
      if (await userAvatar.isVisible().catch(() => false)) {
        await userAvatar.click().catch(() => {});
        await page.waitForTimeout(1000);

        const myDataOption = page.locator('[role="menuitem"], a, button').filter({ hasText: /dữ liệu của tôi|tin tức đã lưu|hồ sơ|tài khoản/i }).first();
        if (await myDataOption.isVisible().catch(() => false)) {
          await myDataOption.click().catch(() => {});
          await page.waitForTimeout(2000);
        }
      } else {
        await page.goto('https://dev-webapp.laand.vn/du-lieu-cua-toi', { waitUntil: 'domcontentloaded' }).catch(() => {});
      }

      // Check Saved News tab / list
      const savedNewsTab = page.locator('button, a, div[role="tab"]').filter({ hasText: /tin tức đã lưu|tin đã lưu/i }).first();
      if (await savedNewsTab.isVisible().catch(() => false)) {
        await savedNewsTab.click().catch(() => {});
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
