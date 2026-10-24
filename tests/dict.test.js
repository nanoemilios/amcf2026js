/* Tests for the translation-dictionary writers in js/amcf-content.js.
   Run from the repo root:  node tests/dict.test.js                    */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const C = require(path.join(__dirname, '..', 'js', 'amcf-content.js'));
const dir = path.join(__dirname, '..', 'js');

let fail = 0;
const ok = (c, m, e) => {
  console.log((c ? 'PASS  ' : 'FAIL  ') + m + (!c && e !== undefined ? '  -> ' + e : ''));
  if (!c) fail++;
};
const load = (src) => {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.window.AMCF_I18N_LANGS;
};

for (const lang of ['de-ch', 'en', 'es', 'gl', 'pt']) {
  const read = () => fs.readFileSync(path.join(dir, 'i18n.' + lang + '.js'), 'utf8');
  let s = read();
  ok(!/job\d+\s*:\s*\{[^}]*\btitle\s*:/.test(s), lang + ': job titles are not translated');

  const tags = ['Web / Test', "It's a 'quoted' tag", 'ÄÖÜ / ñ'];
  s = C.setPortTags(s, tags);
  ok(s !== null, lang + ': setPortTags returned a result');
  let L = load(s);
  ok(JSON.stringify(L[lang].port.tags) === JSON.stringify(tags), lang + ': tags written', JSON.stringify(L[lang].port.tags));

  const items = [
    { desc: 'Beschreibung <b> & "quotes"', client: "O'Brien & Co", date: '2024', url: 'https://a.b/?x=1&y=2' },
    { desc: '', client: '', date: '', url: '' }
  ];
  s = C.setPortItems(read(), items);
  L = load(s);
  ok(L[lang].port.items.length === 2, lang + ': items count', L[lang].port.items.length);
  ok(L[lang].port.items[0].desc === items[0].desc, lang + ': item desc round trips', L[lang].port.items[0].desc);
  ok(L[lang].port.items[0].client === items[0].client, lang + ': item client round trips', L[lang].port.items[0].client);
  ok(L[lang].port.items[0].url === items[0].url, lang + ': item url round trips', L[lang].port.items[0].url);

  s = C.setJobField(read(), 3, 'date', 'Neuer Zeitraum');
  ok(s !== null, lang + ': setJobField returned a result');
  s = C.setJobField(s, 2, 'l7', 'Neuer Aufzaehlungspunkt');
  L = load(s);
  ok(L[lang].resume.job3.date === 'Neuer Zeitraum', lang + ': job3 date', L[lang].resume.job3.date);
  ok(L[lang].resume.job2.l7 === 'Neuer Aufzaehlungspunkt', lang + ': job2 l7 inserted', L[lang].resume.job2.l7);
  ok(L[lang].resume.job2.text.indexOf('coop.ch') !== -1, lang + ': job2 text untouched');
  ok(L[lang].resume.job1.text.indexOf('Migros') !== -1, lang + ': job1 text still intact');
  ok(typeof L[lang].resume.facts === 'object', lang + ': facts still an object');

  s = C.setFactLabel(read(), 'permit', 'X Permit / "q"');
  L = load(s);
  ok(L[lang].resume.facts.permit === 'X Permit / "q"', lang + ': fact label written', L[lang].resume.facts.permit);
  ok(!!L[lang].resume.facts.permitV, lang + ': fact VALUE permitV preserved');

  ok(C.getJobNumList(read()).length === 11, lang + ': 11 jobs listed');
}

// German keeps no content entries: index.html is the German source.
const deSrc = fs.readFileSync(path.join(dir, 'i18n.de.js'), 'utf8');
ok(!/port:\s*\{[\s\S]*?tags:\s*\[/.test(deSrc), 'de: no port.tags array');
ok(!/^\s*job\d+:/m.test(deSrc), 'de: no job blocks');

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
process.exit(fail ? 1 : 0);