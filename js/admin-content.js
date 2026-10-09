/* Content editor: edits the marker regions of index.html and the translation
   dictionaries directly. Shared parsing/writing lives in js/amcf-content.js. */
(function () {
	"use strict";

	var PW_HASH = '6db70435647eeba1749000dfcb18e0bbe1af1997fd14ef0361e305f34b17ad6e';
	var LANGS = ['de-ch', 'en', 'es', 'gl', 'pt'];
	var JOB_FIELDS = ['date', 'title', 'text', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7'];
	var FACT_VALUE_KEYS = ['name', 'address2', 'web', 'email', 'tel', 'nationV', 'birthV', 'licenseV', 'civilV', 'permitV'];
	var FACT_LABEL_KEYS = ['name', 'address', 'web', 'email', 'tel', 'nation', 'birth', 'license', 'civil', 'permit'];
	var CATEGORIES = [
		{ v: 'category_1', key: 'admin.cat.web' },
		{ v: 'category_2', key: 'admin.cat.ecommerce' },
		{ v: 'category_3', key: 'admin.cat.branding' },
		{ v: 'category_4', key: 'admin.cat.video' }
	];

	var state = {
		target: 'source',
		indexHtml: '',
		dicts: {},
		model: null,
		dirty: false
	};

	function $(id) { return document.getElementById(id); }
	function escHtml(s) {
		return String(s === null || s === undefined ? '' : s)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
	function t(key, fallback) {
		var lang = localStorage.getItem('amcf_lang') || 'de';
		var root = window.AMCF_I18N_LANGS && window.AMCF_I18N_LANGS[lang];
		var cur = root, parts = String(key).split('.');
		for (var i = 0; i < parts.length; i++) {
			if (!cur || typeof cur !== 'object') { return fallback; }
			cur = cur[parts[i]];
		}
		return typeof cur === 'string' ? cur : fallback;
	}
	function sha256(str) {
		if (!(window.crypto && crypto.subtle && crypto.subtle.digest)) {
			return Promise.reject(new Error('WebCrypto not available'));
		}
		return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (h) {
			return Array.prototype.map.call(new Uint8Array(h), function (b) {
				return ('0' + b.toString(16)).slice(-2);
			}).join('');
		});
	}
	function fetchText(url) {
		return fetch(url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now(), { cache: 'no-store' })
			.then(function (r) {
				if (!r.ok) { throw new Error(url + ' -> HTTP ' + r.status); }
				return r.text();
			});
	}

	/* ---------- loading ---------- */
	function loadAll() {
		$('acMsg').className = 'ac-msg';
		var jobs = [fetchText('index.html').then(function (txt) { state.indexHtml = txt; })];
		LANGS.forEach(function (lang) {
			jobs.push(fetchText('js/i18n.' + lang + '.js').then(function (txt) { state.dicts[lang] = txt; }));
		});
		return Promise.all(jobs).then(function () {
			readModel();
			renderAll();
			$('acMsg').className = 'ac-msg ok';
			$('acMsg').textContent = 'Geladen: index.html + ' + LANGS.length + ' Übersetzungsdateien.';
		}).catch(function (e) {
			$('acMsg').className = 'ac-msg err';
			$('acMsg').textContent = t('admin.loadFailed', 'Laden fehlgeschlagen') + ': ' + e.message;
		});
	}

	// Build the editable model for the current target.
	function readModel() {
		if (state.target === 'source') {
			state.model = C.parse(state.indexHtml);
			state.model.isSource = true;
			return;
		}
		var lang = state.target;
		var sandbox = { window: {} };
		try {
			// Evaluate a copy so we read real values without touching the loaded page.
			var fn = new Function('window', state.dicts[lang]);
			fn(sandbox.window);
		} catch (e) {
			state.model = null;
			return;
		}
		var D = sandbox.window.AMCF_I18N_LANGS[lang] || {};
		var base = C.parse(state.indexHtml);
		var m = { projects: [], jobs: {}, facts: {}, isSource: false };
		var items = (D.port && D.port.items) || [];
		var tags = (D.port && D.port.tags) || [];
		base.projects.forEach(function (p, i) {
			var it = items[i] || {};
			m.projects.push({
				index: p.index,
				name: p.name,
				image: p.image,
				category: p.category,
				tags: tags[i] !== undefined ? tags[i] : '',
				desc: it.desc || '',
				client: it.client || '',
				date: it.date || '',
				url: it.url || ''
			});
		});
		Object.keys(base.jobs).forEach(function (n) {
			var dj = (D.resume && D.resume['job' + n]) || {};
			var j = {};
			JOB_FIELDS.forEach(function (f) { j[f] = dj[f] !== undefined ? dj[f] : ''; });
			m.jobs[n] = j;
		});
		FACT_LABEL_KEYS.forEach(function (k) {
			var f = (D.resume && D.resume.facts) || {};
			m.facts[k] = f[k] !== undefined ? f[k] : '';
		});
		state.model = m;
	}

	/* ---------- rendering ---------- */
	function label(key, fallback) { return escHtml(t(key, fallback)); }

	function renderAll() {
		renderProjects();
		renderJobs();
		renderFacts();
		updateHint();
	}
	function updateHint() {
		var isSrc = state.target === 'source';
		$('acHint').textContent = isSrc
			? 'Bearbeitest index.html – dies ist die deutsche Quelle. Änderungen gelten für Besucher ohne Übersetzung.'
			: 'Bearbeitest die Übersetzung "' + state.target + '" in js/i18n.' + state.target + '.js.';
	}

	function field(labelKey, id, value, opts) {
		opts = opts || {};
		var v = escHtml(value === null || value === undefined ? '' : value);
		if (opts.multiline) {
			return '<div class="admin-field"><label for="' + id + '">' + label(labelKey, opts.fallback || labelKey) +
				'</label><textarea id="' + id + '" rows="' + (opts.rows || 4) + '">' + v + '</textarea></div>';
		}
		return '<div class="admin-field"><label for="' + id + '">' + label(labelKey, opts.fallback || labelKey) +
			'</label><input type="text" id="' + id + '" value="' + v + '"></div>';
	}

	function renderProjects() {
		var host = $('acPanelProjects');
		var isSrc = state.target === 'source';
		var html = '<p class="ac-hint">' + (isSrc
			? 'Name, Bild und Kategorie stehen nur in index.html und sind sprachneutral.'
			: 'Nur Tags und die Lightbox-Felder sind &uuml;bersetzbar; Namen/Bilder kommen aus index.html.') + '</p>';
		state.model.projects.forEach(function (p) {
			var idp = 'p' + p.index;
			var head = '<div class="ac-item-head"><h3>' + escHtml(p.name || ('#' + p.index)) +
				'</h3><span class="hidden-tag">' + escHtml(p.category) + '</span></div>';
			var body = '';
			if (isSrc) {
				body += field('admin.projectName', idp + '_name', p.name);
				body += field('admin.imageUrl', idp + '_image', p.image);
				body += '<div class="admin-field"><label for="' + idp + '_cat">' + label('admin.category', 'Kategorie') +
					'</label><select id="' + idp + '_cat">' + CATEGORIES.map(function (c) {
						return '<option value="' + c.v + '"' + (c.v === p.category ? ' selected' : '') + '>' +
							label(c.key, c.v) + '</option>';
					}).join('') + '</select></div>';
			}
			body += field('admin.tags', idp + '_tags', p.tags);
			body += field('admin.client', idp + '_client', p.client);
			body += field('admin.year', idp + '_date', p.date);
			body += field('admin.projectLink', idp + '_url', p.url);
			body += field('admin.projectDescription', idp + '_desc', p.desc, { multiline: true, rows: 3 });
			html += '<div class="ac-item">' + head + '<div class="admin-grid">' + body + '</div></div>';
		});
		host.innerHTML = html;
	}

	function renderJobs() {
		var host = $('acPanelJobs');
		var nums = Object.keys(state.model.jobs).map(Number).sort(function (a, b) { return a - b; });
		var html = '';
		nums.forEach(function (n) {
			var job = state.model.jobs[n];
			var idj = 'j' + n;
			var head = '<div class="ac-item-head"><h3>#' + n + ' &ndash; ' +
				escHtml(job.title || '') + '</h3></div>';
			var body = field('admin.period', idj + '_date', job.date);
			body += field('admin.title', idj + '_title', job.title);
			body += field('admin.resumeDescription', idj + '_text', job.text, { multiline: true, rows: 5 });
			body += '<div class="admin-field"><label>' + label('admin.item1', 'Aufzählung') + '</label>';
			for (var i = 1; i <= 7; i++) {
				body += '<input type="text" id="' + idj + '_l' + i + '" value="' +
					escHtml(job['l' + i] || '') + '" placeholder="l' + i + '">';
			}
			body += '</div>';
			html += '<div class="ac-item">' + head + '<div class="admin-grid">' + body + '</div></div>';
		});
		host.innerHTML = html;
	}

	function renderFacts() {
		var host = $('acPanelFacts');
		var isSrc = state.target === 'source';
		var keys = isSrc ? FACT_VALUE_KEYS : FACT_LABEL_KEYS;
		var html = '<p class="ac-hint">' + (isSrc
			? 'Die Werte stehen als data-fv in index.html.'
			: 'Die Beschriftungen stehen als resume.facts.* in der Übersetzung.') + '</p><div class="admin-grid">';
		keys.forEach(function (k) {
			html += field(isSrc ? 'admin.facts.' + k : 'admin.facts.' + k, 'f_' + k, state.model.facts[k]);
		});
		html += '</div>';
		host.innerHTML = html;
	}

	/* ---------- collecting edits ---------- */
	function collect() {
		var m = { projects: [], jobs: {}, facts: {} };
		var isSrc = state.target === 'source';
		state.model.projects.forEach(function (p, i) {
			var idp = 'p' + p.index;
			var out = { index: p.index, name: p.name, image: p.image, category: p.category,
				tags: val(idp + '_tags'), client: val(idp + '_client'),
				date: val(idp + '_date'), url: val(idp + '_url'), desc: val(idp + '_desc') };
			if (isSrc) {
				out.name = val(idp + '_name');
				out.image = val(idp + '_image');
				var sel = $(idp + '_cat');
				if (sel) { out.category = sel.value; }
			}
			m.projects.push(out);
		});
		Object.keys(state.model.jobs).forEach(function (n) {
			var idj = 'j' + n, j = {};
			JOB_FIELDS.forEach(function (f) { j[f] = val(idj + '_' + f); });
			m.jobs[n] = j;
		});
		(isSrc ? FACT_VALUE_KEYS : FACT_LABEL_KEYS).forEach(function (k) { m.facts[k] = val('f_' + k); });
		return m;
	}
	function val(id) { var el = $(id); return el ? el.value : ''; }

	/* ---------- building the files to write ---------- */
	function buildFiles(model) {
		var files = {};
		if (state.target === 'source') {
			files['index.html'] = C.write(state.indexHtml, model);
		} else {
			var lang = state.target;
			var src = state.dicts[lang];
			src = C.setPortTags(src, model.projects.map(function (p) { return p.tags; }));
			src = C.setPortItems(src, model.projects.map(function (p) {
				return { desc: p.desc, client: p.client, date: p.date, url: p.url };
			}));
			Object.keys(model.jobs).forEach(function (n) {
				JOB_FIELDS.forEach(function (f) {
					if (model.jobs[n][f] !== '') { src = C.setJobField(src, n, f, model.jobs[n][f]); }
				});
			});
			FACT_LABEL_KEYS.forEach(function (k) {
				if (model.facts[k] !== '') { src = C.setFactLabel(src, k, model.facts[k]); }
			});
			files['js/i18n.' + lang + '.js'] = src;
		}
		return files;
	}

	/* ---------- saving ---------- */
	function save() {
		var files = buildFiles(collect());
		var msg = $('acMsg');
		msg.className = 'ac-msg ok';
		msg.textContent = t('admin.saving', 'Wird gespeichert ...');
		return fetch('save-content.php', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ files: files })
		}).then(function (r) {
			return r.json().then(function (j) { return { ok: r.ok, j: j }; });
		}).then(function (res) {
			if (res.ok && res.j && res.j.ok) {
				msg.className = 'ac-msg ok';
				msg.textContent = t('admin.saved', 'Gespeichert.') + ' ' + Object.keys(res.j.written || {}).join(', ');
				if (files['index.html']) { state.indexHtml = files['index.html']; }
				Object.keys(files).forEach(function (f) {
					if (f.indexOf('js/i18n.') === 0) {
						state.dicts[f.slice(7, -3)] = files[f];
					}
				});
			} else {
				msg.className = 'ac-msg err';
				msg.textContent = t('admin.saveFailed', 'Speichern fehlgeschlagen') + ': ' +
					((res.j && res.j.error) || 'unknown');
			}
		}).catch(function (e) {
			msg.className = 'ac-msg err';
			msg.textContent = t('admin.saveFailed', 'Speichern fehlgeschlagen') + ': ' + e.message +
				' – stattdessen Datei herunterladen.';
		});
	}

	function download() {
		var files = buildFiles(collect());
		Object.keys(files).forEach(function (name, i) {
			var blob = new Blob([files[name]], { type: 'text/plain;charset=utf-8' });
			var a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = name.replace(/\//g, '__');
			document.body.appendChild(a);
			setTimeout(function () { a.click(); a.remove(); }, i * 250);
		});
		$('acMsg').className = 'ac-msg ok';
		$('acMsg').textContent = 'Download gestartet: ' + Object.keys(files).join(', ');
	}

	/* ---------- wiring ---------- */
	function bindTabs() {
		var tabs = document.querySelectorAll('.ac-tab');
		Array.prototype.forEach.call(tabs, function (tab) {
			tab.addEventListener('click', function () {
				Array.prototype.forEach.call(tabs, function (x) { x.classList.remove('on'); });
				tab.classList.add('on');
				['projects', 'jobs', 'facts'].forEach(function (p) {
					$('acPanel' + p.charAt(0).toUpperCase() + p.slice(1)).classList.toggle('admin-hidden', p !== tab.dataset.panel);
				});
			});
		});
	}

	document.addEventListener('DOMContentLoaded', function () {
		$('acLoginBtn').addEventListener('click', function () {
			var v = $('acPw').value;
			if (!v) { return; }
			sha256(v).then(function (h) {
				if (h !== PW_HASH) {
					$('acLoginMsg').className = 'ac-msg err';
					$('acLoginMsg').textContent = 'Falsches Passwort.';
					return;
				}
				$('acLogin').style.display = 'none';
				$('acApp').classList.remove('admin-hidden');
				bindTabs();
				loadAll();
			}).catch(function (e) {
				$('acLoginMsg').className = 'ac-msg err';
				$('acLoginMsg').textContent = e.message;
			});
		});
		$('acPw').addEventListener('keydown', function (e) {
			if (e.key === 'Enter') { $('acLoginBtn').click(); }
		});
		$('acTarget').addEventListener('change', function () {
			state.target = $('acTarget').value;
			readModel();
			renderAll();
		});
		$('acSave').addEventListener('click', function () { save(); });
		$('acDownload').addEventListener('click', function () { download(); });
	});
})();