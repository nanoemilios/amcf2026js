/* Round-trip tests for js/amcf-content.js against the real index.html.
   Run from the repo root:  node tests/content.test.js                */
const fs = require('fs');
const path = require('path');
const C = require(path.join(__dirname, '..', 'js', 'amcf-content.js'));
const file = path.join(__dirname, '..', 'index.html');
const orig = fs.readFileSync(file, 'utf8');
const cssFile = path.join(__dirname, '..', 'css', 'style.css');
const origCss = fs.readFileSync(cssFile, 'utf8');

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
ok(facts.tel && facts.email && facts.address2, 'contact facts exist', JSON.stringify({ tel: facts.tel, email: facts.email, address2: facts.address2 }));

// A no-op rewrite must reproduce the file byte for byte.
const rt = C.write(orig, { projects: projects, jobs: jobs, facts: facts });
ok(rt === orig, 'round trip is byte identical', rt === orig ? '' : 'len ' + orig.length + ' -> ' + rt.length);

// The contact block is derived from the facts, never edited on its own.
const fc = Object.assign({}, facts, {
  tel: '+41 79 123 45 67',
  email: 'kontakt@example.com',
  address2: '8501 Frauenfeld'
});
const contactEdited = C.write(orig, { projects: projects, jobs: jobs, facts: fc });
ok(contactEdited.indexOf('<span data-fact-ref="tel">+41 79 123 45 67</span>') !== -1,
   'contact phone follows facts');
ok(contactEdited.indexOf('<a href="mailto:kontakt@example.com" data-fact-ref="email">kontakt@example.com</a>') !== -1,
   'contact email and mailto link follow facts');
ok(contactEdited.indexOf('<span data-fact-ref="address2">8501 Frauenfeld</span>') !== -1,
   'contact address follows facts');
ok(C.parse(contactEdited).facts.tel === '+41 79 123 45 67',
   'facts still parse after contact sync');

const backgrounds = C.parseBackgrounds(orig, origCss);
ok(backgrounds.slides.join(',') === 'images/bg/1.jpg,images/bg/2.jpg,images/bg/3.jpg',
   'parsed three start-slider backgrounds', backgrounds.slides.join(','));
ok(backgrounds.sections === 'images/bg/1.jpg', 'parsed shared section background', backgrounds.sections);
const bgRoundTrip = C.writeBackgrounds(orig, origCss, backgrounds);
ok(bgRoundTrip.html === orig, 'background no-op preserves index.html');
ok(bgRoundTrip.css === origCss, 'background no-op preserves css/style.css');
const bgEdited = C.writeBackgrounds(orig, origCss, {
  slides: ['images/bg/new-1.jpg', 'images/bg/new 2.jpg', 'images/bg/new-3.jpg'],
  sections: 'images/bg/shared.jpg'
});
const changedBackgrounds = C.parseBackgrounds(bgEdited.html, bgEdited.css);
ok(changedBackgrounds.slides[0] === 'images/bg/new-1.jpg' &&
   changedBackgrounds.slides[1] === 'images/bg/new 2.jpg' &&
   changedBackgrounds.slides[2] === 'images/bg/new-3.jpg',
   'start-slider background paths round trip', JSON.stringify(changedBackgrounds.slides));
ok(changedBackgrounds.sections === 'images/bg/shared.jpg', 'shared background path round trips');
ok((bgEdited.css.match(/url\(\.\.\/images\/bg\/shared\.jpg\)/g) || []).length === 4,
   'all four content section backgrounds updated');
const aboutFallbacks = C.writeAboutFallbacks(orig, {
  head: 'Wer ich bin – neu',
  title: 'Über mich & mehr',
  introHtml: '<strong>Einleitung</strong>',
  philTitle: 'Philosophie',
  philText: 'Philosophie-Text',
  missTitle: 'Mission',
  missText: 'Mission-Text',
  skillsTitle: 'Kenntnisse'
}, ['Web & HTML', 'CMS', 'Marketing', 'Design', 'Responsive', 'Shop', 'Hardware'], [10, 20, 30, 40, 50, 60, 100]);
ok(aboutFallbacks.indexOf('>Wer ich bin – neu</p>') !== -1, 'about section headings update in index fallback');
ok(aboutFallbacks.indexOf('data-i18n-html="about.introHtml"><strong>Einleitung</strong></p>') !== -1,
   'about HTML introduction updates in index fallback');
ok(aboutFallbacks.indexOf('data-i18n="skills.0">Web &amp; HTML</span>') !== -1,
   'skill label updates in index fallback');
ok(C.parseSkillLevels(aboutFallbacks).join(',') === '10,20,30,40,50,60,100',
   'skill percentage values update and parse');
