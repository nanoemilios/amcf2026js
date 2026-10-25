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
  process.env.HOME && process.env.HOME + '/.local/opt/chrome-headless-shell/chrome-headless-shell',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
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

    // The admin password is not stored in the repo. Pass it in:
    //   AMCF_ADMIN_PASSWORD=... node tests/browser.test.js
    const pw = process.env.AMCF_ADMIN_PASSWORD;
    ok(!!pw, 'AMCF_ADMIN_PASSWORD is set (not hardcoded in the repo)');
    await step('submit the password', "(function(){document.getElementById('acPw').value=" + JSON.stringify(pw || '') + ";document.getElementById('acLoginBtn').click();return 'ok';})()");
    await sleep(3000);

    const loginMsg = await step('no login error', "document.getElementById('acLoginMsg').textContent");
    ok(!loginMsg, 'login reported no error', loginMsg);
    ok(await step('editor is visible', "!document.getElementById('acApp').classList.contains('admin-hidden')") === true,
       'the editor became visible');
    ok(await step('six tabs', "document.querySelectorAll('.ac-tab').length") === 6, 'the six tabs are present');
    ok(Number(await step('projects rendered', "document.getElementById('acPanelProjects').innerHTML.length")) > 1000,
       'the projects panel rendered');
    ok(Number(await step('jobs rendered', "document.getElementById('acPanelJobs').innerHTML.length")) > 1000,
       'the jobs panel rendered');
    ok(Number(await step('backgrounds rendered', "document.getElementById('acPanelBackgrounds').innerHTML.length")) > 100,
       'the backgrounds panel rendered');
    ok(await step('slide header fields rendered',
       "!!document.querySelector('#acPanelBackgrounds #slide1_kicker') && !!document.querySelector('#acPanelBackgrounds #slide3_title')") === true,
       'the start-slide header text fields rendered');
    ok(await step('each slide header has its matching image preview',
       "Array.from({length:3},function(_,i){var n=i+1;var p=document.getElementById('acSlidePreview'+n);var f=document.getElementById('acBgSlide'+n);return !!p && p.getAttribute('src')===f.value;}).every(Boolean)") === true,
       'each slide header is paired with its current background image');
    ok(await step('slide preview updates with background path',
       "(function(){var f=document.getElementById('acBgSlide2');f.value='images/bg/preview-test.jpg';f.dispatchEvent(new Event('input',{bubbles:true}));return document.getElementById('acSlidePreview2').getAttribute('src');})()") === 'images/bg/preview-test.jpg',
       'editing a slide image path updates its adjacent preview');
    ok(Number(await step('about rendered', "document.getElementById('acPanelAbout').innerHTML.length")) > 100,
       'the about panel rendered');
    ok(Number(await step('services rendered', "document.getElementById('acPanelServices').innerHTML.length")) > 100,
       'the services panel rendered');
    ok(Number(await step('background upload fields',
       "document.querySelectorAll('#acPanelBackgrounds input[data-upbackground]').length")) === 4,
       'all four background image fields are available');
    const loaded = await step('load message', "document.getElementById('acMsg').textContent");
    ok(/Geladen/.test(loaded || ''), 'content load reported success', loaded);
    ok(await step('Speichern enabled after load', "document.getElementById('acSave').disabled") === false,
       'Speichern is enabled once loaded');

    // Saving writes straight to the project folder through the File System
    // Access API, which needs a real user gesture, so it cannot be driven
    // headlessly. Assert instead that no PHP write endpoint is referenced
    // anywhere in what the server serves, and that the fields are editable.
    const served = await (await fetch(TARGET_URL)).text();
    const servedJs = await (await fetch(new URL('js/admin-content.js', TARGET_URL))).text();
    ok(!/save-content\.php|upload\.php/.test(served + servedJs),
       'no PHP write endpoint is referenced by the served admin');

    const canWrite = await step('File System Access API presence',
      "typeof window.showDirectoryPicker");
    console.log('       (showDirectoryPicker is "' + canWrite.val + '" in this browser)');

    const waitFor = async (expr, tries) => {
      for (let i = 0; i < (tries || 20); i++) {
        const r = await evaluate(expr);
        if (r.val) { return r.val; }
        await sleep(250);
      }
      return null;
    };
    const nameOk = await waitFor("(function(){var el=document.getElementById('p0_name');if(!el)return null;el.value='REALPAGE TEST';return el.value;})()");
    ok(nameOk === 'REALPAGE TEST', 'the project name field is editable', nameOk);
    const factOk = await waitFor("(function(){var el=document.getElementById('f_name');if(!el)return null;el.value='REALPAGE FACT';return el.value;})()");
    ok(factOk === 'REALPAGE FACT', 'the fact field is editable', factOk);

    ok(errors.length === 0, 'no uncaught errors or console errors', errors.join(' | '));

    ws.close();
  } catch (e) {
    ok(false, 'the run completed', e.message);
  } finally {
    cleanup();
  }

  ok(fs.readFileSync(indexFile, 'utf8') === original, 'index.html was untouched by the test');

  console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
  process.exit(fail ? 1 : 0);
})();