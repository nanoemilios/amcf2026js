/* Tests for reading and rewriting the images of resume entries.
   Entries use three different markup shapes (slider, image-popup anchor, and a
   duplicated anchor), so the writer must not assume one of them.
   Run from the repo root:  node tests/images.test.js                  */
const fs = require('fs');
const path = require('path');
const C = require(path.join(__dirname, '..', 'js', 'amcf-content.js'));

const root = path.join(__dirname, '..');
const orig = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let fail = 0;
const ok = (c, m, e) => {
  console.log((c ? 'PASS  ' : 'FAIL  ') + m + (!c && e !== undefined ? '  -> ' + e : ''));
  if (!c) fail++;
};

const imgs = C.parseJobImages(orig);
ok(Object.keys(imgs).length === 11, 'images parsed for 11 entries', Object.keys(imgs).length);
ok(imgs[11][0] === 'images/resume/AS.jpg', 'job11 image', JSON.stringify(imgs[11]));
ok(imgs[10].length === 5, 'job10 has 5 distinct images', imgs[10].length);
ok(imgs[1].length === 1, 'job1 deduplicates its repeated anchor', JSON.stringify(imgs[1]));
ok(imgs[8].length >= 4, 'job8 slider images', imgs[8].length);

// ---- no-op rewrite must be byte identical
const rt = C.writeJobImages(orig, imgs);
ok(rt.html === orig, 'no-op image rewrite is byte identical',
   rt.html === orig ? '' : 'len ' + orig.length + ' -> ' + rt.html.length);
ok(rt.warnings.length === 0, 'no warnings on a no-op rewrite', JSON.stringify(rt.warnings));

// ---- replace images in the slider variant (job10)
let r = C.writeJobImages(orig, { 10: ['images/resume/neu1.jpg', 'images/resume/neu2.jpg'] });
let got = C.parseJobImages(r.html);
ok(got[10].length === 2, 'job10 now has 2 images', got[10].length);
ok(got[10][0] === 'images/resume/neu1.jpg', 'job10 image 1', got[10][0]);
ok(got[10][1] === 'images/resume/neu2.jpg', 'job10 image 2', got[10][1]);
ok(got[11][0] === 'images/resume/AS.jpg', 'job11 untouched', got[11][0]);
ok(got[1][0] === 'images/resume/migros.jpg', 'job1 untouched', got[1][0]);

// ---- replace images in the image-popup variant (job1)
r = C.writeJobImages(orig, { 1: ['images/resume/anders.jpg'] });
got = C.parseJobImages(r.html);
ok(got[1][0] === 'images/resume/anders.jpg', 'job1 image replaced', got[1][0]);
// jobHolderRange returns offsets relative to the RESUME region text
const regText = C.regionSlice(r.html, 'RESUME').text;
const range1 = C.jobHolderRange(regText, 1);
ok(!!range1, 'job1 holder located in the region');
const chunk1 = regText.slice(range1.start, range1.end);
// both anchors must agree, otherwise the hover overlay shows the old picture
const hrefs = [...chunk1.matchAll(/<a class="image-popup"[^>]*href="([^"]*)"/g)].map((m) => m[1]);
ok(hrefs.length === 2, 'job1 really has two image-popup anchors', hrefs.length);
ok(hrefs.length > 0 && hrefs.every((v) => v === 'images/resume/anders.jpg'),
   'every image-popup href updated', JSON.stringify(hrefs));
const imgsIn1 = [...chunk1.matchAll(/<img[^>]*src="([^"]*)"/g)].map((m) => m[1]);
ok(imgsIn1.length >= 1 && imgsIn1.every((v) => v === 'images/resume/anders.jpg'),
   'every img src in the holder updated', JSON.stringify(imgsIn1));

// ---- add an extra image to an entry that has a slider (job11 has one li)
r = C.writeJobImages(orig, { 11: ['images/resume/a.jpg', 'images/resume/b.jpg'] });
got = C.parseJobImages(r.html);
ok(got[11].length === 2, 'job11 grew to 2 images', JSON.stringify(got[11]));
ok(got[11][1] === 'images/resume/b.jpg', 'appended image present', got[11][1]);

// ---- extra image on an entry WITHOUT a slider must warn, not silently vanish
r = C.writeJobImages(orig, { 1: ['images/resume/x.jpg', 'images/resume/y.jpg'] });
ok(r.warnings.length === 1 && /image slot/.test(r.warnings[0]),
   'warns when an entry has no slider to append to', JSON.stringify(r.warnings));
ok(C.parseJobImages(r.html)[1][0] === 'images/resume/x.jpg', 'first image still applied');

// ---- edge cases
r = C.writeJobImages(orig, { 99: ['images/resume/z.jpg'] });
ok(r.warnings.some((w) => /holder not found/.test(w)), 'warns for an unknown entry', JSON.stringify(r.warnings));
r = C.writeJobImages(orig, { 5: [] });
ok(r.warnings.some((w) => /no image given/.test(w)), 'warns when the list is empty');
ok(C.parseJobImages(r.html)[5][0] === 'images/resume/cfcambre.jpg', 'empty list changes nothing');

// ---- other regions untouched
ok(C.regionSlice(r.html, 'PROJECTS').text === C.regionSlice(orig, 'PROJECTS').text,
   'portfolio region untouched');
ok(C.parseJobs(r.html)[3].l3 === C.parseJobs(orig)[3].l3, 'job content untouched');

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall passed');
process.exit(fail ? 1 : 0);