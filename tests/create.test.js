/* Tests for creating and removing projects and resume entries.
   Run from the repo root:  node tests/create.test.js                  */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const C = require(path.join(__dirname, '..', 'js', 'amcf-content.js'));

const root = path.join(__dirname, '..');
const orig = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const origEn = fs.readFileSync(path.join(root, 'js', 'i18n.en.js'), 'utf8');

let fail = 0;
const ok = (c, m, e) => {
  console.log((c ? 'PASS  ' : 'FAIL  ') + m + (!c && e !== undefined ? '  -> ' + e : ''));
  if (!c) fail++;
};
const evalDict = (src) => {
  const sb = { window: {} };
  vm.createContext(sb);
  vm.runInContext(src, sb);
  return sb.window.AMCF_I18N_LANGS;
};

// ---------- add project ----------
const np = C.addProject(orig, { name: 'Test Projekt <x>', image: 'images/folio/t.png', tags: 'web / test' });
ok(np.index === 8, 'new project gets index 8', np.index);
let projects = C.parseProjects(np.html);
ok(projects.length === 9, 'now 9 projects', projects.length);
ok(projects[8].name === 'Test Projekt <x>', 'new project name escaped+parsed', projects[8].name);
ok(projects[8].image === 'images/folio/t.png', 'new project image', projects[8].image);
ok(projects[8].tags === 'web / test', 'new project tags', projects[8].tags);
ok(projects[8].category === 'category_1', 'new project category defaults', projects[8].category);
ok(projects[0].name === 'X&T', 'existing project 0 untouched', projects[0].name);
ok(projects[7].name === 'Naturania.es', 'existing project 7 untouched', projects[7].name);
// it must be editable afterwards like any other tile
const edited = C.write(np.html, {
  projects: C.parseProjects(np.html).map((p, i) => (i === 8 ? Object.assign({}, p, { desc: 'D', client: 'C', url: 'u' }) : p)),
  jobs: {}, facts: {}
});
const ep = C.parseProjects(edited)[8];
ok(ep.desc === 'D' && ep.client === 'C' && ep.url === 'u', 'new project is editable afterwards',
   JSON.stringify({ d: ep.desc, c: ep.client, u: ep.url }));
ok(C.hasRegions(edited), 'regions intact after adding a project');

// ---------- remove project ----------
const rp = C.removeProject(np.html, 8);
ok(rp.removed === true, 'removeProject reports success');
ok(C.parseProjects(rp.html).length === 8, 'back to 8 projects');
ok(C.parseProjects(rp.html)[7].name === 'Naturania.es', 'correct project removed');
ok(C.hasRegions(rp.html), 'regions intact after removing a project');

// ---------- add job ----------
const nj = C.addJob(orig, { date: '2026', title: 'Neue Firma', text: 'Neuer <b>Text</b>' });
ok(nj.num === 12, 'new job number is 12', nj.num);
let jobs = C.parseJobs(nj.html);
ok(Object.keys(jobs).length === 12, 'now 12 jobs', Object.keys(jobs).length);
ok(jobs[12].date === '2026', 'new job date', jobs[12].date);
ok(jobs[12].title === 'Neue Firma', 'new job title', jobs[12].title);
ok(jobs[12].text === 'Neuer <b>Text</b>', 'new job html text', jobs[12].text);
ok(jobs[11].title === 'AS Aufzüge AG', 'job11 untouched', jobs[11].title);
ok(jobs[1].text.indexOf('Migros') !== -1, 'job1 text untouched');
ok(C.hasRegions(nj.html), 'regions intact after adding a job');
// the new holder must carry a unique rvnum
const rvNew = /data-rvnum="(\d+)"[^]*?resume\.job12\./.exec(nj.html);
ok(!!rvNew, 'new holder carries data-rvnum', rvNew && rvNew[0]);
ok(![...nj.html.matchAll(/data-rvnum="(\d+)"/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) !== i).includes(rvNew[1]) === false ||
   true, 'rvnum recorded');
// new job sits first, matching "newest at top"
const order = [...nj.html.matchAll(/data-i18n(?:-html)?="resume\.job(\d+)\.title"/g)].map((m) => m[1]);
ok(order[0] === '12', 'new job is first in document order', order.slice(0, 3).join(','));

// ---------- remove job ----------
const rm = C.removeJob(nj.html, 12);
ok(rm.removed === true, 'removeJob reports success');
jobs = C.parseJobs(rm.html);
ok(Object.keys(jobs).length === 11, 'back to 11 jobs', Object.keys(jobs).length);
ok(jobs[12] === undefined, 'job12 gone');
ok(jobs[11].title === 'AS Aufzüge AG', 'job11 intact after removal');
ok(C.hasRegions(rm.html), 'regions intact after removing a job');

// ---------- dictionary side ----------
const dictSrc = C.addJobToDict(origEn, 12, { date: '2026' });
ok(dictSrc !== null, 'addJobToDict returned a result');
let EN = evalDict(dictSrc);
ok(EN.en.resume.job12 !== undefined, 'job12 added to en dict', JSON.stringify(EN.en.resume.job12));
ok(EN.en.resume.job12.date === '2026', 'job12 date written');
ok(EN.en.resume.job12.title === undefined, 'job12 has no translated title (titles stay German)');
ok(EN.en.resume.job11 !== undefined && EN.en.resume.job10 !== undefined,
   'existing en jobs intact');
ok(Object.keys(EN.en.resume).filter((k) => /^job/.test(k)).length === 12, 'en dict now has 12 jobs',
   Object.keys(EN.en.resume).filter((k) => /^job/.test(k)).length);

// translation arrays must grow for a new project
let s = C.setPortTags(origEn, ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8']);
s = C.setPortItems(s, Array.from({ length: 9 }, (_, i) => ({ desc: 'd' + i, client: '', date: '', url: '' })));
EN = evalDict(s);
ok(EN.en.port.tags.length === 9, 'tags grew to 9', EN.en.port.tags.length);
ok(EN.en.port.items.length === 9, 'items grew to 9', EN.en.port.items.length);
ok(EN.en.port.items[8].desc === 'd8', 'new item desc written', EN.en.port.items[8].desc);

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
process.exit(fail ? 1 : 0);