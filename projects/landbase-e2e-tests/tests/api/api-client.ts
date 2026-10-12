import { Page, APIRequestContext } from '@playwright/test';
import crypto from 'node:crypto';
import { loadApiConfig, saveApiTokens, ApiEnvironmentConfig } from './api-config';

export interface ApiRequestOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  body?: any;
  customHeaders?: Record<string, string>;
  overrideTokens?: {
    accessToken?: string;
    xAuthToken?: string;
    xSessionRef?: string;
  };
}

export interface ApiResponse<T = any> {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  data: T;
  rawText: string;
}

export class LandBaseApiClient {
  private config: ApiEnvironmentConfig;

  constructor(customConfig?: Partial<ApiEnvironmentConfig>) {
    this.config = { ...loadApiConfig(), ...(customConfig || {}) };
  }

  public getConfig(): ApiEnvironmentConfig {
    return this.config;
  }

  /**
   * Generates the standard LandBase security and tracking headers.
   */
  public buildHeaders(options?: ApiRequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'clientlocale': 'vi',
      'clientmessageid': crypto.randomUUID(),
      'clienttime': new Date().toISOString(),
      'Origin': this.config.webappUrl,
      'Referer': `${this.config.webappUrl}/`,
    };

    const accessToken = options?.overrideTokens?.accessToken ?? this.config.accessToken;
    const xAuthToken = options?.overrideTokens?.xAuthToken ?? this.config.xAuthToken;
    const xSessionRef = options?.overrideTokens?.xSessionRef ?? this.config.xSessionRef;

    if (accessToken) {
      headers['Authorization'] = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;
    }
    if (xAuthToken) {
      headers['x-auth-token'] = xAuthToken;
    }
    if (xSessionRef) {
      headers['x-session-ref'] = xSessionRef;
    }

    if (options?.customHeaders) {
      Object.assign(headers, options.customHeaders);
    }

