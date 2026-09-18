// Offline audit probes. All browser, network, database writes and sends are mocked.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const ROOT = path.resolve(__dirname, '../..');
const quiet = { log() {}, warn() {}, error() {} };
const results = [];

function loadTS(relative, mocks, extra = {}) {
  const source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  const context = { exports, require(name) {
    if (!(name in mocks)) throw new Error('Unexpected module: ' + name);
    return mocks[name];
  }, console: quiet, process: { env: {} }, setTimeout: fn => { fn(); return 0; }, ...extra };
  vm.runInNewContext(code, context, { filename: relative });
  return exports;
}

async function runnerProbe(classification, failNotify) {
  const seen = new Map();
  let classifyCalls = 0, notifyCalls = 0;
  const post = { postId: 'synthetic', content: 'Synthetic test post', author: 'Test', authorId: '', groupUrl: 'https://www.facebook.com/groups/111/', postUrl: 'https://www.facebook.com/groups/111/posts/222/' };
  const db = {
    hasSeen: id => seen.has(id), hasSeenContent: () => false,
    markSeen: (p, c, sent) => seen.set(p.postId, { c, sent }),
    getStats: () => ({ leads_24h: 0, scanned_24h: 0 }),
    listGroups: () => [{ url: post.groupUrl }], seedGroupsFromEnvIfEmpty() {},
    getPostWithComment: () => undefined, backfillAuthor: () => false,
  };
  const runner = loadTS('fb-lead-radar/src/runner.ts', {
    './scraper.js': { FBScraper: class { async init() {} async close() {} async scrapeGroup() { return [post]; } } },
    './classifier.js': { classifyPost: async () => { classifyCalls++; return classification; } },
    './notifier.js': { notifyLead: async () => { notifyCalls++; if (failNotify) throw new Error('synthetic send failure'); } },
    './db.js': db, './comment-engine.js': { genCommentForScannedPost: async () => {} },
  });
  await runner.scanOnce();
  await runner.scanOnce();
  return { classifyCalls, notifyCalls, stored: seen.get(post.postId) };
}

async function main() {
  let probe = await runnerProbe({ isLead: true, confidence: 95, category: 'test' }, true);
  assert.equal(probe.notifyCalls, 1);
  assert.equal(probe.stored.sent, true);
  results.push({ probe: 'failed_telegram_marked_sent_no_retry', ...probe });

  probe = await runnerProbe({ isLead: false, confidence: 0, category: 'lỗi', reason: 'synthetic AI failure' }, false);
  assert.equal(probe.classifyCalls, 1);
  results.push({ probe: 'failed_classification_never_retried', ...probe });

  let shared = JSON.stringify({ llm_provider: 'claude', codex_model: 'initial', lead_target: 'ads' });
  const mockFS = { existsSync: () => true, readFileSync: () => shared, writeFileSync: (_p, data) => { shared = data; }, mkdirSync() {} };
  const daemon = loadTS('fb-lead-radar/src/runtime-config.ts', { 'node:fs': mockFS });
  const ui = loadTS('fb-lead-radar/src/runtime-config.ts', { 'node:fs': mockFS });
  daemon.getRuntimeConfig();
  ui.setRuntimeConfig({ lead_target: 'bds' });
  assert.equal(daemon.getLeadTarget(), 'ads');
  results.push({ probe: 'daemon_keeps_stale_ui_config', ui: ui.getLeadTarget(), daemon: daemon.getLeadTarget() });

  let handler, requestedPath;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'docker-demo/server.js'), 'utf8'), {
    require: name => ({ http: { createServer(fn) { handler = fn; return { listen() {} }; } }, fs: { readFile(p, cb) { requestedPath = p; cb(null, 'synthetic content'); } }, path }[name]),
    __dirname: path.join(ROOT, 'docker-demo'), console: quiet, process: { env: {} },
  });
  let code;
  handler({ method: 'GET', url: '/../server.js' }, { writeHead(status) { code = status; }, end() {} });
  assert.equal(requestedPath, path.join(ROOT, 'docker-demo/server.js'));
  assert.equal(code, 200);
  results.push({ probe: 'docker_directory_traversal', request: '/../server.js', resolved: requestedPath, status: code });

  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE seen_posts(classified_at TEXT, is_lead INTEGER)');
  const now = new Date();
  const old = new Date(now); old.setUTCDate(old.getUTCDate() - 1); old.setUTCHours(0, 0, 0, 0);
  db.prepare('INSERT INTO seen_posts VALUES (?, 1)').run(old.toISOString());
  const dbCode = fs.readFileSync(path.join(ROOT, 'fb-lead-radar/src/db.ts'), 'utf8');
  const query = dbCode.match(/const statsStmt = db\.prepare\(`([\s\S]*?)`\);/)[1];
  const stats = db.prepare(query).get();
  assert.equal(stats.scanned_24h, 1);
  results.push({ probe: 'stats_include_more_than_24_hours', age_hours: Number(((now - old) / 3600000).toFixed(2)), counted_in_24h: stats.scanned_24h });
  db.close();

  const helpers = loadTS('tests/helpers.ts', { '@playwright/test': {} });
  let callback;
  const check = helpers.setupStrictApiCheck({ on: (_event, cb) => { callback = cb; } });
  callback({ url: () => 'https://example.test/api/search', status: () => 500 });
  assert.doesNotThrow(() => check.verifyNoApiFailures());
  results.push({ probe: 'strict_api_check_does_not_fail_on_500', throws: false });

  const launcherProcess = { argv: ['node', 'run-tests.js', '--platform=1', '--suite=2', '--headed=true', '--workers=1'], stdin: {}, stdout: {}, exitCode: undefined, exit(code) { this.exitCode = code; } };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'run-tests.js'), 'utf8'), {
    require: name => ({
      child_process: { spawn: () => ({ on: (event, cb) => { if (event === 'exit') cb(1); } }) },
      readline: { createInterface: () => ({ close() {}, question() { throw new Error('Unexpected prompt'); } }) },
      fs: { existsSync: () => false }, path,
    }[name]), __dirname: ROOT, console: quiet, process: launcherProcess,
  });
  await Promise.resolve();
  assert.equal(launcherProcess.exitCode, undefined);
  results.push({ probe: 'test_launcher_drops_child_failure_exit_code', child_exit_code: 1, parent_exit_code: launcherProcess.exitCode ?? 0 });

  console.log(JSON.stringify({ confirmed: results.length, results }, null, 2));
}
main().catch(err => { console.error(err); process.exitCode = 1; });
