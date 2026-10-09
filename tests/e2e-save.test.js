/* End-to-end: edit -> save-content.php -> verify on disk -> restore.
   Requires the PHP dev server on http://localhost:8000.
   Run from the repo root:  node tests/e2e-save.test.js                */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const C = require(path.join(__dirname, '..', 'js', 'amcf-content.js'));

const root = path.join(__dirname, '..');
const indexFile = path.join(root, 'index.html');
const enFile = path.join(root, 'js', 'i18n.en.js');
const URL = 'http://localhost:8000/save-content.php';

let fail = 0;
const ok = (c, m, e) => {
  console.log((c ? 'PASS  ' : 'FAIL  ') + m + (!c && e !== undefined ? '  -> ' + e : ''));
  if (!c) fail++;
};

const origIndex = fs.readFileSync(indexFile, 'utf8');
const origEn = fs.readFileSync(enFile, 'utf8');

// ---- build the edits exactly the way admin-content.js does ----
const model = C.parse(origIndex);
model.projects[0].name = 'X&T Probe';
model.projects[0].desc = 'Beschreibung <mit> & "Anführungszeichen"';
model.projects[0].client = 'Probe GmbH';
model.projects[0].date = '2026';
model.projects[0].url = 'https://example.com/?a=1&b=2';
model.jobs[11].title = 'AS Aufzüge AG Probe';
model.jobs[11].text = 'Neuer Text mit <a href="https://x.y">Link</a> & Ümläuten.';
model.facts.name = 'Probe Name & Co';

const newIndex = C.write(origIndex, model);

let newEn = C.setPortTags(origEn, model.projects.map((p) => p.tags));
newEn = C.setPortItems(newEn, model.projects.map((p) => ({
  desc: 'EN ' + p.name, client: 'EN Client', date: '2026', url: 'https://en.example/'
})));
newEn = C.setJobField(newEn, 11, 'title', 'EN Job 11 Probe');
newEn = C.setJobField(newEn, 11, 'text', 'EN text with <b>bold</b> & more.');
newEn = C.setFactLabel(newEn, 'permit', 'EN Permit');

(async () => {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ files: { 'index.html': newIndex, 'js/i18n.en.js': newEn } })
    });
    const json = await res.json();
    ok(res.ok && json.ok, 'save-content.php accepted the edit', JSON.stringify(json));
    ok(Object.keys(json.written || {}).length === 2, 'both files written', JSON.stringify(json.written));

    // ---- verify index.html on disk ----
    const diskIndex = fs.readFileSync(indexFile, 'utf8');
    const m2 = C.parse(diskIndex);
    ok(m2.projects[0].name === 'X&T Probe', 'project name persisted', m2.projects[0].name);
    ok(m2.projects[0].desc === 'Beschreibung <mit> & "Anführungszeichen"', 'project desc persisted', m2.projects[0].desc);
    ok(m2.projects[0].url === 'https://example.com/?a=1&b=2', 'project url persisted', m2.projects[0].url);
    ok(m2.projects[7].name === 'Naturania.es', 'other projects untouched', m2.projects[7].name);
    ok(m2.jobs[11].title === 'AS Aufzüge AG Probe', 'job title persisted', m2.jobs[11].title);
    ok(m2.jobs[11].text === 'Neuer Text mit <a href="https://x.y">Link</a> & Ümläuten.', 'job html text persisted', m2.jobs[11].text);
    ok(m2.facts.name === 'Probe Name & Co', 'fact persisted', m2.facts.name);
    ok(m2.facts.permitV === 'C', 'other facts untouched', m2.facts.permitV);
    ok(Object.keys(m2.jobs).length === 11, 'still 11 jobs', Object.keys(m2.jobs).length);

    // ---- verify en dict on disk ----
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(enFile, 'utf8'), sandbox);
    const EN = sandbox.window.AMCF_I18N_LANGS.en;
    ok(EN.resume.job11.title === 'EN Job 11 Probe', 'en job title persisted', EN.resume.job11.title);
    ok(EN.resume.job11.text === 'EN text with <b>bold</b> & more.', 'en job text persisted', EN.resume.job11.text);
    ok(EN.port.items.length === 8, 'en items count still 8', EN.port.items.length);
    ok(EN.port.items[0].desc === 'EN X&T Probe', 'en item desc persisted', EN.port.items[0].desc);
    ok(EN.resume.facts.permit === 'EN Permit', 'en fact label persisted', EN.resume.facts.permit);
    ok(EN.resume.facts.permitV === 'C', 'en fact value untouched', EN.resume.facts.permitV);
    ok(EN.resume.job1.text.indexOf('Migros') !== -1, 'en job1 text intact');
    ok(Array.isArray(EN.port.tags) && EN.port.tags.length === 8, 'en tags still 8', EN.port.tags && EN.port.tags.length);
  } catch (e) {
    ok(false, 'e2e run threw', e.message);
  } finally {
    fs.writeFileSync(indexFile, origIndex, 'utf8');
    fs.writeFileSync(enFile, origEn, 'utf8');
    for (const f of [indexFile + '.bak', enFile + '.bak']) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    const restored = fs.readFileSync(indexFile, 'utf8') === origIndex &&
                     fs.readFileSync(enFile, 'utf8') === origEn;
    console.log((restored ? 'PASS  ' : 'FAIL  ') + 'files restored after the test');
    if (!restored) fail++;
    console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
    process.exit(fail ? 1 : 0);
  }
})();