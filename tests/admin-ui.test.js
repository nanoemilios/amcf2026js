/* Executes admin-content.js against a minimal DOM stub and drives the real
   render/collect/build paths. This is what catches ReferenceErrors and typos in
   code that only runs in a browser, which node --check cannot see.
   Run from the repo root:  node tests/admin-ui.test.js                */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
let fail = 0;
const ok = (c, m, e) => {
  console.log((c ? 'PASS  ' : 'FAIL  ') + m + (!c && e !== undefined ? '  -> ' + e : ''));
  if (!c) fail++;
};

/* ---------------- minimal DOM ---------------- */
function makeClassList(el) {
  const set = new Set();
  return {
    add: (...c) => c.forEach((x) => set.add(x)),
    remove: (...c) => c.forEach((x) => set.delete(x)),
    contains: (c) => set.has(c),
    toggle: (c, force) => {
      const on = force === undefined ? !set.has(c) : !!force;
      if (on) set.add(c); else set.delete(c);
      return on;
    },
    _set: set
  };
}
function makeEl(id) {
  const el = {
    id: id || '',
    tagName: 'DIV',
    innerHTML: '',
    textContent: '',
    value: '',
    className: '',
    style: {},
    dataset: {},
    attributes: {},
    children: [],
    files: [],
    classList: null,
    addEventListener() {},
    removeEventListener() {},
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; },
    removeAttribute(k) { delete this.attributes[k]; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k); },
    closest() { return null; },
    matches() { return false; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    focus() {},
    click() {}
  };
  el.classList = makeClassList(el);
  return el;
}

const elements = new Map();
function byId(id) {
  if (!elements.has(id)) { elements.set(id, makeEl(id)); }
  return elements.get(id);
}

const doc = {
  getElementById: byId,
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: (t) => makeEl(''),
  addEventListener() {},
  documentElement: makeEl('html'),
  body: makeEl('body')
};

const listeners = [];
const sandbox = {
  document: doc,
  console: console,
  TextEncoder: TextEncoder,
  Promise: Promise,
  JSON: JSON,
  Math: Math,
  Object: Object,
  Array: Array,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Error: Error,
  Date: Date,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  encodeURIComponent: encodeURIComponent,
  setTimeout: setTimeout,
  FormData: function () { this.append = function () {}; },
  Blob: function () {},
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  localStorage: {
    _d: { amcf_lang: 'de' },
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; }
  },
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, written: {} }) }),
  confirm: () => true,
  window: null
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

// load a real dictionary so the label lookups work
const dictSrc = fs.readFileSync(path.join(root, 'js', 'i18n.de.js'), 'utf8');
// load the real modules so admin-content.js sees window.AMCFContent and a dictionary
vm.createContext(sandbox);
vm.runInContext(dictSrc, sandbox, { filename: 'i18n.de.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'amcf-content.js'), 'utf8'), sandbox,
  { filename: 'amcf-content.js' });
ok(typeof sandbox.AMCFContent === 'object' && typeof sandbox.AMCFContent.parse === 'function',
   'AMCFContent is available to the admin (browser export path)');

// expose the IIFE internals for testing without changing production code
const adminSrc = fs.readFileSync(path.join(root, 'js', 'admin-content.js'), 'utf8');
const hooked = adminSrc.replace(/\}\)\(\);\s*$/,
  'window.__t = { state, readModel, renderAll, renderJobs, renderProjects, renderFacts, collect, buildFiles, imagesBlock }; })();');
ok(hooked !== adminSrc, 'test hook injected into admin-content.js');
if (hooked === adminSrc) { process.exit(1); }

vm.runInContext(hooked, sandbox, { filename: 'admin-content.js' });
const T = sandbox.window.__t;
ok(!!T, 'admin internals exposed');
if (!T) { process.exit(1); }

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

/* ---------------- drive the real code paths ---------------- */
function attempt(name, fn) {
  try { fn(); ok(true, name); }
  catch (e) { ok(false, name, e.message); }
}

T.state.target = 'source';
T.state.indexHtml = indexHtml;

attempt('readModel for the source target', () => {
  T.readModel();
  if (!T.state.model) { throw new Error('model is null'); }
  if (T.state.model.projects.length !== 8) { throw new Error('projects=' + T.state.model.projects.length); }
  if (Object.keys(T.state.model.jobs).length !== 11) { throw new Error('jobs=' + Object.keys(T.state.model.jobs).length); }
  if (!T.state.model.images || !T.state.model.images[11]) { throw new Error('entry images not loaded'); }
});

attempt('renderJobs (uses isSrc)', () => {
  T.renderJobs();
  const html = byId('acPanelJobs').innerHTML;
  if (!html) { throw new Error('jobs panel is empty'); }
  if (html.indexOf('id="acAddJob"') === -1) { throw new Error('add-entry button missing'); }
});
attempt('renderProjects', () => {
  T.renderProjects();
  const html = byId('acPanelProjects').innerHTML;
  if (!html) { throw new Error('projects panel is empty'); }
  if (html.indexOf('data-del-project="0"') === -1) { throw new Error('delete button missing'); }
});
attempt('renderFacts', () => {
  T.renderFacts();
  if (!byId('acPanelFacts').innerHTML) { throw new Error('facts panel is empty'); }
});
attempt('renderAll fills every panel', () => {
  ['acPanelProjects', 'acPanelJobs', 'acPanelFacts'].forEach((id) => {
    if (!byId(id).innerHTML) { throw new Error(id + ' is empty'); }
  });
});
attempt('collect', () => { T.collect(); });
attempt('buildFiles for the source target', () => {
  const files = T.buildFiles(T.collect());
  if (!files['index.html']) { throw new Error('index.html not produced'); }
});

// the translation target runs a different branch
attempt('readModel for a translation target', () => {
  T.state.target = 'en';
  T.state.dicts.en = fs.readFileSync(path.join(root, 'js', 'i18n.en.js'), 'utf8');
  T.readModel();
  if (!T.state.model) { throw new Error('model is null for en'); }
  if (T.state.model.projects.length !== 8) { throw new Error('en projects=' + T.state.model.projects.length); }
  if (Object.keys(T.state.model.jobs).length !== 11) { throw new Error('en jobs=' + Object.keys(T.state.model.jobs).length); }
});
attempt('renderJobs for a translation target', () => { T.renderJobs(); });
attempt('buildFiles for a translation target', () => {
  const files = T.buildFiles(T.collect());
  const key = 'js/i18n.en.js';
  if (!files[key]) { throw new Error(key + ' not produced'); }
});

// imagesBlock must emit one row per image plus the controls
attempt('imagesBlock renders rows and controls', () => {
  const html = T.imagesBlock(11, ['a.jpg', 'b.jpg']);
  ['data-imgjob="11"', 'value="a.jpg"', 'value="b.jpg"', 'data-addimg="11"', 'data-rmimg="11|0"', 'id="acUp11"']
    .forEach((needle) => {
      if (html.indexOf(needle) === -1) { throw new Error('missing ' + needle); }
    });
});
attempt('imagesBlock handles an entry with no images', () => {
  const html = T.imagesBlock(7, []);
  if (html.indexOf('data-imgjob="7"') === -1) { throw new Error('no empty row offered'); }
});

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
process.exit(fail ? 1 : 0);