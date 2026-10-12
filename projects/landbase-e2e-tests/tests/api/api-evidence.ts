import { Page, TestInfo } from '@playwright/test';

export interface ApiEvidenceOptions {
  testId: string;
  testName: string;
  endpoint: string;
  method: string;
  expectedStatus: string | number;
  actualStatus: number;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  durationMs?: number;
}

/**
 * Ghi nhận bằng chứng kiểm thử API (Expected vs Actual, Request & Response Body)
 * 1. Đính kèm file JSON vào Playwright HTML Report (y hệt Postman response)
 * 2. Render giao diện trực quan Postman Evidence lên màn hình để ảnh chụp screenshot có bằng chứng rõ ràng
 */
export async function recordApiEvidence(
  page: Page,
  testInfo: TestInfo,
  evidence: ApiEvidenceOptions
): Promise<void> {
  const isStatusMatch = String(evidence.actualStatus) === String(evidence.expectedStatus) ||
    (typeof evidence.expectedStatus === 'string' && evidence.expectedStatus.includes(String(evidence.actualStatus)));

  // 1. Đính kèm File JSON thực tế (Postman Response) vào HTML Report
  await testInfo.attach(`${evidence.testId}_Actual_Response.json`, {
    contentType: 'application/json',
    body: JSON.stringify(evidence.responseBody, null, 2),
  });

  // 2. Đính kèm File Báo cáo đối chiếu chi tiết (Contract Evidence)
  const fullEvidence = {
    testcaseId: evidence.testId,
    testcaseName: evidence.testName,
    endpoint: evidence.endpoint,
    method: evidence.method,
    statusComparison: {
      expected: evidence.expectedStatus,
      actual: evidence.actualStatus,
      result: isStatusMatch ? 'MATCH (PASSED)' : 'MISMATCH (FAILED)',
    },
    request: {
      headers: evidence.requestHeaders,
      payload: evidence.requestBody,
    },
    response: {
      headers: evidence.responseHeaders,
      body: evidence.responseBody,
    },
    timestamp: new Date().toISOString(),
  };

  await testInfo.attach(`${evidence.testId}_Evidence_Contract.json`, {
    contentType: 'application/json',
    body: JSON.stringify(fullEvidence, null, 2),
  });

  // 3. Render giao diện Postman/Swagger Visual Card lên trang để chụp ảnh màn hình làm bằng chứng
  await page.evaluate((data) => {
    // Xóa overlay cũ nếu có
    const oldOverlay = document.getElementById('api-evidence-overlay');
    if (oldOverlay) oldOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'api-evidence-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = '#0b0f19';
    overlay.style.zIndex = '999999';
    overlay.style.overflow = 'auto';
    overlay.style.padding = '24px';
    overlay.style.boxSizing = 'border-box';
    overlay.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
    overlay.style.color = '#e2e8f0';

    const statusBg = data.isMatch ? '#065f46' : '#991b1b';
    const statusText = data.isMatch ? '#34d399' : '#f87171';
    const methodBg = data.method === 'POST' ? '#7c3aed' : '#2563eb';

    const respJsonStr = JSON.stringify(data.responseBody, null, 2) || '(Empty Response)';
    const reqJsonStr = JSON.stringify(data.requestBody, null, 2) || '(No Body)';

    overlay.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
        <!-- Top bar -->
        <div style="background: #0f172a; padding: 16px 20px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="background: ${methodBg}; color: white; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 13px;">${data.method}</span>
            <span style="color: #94a3b8; font-size: 13px; font-weight: 600;">${data.testId}: ${data.testName}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="background: #334155; color: #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 12px;">Expected: ${data.expectedStatus}</span>
            <span style="background: ${statusBg}; color: ${statusText}; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 13px; border: 1px solid ${statusText}40;">Actual: ${data.actualStatus}</span>
          </div>
        </div>

        <!-- Endpoint -->
        <div style="padding: 12px 20px; background: #1e293b; border-bottom: 1px solid #334155; font-size: 13px; color: #38bdf8; word-break: break-all;">
          <strong>URL:</strong> ${data.endpoint}
        </div>

        <!-- Content Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 20px;">
          <!-- Request Payload -->
          <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; overflow: hidden;">
            <div style="background: #1e293b; padding: 8px 14px; font-size: 12px; font-weight: 600; color: #a5b4fc; border-bottom: 1px solid #334155;">
              📤 REQUEST PAYLOAD & HEADERS
            </div>
            <pre style="margin: 0; padding: 14px; font-size: 11px; line-height: 1.5; color: #cbd5e1; max-height: 480px; overflow: auto; white-space: pre-wrap;">${reqJsonStr}</pre>
          </div>

          <!-- Actual Response -->
          <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; overflow: hidden;">
            <div style="background: #1e293b; padding: 8px 14px; font-size: 12px; font-weight: 600; color: #86efac; border-bottom: 1px solid #334155; display: flex; justify-content: space-between;">
              <span>📥 ACTUAL RESPONSE (Postman Equivalent)</span>
              <span style="color: ${statusText}; font-weight: bold;">HTTP ${data.actualStatus}</span>
            </div>
            <pre style="margin: 0; padding: 14px; font-size: 11px; line-height: 1.5; color: #86efac; max-height: 480px; overflow: auto; white-space: pre-wrap;">${respJsonStr}</pre>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }, {
    testId: evidence.testId,
    testName: evidence.testName,
    endpoint: evidence.endpoint,
    method: evidence.method,
    expectedStatus: evidence.expectedStatus,
    actualStatus: evidence.actualStatus,
    isMatch: isStatusMatch,
    requestBody: evidence.requestBody,
    responseBody: evidence.responseBody,
  });

  // Chờ ngắn để giao diện render trước khi Playwright chụp screenshot
  await page.waitForTimeout(300);
}
