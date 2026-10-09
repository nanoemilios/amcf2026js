/* Round-trip tests for js/amcf-content.js against the real index.html.
   Run from the repo root:  node tests/content.test.js                */
const fs = require('fs');
const path = require('path');
const C = require(path.join(__dirname, '..', 'js', 'amcf-content.js'));
const file = path.join(__dirname, '..', 'index.html');
const orig = fs.readFileSync(file, 'utf8');

let fail = 0;
const ok = (cond, msg, extra) => {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + msg + (!cond && extra !== undefined ? '  -> ' + extra : ''));
  if (!cond) fail++;
};

ok(C.hasRegions(orig), 'all three marker regions present');

const projects = C.parseProjects(orig);
ok(projects.length === 8, 'parsed 8 projects', projects.length);
ok(projects[0].name === 'X&T', 'project 0 name = X&T', projects[0].name);
ok(projects[0].category === 'category_2', 'project 0 category', projects[0].category);
ok(projects[3].name.indexOf('O Mundo') === 0, 'project 3 name', projects[3].name);
ok(projects.every((p, i) => p.index === i), 'indices are 0..7 in order', projects.map((p) => p.index).join(','));

const jobs = C.parseJobs(orig);
ok(Object.keys(jobs).length === 11, 'parsed 11 jobs', Object.keys(jobs).length);
ok(jobs[11].title === 'AS Aufzüge AG', 'job11 title', jobs[11].title);
ok(jobs[11].date === '09.2020 - Heute', 'job11 date', jobs[11].date);
ok(/<a href="https:\/\/www\.lift\.ch"/.test(jobs[11].text), 'job11 text kept as HTML');
ok(jobs[6].l1 && jobs[6].l7, 'job6 has l1..l7');

const facts = C.parseFacts(orig);
ok(facts.name === 'Alberto Manuel Costa Ferreiro', 'fact name', facts.name);
ok(facts.permitV === 'C', 'fact permitV', facts.permitV);

// A no-op rewrite must reproduce the file byte for byte.
const rt = C.write(orig, { projects: projects, jobs: jobs, facts: facts });
ok(rt === orig, 'round trip is byte identical', rt === orig ? '' : 'len ' + orig.length + ' -> ' + rt.length);

const p2 = projects.map((p) => Object.assign({}, p));
p2[0].name = 'X&T "Neu"';
p2[0].desc = 'Beschreibung <mit> & Ampersand';
p2[0].client = 'Kunde GmbH';
p2[0].date = '2024';
p2[0].url = 'https://example.com/?a=1&b=2';
p2[0].tags = 'neu / test';
const j2 = JSON.parse(JSON.stringify(jobs));
j2[1].title = 'Titel mit <tag>';
j2[1].text = 'Text <b>fett</b>';
const f2 = Object.assign({}, facts);
f2.name = 'Neuer Name & Co';

const edited = C.write(orig, { projects: p2, jobs: j2, facts: f2 });
const rp = C.parseProjects(edited), rj = C.parseJobs(edited), rf = C.parseFacts(edited);
ok(rp[0].name === 'X&T "Neu"', 'project name round trips', rp[0].name);
ok(rp[0].desc === 'Beschreibung <mit> & Ampersand', 'desc round trips', rp[0].desc);
ok(rp[0].url === 'https://example.com/?a=1&b=2', 'url with & round trips', rp[0].url);
ok(rp[0].tags === 'neu / test', 'tags round trip', rp[0].tags);
ok(rp[0].category === 'category_2', 'category preserved', rp[0].category);
ok(rp[0].image === 'images/folio/xyt.png', 'image preserved', rp[0].image);
ok(rp[7].name === 'Naturania.es', 'other projects untouched', rp[7].name);
ok(rj[1].title === 'Titel mit <tag>', 'job title escaped+round trips', rj[1].title);
ok(rj[1].text === 'Text <b>fett</b>', 'job html text round trips', rj[1].text);
ok(rj[11].title === 'AS Aufzüge AG', 'other jobs untouched', rj[11].title);
ok(rj[1] && rj[1].text, 'job1.text survived the rewrite', JSON.stringify(rj[1]));
ok(rf.name === 'Neuer Name & Co', 'fact round trips', rf.name);
ok(rf.permitV === 'C', 'other facts untouched', rf.permitV);
ok(C.hasRegions(edited), 'regions still intact after edit');

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
process.exit(fail ? 1 : 0);