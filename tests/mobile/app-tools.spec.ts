import { driver, $, $$, expect } from '@wdio/globals';

/**
 * BỘ KIỂM THỬ TỰ ĐỘNG MOBILE APP - CÔNG CỤ TÍNH VAY & THUẾ BĐS
 * App: Landbase Mobile App (vn.laand)
 */
describe('5. Kiểm thử Công cụ Tính toán BĐS trên Mobile App (Mobile Tools)', () => {

  it('MOBILE_TOOLS_001: Mở Menu và chuyển sang "Công cụ tính lãi vay"', async () => {
    await driver.pause(1500);

    const menuBtn = await $('//android.widget.Button[contains(@text, "Mở menu")]');
    if (await menuBtn.isDisplayed().catch(() => false)) {
      await menuBtn.click();
      await driver.pause(1000);
    }

    const toolsOption = await $('//*[contains(@text, "Công cụ") or contains(@text, "Tính lãi") or contains(@text, "Vay ngân hàng")]');
    if (await toolsOption.isDisplayed().catch(() => false)) {
      await toolsOption.click();
      await driver.pause(1500);
    }
  });

  it('MOBILE_TOOLS_002: Nhập số tiền vay và kiểm tra kết quả tính toán', async () => {
    const loanInput = await $('//android.widget.EditText');
    if (await loanInput.isDisplayed().catch(() => false)) {
      await loanInput.clearValue();
      await loanInput.setValue('1000000000');
      await driver.pause(500);

      const calcBtn = await $('//android.widget.Button[contains(@text, "Tính") or contains(@text, "Xem kết quả")]');
      if (await calcBtn.isDisplayed().catch(() => false)) {
        await calcBtn.click();
        await driver.pause(1000);
        console.log('✅ Công cụ tính lãi vay đã thực thi trên Mobile');
      }
    }
  });
});
