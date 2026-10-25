/* Executes admin-content.js against a minimal DOM stub and drives the real
   render/collect/build paths. This is what catches ReferenceErrors and typos in
   code that only runs in a browser, which node --check cannot see.
   Run from the repo root:  node tests/admin-ui.test.js                */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
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
  'window.__t = { state, readModel, renderAll, renderJobs, renderProjects, renderFacts, renderBackgrounds, renderAbout, renderServices, changeServiceCount, collect, buildFiles, imagesBlock, save, download, showError, C }; })();');
ok(hooked !== adminSrc, 'test hook injected into admin-content.js');
if (hooked === adminSrc) { process.exit(1); }

vm.runInContext(hooked, sandbox, { filename: 'admin-content.js' });
const T = sandbox.window.__t;
ok(!!T, 'admin internals exposed');
if (!T) { process.exit(1); }

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'admin-content.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
ok(adminHtml.includes('<meta name="version" content="' + version + '">') &&
   adminHtml.includes('Version ' + version),
   'the admin displays the current project version');

/* ---------------- drive the real code paths ---------------- */
function attempt(name, fn) {
  try { fn(); ok(true, name); }
  catch (e) { ok(false, name, e.message); }
}

T.state.target = 'source';
T.state.indexHtml = indexHtml;
T.state.styleCss = styleCss;
T.state.dicts.de = fs.readFileSync(path.join(root, 'js', 'i18n.de.js'), 'utf8');

