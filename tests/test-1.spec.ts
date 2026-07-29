import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://dev-webapp.laand.vn/tin-tuc-thi-truong');
  await page.getByRole('button', { description: 'Tìm chính xác — nhấn để bật tương đối', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn khoảng thời gian ' }).click();
  await page.getByRole('button').nth(3).click();
});