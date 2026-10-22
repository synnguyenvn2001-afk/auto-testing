import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const projectRoot = __dirname;
const envKey = process.env.TEST_ENV || ((process.env.BASE_URL || '').includes('dev') ? 'dev' : 'prod');
const authDir = path.join(projectRoot, 'playwright', '.auth');
const specificAuth = path.join(authDir, `user-${envKey}.json`);
const fallbackAuth = path.join(authDir, 'user.json');
const authStatePath = fs.existsSync(specificAuth)
  ? specificAuth
  : (envKey === 'prod' && fs.existsSync(fallbackAuth) ? fallbackAuth : specificAuth);
const artifactsDir = path.join(projectRoot, 'artifacts');

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: path.join(projectRoot, 'tests'),
  testIgnore: /.*mobile.*/,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests to avoid overloading dev server. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', {
    outputFolder: path.join(artifactsDir, 'playwright-report'),
    open: 'never',
  }]],
  outputDir: path.join(artifactsDir, 'test-results'),
  expect: {
    timeout: 8000,
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'https://landbase.vn',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Tự động chụp ảnh màn hình ở cuối mỗi testcase để kẹp vào HTML report */
    screenshot: 'on',
    navigationTimeout: 15000,
    actionTimeout: 8000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'api',
      testMatch: /tests[\\/]api[\\/].*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.WEBAPP_BASE_URL || process.env.BASE_URL || 'https://dev-webapp.laand.vn',
      },
    },
    {
      name: 'chromium',
      testIgnore: [/api/, /mobile/],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authStatePath,
      },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      testIgnore: [/api/, /mobile/],
      use: {
        ...devices['Desktop Firefox'],
        storageState: authStatePath,
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      testIgnore: [/api/, /mobile/],
      use: {
        ...devices['Desktop Safari'],
        storageState: authStatePath,
      },
      dependencies: ['setup'],
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