    return headers;
  }

  /**
   * Resolves the full URL from endpoint (gateway or webapp).
   */
  public resolveUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.config.gatewayUrl}${cleanEndpoint}`;
  }

  /**
   * Trích xuất Token tươi mới trực tiếp từ phiên làm việc trên trình duyệt https://dev-webapp.laand.vn/
   */
  public async extractTokensFromPage(page: Page): Promise<{
    accessToken: string;
    xAuthToken: string;
    xSessionRef: string;
  } | null> {
    try {
      // 1. Trích xuất accessToken từ NextAuth session endpoint
      const sessionData = await page.evaluate(async () => {
        try {
          const res = await window.fetch('/api/auth/session');
          return await res.json();
        } catch {
          return null;
        }
      });

      const extractedAccessToken = sessionData?.user?.accessToken || '';

      // 2. Trích xuất x-session-ref & x-auth-token từ Cookies
      const cookies = await page.context().cookies(this.config.webappUrl);
      let extractedSessionRef = '';
      let extractedAuthToken = '';

      for (const c of cookies) {
        if (c.name === '_v2_mClientFP') extractedSessionRef = c.value;
        if (c.name === '_v2_sig' || c.name === '_v2_sig_fp') extractedAuthToken = c.value;
      }

      // Fallback: Nếu cookie HttpOnly hoặc chưa có, kiểm tra localStorage
      if (!extractedSessionRef) {
        const localFp = await page.evaluate(() => localStorage.getItem('_v2_mClientFP'));
        if (localFp) extractedSessionRef = localFp;
      }

      if (extractedAccessToken) {
        this.config.accessToken = extractedAccessToken;
        if (extractedAuthToken) this.config.xAuthToken = extractedAuthToken;
        if (extractedSessionRef) this.config.xSessionRef = extractedSessionRef;
        this.config.isConfigured = true;

        saveApiTokens({
          accessToken: extractedAccessToken,
          xAuthToken: extractedAuthToken,
          xSessionRef: extractedSessionRef,
          gatewayUrl: this.config.gatewayUrl,
          webappUrl: this.config.webappUrl,
        });

        console.log('🔑 Đã tự động bắt được Token mới từ phiên đăng nhập webapp:');
        console.log(`   - Access Token: ${extractedAccessToken.slice(0, 20)}...`);
        console.log(`   - X-Session-Ref: ${extractedSessionRef || '(chưa có)'}`);
        console.log(`   - X-Auth-Token: ${extractedAuthToken || '(chưa có)'}`);

        return {
          accessToken: extractedAccessToken,
          xAuthToken: extractedAuthToken,
          xSessionRef: extractedSessionRef,
        };
      }
    } catch (err: any) {
      console.warn(`⚠️ Lỗi khi trích xuất token từ trang: ${err.message}`);
    }

    return null;
  }

  /**
   * Kiểm tra xem JWT Token còn hạn hay không (ít nhất còn 30 giây).
   */
  public isTokenValid(token?: string): boolean {
    if (!token) return false;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return false;
      const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);
      if (!payload.exp) return true;
      const nowSec = Math.floor(Date.now() / 1000);
      return payload.exp > (nowSec + 30);
    } catch {
      return false;
    }
  }

  /**
   * Đăng nhập nhanh tự động thông qua NextAuth callback ngay trong browser context (< 1s)
   */
  public async programmaticLogin(page: Page): Promise<boolean> {
    const username = this.config.username;
    const password = this.config.password;
    if (!username || !password) return false;

    try {
      console.log(`🔐 Đang tự động làm mới phiên đăng nhập cho [${username}] trên ${this.config.webappUrl}...`);

      const loginSuccess = await page.evaluate(
        async ({ username, password, callbackUrl }) => {
          try {
            const csrfRes = await window.fetch('/api/auth/csrf');
            const { csrfToken } = await csrfRes.json();
            const loginRes = await window.fetch('/api/auth/callback/credentials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                csrfToken,
                userName: username,
                password: password,
                loginType: 'BASIC',
                callbackUrl: callbackUrl || 'https://dev-webapp.laand.vn/',
              }),
            });
            return loginRes.status === 200;
          } catch {
            return false;
          }
        },
        { username, password, callbackUrl: this.config.webappUrl }
      );

      if (loginSuccess) {
        await page.waitForTimeout(500);
        const tokens = await this.extractTokensFromPage(page);
        if (tokens?.accessToken && this.isTokenValid(tokens.accessToken)) {
          console.log('✅ Đăng nhập làm mới token thành công!');
          return true;
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ Lỗi khi đăng nhập bằng NextAuth API: ${err.message}`);
    }

    return false;
  }

  /**
   * Tự động đăng nhập trên dev-webapp và trích xuất tokens nếu chưa có phiên hợp lệ.
   */
  public async ensureAuthenticated(page: Page): Promise<boolean> {
    if (page.url() !== this.config.webappUrl && !page.url().startsWith(this.config.webappUrl)) {
      await page.goto(this.config.webappUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    }

    // 1. Kiểm tra xem phiên hiện tại trên trình duyệt đã có Token còn hạn hay chưa
    const existingTokens = await this.extractTokensFromPage(page);
    if (existingTokens?.accessToken && this.isTokenValid(existingTokens.accessToken)) {
      return true;
    }

    // 2. Token đã hết hạn hoặc chưa có: Thực hiện đăng nhập nhanh
    if (this.config.username && this.config.password) {
      const fastLoginOk = await this.programmaticLogin(page);
      if (fastLoginOk) return true;

      // 3. Fallback: Nếu đăng nhập nhanh không thành công, thử qua form UI
      console.log(`🔐 Đang thực hiện đăng nhập qua giao diện bằng tài khoản [${this.config.username}]...`);
      try {
        const closeTourBtn = page.locator('.driver-popover-close-btn, button:has-text("×"), button.driver-close-btn').first();
        if (await closeTourBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await closeTourBtn.click({ force: true }).catch(() => {});
        }

        const loginTrigger = page.locator('#login-trigger-btn, button:has-text("Đăng nhập")').first();
        if (await loginTrigger.isVisible({ timeout: 4000 }).catch(() => false)) {
          await loginTrigger.click({ force: true });
          await page.waitForTimeout(1000);

          const dialog = page.locator('div[role="dialog"]').first();
          await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

          const uInput = dialog.locator('input:not([type="password"])').first();
          const pInput = dialog.locator('input[type="password"]').first();
          const submitBtn = dialog.locator('button[type="submit"]').last();

          await uInput.fill(this.config.username);
          await pInput.fill(this.config.password);
          await submitBtn.click({ force: true });

          await page.waitForResponse(
            res => res.url().includes('/api/auth/callback/credentials') || res.url().includes('/api/auth/session'),
            { timeout: 15000 }
          ).catch(() => null);

          await page.waitForTimeout(2000);
          const freshTokens = await this.extractTokensFromPage(page);
          if (freshTokens?.accessToken && this.isTokenValid(freshTokens.accessToken)) {
            console.log('✅ Đăng nhập giao diện thành công! Đã nạp Token mới.');
            return true;
          }
        }
      } catch (err: any) {
        console.warn(`⚠️ Quá trình đăng nhập giao diện gặp lỗi: ${err.message}`);
      }
    }

    return this.config.isConfigured;
  }

  /**
   * In-Page Execution Mode:
   * Executes the API call inside the browser page context of https://dev-webapp.laand.vn/
   */
  public async executeInPage<T = any>(page: Page, options: ApiRequestOptions): Promise<ApiResponse<T>> {
    const currentUrl = page.url();
    if (!currentUrl.startsWith(this.config.webappUrl)) {
      await page.goto(this.config.webappUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    }

    const fullUrl = this.resolveUrl(options.endpoint);
    const headers = this.buildHeaders(options);
    const method = options.method || 'POST';
    const bodyStr = options.body !== undefined ? JSON.stringify(options.body) : undefined;

    const evaluationResult = await page.evaluate(
      async ({ url, method, headers, body }) => {
        try {
          const fetchOptions: RequestInit = {
            method,
            headers,
          };
          if (body && method !== 'GET') {
            fetchOptions.body = body;
          }

          const response = await window.fetch(url, fetchOptions);
          const rawText = await response.text();

          const respHeaders: Record<string, string> = {};
          response.headers.forEach((val, key) => {
            respHeaders[key.toLowerCase()] = val;
          });

          let parsedJson: any = null;
          try {
            parsedJson = JSON.parse(rawText);
          } catch {
            // Non-JSON response
          }

          return {
            status: response.status,
            ok: response.ok,
            headers: respHeaders,
            rawText,
            data: parsedJson,
            error: null,
          };
        } catch (err: any) {
          return {
            status: 0,
            ok: false,
            headers: {},
            rawText: '',
            data: null,
            error: err.message || String(err),
          };
        }
      },
      {
        url: fullUrl,
        method,
        headers,
        body: bodyStr,
      }
    );

    if (evaluationResult.error) {
      throw new Error(`In-page fetch failed on ${this.config.webappUrl}: ${evaluationResult.error}`);
    }

    // Nếu request bị 401 Unauthorized do token vừa hết hạn trong lúc test và không phải testcase cố ý override token
    if (evaluationResult.status === 401 && !options.overrideTokens && this.config.username && this.config.password) {
      console.warn(`🔄 Token hết hạn (401) tại ${options.endpoint}. Tự động làm mới và gửi lại request...`);
      const reloginOk = await this.programmaticLogin(page);
      if (reloginOk) {
        const retryHeaders = this.buildHeaders(options);
        const retryResult = await page.evaluate(
          async ({ url, method, headers, body }) => {
            try {
              const fetchOptions: RequestInit = { method, headers };
              if (body && method !== 'GET') fetchOptions.body = body;
              const response = await window.fetch(url, fetchOptions);
              const rawText = await response.text();
              const respHeaders: Record<string, string> = {};
              response.headers.forEach((val, key) => { respHeaders[key.toLowerCase()] = val; });
              let parsedJson: any = null;
              try { parsedJson = JSON.parse(rawText); } catch {}
              return { status: response.status, ok: response.ok, headers: respHeaders, rawText, data: parsedJson, error: null };
            } catch (err: any) {
              return { status: 0, ok: false, headers: {}, rawText: '', data: null, error: err.message || String(err) };
            }
          },
          { url: fullUrl, method, headers: retryHeaders, body: bodyStr }
        );

        if (!retryResult.error) {
          return {
            status: retryResult.status,
            ok: retryResult.ok,
            headers: retryResult.headers,
            data: retryResult.data,
            rawText: retryResult.rawText,
          };
        }
      }
    }

    return {
      status: evaluationResult.status,
      ok: evaluationResult.ok,
      headers: evaluationResult.headers,
      data: evaluationResult.data,
      rawText: evaluationResult.rawText,
    };
  }

  /**
   * Direct Playwright Request Context Mode
   */
  public async executeDirect<T = any>(
    request: APIRequestContext,
    options: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    const fullUrl = this.resolveUrl(options.endpoint);
    const headers = this.buildHeaders(options);
    const method = options.method || 'POST';

    const response = await request.fetch(fullUrl, {
      method,
      headers,
      data: options.body,
    });

    const rawText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Non-JSON
    }

    const respHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(response.headers())) {
      respHeaders[k.toLowerCase()] = v;
    }

    return {
      status: response.status(),
      ok: response.ok(),
      headers: respHeaders,
      data,
      rawText,
    };
  }

  public async execute<T = any>(
    context: { page?: Page; request?: APIRequestContext },
    options: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    if (context.page) {
      return this.executeInPage<T>(context.page, options);
    }
    if (context.request) {
      return this.executeDirect<T>(context.request, options);
    }
    throw new Error('Either page or request context must be provided to execute LandBase API call.');
  }
}