attempt('readModel for the source target', () => {
  T.readModel();
  if (!T.state.model) { throw new Error('model is null'); }
  if (T.state.model.projects.length !== 8) { throw new Error('projects=' + T.state.model.projects.length); }
  if (Object.keys(T.state.model.jobs).length !== 11) { throw new Error('jobs=' + Object.keys(T.state.model.jobs).length); }
  if (!T.state.model.images || !T.state.model.images[11]) { throw new Error('entry images not loaded'); }
  if (!T.state.model.backgrounds || T.state.model.backgrounds.slides.length !== 3) {
    throw new Error('background images not loaded');
  }
  if (!T.state.model.services || !T.state.model.services.s1text) {
    throw new Error('service fields not loaded');
  }
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
attempt('renderBackgrounds', () => {
  T.renderBackgrounds();
  const html = byId('acPanelBackgrounds').innerHTML;
  ['images/bg/1.jpg', 'images/bg/2.jpg', 'images/bg/3.jpg', 'data-upbackground="Sections"',
    'slide1_kicker', 'slide1_h1', 'slide2_sub', 'slide3_title',
    'id="acSlidePreview1" src="images/bg/1.jpg"',
    'id="acSlidePreview2" src="images/bg/2.jpg"',
    'id="acSlidePreview3" src="images/bg/3.jpg"']
    .forEach((needle) => {
      if (html.indexOf(needle) === -1) { throw new Error('missing ' + needle); }
    });
  const sharedBackground = html.indexOf('id="acBgSections"');
  const firstPreview = html.indexOf('id="acSlidePreview1"');
  const firstSlideImageField = html.indexOf('id="acBgSlide1"');
  const firstSlideHeaderField = html.indexOf('id="slide1_kicker"');
  if (!(sharedBackground < firstPreview && firstPreview < firstSlideImageField &&
      firstSlideImageField < firstSlideHeaderField)) {
    throw new Error('shared background should be first, followed by each slide image and its text fields');
  }
  if (!html.includes('class="ac-slide-image-column"') ||
      !html.includes('class="ac-slide-header-editor"')) {
    throw new Error('slide image and header text should be separated into two columns');
  }
});
attempt('renderAbout', () => {
    T.renderAbout();
    const html = byId('acPanelAbout').innerHTML;
    ['about_introHtml', 'about_philText', 'about_skill6', 'about_level6']
      .forEach((needle) => {
        if (html.indexOf(needle) === -1) { throw new Error('missing ' + needle); }
      });
    if (!html.includes('class="ac-about-row"') || !html.includes('class="ac-about-heading"')) {
      throw new Error('about fields are missing the two-column layout or full-width heading');
    }
    if (html.indexOf('for="about_head"') > html.indexOf('id="about_head"')) {
      throw new Error('about label does not appear to the left of its input');
    }
});
attempt('renderServices with the two-column layout', () => {
  T.renderServices();
  const html = byId('acPanelServices').innerHTML;
  ['services_title', 'services_box1', 'services_s1title', 'services_s2sub',
    'services_s3text'].forEach((needle) => {
      if (!html.includes(needle)) { throw new Error('missing ' + needle); }
    });
  if (!html.includes('data-service-action="add"') || !html.includes('3 / 5')) {
    throw new Error('service add control or default count is missing');
  }
  if (!html.includes('class="ac-about-row"') || !html.includes('class="ac-about-heading"')) {
    throw new Error('service fields are missing the two-column layout or full-width heading');
  }
  if (html.indexOf('for="services_title"') > html.indexOf('id="services_title"')) {
    throw new Error('service label does not appear to the left of its input');
  }
});
attempt('service areas respect the 1-to-5 limit', () => {
  T.changeServiceCount(1);
  if (T.state.model.serviceCount !== 4 || T.state.model.services.box4 !== '') {
    throw new Error('adding an area did not create a blank fourth area');
  }
  T.changeServiceCount(-1);
  if (T.state.model.serviceCount !== 3 || Object.prototype.hasOwnProperty.call(T.state.model.services, 'box4')) {
    throw new Error('removing the last area did not restore three areas');
  }
  T.state.model.serviceCount = 5;
  T.renderServices();
  if (!byId('acPanelServices').innerHTML.includes('services_s5text') ||
      !byId('acPanelServices').innerHTML.includes('data-service-action="add" disabled')) {
    throw new Error('fifth area fields were not rendered');
  }
  T.changeServiceCount(1);
  if (T.state.model.serviceCount !== 5) { throw new Error('service count exceeded five areas'); }
  T.state.model.serviceCount = 1;
  T.renderServices();
  if (!byId('acPanelServices').innerHTML.includes('services_s1text') ||
      byId('acPanelServices').innerHTML.includes('services_s2text') ||
      !byId('acPanelServices').innerHTML.includes('data-service-action="remove" disabled')) {
    throw new Error('minimum one-area view is incorrect');
  }
  T.changeServiceCount(-1);
  if (T.state.model.serviceCount !== 1) { throw new Error('service count fell below one area'); }
  T.state.model.serviceCount = 3;
  T.readModel();
  T.renderAll();
});
attempt('renderAll fills every panel', () => {
    ['acPanelProjects', 'acPanelJobs', 'acPanelFacts', 'acPanelBackgrounds', 'acPanelAbout', 'acPanelServices'].forEach((id) => {
    if (!byId(id).innerHTML) { throw new Error(id + ' is empty'); }
  });
});
['Slide1', 'Slide2', 'Slide3'].forEach((key, i) => {
  byId('acBg' + key).value = T.state.model.backgrounds.slides[i];
});
byId('acBgSections').value = T.state.model.backgrounds.sections;
byId('acBgSlide2').value = 'images/bg/new slide 2.jpg';
byId('acBgSections').value = 'images/bg/new-shared.jpg';
byId('about_head').value = 'Über $& mich';
byId('about_introHtml').value = '<b>Einleitung</b>\nZweiter Absatz';
byId('about_skill0').value = 'Web & Design';
byId('about_level0').value = '88';
byId('services_title').value = 'Kenntnisse & Services';
byId('services_s1text').value = 'Support & Hardware';
byId('slide1_kicker').value = 'Willkommen & los';
byId('slide1_h1').value = '<span>Mein</span> Titel';
byId('slide3_title').value = 'World <Wide>';
attempt('collect', () => { T.collect(); });
attempt('buildFiles for the source target', () => {
  const files = T.buildFiles(T.collect());
  if (!files['index.html']) { throw new Error('index.html not produced'); }
  if (!files['js/i18n.de.js']) { throw new Error('German dictionary not produced'); }
  if (!files['css/style.css']) { throw new Error('css/style.css not produced after background edit'); }
  const styleVersion = /href="css\/style\.css\?v=(\d+)"/.exec(indexHtml);
  if (!styleVersion || files['index.html'].indexOf('href="css/style.css?v=' +
      (Number(styleVersion[1]) + 1) + '"') === -1) {
    throw new Error('stylesheet cache version was not incremented');
  }
  const deVersion = /src="js\/i18n\.de\.js\?v=(\d+)"/.exec(indexHtml);
  if (!deVersion || files['index.html'].indexOf('src="js/i18n.de.js?v=' +
      (Number(deVersion[1]) + 1) + '"') === -1) {
    throw new Error('German translation cache version was not incremented');
  }
  if (files['index.html'].indexOf("url('images/bg/new\\ slide\\ 2.jpg')") === -1) {
    throw new Error('edited slide background missing from index.html');
  }
  if ((files['css/style.css'].match(/url\(\.\.\/images\/bg\/new-shared\.jpg\)/g) || []).length !== 4) {
    throw new Error('shared background was not updated in every section');
  }
  if (!files['index.html'].includes('>Über $&amp; mich</p>')) {
    throw new Error('about fallback was not updated in index.html');
  }
  if (!files['index.html'].includes('data-percent="88%"')) {
    throw new Error('skill level was not updated in index.html');
  }
  if (!files['index.html'].includes('data-i18n="services.title">Kenntnisse &amp; Services</h2>') ||
      !files['index.html'].includes('data-i18n="services.s1text">Support &amp; Hardware</p>')) {
    throw new Error('German services fallback fields were not updated in index.html');
  }
  if (!files['index.html'].includes('data-i18n="slide1.kicker">Willkommen &amp; los</p>') ||
      !files['index.html'].includes('data-i18n-html="slide1.h1"><span>Mein</span> Titel</h2>') ||
      !files['index.html'].includes('data-i18n="slide3.title">World &lt;Wide&gt;</h2>')) {
    throw new Error('German slide header fallbacks were not updated correctly');
  }
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(files['js/i18n.de.js'], sandbox);
  const de = sandbox.window.AMCF_I18N_LANGS.de;
  if (de.about.head !== 'Über $& mich' || de.about.introHtml !== '<b>Einleitung</b>\nZweiter Absatz') {
    throw new Error('German about fields did not round trip');
  }
  if (de.skills[0] !== 'Web & Design') { throw new Error('German skill label did not round trip'); }
  if (de.services.title !== 'Kenntnisse & Services' || de.services.s1text !== 'Support & Hardware') {
    throw new Error('German services fields did not round trip');
  }
  if (de.slide1.kicker !== 'Willkommen & los' || de.slide1.h1 !== '<span>Mein</span> Titel' ||
      de.slide3.title !== 'World <Wide>') {
    throw new Error('German slide header fields did not round trip');
  }
});

// the translation target runs a different branch
attempt('readModel for a translation target', () => {
  T.state.target = 'en';
  ['de', 'de-ch', 'en', 'es', 'gl', 'pt'].forEach((language) => {
    T.state.dicts[language] = fs.readFileSync(path.join(root, 'js', 'i18n.' + language + '.js'), 'utf8');
  });
  T.readModel();
  if (!T.state.model) { throw new Error('model is null for en'); }
  if (T.state.model.projects.length !== 8) { throw new Error('en projects=' + T.state.model.projects.length); }
  if (Object.keys(T.state.model.jobs).length !== 11) { throw new Error('en jobs=' + Object.keys(T.state.model.jobs).length); }
});
attempt('adding an area saves all language structures', () => {
  const model = Object.assign({}, T.state.model, {
    serviceCount: 4,
    services: Object.assign({}, T.state.model.services, {
      box4: '', s4title: '', s4sub: '', s4text: ''
    })
  });
  const files = T.buildFiles(model);
  if (T.C.parseServiceCount(files['index.html']) !== 4 ||
      !files['index.html'].includes('data-i18n="services.s4text"></p>')) {
    throw new Error('fourth service slide was not added with an empty German fallback');
  }
  ['de', 'de-ch', 'en', 'es', 'gl', 'pt'].forEach((language) => {
    const file = 'js/i18n.' + language + '.js';
    if (!files[file] || !files[file].includes('s4text:')) {
      throw new Error('fourth service dictionary field missing for ' + language);
    }
    const version = new RegExp('src="js/i18n\\.' + language + '\\.js\\?v=(\\d+)"').exec(indexHtml);
    if (!version || !files['index.html'].includes('src="js/i18n.' + language + '.js?v=' +
        (Number(version[1]) + 1) + '"')) {
      throw new Error('cache version not bumped for ' + language);
    }
  });
  const oneArea = Object.assign({}, model, {
    serviceCount: 1,
    services: Object.keys(model.services).reduce((result, key) => {
      if (key === 'title' || /^box1$|^s1(?:title|sub|text)$/.test(key)) {
        result[key] = model.services[key];
      }
      return result;
    }, {})
  });
  const removedFiles = T.buildFiles(oneArea);
  if (T.C.parseServiceCount(removedFiles['index.html']) !== 1) {
    throw new Error('removing areas did not update the shared markup');
  }
  ['de', 'de-ch', 'en', 'es', 'gl', 'pt'].forEach((language) => {
    const dictionary = removedFiles['js/i18n.' + language + '.js'];
    if (!dictionary || /\b(?:box|s)[2-5](?:title|sub|text)?\s*:/.test(
      dictionary.slice(dictionary.indexOf('services:')))) {
      throw new Error('removed area fields remain in ' + language);
    }
  });
});
attempt('renderServices and save a translation target', () => {
  T.renderServices();
  if (!byId('acPanelServices').innerHTML.includes('services_s3text')) {
    throw new Error('services panel is empty for a translated language');
  }
  byId('services_s2text').value = 'Translated service description';
  byId('slide2_kicker').value = 'Translated slide kicker';
  const files = T.buildFiles(T.collect());
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(files['js/i18n.en.js'], sandbox);
  if (sandbox.window.AMCF_I18N_LANGS.en.services.s2text !== 'Translated service description') {
    throw new Error('translated service field did not round trip');
  }
  if (sandbox.window.AMCF_I18N_LANGS.en.slide2.kicker !== 'Translated slide kicker') {
    throw new Error('translated slide header field did not round trip');
  }
});
attempt('renderJobs for a translation target', () => { T.renderJobs(); });
attempt('renderBackgrounds is read-only for translations', () => {
  T.renderBackgrounds();
  const html = byId('acPanelBackgrounds').innerHTML;
  if (html.indexOf('disabled') === -1 || html.indexOf('backgroundsSourceOnly') !== -1) {
    throw new Error('background fields should be disabled and explained for translations');
  }
});
attempt('buildFiles for a translation target', () => {
  const files = T.buildFiles(T.collect());
  const key = 'js/i18n.en.js';
  if (!files[key]) { throw new Error(key + ' not produced'); }
  const enVersion = /src="js\/i18n\.en\.js\?v=(\d+)"/.exec(indexHtml);
  if (!files['index.html'] || !enVersion || files['index.html'].indexOf('js/i18n.en.js?v=' +
      (Number(enVersion[1]) + 1)) === -1) {
    throw new Error('translation cache version was not updated in index.html');
  }
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

// ---------- a failing save must tell the user something ----------
// There is no server endpoint any more. If the folder cannot be written the
// editor falls back to downloading, and either way it must not fail silently.
(async () => {
  // 1) buildFiles blows up -> reported, no fetch, no silent death
  const goodHtml = T.state.indexHtml;
  T.state.indexHtml = '<html>no AMCF markers at all</html>';
  try {
    T.readModel();
    ok(false, 'readModel rejects marker-less html');
  } catch (e) {
    ok(/Expected 3 start-slider background images/.test(e.message), 'readModel rejects marker-less html');
  }
  T.state.model = { projects: [], jobs: {}, facts: {}, images: {} };
  byId('acMsg').textContent = '';
  await T.save();
  const m1 = byId('acMsg');
  ok(/nicht möglich|fehlgeschlagen|Failed/i.test(m1.textContent),
     'save() reports a buildFiles failure instead of failing silently', m1.textContent);
  ok(m1.className.indexOf('err') !== -1, 'the message bar is styled as an error', m1.className);

  // 2) no folder granted -> the user is told and the files are offered
  T.state.indexHtml = goodHtml;
  T.readModel();
  byId('acMsg').textContent = '';
  await T.save();
  const m2 = byId('acMsg');
  ok(/nicht möglich|nicht gespeichert/i.test(m2.textContent),
     'save() explains that direct writing was not possible', m2.textContent);
  ok(/heruntergelad|herunterlad/i.test(m2.textContent), 'and points at the download fallback', m2.textContent);

  // 3) nothing loaded -> explicit message
  T.state.model = null;
  byId('acMsg').textContent = '';
  await T.save();
  ok(/nothing loaded/i.test(byId('acMsg').textContent),
     'save() reports an unloaded model', byId('acMsg').textContent);

  // 4) download must not throw either
  let threw = null;
  try { T.download(); } catch (e) { threw = e; }
  ok(!threw, 'download() does not throw when there is no model', threw && threw.message);

  console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
  process.exit(fail ? 1 : 0);
})();