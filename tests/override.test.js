/* Proves that an edit saved into index.html survives a page reload, and that
   stale legacy localStorage can no longer undo it.
   Run from the repo root:  node tests/override.test.js                 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const indexFile = path.join(root, 'index.html');
const SITE = 'http://localhost:8000/index.html';
const ADMIN = 'http://localhost:8000/admin-content.html';
const PORT = 9501 + (process.pid % 200);

let fail = 0;
const ok = (c, m, e) => {
  console.log((c ? 'PASS  ' : 'FAIL  ') + m + (!c && e !== undefined ? '  -> ' + e : ''));
  if (!c) fail++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME = [
  process.env.CHROME_PATH,
  process.env.HOME && process.env.HOME + '/.local/opt/chrome-headless-shell/chrome-headless-shell',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean).find((p) => fs.existsSync(p));
ok(!!CHROME, 'a Chrome/Edge binary was found');
if (!CHROME) { process.exit(1); }
ok(typeof WebSocket === 'function', 'Node has a global WebSocket');
if (typeof WebSocket !== 'function') { process.exit(1); }

const original = fs.readFileSync(indexFile, 'utf8');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-override-'));
let chrome = null;

function killTree(child) {
  if (!child || !child.pid) { return; }
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(-child.pid, 'SIGKILL');
    }
  } catch (e) { /* already gone */ }
}

function cleanup() {
  try { fs.writeFileSync(indexFile, original, 'utf8'); } catch (e) {}
  for (const p of [indexFile + '.bak']) { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {} }
  killTree(chrome);
  try { chrome.kill(); } catch (e) {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
}

const getJSON = (u) => new Promise((res, rej) => {
  http.get(u, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej);
});

async function session() {
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, SITE], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60; i++) {
    try {
      const l = await getJSON(`http://127.0.0.1:${PORT}/json/list`);
      const pages = l.filter((x) => x.type === 'page' && x.webSocketDebuggerUrl);
      if (pages.length) { target = pages.find((x) => /localhost:8000/.test(x.url)) || pages[0]; break; }
    } catch (e) {}
    await sleep(250);
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result && r.result.exceptionDetails) return { err: r.result.exceptionDetails.text };
    return { val: r.result && r.result.result ? r.result.result.value : undefined };
  };
  await send('Runtime.enable');
  await send('Page.enable');
  return { evaluate, send, close: () => ws.close() };
}

(async () => {
  try {
    // ---- 1. plant stale legacy data, exactly as the old admin would have ----
    let s = await session();
    await sleep(3500);
    await s.evaluate(`localStorage.setItem('amcf_local_edits', JSON.stringify({
      0: { name: 'STALE OLD NAME', tags: 'stale / tags' }
    }));localStorage.setItem('amcf_local_resume', JSON.stringify({
      jobs: { 11: { title: 'STALE OLD TITLE' } },
      facts: { name: 'STALE OLD FACT' }
    }));'planted'`);
    await s.close();
    ok(true, 'planted stale legacy localStorage overrides');

    // ---- 2. write the edits the way the editor does ----
    const writeRes = spawnSync(process.execPath, ['-e', `
      const C = require(${JSON.stringify(path.join(root, 'js', 'amcf-content.js'))});
      const fs = require('fs');
      const f = ${JSON.stringify(indexFile)};
      const src = fs.readFileSync(f, 'utf8');
      const m = C.parse(src);
      m.projects[0].name = 'PERSISTED NAME';
      m.jobs[11].title = 'PERSISTED TITLE';
      m.facts.name = 'PERSISTED FACT';
      // the reported case: a bullet on an entry that has none in the markup
      m.jobs[1].l1 = 'Lagerverwaltung';
      fs.writeFileSync(f, C.write(src, m), 'utf8');
      console.log('written');
    `], { encoding: 'utf8' });
    ok(/written/.test(writeRes.stdout || ''), 'the files were written', (writeRes.stdout || writeRes.stderr || '').trim());

    // ---- 3. reload the public page and read what it renders ----
    chrome.kill();
    await sleep(800);
    s = await session();
    await sleep(4000);
    const name = await s.evaluate("(function(){var h=document.querySelector('#folio_container .folio-open[data-project=\"0\"] .folio-title');return h?h.textContent.trim():'(none)';})()");
    const title = await s.evaluate("(function(){var h=document.querySelector('[data-i18n=\"resume.job11.title\"]');return h?h.textContent.trim():'(none)';})()");
    const fact = await s.evaluate("(function(){var h=document.querySelector('[data-fv=\"name\"]');return h?h.textContent.trim():'(none)';})()");
    const tiles = await s.evaluate("document.querySelectorAll('#folio_container li.box').length");

    ok(name.val === 'PERSISTED NAME', 'project name survives the reload', name.val);
    ok(title.val === 'PERSISTED TITLE', 'entry title survives the reload', title.val);
    ok(fact.val === 'PERSISTED FACT', 'fact value survives the reload', fact.val);
    ok(tiles.val === 8, 'still 8 tiles, no duplicates from the legacy loader', tiles.val);

    // the bullet added to job1 must actually render after the reload
    const bullet = await s.evaluate("(function(){var li=document.querySelector('[data-i18n=\"resume.job1.l1\"]');return li?li.textContent.trim():'(none)';})()");
    ok(bullet.val === 'Lagerverwaltung', 'a bullet added to job1 survives the reload', bullet.val);
    await s.close();
  } catch (e) {
    ok(false, 'the run completed', e.message);
  } finally {
    cleanup();
  }

  ok(fs.readFileSync(indexFile, 'utf8') === original, 'index.html was restored after the test');
  console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
  process.exit(fail ? 1 : 0);
})();