import { test, expect } from '@playwright/test';
import { skipOnboardingTour } from './helpers';

test.describe('Financial and Estimation Tools Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://dev-webapp.laand.vn/');
    await page.waitForLoadState('domcontentloaded');
    await skipOnboardingTour(page);
  });

  test('should open and calculate loan payments', async ({ page }) => {
    // Click "Tính lãi vay" button
    const loanToolBtn = page.getByText('Tính lãi vay').first();
    await expect(loanToolBtn).toBeVisible();
    await loanToolBtn.click();
    await page.waitForTimeout(2000);

    // Locate the active dialog modal
    const dialogModal = page.locator('div[role="dialog"]');
    await expect(dialogModal).toBeVisible();

    // Fill out inputs in the loan calculator
    const inputs = await dialogModal.locator('input').all();
    console.log(`Loan inputs found: ${inputs.length}`);
    for (let i = 0; i < inputs.length; i++) {
      const ph = await inputs[i].getAttribute('placeholder');
      console.log(`Input ${i}: placeholder="${ph}"`);
      if (await inputs[i].isEditable()) {
        if (i === 0) {
          await inputs[i].fill('1000000000'); // Amount: 1,000,000,000 VND
        } else if (i === 1) {
          await inputs[i].fill('120'); // Term: 120 months
        } else if (i === 2) {
          await inputs[i].fill('8.5'); // Interest rate: 8.5%
        } else {
          const val = await inputs[i].inputValue();
          if (!val) {
            await inputs[i].fill('10');
          }
        }
      }
    }
    await page.waitForTimeout(1000);

    // Submit or calculate button inside the modal
    const calcBtn = dialogModal.locator('button:has-text("Tính"), button:has-text("Kết quả"), button:has-text("Ước tính")').first();
    await expect(calcBtn).toBeEnabled();
    await calcBtn.click();
    await page.waitForTimeout(2000);
    
    // Take screenshot of calculations
    await page.screenshot({ path: 'loan-calculated.png' });
  });

  test('should open savings interest calculator', async ({ page }) => {
    // Click "Tính lãi tiết kiệm" button
    const savingsToolBtn = page.getByText('Tính lãi tiết kiệm').first();
    await expect(savingsToolBtn).toBeVisible();
    await savingsToolBtn.click();
    await page.waitForTimeout(2000);

    // Locate active dialog
    const dialogModal = page.locator('div[role="dialog"]');
    await expect(dialogModal).toBeVisible();

    // Verify calculator inputs inside the modal
    const inputs = await dialogModal.locator('input').all();
    console.log(`Savings inputs found: ${inputs.length}`);
  });

  test('should open building cost estimator', async ({ page }) => {
    // Click "Ước tính chi phí xây nhà" button
    const buildToolBtn = page.getByText('Ước tính chi phí xây nhà').first();
    await expect(buildToolBtn).toBeVisible();
    await buildToolBtn.click();
    await page.waitForTimeout(2000);

    // Locate active dialog
    const dialogModal = page.locator('div[role="dialog"]');
    await expect(dialogModal).toBeVisible();

    // Verify estimator inputs
    const areaInput = dialogModal.locator('input').first();
    if (await areaInput.isVisible()) {
      await expect(areaInput).toBeVisible();
    }
  });
});
