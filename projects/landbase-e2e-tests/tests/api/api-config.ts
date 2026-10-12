import path from 'node:path';
import fs from 'node:fs';

export interface ApiEnvironmentConfig {
  webappUrl: string;
  gatewayUrl: string;
  accessToken: string;
  xAuthToken: string;
  xSessionRef: string;
  username?: string;
  password?: string;
  validWardCode?: string;
  searchKeyword?: string;
  noMatchKeyword?: string;
  articleId?: string;
  isListingPost?: boolean;
  isConfigured: boolean;
}

const DEFAULT_CONFIG_FILE = path.join(__dirname, '..', '..', 'api-environment.json');

/**
 * Loads configuration for LandBase API testing.
 * Priorities:
 * 1. Process environment variables (.env / CLI env)
 * 2. Local JSON config (postman-environment.json or api-environment.json)
 * 3. Default fallback values
 */
export function loadApiConfig(): ApiEnvironmentConfig {
  let webappUrl = process.env.WEBAPP_BASE_URL || 'https://dev-webapp.laand.vn';
  let gatewayUrl = process.env.API_BASE_URL || process.env.GATEWAY_BASE_URL || 'https://dev-gateway.laand.vn';
  let accessToken = process.env.ACCESS_TOKEN || process.env.access_token || '';
  let xAuthToken = process.env.X_AUTH_TOKEN || process.env.x_auth_token || '';
  let xSessionRef = process.env.X_SESSION_REF || process.env.x_session_ref || '';
  let username = process.env.DEV_USERNAME || process.env.TEST_USERNAME || 'usert1';
  let password = process.env.DEV_PASSWORD || process.env.TEST_PASSWORD || 'Enao@123';
  let validWardCode = process.env.VALID_WARD_CODE || '09552';
  let searchKeyword = process.env.SEARCH_KEYWORD || 'Nguyễn Trãi';
  let noMatchKeyword = process.env.NO_MATCH_KEYWORD || '__NO_MATCH_TEST_VALUE__';
  let articleId = process.env.ARTICLE_ID || process.env.articleId || '238622';
  let isListingPost = process.env.IS_LISTING_POST !== undefined ? process.env.IS_LISTING_POST === 'true' : true;

  const candidateConfigPaths = [
    DEFAULT_CONFIG_FILE,
    path.join(__dirname, 'api-environment.json'),
    path.join(__dirname, '..', '..', 'postman-environment.json'),
  ];

  for (const configPath of candidateConfigPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const rawContent = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(rawContent);

        // Postman environment format { values: [{ key, value }] }
        if (Array.isArray(parsed.values)) {
          for (const item of parsed.values) {
            if (item.key === 'baseUrl' && item.value && !process.env.API_BASE_URL) {
              gatewayUrl = item.value;
            }
            if (item.key === 'webappUrl' && item.value && !process.env.WEBAPP_BASE_URL) {
              webappUrl = item.value;
            }
            if (item.key === 'access_token' && item.value && !process.env.ACCESS_TOKEN) {
              accessToken = item.value;
            }
            if (item.key === 'x_auth_token' && item.value && !process.env.X_AUTH_TOKEN) {
              xAuthToken = item.value;
            }
            if (item.key === 'x_session_ref' && item.value && !process.env.X_SESSION_REF) {
              xSessionRef = item.value;
            }
            if (item.key === 'username' && item.value && !username) {
              username = item.value;
            }
            if (item.key === 'password' && item.value && !password) {
              password = item.value;
            }
            if (item.key === 'articleId' && item.value && !process.env.ARTICLE_ID) {
              articleId = item.value;
            }
            if (item.key === 'isListingPost' && item.value !== undefined && process.env.IS_LISTING_POST === undefined) {
              isListingPost = String(item.value).toLowerCase() === 'true';
            }
          }
        } else {
          // Plain key-value JSON
          if (parsed.gatewayUrl && !process.env.API_BASE_URL) gatewayUrl = parsed.gatewayUrl;
          if (parsed.webappUrl && !process.env.WEBAPP_BASE_URL) webappUrl = parsed.webappUrl;
          if (parsed.accessToken && !process.env.ACCESS_TOKEN) accessToken = parsed.accessToken;
          if (parsed.xAuthToken && !process.env.X_AUTH_TOKEN) xAuthToken = parsed.xAuthToken;
          if (parsed.xSessionRef && !process.env.X_SESSION_REF) xSessionRef = parsed.xSessionRef;
          if (parsed.username && !username) username = parsed.username;
          if (parsed.password && !password) password = parsed.password;
          if (parsed.articleId && !process.env.ARTICLE_ID) articleId = parsed.articleId;
          if (parsed.isListingPost !== undefined && process.env.IS_LISTING_POST === undefined) {
            isListingPost = Boolean(parsed.isListingPost);
          }
        }
        break;
      } catch {
        // Skip unparseable JSON
      }
    }
  }

  const isPlaceholder = (val: string) => !val || val.includes('PASTE_') || val.includes('HERE');

  const isConfigured =
    !isPlaceholder(accessToken) &&
    !isPlaceholder(xAuthToken) &&
    !isPlaceholder(xSessionRef);

  return {
    webappUrl: webappUrl.replace(/\/+$/, ''),
    gatewayUrl: gatewayUrl.replace(/\/+$/, ''),
    accessToken,
    xAuthToken,
    xSessionRef,
    username,
    password,
    validWardCode,
    searchKeyword,
    noMatchKeyword,
    articleId,
    isListingPost,
    isConfigured,
  };
}

/**
 * Persists freshly extracted tokens into local api-environment.json
 */
export function saveApiTokens(tokens: {
  accessToken: string;
  xAuthToken?: string;
  xSessionRef?: string;
  gatewayUrl?: string;
  webappUrl?: string;
}): void {
  const current = loadApiConfig();
  const filePath = DEFAULT_CONFIG_FILE;

  const content = {
    baseUrl: tokens.gatewayUrl || current.gatewayUrl,
    webappUrl: tokens.webappUrl || current.webappUrl,
    accessToken: tokens.accessToken,
    xAuthToken: tokens.xAuthToken || current.xAuthToken,
    xSessionRef: tokens.xSessionRef || current.xSessionRef,
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
    console.log(`💾 Đã tự động lưu Token mới vào: ${filePath}`);
  } catch (err: any) {
    console.warn(`⚠️ Không thể ghi file cấu hình ${filePath}: ${err.message}`);
  }
}
