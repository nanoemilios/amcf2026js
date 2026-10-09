/* Guards the resume job-number resolution. data-rvnum is not the job number and
   is not unique (job11 and job9 are both rvnum 2), so resolving the number from
   data-rvnum silently showed the wrong entry, or an empty one once the German
   dictionary stopped carrying job entries.
   Run from the repo root:  node tests/resume-num.test.js               */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let fail = 0;
const ok = (c, m, e) => {
  console.log((c ? 'PASS  ' : 'FAIL  ') + m + (!c && e !== undefined ? '  -> ' + e : ''));
  if (!c) fail++;
};

// pull the real helper out of scripts.js so the test exercises shipped code
const src = fs.readFileSync(path.join(root, 'js', 'scripts.js'), 'utf8');
const m = /function jobNumFromKeys\(rvnum, keys\) \{[\s\S]*?\n\}/.exec(src);
ok(!!m, 'jobNumFromKeys is present in scripts.js');
if (!m) { process.exit(1); }
const jobNumFromKeys = new Function('return ' + m[0].replace('function jobNumFromKeys', 'function'))();

// ---- real index.html: map every holder to the job number it actually contains
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const holders = [...html.matchAll(/<div class="resume-holder" data-rvnum="(\d+)">([\s\S]*?)(?=<div class="resume-holder" data-rvnum=|$)/g)];
ok(holders.length === 11, 'found 11 holders in index.html', holders.length);

let allResolved = true;
let keysSatisfied = true;
const seen = [];
const FIELDS = ['date', 'title', 'text', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7'];
holders.forEach((h) => {
  const rvnum = h[1];
  const keys = [...h[2].matchAll(/data-i18n(?:-html)?="([^"]+)"/g)].map((k) => k[1]);
  const num = jobNumFromKeys(rvnum, keys);
  seen.push('rv' + rvnum + '->job' + num);
  if (num === null || isNaN(num)) { allResolved = false; return; }
  // the markup fallback looks up resume.job<num>.<field> inside this holder,
  // so date and title must be reachable for the number we resolved
  ['date', 'title'].forEach((f) => {
    if (keys.indexOf('resume.job' + num + '.' + f) === -1) { keysSatisfied = false; }
  });
  // and no other entry's keys may leak in
  FIELDS.forEach((f) => {
    const k = 'resume.job' + num + '.' + f;
    if (keys.indexOf(k) !== -1 && h[2].indexOf(k) === -1) { keysSatisfied = false; }
  });
});
ok(allResolved, 'every holder resolves to a job number', seen.join(' '));
ok(keysSatisfied, 'date and title are reachable for every resolved job number');
ok(new Set(seen).size === 11, 'each holder maps to a distinct job number', seen.join(' '));

// job11 and job9 share rvnum 2, which is exactly why rvnum cannot be the key
const dupRv = holders.filter((h) => h[1] === '2').map((h) => {
  const keys = [...h[2].matchAll(/data-i18n(?:-html)?="([^"]+)"/g)].map((k) => k[1]);
  return jobNumFromKeys(h[1], keys);
});
ok(dupRv.length === 2 && dupRv[0] !== dupRv[1],
   'two holders with rvnum 2 resolve to different jobs', JSON.stringify(dupRv));

// ---- fallbacks
ok(jobNumFromKeys('7', []) === 7, 'falls back to rvnum when no keys are present');
ok(jobNumFromKeys('abc', []) === null, 'returns null when neither is usable');
ok(jobNumFromKeys('', ['resume.job11.date']) === 11, 'reads the job number from the keys');
ok(jobNumFromKeys('', ['resume.facts.name', 'resume.job4.title']) === 4,
   'ignores non-job keys and finds the job key', jobNumFromKeys('', ['resume.facts.name', 'resume.job4.title']));

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
process.exit(fail ? 1 : 0);