const serviceFallbacks = C.writeServiceFallbacks(orig, {
  title: 'Kenntnisse & Dienste',
  box1: 'Support',
  box2: 'Webdesign',
  box3: 'Grafik',
  s1title: 'IT & Support',
  s1sub: 'Installation',
  s1text: 'Text <mit> & Zeichen',
  s2title: 'Webdesign',
  s2sub: 'Responsive',
  s2text: 'Zweiter Bereich',
  s3title: 'Print',
  s3sub: 'Branding',
  s3text: 'Dritter Bereich'
}, 3);
ok(serviceFallbacks.includes('data-i18n="services.title">Kenntnisse &amp; Dienste</h2>'),
   'services heading updates in index fallback');
ok(serviceFallbacks.includes('data-i18n="services.s1title">IT &amp; Support</span>'),
   'service title updates in index fallback');
ok(serviceFallbacks.includes('data-i18n="services.s1text">Text &lt;mit&gt; &amp; Zeichen</p>'),
   'service descriptions are safely escaped in index fallback');
const changedServices = C.setServiceField(
  fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n.de.js'), 'utf8'),
  's1text', 'Text mit "Anführungszeichen" und Zeile\nzwei'
);
ok(changedServices && changedServices.includes("s1text: 'Text mit \"Anführungszeichen\" und Zeile\\nzwei'"),
   'service dictionary value is safely escaped and written');
const slideFallbacks = C.writeSlideFallbacks(orig, {
  1: { kicker: 'Kicker & Co', h1: '<span>Neu</span><br/>Titel', sub: 'Untertitel 1' },
  2: { kicker: 'Slide zwei', h1: '<span>Das</span> bin ich', sub: 'Untertitel 2' },
  3: { kicker: 'Drei', title: 'Titel <ohne> HTML', sub: 'Untertitel 3' }
});
ok(slideFallbacks.includes('data-i18n="slide1.kicker">Kicker &amp; Co</p>'),
   'slide header fallback text is safely escaped');
ok(slideFallbacks.includes('data-i18n-html="slide1.h1"><span>Neu</span><br/>Titel</h2>'),
   'slide main heading fallback preserves supported HTML');
ok(slideFallbacks.includes('data-i18n="slide3.title">Titel &lt;ohne&gt; HTML</h2>'),
   'plain slide title fallback is escaped as text');
const changedSlideDict = C.setSlideField(
  fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n.de.js'), 'utf8'),
  1, 'h1', '<span>Neuer Titel</span>'
);
ok(changedSlideDict && changedSlideDict.includes("h1: '<span>Neuer Titel</span>'"),
   'slide title dictionary value can be updated');
ok(C.parseServiceCount(orig) === 3, 'service section starts with three areas');
ok(C.writeServicesHtml(orig, 3) === orig, 'unchanged service count preserves the markup');
const fiveServices = C.writeServicesHtml(orig, 5);
ok(C.parseServiceCount(fiveServices) === 5, 'service markup supports five areas');
ok((fiveServices.match(/class="service_box/g) || []).length === 5,
   'service button markup contains exactly five areas');
ok(fiveServices.includes('data-i18n="services.box5"') &&
   fiveServices.includes('data-i18n="services.s5text"'),
   'new service button and slide markup use the fifth area keys');
ok(C.parseServiceCount(C.writeServicesHtml(orig, 1)) === 1,
   'service markup supports the minimum of one area');
const servicesFiveDict = C.setServices(
  fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n.de.js'), 'utf8'),
  { title: 'Services', box1: 'A', s1title: 'A', s1sub: 'A', s1text: 'A',
    box2: 'B', s2title: 'B', s2sub: 'B', s2text: 'B',
    box3: 'C', s3title: 'C', s3sub: 'C', s3text: 'C',
    box4: '', s4title: '', s4sub: '', s4text: '',
    box5: '', s5title: '', s5sub: '', s5text: '' }, 5
);
const servicesOneDict = C.setServices(servicesFiveDict, {
  title: 'Services', box1: 'A', s1title: 'A', s1sub: 'A', s1text: 'A'
}, 1);
ok(servicesOneDict && !/\b(?:box|s)[2-5](?:title|sub|text)?\s*:/.test(
  servicesOneDict.slice(servicesOneDict.indexOf('services:'))
), 'removing areas prunes their dictionary fields');
ok(C.serviceKeys(5).length === 21, 'service editor exposes all five-area fields');
const bumpedLang = C.bumpDictionaryVersion(orig, 'en');
ok(/i18n\.en\.js\?v=4/.test(bumpedLang), 'translated dictionary cache version increments');

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
ok(rp[0].image === 'images/folio/xyt.jpg', 'image preserved', rp[0].image);
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