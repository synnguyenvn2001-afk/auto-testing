import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://dev-webapp.laand.vn/tin-tuc-thi-truong');
  await page.getByRole('button').nth(4).click();
  await page.getByRole('button').nth(3).click();
});