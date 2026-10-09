/* Real-browser smoke test for the admin content editor.
   Node cannot catch the failures that actually bite here: DOM wiring, module
   export shape in a browser, and the save round trip through PHP.

   Needs Chrome or Edge plus the PHP dev server on http://localhost:8000.
   Run from the repo root:  node tests/browser.test.js                */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const indexFile = path.join(root, 'index.html');
const probeName = '_probe_browser_test.html';
const probeDest = path.join(root, probeName);
const PROBE_VALUE = 'PROBE NAME';

let fail = 0;
const ok = (c, m, e) => {
  console.log((c ? 'PASS  ' : 'FAIL  ') + m + (!c && e !== undefined ? '  -> ' + e : ''));
  if (!c) fail++;
};

function findBrowser() {
  const cands = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
  ].filter(Boolean);
  for (const c of cands) { if (fs.existsSync(c)) { return c; } }
  return null;
}

const browser = findBrowser();
ok(!!browser, 'a Chrome/Edge binary was found', browser);
if (!browser) { process.exit(1); }

// the server must be running
const reachable = spawnSync(process.execPath, ['-e',
  "fetch('http://localhost:8000/admin-content.html').then(r=>{console.log(r.status);process.exit(0)}).catch(()=>process.exit(1))"
], { encoding: 'utf8' });
ok(reachable.status === 0 && /200/.test(reachable.stdout || ''),
   'the PHP dev server answers on :8000', (reachable.stdout || reachable.stderr || '').trim());

const originalIndex = fs.readFileSync(indexFile, 'utf8');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-profile-'));

function cleanup() {
  try { fs.writeFileSync(indexFile, originalIndex, 'utf8'); } catch (e) {}
  for (const p of [probeDest, indexFile + '.bak']) {
    try { if (fs.existsSync(p)) { fs.unlinkSync(p); } } catch (e) {}
  }
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
}

try {
  fs.copyFileSync(path.join(__dirname, 'browser.probe.html'), probeDest);

  const res = spawnSync(browser, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--user-data-dir=' + profile,
    '--virtual-time-budget=20000',
    '--dump-dom',
    'http://localhost:8000/' + probeName
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 90000 });

  const dom = res.stdout || '';
  const m = /RESULT::([\s\S]*?)<\/div>/.exec(dom);
  ok(!!m, 'the probe produced a result', 'exit=' + res.status + ' stderr=' + (res.stderr || '').slice(0, 200));
  if (!m) { cleanup(); process.exit(1); }

  const got = {};
  m[1].split(';;').forEach((pair) => {
    const i = pair.indexOf('=');
    if (i > 0) { got[pair.slice(0, i).trim()] = pair.slice(i + 1).trim(); }
  });

  ok(got.AMCFContent === 'object', 'AMCFContent is exported for the browser', got.AMCFContent);
  ok(got.loginClicked === 'true', 'the login button was clicked');
  ok(got.appVisible === 'true', 'login succeeded and the app is visible', got.appVisible);
  ok(Number(got.projectsHtml) > 1000, 'the projects panel rendered', got.projectsHtml);
  ok(Number(got.jobsHtml) > 1000, 'the jobs panel rendered', got.jobsHtml);
  ok(Number(got.factsHtml) > 100, 'the facts panel rendered', got.factsHtml);
  ok(/Geladen/.test(got.loadMsg || ''), 'the content loaded', got.loadMsg);
  ok(got.p0_nameFound === 'true', 'the project name field exists', got.p0_nameFound);
  ok(got.f_nameFound === 'true', 'the fact field exists', got.f_nameFound);
  ok(/Gespeichert/.test(got.saveMsg || ''), 'saving reported success', got.saveMsg);
  ok(/ac-msg ok/.test(got.saveMsgClass || ''), 'the save message is styled as success', got.saveMsgClass);
  ok(got.errors === 'none', 'no uncaught errors or rejections', got.errors);

  const after = fs.readFileSync(indexFile, 'utf8');
  ok(after.includes(PROBE_VALUE), 'the edit reached index.html on disk');
  ok(after.includes('PROBE FACT'), 'the fact edit reached index.html on disk');
} finally {
  cleanup();
}

const restored = fs.readFileSync(indexFile, 'utf8') === originalIndex;
ok(restored, 'index.html was restored after the test');
ok(!fs.existsSync(probeDest), 'the probe page was removed');
ok(!fs.existsSync(indexFile + '.bak'), 'the .bak written by save-content.php was removed');

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
process.exit(fail ? 1 : 0);