/* Verifies js/amcf-content.js exports the way the browser expects.
   The UMD wrapper must publish window.AMCFContent when there is no CommonJS
   `module`, and admin-content.js must resolve it. Run: node tests/umd.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
let fail = 0;
const ok = (c, m, e) => {
  console.log((c ? 'PASS  ' : 'FAIL  ') + m + (!c && e !== undefined ? '  -> ' + e : ''));
  if (!c) fail++;
};

const src = fs.readFileSync(path.join(root, 'js', 'amcf-content.js'), 'utf8');

// --- browser-like: `self` exists, `module` does not
const win = {};
const sandbox = { self: win, window: win };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'amcf-content.js' });

ok(typeof win.AMCFContent === 'object', 'window.AMCFContent is published without CommonJS module',
   typeof win.AMCFContent);
ok(typeof win.AMCFContent.parse === 'function', 'AMCFContent.parse exists');
ok(typeof win.AMCFContent.write === 'function', 'AMCFContent.write exists');
ok(typeof win.AMCFContent.setPortTags === 'function', 'AMCFContent.setPortTags exists');
ok(typeof win.AMCFContent.setJobField === 'function', 'AMCFContent.setJobField exists');

// --- the module must not leak a bare global named C or AMCFContentClass
ok(typeof sandbox.C === 'undefined', 'no stray global C leaked', typeof sandbox.C);

// --- it must still work in the browser context against the real file
if (win.AMCFContent) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const m = win.AMCFContent.parse(html);
  ok(m.projects.length === 8, 'parses 8 projects in the browser export', m.projects.length);
  ok(Object.keys(m.jobs).length === 11, 'parses 11 jobs in the browser export', Object.keys(m.jobs).length);
  ok(win.AMCFContent.write(html, m) === html, 'byte identical round trip via the browser export');
}

// --- admin-content.js must resolve C from window, not from a bare identifier
const adminSrc = fs.readFileSync(path.join(root, 'js', 'admin-content.js'), 'utf8');
ok(/var C = window\.AMCFContent;/.test(adminSrc), 'admin-content.js binds C from window.AMCFContent');
const bareC = adminSrc.match(/(^|[^.A-Za-z0-9_$])C\s*\./g) || [];
ok(bareC.length > 0, 'admin-content.js uses C.* calls (sanity)');

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
process.exit(fail ? 1 : 0);