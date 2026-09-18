import path from 'node:path';

export const TEST_PROJECT_ROOT = path.resolve(__dirname, '..');
export const AUTH_STATE_PATH = path.join(TEST_PROJECT_ROOT, 'playwright', '.auth', 'user.json');
export const FIXTURES_DIR = path.join(__dirname, 'fixtures');
export const DEBUG_SCREENSHOTS_DIR = path.join(TEST_PROJECT_ROOT, 'artifacts', 'debug-screenshots');
