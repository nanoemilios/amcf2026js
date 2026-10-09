/* Content editor: edits the marker regions of index.html and the translation
   dictionaries directly. Shared parsing/writing lives in js/amcf-content.js. */
(function () {
	"use strict";

	// js/amcf-content.js is a UMD module: it exports to module.exports under
	// Node and to window.AMCFContent in the browser.
	var C = window.AMCFContent;
	if (!C) {
		document.addEventListener('DOMContentLoaded', function () {
			var m = document.getElementById('acMsg');
			if (m) { m.className = 'ac-msg err'; m.textContent = 'js/amcf-content.js did not load.'; }
		});
	}

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
			// entry images live in the markup, so they are only editable in the source
			state.model.images = C.parseJobImages(state.indexHtml);
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
		var D = (sandbox.window.AMCF_I18N_LANGS && sandbox.window.AMCF_I18N_LANGS[lang]) || {};
		var base = C.parse(state.indexHtml);
		var m = { projects: [], jobs: {}, facts: {}, images: {}, jobKeys: {}, isSource: false };
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
			// remember which keys the dictionary already had, so clearing a
			// field in the form clears it in the file instead of being skipped
			m.jobKeys[n] = Object.keys(dj);
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
		if (!state.model) {
			$('acMsg').className = 'ac-msg err';
			$('acMsg').textContent = t('admin.loadFailed', 'Laden fehlgeschlagen') +
				': could not read ' + (state.target === 'source' ? 'index.html' : 'js/i18n.' + state.target + '.js');
			['acPanelProjects', 'acPanelJobs', 'acPanelFacts'].forEach(function (id) {
				var el = $(id);
				if (el) { el.innerHTML = ''; }
			});
			return;
		}
		renderProjects();
		renderJobs();
		renderFacts();
		updateHint();
		bindPanelActions();
	}

	// The add buttons are recreated on every render, so they are rebound each time.
// The delete buttons are handled by delegation bound once in the setup below.
	function bindPanelActions() {
		var addP = $('acAddProject');
		if (addP) { addP.addEventListener('click', addProject); }
		var addJ = $('acAddJob');
		if (addJ) { addJ.addEventListener('click', addJob); }
	}

	function bindDelegates() {
		var pHost = $('acPanelProjects');
		if (pHost) {
			pHost.addEventListener('click', function (e) {
				var b = e.target.closest('[data-del-project]');
				if (b) { delProject(parseInt(b.getAttribute('data-del-project'), 10)); }
			});
		}
		var jHost = $('acPanelJobs');
		if (jHost) {
			jHost.addEventListener('click', function (e) {
				var del = e.target.closest('[data-del-job]');
				if (del) { delJob(parseInt(del.getAttribute('data-del-job'), 10)); return; }
				var add = e.target.closest('[data-addimg]');
				if (add) { addImageRow(add.getAttribute('data-addimg')); return; }
				var rm = e.target.closest('[data-rmimg]');
				if (rm) { removeImageRow(rm); }
			});
			jHost.addEventListener('change', function (e) {
				if (e.target.matches('input[type=file][id^="acUp"]')) {
					handleEntryUpload(e.target, e.target.id.replace('acUp', ''));
				}
			});
		}
		var pHost2 = $('acPanelProjects');
		if (pHost2) {
			pHost2.addEventListener('change', function (e) {
				if (!e.target.matches('input[type=file][data-upproject]')) { return; }
				handleProjectUpload(e.target, parseInt(e.target.getAttribute('data-upproject'), 10));
			});
		}
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
		if (isSrc) {
			html += '<p><button type="button" class="admin-btn" id="acAddProject" data-i18n="admin.addProject">Projekt hinzuf&uuml;gen</button></p>';
		} else {
			html += '<p class="ac-hint">Neue Projekte werden im Bereich <strong>index.html (Deutsch)</strong> angelegt, damit sie in allen Sprachen existieren.</p>';
		}
		state.model.projects.forEach(function (p) {
			var idp = 'p' + p.index;
			var head = '<div class="ac-item-head"><h3>' + escHtml(p.name || ('#' + p.index)) +
				'</h3><span class="hidden-tag">' + escHtml(p.category) + '</span>' +
				(isSrc ? '<button type="button" class="admin-btn ghost" data-del-project="' + p.index +
					'" data-i18n="admin.delete">L&ouml;schen</button>' : '') + '</div>';
			var body = '';
			if (isSrc) {
				body += field('admin.projectName', idp + '_name', p.name);
				body += field('admin.imageUrl', idp + '_image', p.image) +
					'<input type="file" accept="image/*" data-upproject="' + p.index + '">';
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
		var isSrc = state.target === 'source';
		var nums = Object.keys(state.model.jobs).map(Number).sort(function (a, b) { return a - b; });
		var html = '<p><button type="button" class="admin-btn" id="acAddJob" data-i18n="admin.addEntry">Neuer Eintrag (oben)</button></p>';
		nums.forEach(function (n) {
			var job = state.model.jobs[n];
			var idj = 'j' + n;
			var head = '<div class="ac-item-head"><h3>#' + n + ' &ndash; ' +
				escHtml(job.title || '') + '</h3>' +
				'<button type="button" class="admin-btn ghost" data-del-job="' + n +
				'" data-i18n="admin.delete">L&ouml;schen</button></div>';
			var body = field('admin.period', idj + '_date', job.date);
			body += field('admin.title', idj + '_title', job.title);
			body += field('admin.resumeDescription', idj + '_text', job.text, { multiline: true, rows: 5 });
			body += '<div class="admin-field"><label>' + label('admin.item1', 'Aufzählung') + '</label>';
			for (var i = 1; i <= 7; i++) {
				body += '<input type="text" id="' + idj + '_l' + i + '" value="' +
					escHtml(job['l' + i] || '') + '" placeholder="l' + i + '">';
			}
			body += '</div>';
			if (isSrc) { body += imagesBlock(n, state.model.images[n] || []); }
			html += '<div class="ac-item">' + head + '<div class="admin-grid">' + body + '</div></div>';
		});
		host.innerHTML = html;
	}

	function imagesBlock(num, list) {
		var rows = (list && list.length ? list : ['']).map(function (src, i) {
			return '<div class="ac-imgrow"><input type="text" data-imgjob="' + num +
				'" value="' + escHtml(src) + '" placeholder="images/resume/bild.jpg">' +
				'<button type="button" class="admin-btn ghost" data-rmimg="' + num + '|' + i +
				'" title="remove">&times;</button></div>';
		}).join('');
		return '<div class="admin-field ac-imgs"><label>' + label('admin.images', 'Bilder') + '</label>' +
			rows +
			'<button type="button" class="admin-btn ghost" data-addimg="' + num + '">+ Bild</button> ' +
			'<input type="file" id="acUp' + num + '" accept="image/*" multiple>' +
			'</div>';
	}

	function renderFacts() {
		var host = $('acPanelFacts');
		var isSrc = state.target === 'source';
		var keys = isSrc ? FACT_VALUE_KEYS : FACT_LABEL_KEYS;
		var html = '<p class="ac-hint">' + (isSrc
			? 'Die Werte stehen als data-fv in index.html.'
			: 'Die Beschriftungen stehen als resume.facts.* in der Übersetzung.') + '</p><div class="admin-grid">';
		keys.forEach(function (k) {
			// human fallback so a missing dictionary key never shows a raw key name
			html += field('admin.facts.' + k, 'f_' + k, state.model.facts[k], { fallback: k });
		});
		html += '</div>';
		host.innerHTML = html;
	}

	/* ---------- creating and deleting ---------- */
	function refreshAfterStructureChange(fn) {
		try {
			fn();
		} catch (e) {
			$('acMsg').className = 'ac-msg err';
			$('acMsg').textContent = e.message;
			return;
		}
		readModel();
		renderAll();
		var m = $('acMsg');
		m.className = 'ac-msg ok';
		m.textContent = t('admin.saving', '...') + ' – noch nicht gespeichert, bitte ' +
			t('admin.save', 'Speichern') + '.';
	}

	function addProject() {
		refreshAfterStructureChange(function () {
			var r = C.addProject(state.indexHtml, {});
			state.indexHtml = r.html;
		});
	}
	function delProject(index) {
		if (!window.confirm(t('admin.confirmDelete', 'Wirklich loeschen?'))) { return; }
		refreshAfterStructureChange(function () {
			var r = C.removeProject(state.indexHtml, index);
			if (!r.removed) { throw new Error('Projekt nicht gefunden'); }
			state.indexHtml = r.html;
		});
	}
	function addJob() {
		refreshAfterStructureChange(function () {
			if (state.target === 'source') {
				var r = C.addJob(state.indexHtml, {});
				state.indexHtml = r.html;
			} else {
				var lang = state.target;
				var max = 0;
				Object.keys(state.model.jobs).forEach(function (n) { if (+n > max) { max = +n; } });
				var next = C.addJobToDict(state.dicts[lang], max + 1, {});
				if (next === null) { throw new Error('resume block not found in js/i18n.' + lang + '.js'); }
				state.dicts[lang] = next;
			}
		});
	}
	function delJob(num) {
		if (!window.confirm(t('admin.confirmDelete', 'Wirklich loeschen?'))) { return; }
		refreshAfterStructureChange(function () {
			if (state.target === 'source') {
				var r = C.removeJob(state.indexHtml, num);
				if (!r.removed) { throw new Error('Eintrag nicht gefunden'); }
				state.indexHtml = r.html;
			} else {
				var lang = state.target;
				var next = C.removeJobFromDict(state.dicts[lang], num);
				if (next === null) { throw new Error('job' + num + ' not found'); }
				state.dicts[lang] = next;
			}
		});
	}

	/* ---------- images ---------- */
	function setMsg(cls, text) {
		var m = $('acMsg');
		m.className = 'ac-msg ' + cls;
		m.textContent = text;
	}

	// POST the picked files to upload.php and return the stored paths.
	function uploadFiles(fileList, dir) {
		var out = [], chain = Promise.resolve();
		Array.prototype.forEach.call(fileList, function (f) {
			chain = chain.then(function () {
				var fd = new FormData();
				fd.append('dir', dir);
				fd.append('file', f);
				return fetch('upload.php', { method: 'POST', body: fd })
					.then(function (r) { return r.json(); })
					.then(function (j) {
						if (!j.ok) { throw new Error(j.error || 'upload failed'); }
						out.push(j.path);
					});
			});
		});
		return chain.then(function () { return out; });
	}

	function handleEntryUpload(input, num) {
		if (!input.files || !input.files.length) { return; }
		setMsg('ok', t('admin.saving', '...') + ' …');
		uploadFiles(input.files, 'resume').then(function (paths) {
			state.model.images[num] = (state.model.images[num] || []).concat(paths);
			renderJobs();
			bindPanelActions();
			setMsg('ok', paths.join(', '));
		}).catch(function (e) {
			setMsg('err', 'Upload fehlgeschlagen: ' + e.message);
		});
	}

	function handleProjectUpload(input, index) {
		if (!input.files || !input.files.length) { return; }
		setMsg('ok', t('admin.saving', '...') + ' …');
		uploadFiles(input.files, 'folio').then(function (paths) {
			var el = $('p' + index + '_image');
			if (el && paths.length) { el.value = paths[0]; }
			setMsg('ok', paths.join(', '));
		}).catch(function (e) {
			setMsg('err', 'Upload fehlgeschlagen: ' + e.message);
		});
	}

	function addImageRow(num) {
		var host = $('acPanelJobs');
		var input = host.querySelector('[data-imgjob="' + num + '"]');
		if (input && input.parentNode) {
			var row = document.createElement('div');
			row.className = 'ac-imgrow';
			row.innerHTML = '<input type="text" data-imgjob="' + num + '" value="">' +
				'<button type="button" class="admin-btn ghost" data-rmimg="' + num + '|">&times;</button>';
			input.parentNode.parentNode.insertBefore(row, input.parentNode.nextSibling);
		}
	}

	function removeImageRow(btn) {
		var row = btn.parentNode;
		if (row && row.parentNode) { row.parentNode.removeChild(row); }
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
		if (isSrc) {
			// entry images, grouped by entry number
			m.images = {};
			document.querySelectorAll('[data-imgjob]').forEach(function (el) {
				var n = el.getAttribute('data-imgjob');
				var v = (el.value || '').trim();
				if (!m.images[n]) { m.images[n] = []; }
				if (v !== '') { m.images[n].push(v); }
			});
		}
		return m;
	}
	function val(id) { var el = $(id); return el ? el.value : ''; }

	/* ---------- building the files to write ---------- */
	function buildFiles(model) {
		var files = {};
		if (state.target === 'source') {
			var out = C.write(state.indexHtml, model);
			if (model.images) {
				var wi = C.writeJobImages(out, model.images);
				out = wi.html;
				if (wi.warnings.length) { state.warnings = wi.warnings; }
			}
			files['index.html'] = out;
		} else {
			var lang = state.target;
			var src = state.dicts[lang];
			src = C.setPortTags(src, model.projects.map(function (p) { return p.tags; }));
			src = C.setPortItems(src, model.projects.map(function (p) {
				return { desc: p.desc, client: p.client, date: p.date, url: p.url };
			}));
			Object.keys(model.jobs).forEach(function (n) {
				JOB_FIELDS.forEach(function (f) {
					var existed = state.model.jobKeys && state.model.jobKeys[n] &&
						state.model.jobKeys[n].indexOf(f) !== -1;
					// write when it has a value, or when it already existed so that
					// clearing a field actually clears it in the file
					if (model.jobs[n][f] !== '' || existed) {
						src = C.setJobField(src, n, f, model.jobs[n][f]);
					}
				});
			});
			FACT_LABEL_KEYS.forEach(function (k) {
				if (model.facts[k] !== '') { src = C.setFactLabel(src, k, model.facts[k]); }
			});
			files['js/i18n.' + lang + '.js'] = src;
		}
		return files;
	}

	function showError(prefix, e) {
		var msg = $('acMsg');
		if (!msg) { return; }
		msg.className = 'ac-msg err';
		msg.textContent = prefix + ': ' + (e && e.message ? e.message : String(e));
	}

	/* ---------- saving ---------- */
	function save() {
		var msg = $('acMsg');
		if (!state.model) {
			msg.className = 'ac-msg err';
			msg.textContent = t('admin.saveFailed', 'Speichern fehlgeschlagen') + ': nothing loaded.';
			return Promise.resolve();
		}
		// collect() and buildFiles() run before the request. If either throws the
		// click handler would die silently, so report it instead.
		var files;
		try {
			files = buildFiles(collect());
		} catch (e) {
			showError(t('admin.saveFailed', 'Speichern fehlgeschlagen'), e);
			return Promise.resolve();
		}
		if (!files || !Object.keys(files).length) {
			msg.className = 'ac-msg err';
			msg.textContent = t('admin.saveFailed', 'Speichern fehlgeschlagen') + ': nothing to write.';
			return Promise.resolve();
		}
		msg.className = 'ac-msg ok';
		msg.textContent = t('admin.saving', 'Wird gespeichert ...');
		return fetch('save-content.php', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ files: files })
		}).then(function (r) {
			return r.text().then(function (txt) {
				var j = null;
				try { j = JSON.parse(txt); } catch (e) { /* reported below */ }
				return { ok: r.ok, j: j, raw: txt };
			});
		}).then(function (res) {
			if (res.ok && res.j && res.j.ok) {
				msg.className = 'ac-msg ok';
				msg.textContent = t('admin.saved', 'Gespeichert.') + ' ' + Object.keys(res.j.written || {}).join(', ');
				if (state.warnings && state.warnings.length) {
					msg.className = 'ac-msg err';
					msg.textContent = 'Gespeichert, aber: ' + state.warnings.join(' | ');
				}
				if (files['index.html']) { state.indexHtml = files['index.html']; }
				Object.keys(files).forEach(function (f) {
					if (f.indexOf('js/i18n.') === 0) {
						state.dicts[f.slice(7, -3)] = files[f];
					}
				});
			} else {
				msg.className = 'ac-msg err';
				msg.textContent = t('admin.saveFailed', 'Speichern fehlgeschlagen') + ': ' +
					((res.j && res.j.error) || res.raw || 'unknown');
			}
		}).catch(function (e) {
			showError(t('admin.saveFailed', 'Speichern fehlgeschlagen'), e);
		});
	}

	function download() {
		var files;
		try {
			files = buildFiles(collect());
		} catch (e) {
			showError('Download fehlgeschlagen', e);
			return;
		}
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
		bindDelegates();
	});
})();