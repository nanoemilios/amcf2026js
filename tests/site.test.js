/* Smoke test for the public site after a cleanup: loads index.html in a real
   browser and asserts the portfolio and resume still render, that no console
   error occurs, and that no subresource 404s.
   Run from the repo root:  node tests/site.test.js                  */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const SITE = process.env.AMCF_SITE_URL || 'http://localhost:8000/index.html';
const PORT = 9601 + (process.pid % 200);

let fail = 0;
const ok = (c, m, e) => {
  console.log((c ? 'PASS  ' : 'FAIL  ') + m + (!c && e !== undefined ? '  -> ' + e : ''));
  if (!c) fail++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME = [process.env.CHROME_PATH,
  process.env.HOME && process.env.HOME + '/.local/opt/chrome-headless-shell/chrome-headless-shell',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe']
  .filter(Boolean).find((p) => fs.existsSync(p));
ok(!!CHROME, 'a Chrome/Edge binary was found');
if (!CHROME) { process.exit(1); }
ok(typeof WebSocket === 'function', 'Node has a global WebSocket');
if (typeof WebSocket !== 'function') { process.exit(1); }

ok(spawnSync(process.execPath, ['-e',
  "fetch(process.argv[1]).then(r=>{console.log(r.status);process.exit(0)}).catch(()=>process.exit(1))", SITE
], { encoding: 'utf8' }).status === 0, SITE + ' is reachable');

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-site-'));
let chrome = null;

function killTree(child) {
  if (!child || !child.pid) { return; }
  try {
    if (process.platform === 'win32') { spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); }
    else { process.kill(-child.pid, 'SIGKILL'); }
  } catch (e) {}
}
function cleanup() { killTree(chrome); try { if (chrome) chrome.kill(); } catch (e) {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} }

const getJSON = (u) => new Promise((res, rej) => {
  http.get(u, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej);
});

(async () => {
  try {
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
    ok(!!target, 'attached to the site');
    if (!target) { return; }

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = r; });
    let id = 0; const pending = new Map();
    const errors = [], failed = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
      if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails;
        errors.push(((d.exception && d.exception.description) || d.text));
      }
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        errors.push('console.error: ' + m.params.args.map((a) => a.value || a.description || '').join(' '));
      }
      if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
        failed.push(m.params.response.status + ' ' + m.params.response.url);
      }
      if (m.method === 'Network.loadingFailed' && !/favicon/.test(m.params.errorText || '')) {
        failed.push('failed: ' + (m.params.errorText || ''));
      }
    };
    const send = (m, p) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
    const ev = async (expr) => {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result && r.result.exceptionDetails) return { err: r.result.exceptionDetails.text };
      return { val: r.result && r.result.result ? r.result.result.value : undefined };
    };
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Page.enable');
    await sleep(4500);

    ok((await ev("document.querySelectorAll('#folio_container li.box').length")).val === 8,
       'the portfolio renders 8 tiles', (await ev("document.querySelectorAll('#folio_container li.box').length")).val);
    ok((await ev("document.querySelectorAll('.resume-holder[data-rvnum]').length")).val === 11,
       'the resume renders 11 entries');
    const name = (await ev("(function(){var h=document.querySelector('#folio_container .folio-open[data-project=\"0\"] .folio-title');return h?h.textContent.trim():'';})()")).val;
    ok(!!name && name !== 'undefined', 'the first project name renders', JSON.stringify(name));
    const jobTitle = (await ev("(function(){var h=document.querySelector('[data-i18n=\"resume.job11.title\"]');return h?h.textContent.trim():'';})()")).val;
    ok(!!jobTitle && jobTitle.indexOf('resume.job11') === -1,
       'a resume entry title renders from the markup', JSON.stringify(jobTitle));
    const fact = (await ev("(function(){var h=document.querySelector('[data-fv=\"email\"]');return h?h.textContent.trim():'';})()")).val;
    ok(!!fact && fact.indexOf('@') !== -1, 'a fact value renders', JSON.stringify(fact));
    ok((await ev("typeof window.AMCFContent")).val === 'undefined',
       'the editor module is not shipped to the public page');
    ok(errors.length === 0, 'no console errors', errors.slice(0, 3).join(' | '));
    const realFailed = failed.filter((u) => !/favicon/.test(u));
    ok(realFailed.length === 0, 'no failed subresources', realFailed.slice(0, 5).join(' | '));

    ws.close();
  } catch (e) {
    ok(false, 'the run completed', e.message);
  } finally {
    cleanup();
  }
  console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
  process.exit(fail ? 1 : 0);
})();