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
  mapSavedId?: string;
  listingSavedId?: string;
  confirmRemoveSaved?: boolean;
  runMapRemove?: boolean;
  runListingRemove?: boolean;
  geomancyBirth?: string;
  geomancyGender?: number;
  geomancyDirection?: string;
  geomancyCategoryCode?: string;
  feedbackName?: string;
  feedbackEmail?: string;
  feedbackErrorType?: string;
  feedbackCookie?: string;
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
  let mapSavedId = process.env.MAP_SAVED_ID || process.env.mapSavedId || '190a1c1e-f49a-4726-b793-454863565ecd';
  let listingSavedId = process.env.LISTING_SAVED_ID || process.env.listingSavedId || '238622';
  let confirmRemoveSaved = process.env.CONFIRM_REMOVE_SAVED === 'true';
  let runMapRemove = process.env.RUN_MAP_REMOVE === 'true';
  let runListingRemove = process.env.RUN_LISTING_REMOVE === 'true';
  let geomancyBirth = process.env.GEOMANCY_BIRTH || '2026-10-13T17:00:00.000Z';
  let geomancyGender = process.env.GEOMANCY_GENDER !== undefined ? Number(process.env.GEOMANCY_GENDER) : 0;
  let geomancyDirection = process.env.GEOMANCY_DIRECTION || 'Bắc';
  let geomancyCategoryCode = process.env.GEOMANCY_CATEGORY_CODE || 'BDS00035';
  let feedbackName = process.env.FEEDBACK_NAME || 'user';
  let feedbackEmail = process.env.FEEDBACK_EMAIL || 'tamoco6090@nab4.com';
  let feedbackErrorType = process.env.FEEDBACK_ERROR_TYPE || 'Dữ liệu';
  let feedbackCookie = process.env.FEEDBACK_COOKIE || '';

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
            if (item.key === 'mapSavedId' && item.value && !process.env.MAP_SAVED_ID) {
              mapSavedId = item.value;
            }
            if (item.key === 'listingSavedId' && item.value && !process.env.LISTING_SAVED_ID) {
              listingSavedId = item.value;
            }
            if (item.key === 'confirmRemoveSaved' && item.value !== undefined && process.env.CONFIRM_REMOVE_SAVED === undefined) {
              confirmRemoveSaved = String(item.value).toLowerCase() === 'true';
            }
            if (item.key === 'runMapRemove' && item.value !== undefined && process.env.RUN_MAP_REMOVE === undefined) {
              runMapRemove = String(item.value).toLowerCase() === 'true';
            }
            if (item.key === 'runListingRemove' && item.value !== undefined && process.env.RUN_LISTING_REMOVE === undefined) {
              runListingRemove = String(item.value).toLowerCase() === 'true';
            }
            if (item.key === 'geomancyBirth' && item.value && !process.env.GEOMANCY_BIRTH) {
              geomancyBirth = item.value;
            }
            if (item.key === 'geomancyGender' && item.value !== undefined && process.env.GEOMANCY_GENDER === undefined) {
              geomancyGender = Number(item.value);
            }
            if (item.key === 'geomancyDirection' && item.value && !process.env.GEOMANCY_DIRECTION) {
              geomancyDirection = item.value;
            }
            if (item.key === 'geomancyCategoryCode' && item.value && !process.env.GEOMANCY_CATEGORY_CODE) {
              geomancyCategoryCode = item.value;
            }
            if (item.key === 'feedbackName' && item.value) {
              feedbackName = item.value;
            }
            if (item.key === 'feedbackEmail' && item.value) {
              feedbackEmail = item.value;
            }
            if (item.key === 'feedbackErrorType' && item.value) {
              feedbackErrorType = item.value;
            }
            if (item.key === 'feedbackCookie' && item.value && !item.value.includes('PASTE_')) {
              feedbackCookie = item.value;
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
          if (parsed.mapSavedId && !process.env.MAP_SAVED_ID) mapSavedId = parsed.mapSavedId;
          if (parsed.listingSavedId && !process.env.LISTING_SAVED_ID) listingSavedId = parsed.listingSavedId;
          if (parsed.confirmRemoveSaved !== undefined && process.env.CONFIRM_REMOVE_SAVED === undefined) {
            confirmRemoveSaved = Boolean(parsed.confirmRemoveSaved);
          }
          if (parsed.runMapRemove !== undefined && process.env.RUN_MAP_REMOVE === undefined) {
            runMapRemove = Boolean(parsed.runMapRemove);
          }
          if (parsed.runListingRemove !== undefined && process.env.RUN_LISTING_REMOVE === undefined) {
            runListingRemove = Boolean(parsed.runListingRemove);
          }
          if (parsed.geomancyBirth && !process.env.GEOMANCY_BIRTH) {
            geomancyBirth = parsed.geomancyBirth;
          }
          if (parsed.geomancyGender !== undefined && process.env.GEOMANCY_GENDER === undefined) {
            geomancyGender = Number(parsed.geomancyGender);
          }
          if (parsed.geomancyDirection && !process.env.GEOMANCY_DIRECTION) {
            geomancyDirection = parsed.geomancyDirection;
          }
          if (parsed.geomancyCategoryCode && !process.env.GEOMANCY_CATEGORY_CODE) {
            geomancyCategoryCode = parsed.geomancyCategoryCode;
          }
          if (parsed.feedbackName) feedbackName = parsed.feedbackName;
          if (parsed.feedbackEmail) feedbackEmail = parsed.feedbackEmail;
          if (parsed.feedbackErrorType) feedbackErrorType = parsed.feedbackErrorType;
          if (parsed.feedbackCookie && !parsed.feedbackCookie.includes('PASTE_')) feedbackCookie = parsed.feedbackCookie;
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
    mapSavedId,
    listingSavedId,
    confirmRemoveSaved,
    runMapRemove,
    runListingRemove,
    geomancyBirth,
    geomancyGender,
    geomancyDirection,
    geomancyCategoryCode,
    feedbackName,
    feedbackEmail,
    feedbackErrorType,
    feedbackCookie,
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
