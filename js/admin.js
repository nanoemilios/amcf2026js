(function () {
	"use strict";

	var PW_HASH = '6db70435647eeba1749000dfcb18e0bbe1af1997fd14ef0361e305f34b17ad6e'; // sha256("AMCF2026")
	var LS_KEY = 'amcf_local_projects';
	var LS_EDITS = 'amcf_local_edits';
	var LS_RESUME = 'amcf_local_resume';

	var RESUME_FACTS = ['name','street','address2','web','email','tel','nationV','birthV','licenseV','civilV','permitV'];
	var RESUME_JOBS = ['1','2','3','4','5','6','7','8','9','10'];
	var RESUME_JOB_FIELDS = ['date','title','text','l1','l2','l3','l4','l5','l6','l7'];
	// Values hardcoded in index.html (not in the i18n dicts)
	var RESUME_FACT_DEFAULTS = {
		name: 'Alberto Manuel Costa Ferreiro',
		web: 'www.albertocosta.info',
		email: 'info@albertocosta.info',
		tel: '+41 (0) 76 537 29 19'
	};

	var BASE_PROJECTS = [
		{ name: 'X&amp;T', image: 'images/folio/xyt.png', category: 'category_2' },
		{ name: 'Kalamos GmbH', image: 'images/folio/kalamos.png', category: 'category_3' },
		{ name: 'Tunight', image: 'images/folio/tunight.png', category: 'category_4' },
		{ name: 'O Mundo do T&eacute;', image: 'images/folio/omundodote.png', category: 'category_2' },
		{ name: 'Repera.net', image: 'images/folio/reperanet.png', category: 'category_1' },
		{ name: 'Royal Haus', image: 'images/folio/royalhaus.png', category: 'category_3' },
		{ name: 'IFC', image: 'images/folio/ifc.png', category: 'category_3' },
		{ name: 'Naturania.es', image: 'images/folio/naturania.png', category: 'category_1' }
	];

	var editIndex = null;
	var localEditIndex = null;
	var resumeJobImgs = [];
	var currentPwHash = null;

	function sha256(str) {
		if (window.crypto && crypto.subtle && crypto.subtle.digest) {
			var buf = new TextEncoder().encode(str);
			return crypto.subtle.digest('SHA-256', buf).then(function (h) {
				return Array.prototype.map.call(new Uint8Array(h), function (b) {
					return ('0' + b.toString(16)).slice(-2);
				}).join('');
			});
		}
		return Promise.reject(new Error('Kein WebCrypto verfügbar'));
	}

	function getProjects() {
		try {
			var raw = localStorage.getItem(LS_KEY);
			return raw ? JSON.parse(raw) : [];
		} catch (e) { return []; }
	}

	function saveProjects(list) {
		try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) {
			alert('Speichern fehlgeschlagen (localStorage voll?).');
			return false;
		}
		return true;
	}

	function getEdits() {
		try {
			var raw = localStorage.getItem(LS_EDITS);
			return raw ? JSON.parse(raw) : {};
		} catch (e) { return {}; }
	}

	function saveEdits(obj) {
		try { localStorage.setItem(LS_EDITS, JSON.stringify(obj)); } catch (e) {
			alert('Speichern fehlgeschlagen (localStorage voll?).');
			return false;
		}
		return true;
	}

	function getResume() {
		try {
			var raw = localStorage.getItem(LS_RESUME);
			return raw ? JSON.parse(raw) : { facts: {}, jobs: {}, newJobs: [] };
		} catch (e) { return { facts: {}, jobs: {}, newJobs: [] }; }
	}

	function saveResume(obj) {
		try { localStorage.setItem(LS_RESUME, JSON.stringify(obj)); } catch (e) {
			alert('Speichern fehlgeschlagen (localStorage voll?).');
			return false;
		}
		return true;
	}

	// German dict is the base/fallback for pre-filling the resume forms.
	function resumeBase() {
		var d = window.AMCF_I18N_LANGS && window.AMCF_I18N_LANGS.de && window.AMCF_I18N_LANGS.de.resume;
		return d || {};
	}

	function resumeEffFact(key) {
		var loc = getResume();
		if (loc.facts && loc.facts[key] !== undefined) { return loc.facts[key]; }
		if (RESUME_FACT_DEFAULTS[key] !== undefined) { return RESUME_FACT_DEFAULTS[key]; }
		var b = resumeBase();
		return (b.facts && b.facts[key] !== undefined) ? b.facts[key] : '';
	}

	function resumeEffJob(num, field) {
		var loc = getResume();
		if (loc.jobs && loc.jobs[num] && loc.jobs[num][field] !== undefined) { return loc.jobs[num][field]; }
		var b = resumeBase();
		return (b['job' + num] && b['job' + num][field] !== undefined) ? b['job' + num][field] : '';
	}

	function fillResumeFacts() {
		RESUME_FACTS.forEach(function (k) {
			document.getElementById('rf-' + k).value = resumeEffFact(k);
		});
	}

	function renderResumeJobs() {
		var wrap = document.getElementById('resumeJobList');
		var r = getResume();
		var edits = r.jobs || {};
		var newJobs = r.newJobs || [];
		var html = '';
		// new (user-added) entries are rendered first => appear at the top of the list
		newJobs.forEach(function (job, i) {
			var title = (job && job.title) ? job.title : '(Neuer Eintrag)';
			html += '<div class="admin-list-item"><span style="color:#c0392b;font-weight:700;">Neu</span> <span>' + esc(title) + '</span>' +
				'<span style="flex:1;"></span>' +
				'<button type="button" class="edit" data-jobedit="new' + i + '">Bearbeiten</button>' +
				'<button type="button" class="del" data-jobdel="new' + i + '" style="color:#c0392b;">Entfernen</button></div>';
		});
		RESUME_JOBS.forEach(function (num) {
			var title = resumeEffJob(num, 'title');
			var edited = edits[num] ? ' <span class="hidden-tag">bearbeitet</span>' : '';
			html += '<div class="admin-list-item"><span>Job ' + num + ': ' + esc(title) + edited + '</span>' +
				'<span style="flex:1;"></span>' +
				'<button type="button" class="edit" data-jobedit="' + num + '">Bearbeiten</button>' +
				'<button type="button" class="del" data-jobreset="' + num + '" style="color:#8f8f8f;">Reset</button></div>';
		});
		wrap.innerHTML = html;
	}

	function renderResume() {
		fillResumeFacts();
		renderResumeJobs();
	}

	function fillJobForm(num) {
		var r = getResume();
		var newJobs = r.newJobs || [];
		if (num === 'new') {
			// creating a brand-new entry (empty form)
			RESUME_JOB_FIELDS.forEach(function (f) { document.getElementById('rj-' + f).value = ''; });
			document.getElementById('rj-imgs').value = '';
			document.getElementById('rj-imgfiles').value = '';
			resumeJobImgs = [];
			renderJobImgs();
			document.getElementById('jobEditTitle').textContent = 'Neuen Eintrag hinzuf&uuml;gen';
			document.getElementById('resumeJobEdit').setAttribute('data-num', 'new');
			document.getElementById('resumeJobEdit').classList.remove('admin-hidden');
			return;
		}
		if (/^new\d+$/.test(num)) {
			// editing an existing new entry
			var idx = parseInt(num.slice(3), 10);
			var job = newJobs[idx] || {};
			RESUME_JOB_FIELDS.forEach(function (f) {
				document.getElementById('rj-' + f).value = (job[f] !== undefined) ? job[f] : '';
			});
			document.getElementById('rj-imgs').value = '';
			document.getElementById('rj-imgfiles').value = '';
			resumeJobImgs = Array.isArray(job.imgs) ? job.imgs.slice() : [];
			renderJobImgs();
			document.getElementById('jobEditTitle').textContent = 'Neuen Eintrag bearbeiten';
			document.getElementById('resumeJobEdit').setAttribute('data-num', num);
			document.getElementById('resumeJobEdit').classList.remove('admin-hidden');
			return;
		}
		RESUME_JOB_FIELDS.forEach(function (f) {
			document.getElementById('rj-' + f).value = resumeEffJob(num, f);
		});
		document.getElementById('rj-imgs').value = '';
		document.getElementById('rj-imgfiles').value = '';

		var imgs = [];
		var base = resumeBase();
		if (base['job' + num] && Array.isArray(base['job' + num].imgs)) {
			imgs = imgs.concat(base['job' + num].imgs);
		}
		var loc = getResume();
		if (loc.jobs && loc.jobs[num] && Array.isArray(loc.jobs[num].imgs)) {
			imgs = imgs.concat(loc.jobs[num].imgs);
		}
		// dedupe
		var seen = {};
		resumeJobImgs = [];
		imgs.forEach(function (s) {
			s = String(s).trim();
			if (s && !seen[s]) { seen[s] = true; resumeJobImgs.push(s); }
		});
		renderJobImgs();
		document.getElementById('jobEditTitle').textContent = 'Eintrag ' + num + ' bearbeiten';
		document.getElementById('resumeJobEdit').setAttribute('data-num', num);
		document.getElementById('resumeJobEdit').classList.remove('admin-hidden');
	}

	function renderJobImgs() {
		var $pv = document.getElementById('rj-preview');
		if (!resumeJobImgs.length) { $pv.innerHTML = ''; return; }
		var html = '';
		resumeJobImgs.forEach(function (src, i) {
			html += '<div class="jmx"><img src="' + esc(src) + '"><button type="button" class="jmx-del" data-jdel="' + i + '">&times;</button></div>';
		});
		$pv.innerHTML = html;
	}

	function cleanResume() {
		var loc = getResume();
		var out = { facts: {}, jobs: {}, newJobs: [] };
		if (loc.facts) {
			RESUME_FACTS.forEach(function (k) {
				var v = loc.facts[k];
				if (v !== undefined && v !== null && String(v).trim() !== '') { out.facts[k] = String(v); }
			});
		}
if (loc.jobs) {
		RESUME_JOBS.forEach(function (num) {
			var j = loc.jobs[num];
			if (!j) { return; }
			var c = {};
			RESUME_JOB_FIELDS.forEach(function (f) {
				var v = j[f];
				if (v !== undefined && v !== null && String(v).trim() !== '') { c[f] = String(v).trim(); }
			});
			if (Array.isArray(j.imgs) && j.imgs.length) { c.imgs = j.imgs; }
			if (Object.keys(c).length) { out.jobs[num] = c; }
		});
	}
	if (Array.isArray(loc.newJobs)) {
		loc.newJobs.forEach(function (j) {
			if (!j || typeof j !== 'object') { return; }
			var c = {};
			RESUME_JOB_FIELDS.forEach(function (f) {
				var v = j[f];
				if (v !== undefined && v !== null && String(v).trim() !== '') { c[f] = String(v).trim(); }
			});
			if (Array.isArray(j.imgs) && j.imgs.length) { c.imgs = j.imgs; }
			if (Object.keys(c).length) { out.newJobs.push(c); }
		});
	}
		return out;
	}

	function esc(s) {
		return String(s == null ? '' : s)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}

	function stripHtml(s) {
		var d = document.createElement('div');
		d.innerHTML = s == null ? '' : String(s);
		return d.textContent || '';
	}

	function showErr(msg) {
		var el = document.getElementById('adminError');
		el.textContent = msg;
		el.style.display = 'block';
	}

	function showMsg(msg) {
		var el = document.getElementById('saveMsg');
		el.textContent = msg;
		el.style.display = 'block';
		setTimeout(function () { el.style.display = 'none'; }, 5000);
	}

	function readImageFile(file) {
		return new Promise(function (resolve) {
			if (!file) { resolve(''); return; }
			var reader = new FileReader();
			reader.onload = function () { resolve(reader.result); };
			reader.onerror = function () { resolve(''); };
			reader.readAsDataURL(file);
		});
	}

	function getEffectiveExisting(i) {
		var edits = getEdits();
		var e = edits[i] || {};
		var base = BASE_PROJECTS[i] || {};
		return {
			name: e.name !== undefined ? e.name : stripHtml(base.name),
			image: e.image !== undefined ? e.image : (base.image || ''),
			category: e.category !== undefined ? e.category : (base.category || 'category_1'),
			tags: e.tags !== undefined ? e.tags : '',
			desc: e.desc !== undefined ? e.desc : '',
			client: e.client !== undefined ? e.client : '',
			date: e.date !== undefined ? e.date : '',
			url: e.url !== undefined ? e.url : '',
			hidden: !!e.hidden
		};
	}

	function renderExisting() {
		var wrap = document.getElementById('existingList');
		var edits = getEdits();
		var html = '<h3 style="font-family:Oswald;font-size:15px;text-transform:uppercase;color:#fff;margin:24px 0 10px;">Bestehende Projekte (' + BASE_PROJECTS.length + ')</h3>';
		BASE_PROJECTS.forEach(function (base, i) {
			var eff = getEffectiveExisting(i);
			var edited = edits[i] ? ' <span class="hidden-tag">bearbeitet</span>' : '';
			var hidden = eff.hidden ? ' <span class="hidden-tag">verborgen</span>' : '';
			html += '<div class="admin-list-item"><span>' + esc(eff.name) + hidden + edited + '</span>' +
				'<span style="flex:1;"></span>' +
				'<button type="button" class="edit" data-edit="' + i + '">Bearbeiten</button>' +
				'<button type="button" class="del" data-hide="' + i + '">' + (eff.hidden ? 'Einblenden' : 'Ausblenden') + '</button>' +
				'<button type="button" class="del" data-reset="' + i + '" style="color:#8f8f8f;">Reset</button></div>';
		});
		wrap.innerHTML = html;
	}

	function renderLocal() {
		var list = getProjects();
		var wrap = document.getElementById('localList');
		if (list.length === 0) { wrap.innerHTML = ''; return; }
		var html = '<h3 style="font-family:Oswald;font-size:15px;text-transform:uppercase;color:#fff;margin:24px 0 10px;">Lokale Projekte (' + list.length + ')</h3>';
		list.forEach(function (p, i) {
			html += '<div class="admin-list-item"><span>' + esc(p.name) + '</span>' +
				'<button type="button" class="edit" data-localedit="' + i + '">Bearbeiten</button>' +
				'<button type="button" class="del" data-localdel="' + i + '">Entfernen</button></div>';
		});
		wrap.innerHTML = html;
	}

	function renderAll() {
		renderExisting();
		renderLocal();
		renderResume();
	}

	function clearForm() {
		['pName','pTags','pImageUrl','pDesc','pClient','pDate','pUrl'].forEach(function (id) {
			document.getElementById(id).value = '';
		});
		document.getElementById('pCategory').value = 'category_1';
		document.getElementById('pImageFile').value = '';
		editIndex = null;
		localEditIndex = null;
		document.getElementById('formTitle').textContent = 'Neues Projekt';
		document.getElementById('addBtn').textContent = 'Projekt hinzufügen';
		document.getElementById('cancelEditBtn').classList.add('admin-hidden');
	}

	function fillForm(p) {
		document.getElementById('pName').value = p.name || '';
		document.getElementById('pCategory').value = p.category || 'category_1';
		document.getElementById('pTags').value = p.tags || '';
		document.getElementById('pImageUrl').value = (p.image || '').indexOf('data:') === 0 ? '' : (p.image || '');
		document.getElementById('pDesc').value = p.desc || '';
		document.getElementById('pClient').value = p.client || '';
		document.getElementById('pDate').value = p.date || '';
		document.getElementById('pUrl').value = p.url || '';
	}

	function collectForm() {
		return {
			name: document.getElementById('pName').value.trim(),
			category: document.getElementById('pCategory').value,
			tags: document.getElementById('pTags').value.trim(),
			imageUrl: document.getElementById('pImageUrl').value.trim(),
			desc: document.getElementById('pDesc').value.trim(),
			client: document.getElementById('pClient').value.trim(),
			date: document.getElementById('pDate').value.trim(),
			url: document.getElementById('pUrl').value.trim()
		};
	}

	function cleanEdits() {
		var edits = getEdits();
		var out = {};
		Object.keys(edits).forEach(function (k) {
			var e = edits[k];
			if (!e) { return; }
			if (e.hidden) { out[k] = { hidden: true }; return; }
			var c = {};
			['name','category','tags','image','desc','client','date','url'].forEach(function (f) {
				if (e[f] !== undefined && e[f] !== null && e[f] !== '') { c[f] = e[f]; }
			});
			if (Object.keys(c).length) { out[k] = c; }
		});
		return out;
	}

	function generateDataFile() {
		var edits = cleanEdits();
		var projects = getProjects();
		var now = new Date();
		var stamp = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' +
			String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' +
			String(now.getMinutes()).padStart(2, '0');
		var payload = { edits: edits, projects: projects, resume: cleanResume() };
		return '/* ============================================================\n' +
			'   AMCF Website-Daten (Projekte-Overrides & lokale Projekte)\n' +
			'   Generiert am ' + stamp + ' aus der Admin-Seite.\n' +
			'   Diese Datei nach data/projects.js kopieren (Ordner 2026/data/)\n' +
			'   und die Website neu hochladen. Siehe Kommentar in data/projects.js.\n' +
			'   ============================================================ */\n' +
			'window.AMCF_SITE_DATA = ' + JSON.stringify(payload, null, '\t') + ';';
	}

	function downloadDataFile() {
		var blob = new Blob([generateDataFile()], { type: 'application/javascript' });
		var a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'projects.js';
		document.body.appendChild(a);
		a.click();
		setTimeout(function () {
			URL.revokeObjectURL(a.href);
			a.remove();
		}, 1000);
		showMsg('projects.js heruntergeladen. Datei in den Ordner 2026/data/ legen und die Seite neu hochladen, damit alle Besucher die Änderungen sehen.');
	}

	function generateExportCode() {
		var parts = [];

		// edits of existing projects -> items overrides
		var edits = getEdits();
		var editIdx = Object.keys(edits).filter(function (k) {
			var e = edits[k];
			return e && (e.desc || e.client || e.date || e.url || e.tags || e.name || e.image || e.category || e.hidden);
		}).sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });

		editIdx.forEach(function (k) {
			var i = parseInt(k, 10);
			var eff = getEffectiveExisting(i);
			if (eff.hidden) {
				parts.push('// index ' + i + ' (' + eff.name + ') – AUSGEBLENDET: port.items[' + i + '] = null entfernen bzw. item löschen');
				return;
			}
			var line = "port.items[" + i + "] = { desc: '" + esc(eff.desc).replace(/'/g, "\\'") +
				"', client: '" + esc(eff.client).replace(/'/g, "\\'") +
				"', date: '" + esc(eff.date).replace(/'/g, "\\'") +
				"', url: '" + esc(eff.url).replace(/'/g, "\\'") + "' };";
			parts.push(line);
			if (eff.tags || eff.image || eff.category) {
				parts.push('// HTML-Anpassung index ' + i + ' (' + esc(eff.name) + '): img-src="' + esc(eff.image) + '", mix-Klasse "' + eff.category + '", h6="' + esc(eff.tags) + '"');
			}
		});

		// new local projects
		var list = getProjects();
		if (list.length) {
			if (parts.length) { parts.push(''); }
			parts.push('// Neue Projekte als port.items-Elemente (in das Array an das Ende einfügen):');
			list.forEach(function (p, i) {
				parts.push("{ desc: '" + p.desc.replace(/'/g, "\\'") + "', client: '" +
					p.client.replace(/'/g, "\\'") + "', date: '" + p.date.replace(/'/g, "\\'") +
					"', url: '" + p.url.replace(/'/g, "\\'") + "' }");
			});
			parts.push('');
			parts.push('// HTML: In index.html in <ul id="folio_container"> diese <li> einfügen (data-project-Nummern weiterzählen):');
			list.forEach(function (p, i) {
				parts.push('<li class="box mix ' + p.category + ' mix_all">\n  <a href="#" class="folio-open" data-project="' + (8 + i) + '">\n    <img src="' + p.image + '" class="respimg" alt="" title="">\n    <div class="folio-name clear"><div class="folio-overlay"><span class="overlay red"></span><h4>' + esc(p.name) + '</h4><h6>' + esc(p.tags) + '</h6></div></div>\n  </a>\n</li>');
			});
		}

		var pre = document.getElementById('exportCode');
		pre.textContent = parts.join('\n') || 'Keine Änderungen vorhanden.';
		pre.style.display = 'block';
	}

	// baut den kompletten Datenstand (Projekte + Lebenslauf) auf
	function buildPayload() {
		return { edits: cleanEdits(), projects: getProjects(), resume: cleanResume() };
	}

	// sendet den Stand an save.php (schreibt data/projects.js auf dem Server)
	function pushToServer() {
		if (!currentPwHash) { return Promise.resolve(false); }
		return fetch('save.php', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ pwHash: currentPwHash, data: buildPayload() })
		}).then(function (r) {
			return r.json();
		}).then(function (j) {
			return !!(j && j.ok);
		}).catch(function () {
			return false;
		});
	}

	// speichert lokal + überträgt an den Server, dann Rückmeldung zeigen
	function syncNow(successText) {
		if (!currentPwHash) { showMsg(successText); return; }
		pushToServer().then(function (ok) {
			if (ok) { showMsg(successText + ' – für alle Besucher sofort verfügbar.'); }
			else { showMsg(successText + '. ACHTUNG: Server-Speicherung fehlgeschlagen – bitte „Datei data/projects.js herunterladen" und manuell hochladen.'); }
		});
	}

	document.addEventListener('DOMContentLoaded', function () {
		var loginBtn = document.getElementById('loginBtn');
		var pw = document.getElementById('pw');
		var loginBox = document.getElementById('adminLogin');
		var app = document.getElementById('adminApp');

		function attemptLogin() {
			var val = pw.value;
			if (!val) { showErr('Bitte Passwort eingeben.'); return; }
			sha256(val).then(function (h) {
				if (h === PW_HASH) {
					currentPwHash = h;
					loginBox.style.display = 'none';
					app.classList.remove('admin-hidden');
					renderAll();
				} else {
					showErr('Falsches Passwort.');
				}
			}).catch(function (e) {
				showErr(e.message);
			});
		}

		loginBtn.addEventListener('click', attemptLogin);
		pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') { attemptLogin(); } });

		resumeAppReady();

		document.getElementById('addBtn').addEventListener('click', function () {
			var f = collectForm();
			if (!f.name) { showMsg('Bitte Projektname eingeben.'); return; }

			if (editIndex !== null) {
				// save override for existing project
				var edits = getEdits();
				var existing = edits[editIndex] || {};
				existing.name = f.name;
				existing.category = f.category;
				existing.tags = f.tags;
				existing.desc = f.desc;
				existing.client = f.client;
				existing.date = f.date;
				existing.url = f.url;
				if (f.imageUrl) { existing.image = f.imageUrl; }
				else if (!existing.image) { existing.image = ''; }
				edits[editIndex] = existing;
				if (!saveEdits(edits)) { return; }
				clearForm();
				renderAll();
				syncNow('Projekt ' + f.name + ' aktualisiert');
				return;
			}

			if (localEditIndex !== null) {
				var list = getProjects();
				var target = list[localEditIndex];
				if (!target) { clearForm(); renderAll(); return; }
				target.name = f.name;
				target.category = f.category;
				target.tags = f.tags;
				target.desc = f.desc;
				target.client = f.client;
				target.date = f.date;
				target.url = f.url;
				if (f.imageUrl) { target.image = f.imageUrl; }
				if (!saveProjects(list)) { return; }
				clearForm();
				renderAll();
				syncNow('Lokales Projekt aktualisiert');
				return;
			}

			var fileInput = document.getElementById('pImageFile');
			var done = function (dataUrl) {
				var finalImage = f.imageUrl || dataUrl || '';
				if (!finalImage) { showMsg('Bitte Bild-URL wählen oder Datei hochladen.'); return; }
				var list = getProjects();
				list.push({
					name: f.name, category: f.category, tags: f.tags, image: finalImage,
					desc: f.desc, client: f.client, date: f.date, url: f.url
				});
				if (!saveProjects(list)) { return; }
				clearForm();
				renderAll();
				syncNow('Projekt gespeichert');
			};
			if (fileInput.files && fileInput.files.length) {
				readImageFile(fileInput.files[0]).then(done);
			} else {
				done('');
			}
		});

		document.getElementById('cancelEditBtn').addEventListener('click', function () {
			clearForm();
		});

		document.getElementById('existingList').addEventListener('click', function (e) {
			var editBtn = e.target.closest('.edit[data-edit]');
			if (editBtn) {
				var i = parseInt(editBtn.getAttribute('data-edit'), 10);
				var eff = getEffectiveExisting(i);
				fillForm({ name: eff.name, category: eff.category, tags: eff.tags, image: eff.image, desc: eff.desc, client: eff.client, date: eff.date, url: eff.url });
				editIndex = i;
				document.getElementById('formTitle').textContent = 'Projekt bearbeiten (Index ' + i + ')';
				document.getElementById('addBtn').textContent = 'Änderungen speichern';
				document.getElementById('cancelEditBtn').classList.remove('admin-hidden');
				document.getElementById('formTitle').scrollIntoView({ behavior: 'smooth' });
				return;
			}
			var hideBtn = e.target.closest('.del[data-hide]');
			if (hideBtn) {
				var hi = parseInt(hideBtn.getAttribute('data-hide'), 10);
				var edits = getEdits();
				var cur = edits[hi] || {};
				cur.hidden = !cur.hidden;
				edits[hi] = cur;
				saveEdits(edits);
				renderAll();
				syncNow('Projekt ' + (cur.hidden ? 'ausgeblendet' : 'eingeblendet'));
				return;
			}
			var resetBtn = e.target.closest('.del[data-reset]');
			if (resetBtn) {
				var ri = parseInt(resetBtn.getAttribute('data-reset'), 10);
				var edits2 = getEdits();
				delete edits2[ri];
				saveEdits(edits2);
				renderAll();
				syncNow('Projekt zurückgesetzt');
			}
		});

		document.getElementById('localList').addEventListener('click', function (e) {
			var editBtn = e.target.closest('.edit[data-localedit]');
			if (editBtn) {
				var li = parseInt(editBtn.getAttribute('data-localedit'), 10);
				var list = getProjects();
				var p = list[li];
				fillForm({ name: p.name, category: p.category, tags: p.tags, image: p.image, desc: p.desc, client: p.client, date: p.date, url: p.url });
				localEditIndex = li;
				editIndex = null;
				document.getElementById('formTitle').textContent = 'Lokales Projekt bearbeiten';
				document.getElementById('addBtn').textContent = 'Änderungen speichern';
				document.getElementById('cancelEditBtn').classList.remove('admin-hidden');
				document.getElementById('formTitle').scrollIntoView({ behavior: 'smooth' });
				return;
			}
			var delBtn = e.target.closest('.del[data-localdel]');
			if (delBtn) {
				var di = parseInt(delBtn.getAttribute('data-localdel'), 10);
				var l2 = getProjects();
				if (di >= 0 && di < l2.length) { l2.splice(di, 1); saveProjects(l2); renderAll(); syncNow('Lokales Projekt entfernt'); }
			}
		});

		document.getElementById('genCodeBtn').addEventListener('click', generateExportCode);
		document.getElementById('dlDataBtn').addEventListener('click', downloadDataFile);

		// Lebenslauf: Fakten
		document.getElementById('saveFactsBtn').addEventListener('click', function () {
			var r = getResume();
			r.facts = {};
			RESUME_FACTS.forEach(function (k) {
				var v = document.getElementById('rf-' + k).value.trim();
				if (v) { r.facts[k] = v; }
			});
			if (!saveResume(r)) { return; }
			renderResume();
			syncNow('Persönliche Fakten gespeichert');
		});
		document.getElementById('resetFactsBtn').addEventListener('click', function () {
			var r = getResume();
			r.facts = {};
			saveResume(r);
			fillResumeFacts();
			syncNow('Persönliche Fakten auf Standard zurückgesetzt');
		});

		function collectJobFields() {
		var c = {};
		RESUME_JOB_FIELDS.forEach(function (f) {
			var v = document.getElementById('rj-' + f).value.trim();
			if (v) { c[f] = v; }
		});
		return c;
	}

	// images are collected live into resumeJobImgs (URLs + uploaded files)
	function collectJobImgs() {
		return Promise.resolve(resumeJobImgs.slice());
	}

	function resumeAppReady() {
		// Lebenslauf: Einträge
		document.getElementById('rj-imgfiles').addEventListener('change', function (ev) {
			var files = ev.target.files;
			if (!files || !files.length) { return; }
			var readers = [];
			for (var i = 0; i < files.length; i++) {
				readers.push(readImageFile(files[i]).then(function (dataUrl) {
					if (dataUrl) { resumeJobImgs.push(dataUrl); }
				}));
			}
			Promise.all(readers).then(function () {
				document.getElementById('rj-imgfiles').value = '';
				renderJobImgs();
			});
		});
		document.getElementById('rj-imgs-add').addEventListener('click', function () {
			var v = document.getElementById('rj-imgs').value.trim();
			if (!v) { return; }
			v.split(/[\n,]+/).forEach(function (s) {
				s = s.trim();
				if (s && resumeJobImgs.indexOf(s) === -1) { resumeJobImgs.push(s); }
			});
			document.getElementById('rj-imgs').value = '';
			renderJobImgs();
		});
		document.getElementById('rj-preview').addEventListener('click', function (e) {
			var btn = e.target.closest('.jmx-del');
			if (!btn) { return; }
			var idx = parseInt(btn.getAttribute('data-jdel'), 10);
			if (idx >= 0 && idx < resumeJobImgs.length) {
				resumeJobImgs.splice(idx, 1);
				renderJobImgs();
			}
		});
		document.getElementById('addJobBtn').addEventListener('click', function () {
			fillJobForm('new');
			document.getElementById('resumeJobEdit').scrollIntoView({ behavior: 'smooth' });
		});
		document.getElementById('resumeJobList').addEventListener('click', function (e) {
			var editBtn = e.target.closest('.edit[data-jobedit]');
			if (editBtn) {
				fillJobForm(editBtn.getAttribute('data-jobedit'));
				document.getElementById('resumeJobEdit').scrollIntoView({ behavior: 'smooth' });
				return;
			}
			var resetBtn = e.target.closest('.del[data-jobreset]');
			if (resetBtn) {
				var num = resetBtn.getAttribute('data-jobreset');
				var r = getResume();
				if (!r.jobs) { r.jobs = {}; }
				delete r.jobs[num];
				saveResume(r);
				renderResumeJobs();
				syncNow('Lebenslauf-Eintrag zurückgesetzt');
			}
			var delBtn = e.target.closest('.del[data-jobdel]');
			if (delBtn) {
				var key = delBtn.getAttribute('data-jobdel');
				var idx = parseInt(key.slice(3), 10);
				var rr = getResume();
				if (Array.isArray(rr.newJobs) && idx >= 0 && idx < rr.newJobs.length) {
					rr.newJobs.splice(idx, 1);
					saveResume(rr);
					renderResumeJobs();
					syncNow('Lebenslauf-Eintrag entfernt');
				}
			}
		});
		document.getElementById('saveJobBtn').addEventListener('click', function () {
			var box = document.getElementById('resumeJobEdit');
			var num = box.getAttribute('data-num');
			if (!num) { return; }
			var r = getResume();
			if (!r.jobs) { r.jobs = {}; }
			if (!Array.isArray(r.newJobs)) { r.newJobs = []; }
			var c = collectJobFields();
			collectJobImgs().then(function (imgs) {
				if (imgs.length) { c.imgs = imgs; }
				if (num === 'new') {
					// new entries are inserted at the top (index 0)
					r.newJobs.unshift(c);
				} else if (/^new\d+$/.test(num)) {
					var idx = parseInt(num.slice(3), 10);
					if (idx >= 0 && idx < r.newJobs.length) { r.newJobs[idx] = c; }
				} else {
					r.jobs[num] = c;
				}
				if (!saveResume(r)) { return; }
				box.classList.add('admin-hidden');
				renderResumeJobs();
				syncNow('Lebenslauf-Eintrag gespeichert');
			});
		});
		document.getElementById('cancelJobBtn').addEventListener('click', function () {
			document.getElementById('resumeJobEdit').classList.add('admin-hidden');
		});
	}
	});
})();