/* Real-browser test that drives the actual admin-content.html over the Chrome
   DevTools Protocol, rather than a lookalike page. The earlier probe-based test
   passed while the real page could still fail, because it did not share the real
   markup or stylesheet.

   Needs Chrome or Edge, Node 22+ (for the global WebSocket) and the PHP dev
   server on http://localhost:8000.
   Run from the repo root:  node tests/browser.test.js                */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const indexFile = path.join(root, 'index.html');
const TARGET_URL = process.env.AMCF_ADMIN_URL || 'http://localhost:8000/admin-content.html';
const PORT = 9333 + (process.pid % 200);

let fail = 0;
const ok = (c, m, e) => {
  console.log((c ? 'PASS  ' : 'FAIL  ') + m + (!c && e !== undefined ? '  -> ' + e : ''));
  if (!c) fail++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findBrowser() {
  const cands = [process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  for (const c of cands) { if (fs.existsSync(c)) { return c; } }
  return null;
}

const browser = findBrowser();
ok(!!browser, 'a Chrome/Edge binary was found', browser);
if (!browser) { process.exit(1); }
ok(typeof WebSocket === 'function', 'Node has a global WebSocket (Node 22+)');
if (typeof WebSocket !== 'function') { process.exit(1); }

const probe = spawnSync(process.execPath, ['-e',
  "fetch(process.argv[1]).then(r=>{console.log(r.status);process.exit(0)}).catch(()=>process.exit(1))", TARGET_URL
], { encoding: 'utf8' });
ok(probe.status === 0 && /200/.test(probe.stdout || ''),
   TARGET_URL + ' is reachable', (probe.stdout || probe.stderr || '').trim());

const original = fs.readFileSync(indexFile, 'utf8');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-real-'));
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
  try { if (chrome) chrome.kill(); } catch (e) {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
}

const getJSON = (url) => new Promise((res, rej) => {
  http.get(url, (r) => {
    let d = '';
    r.on('data', (c) => (d += c));
    r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
  }).on('error', rej);
});

(async () => {
  try {
    chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
      '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, TARGET_URL], { stdio: 'ignore' });

    let target = null;
    for (let i = 0; i < 60; i++) {
      try {
        const list = await getJSON(`http://127.0.0.1:${PORT}/json/list`);
        const pages = list.filter((x) => x.type === 'page' && x.webSocketDebuggerUrl);
        if (pages.length) {
          target = pages.find((x) => /admin-content|localhost:8000/.test(x.url)) || pages[0];
          break;
        }
      } catch (e) {}
      await sleep(250);
    }
    ok(!!target, 'attached to the admin page target');
    if (!target) { return; }

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let id = 0;
    const pending = new Map();
    const errors = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
      if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails;
        errors.push(((d.exception && d.exception.description) || d.text) + ' @' + (d.url || '') + ':' + d.lineNumber);
      }
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        errors.push('console.error: ' + m.params.args.map((a) => a.value || a.description || '').join(' '));
      }
    };
    const send = (method, params) => new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    });
    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      const d = r.result || {};
      if (d.exceptionDetails) {
        return { err: (d.exceptionDetails.exception && d.exceptionDetails.exception.description) || d.exceptionDetails.text };
      }
      return { val: d.result ? d.result.value : undefined };
    };
    const step = async (msg, expr) => {
      const r = await evaluate(expr);
      ok(!r.err, msg, r.err);
      return r.val;
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await sleep(3500);

    // the message bar must not be inside the hidden app container
    const msgHidden = await evaluate("(function(){var m=document.getElementById('acMsg');return !!(m && m.closest('#acApp'));})()");
    ok(msgHidden.val === false, '#acMsg is outside the hidden #acApp', msgHidden.val);

    const stamp = await step('admin script reports it loaded',
      "document.getElementById('acBuild').textContent");
    ok(/geladen/.test(stamp || ''), 'build stamp says loaded', stamp);
    ok(await step('Speichern starts disabled', "document.getElementById('acSave').disabled") === true,
       'Speichern is disabled before loading');

    await step('submit the password', "(function(){document.getElementById('acPw').value='AMCF2026';document.getElementById('acLoginBtn').click();return 'ok';})()");
    await sleep(3000);

    const loginMsg = await step('no login error', "document.getElementById('acLoginMsg').textContent");
    ok(!loginMsg, 'login reported no error', loginMsg);
    ok(await step('editor is visible', "!document.getElementById('acApp').classList.contains('admin-hidden')") === true,
       'the editor became visible');
    ok(await step('three tabs', "document.querySelectorAll('.ac-tab').length") === 3, 'the three tabs are present');
    ok(Number(await step('projects rendered', "document.getElementById('acPanelProjects').innerHTML.length")) > 1000,
       'the projects panel rendered');
    ok(Number(await step('jobs rendered', "document.getElementById('acPanelJobs').innerHTML.length")) > 1000,
       'the jobs panel rendered');
    const loaded = await step('load message', "document.getElementById('acMsg').textContent");
    ok(/Geladen/.test(loaded || ''), 'content load reported success', loaded);
    ok(await step('Speichern enabled after load', "document.getElementById('acSave').disabled") === false,
       'Speichern is enabled once loaded');

    await step('edit the first project name', "(function(){document.getElementById('p0_name').value='REALPAGE TEST';return 'ok';})()");
    await step('edit a fact', "(function(){document.getElementById('f_name').value='REALPAGE FACT';return 'ok';})()");
    await step('click Speichern', "(function(){document.getElementById('acSave').click();return 'ok';})()");
    await sleep(3000);

    const saved = await step('save message', "document.getElementById('acMsg').textContent");
    ok(/Gespeichert/.test(saved || ''), 'saving reported success', saved);
    const cls = await step('save message styling', "document.getElementById('acMsg').className");
    ok(/ac-msg ok/.test(cls || ''), 'the save message is styled as success', cls);

    const disk = fs.readFileSync(indexFile, 'utf8');
    ok(disk.includes('REALPAGE TEST'), 'the project edit reached index.html on disk');
    ok(disk.includes('REALPAGE FACT'), 'the fact edit reached index.html on disk');

    ok(errors.length === 0, 'no uncaught errors or console errors', errors.join(' | '));

    ws.close();
  } catch (e) {
    ok(false, 'the run completed', e.message);
  } finally {
    cleanup();
  }

  ok(fs.readFileSync(indexFile, 'utf8') === original, 'index.html was restored after the test');
  ok(!fs.existsSync(indexFile + '.bak'), 'the .bak written by save-content.php was removed');

  console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
  process.exit(fail ? 1 : 0);
})();