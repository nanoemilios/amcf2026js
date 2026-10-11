/* An entry can only be edited where the markup already has an element. job1
   (Migros) has no l1..l7 at all, so typing a bullet used to be silently dropped
   on save. The writer must create the missing elements and drop cleared ones.
   Run from the repo root:  node tests/bullets.test.js                 */
const fs = require('fs');
const path = require('path');
const C = require(path.join(__dirname, '..', 'js', 'amcf-content.js'));

const root = path.join(__dirname, '..');

let fail = 0;
const ok = (c, m, e) => {
  console.log((c ? 'PASS  ' : 'FAIL  ') + m + (!c && e !== undefined ? '  -> ' + e : ''));
  if (!c) fail++;
};
const jobs = (h) => C.parseJobs(h);

// Build our own starting point instead of relying on the live index.html, which
// changes as soon as the owner edits anything. Strip job1's bullets and job3's
// description so the "entry has neither" scenario is reproducible.
const EMPTY = ['text', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7'];
const strip = {};
strip[1] = {}; strip[3] = {};
EMPTY.forEach((f) => { strip[1][f] = ''; strip[3][f] = ''; });
const orig = C.write(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { jobs: strip });

// --- the starting point: job1 has no bullets, job3 no description
ok(jobs(orig)[1].l1 === undefined, 'fixture: job1 has no bullets', jobs(orig)[1].l1);
ok(jobs(orig)[3].text === undefined, 'fixture: job3 has no description', jobs(orig)[3].text);

// --- add a bullet to job1 (the reported case)
let m = jobs(orig);
m[1].l1 = 'Lagerverwaltung';
let out = C.write(orig, { jobs: m });
ok(jobs(out)[1].l1 === 'Lagerverwaltung', 'the new bullet on job1 is saved', jobs(out)[1].l1);
ok(jobs(out)[1].title === jobs(orig)[1].title, 'job1 title untouched');
ok(jobs(out)[11].title === jobs(orig)[11].title, 'job11 untouched');

// --- it must be read back after a second parse/write cycle
let m2 = jobs(out);
m2[1].l2 = 'Kommissionierung';
out = C.write(out, { jobs: m2 });
ok(jobs(out)[1].l1 === 'Lagerverwaltung', 'first bullet survives a second edit', jobs(out)[1].l1);
ok(jobs(out)[1].l2 === 'Kommissionierung', 'second bullet added', jobs(out)[1].l2);

// --- the new bullet must render as a real <li> with the right key
const reg = C.regionSlice(out, 'RESUME');
const chunk1 = reg.text.slice(...Object.values(C.jobHolderRange(reg.text, 1)).slice(0, 2));
ok(/<li[^>]*data-i18n="resume\.job1\.l1"/.test(chunk1), 'job1.l1 is a <li data-i18n>');
ok(/<li[^>]*data-i18n="resume\.job1\.l2"/.test(chunk1), 'job1.l2 is a <li data-i18n>');
ok((chunk1.match(/<li[^>]*data-i18n="resume\.job1\.l\d"/g) || []).length === 2, 'exactly two bullets on job1');
ok(!/<li[^>]*data-i18n="resume\.job1\.l5"/.test(chunk1), 'no empty bullet was invented');

// --- clearing a bullet removes the element again
let m3 = jobs(out);
m3[1].l2 = '';
out = C.write(out, { jobs: m3 });
ok(jobs(out)[1].l2 === undefined, 'cleared bullet removed from the model', jobs(out)[1].l2);
const reg2 = C.regionSlice(out, 'RESUME');
const range = C.jobHolderRange(reg2.text, 1);
const chunk2 = reg2.text.slice(range.start, range.end);
ok(!/data-i18n="resume\.job1\.l2"/.test(chunk2), 'the <li> for the cleared bullet is gone');
ok(/data-i18n="resume\.job1\.l1"/.test(chunk2), 'the remaining bullet is untouched');

// --- clearing the last bullet must not leave an empty <ul> behind
let m4 = jobs(out);
m4[1].l1 = '';
out = C.write(out, { jobs: m4 });
const reg3 = C.regionSlice(out, 'RESUME');
const range3 = C.jobHolderRange(reg3.text, 1);
const chunk3 = reg3.text.slice(range3.start, range3.end);
ok(!/<ul(?![^>]*slides)[^>]*>\s*<\/ul>/.test(chunk3), 'no empty bullet list is left behind');

// --- adding a description to an entry that has none (job3)
let m5 = jobs(orig);
m5[3].text = 'Ein neuer Beschreibungstext.';
out = C.write(orig, { jobs: m5 });
ok(jobs(out)[3].text === 'Ein neuer Beschreibungstext.', 'job3 gained a description', jobs(out)[3].text);
ok(jobs(out)[3].l3 === jobs(orig)[3].l3, 'job3 bullets untouched');
ok(jobs(out)[3].date === jobs(orig)[3].date, 'job3 date untouched');

// --- the image slider must never receive a text bullet
let m6 = jobs(orig);
m6[11].l1 = 'Aufzugswartung';
out = C.write(orig, { jobs: m6 });
const reg4 = C.regionSlice(out, 'RESUME');
const range11 = C.jobHolderRange(reg4.text, 11);
const chunk11 = reg4.text.slice(range11.start, range11.end);
ok(jobs(out)[11].l1 === 'Aufzugswartung', 'job11 gained a bullet', jobs(out)[11].l1);
const slidesUl = /<ul class="slides">([\s\S]*?)<\/ul>/.exec(chunk11);
ok(slidesUl && slidesUl[1].indexOf('data-i18n="resume.job11.l1"') === -1,
   'the bullet did not land inside the image slider', slidesUl && slidesUl[1]);
ok(chunk11.indexOf('images/resume/AS.jpg') !== -1, 'job11 image untouched');
ok(jobs(out)[11].text === jobs(orig)[11].text, 'job11 description untouched');

// --- editing one entry must not disturb the others
ok(jobs(out)[6].l7 === jobs(orig)[6].l7, 'job6 l7 untouched');
ok(jobs(out)[5].l2 === jobs(orig)[5].l2, 'job5 l2 untouched');
ok(jobs(out)[2].text === jobs(orig)[2].text, 'job2 text untouched');
ok(C.hasRegions(out), 'regions intact');

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
process.exit(fail ? 1 : 0);