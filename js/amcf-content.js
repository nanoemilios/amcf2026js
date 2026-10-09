/* AMCF content module: parse and rewrite the editable regions of index.html
   plus the translation dictionaries. Works in the browser and in Node. */
(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) { module.exports = api; }
	else { root.AMCFContent = api; }
})(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	var REGIONS = ['PROJECTS', 'RESUME', 'FACTS'];

	function esc(s) {
		return String(s === null || s === undefined ? '' : s)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
	function attrEsc(s) {
		return esc(s).replace(/"/g, '&quot;');
	}
	function unesc(s) {
		return String(s === null || s === undefined ? '' : s)
			.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
			.replace(/&amp;/g, '&');
	}
	function regionSlice(html, name) {
		var re = new RegExp('(<!--AMCF:' + name + ':START-->[\\s\\S]*?<!--AMCF:' + name + ':END-->)');
		var m = re.exec(html);
		if (!m) { return null; }
		return { start: m.index, end: m.index + m[0].length, text: m[0] };
	}
	function hasRegions(html) {
		return REGIONS.every(function (n) { return regionSlice(html, n) !== null; });
	}

	/* ---------------- projects ---------------- */
	// Each tile is <li class="box ..." data-desc=... > containing .folio-open[data-project="i"]
	var LI_RE = /<li class="([^"]*)"([^>]*)>([\s\S]*?)<\/li>/g;

	function parseProjects(html) {
		var out = [];
		LI_RE.lastIndex = 0;
		var m;
		while ((m = LI_RE.exec(html)) !== null) {
			var cls = m[1], attrs = m[2], body = m[3];
			if (body.indexOf('folio-open') === -1) { continue; }
			var idxM = /data-project="(\d+)"/.exec(body);
			var catM = /category_(\d)/.exec(cls);
			out.push({
				index: idxM ? parseInt(idxM[1], 10) : out.length,
				category: catM ? 'category_' + catM[1] : 'category_1',
				image: (/<img[^>]*\ssrc="([^"]*)"/.exec(body) || [, ''])[1],
				name: unesc((/<h4[^>]*>([\s\S]*?)<\/h4>/.exec(body) || [, ''])[1]),
				tags: unesc((/<h6[^>]*>([\s\S]*?)<\/h6>/.exec(body) || [, ''])[1]),
				desc: unesc((/data-desc="([^"]*)"/.exec(attrs) || [, ''])[1]),
				client: unesc((/data-client="([^"]*)"/.exec(attrs) || [, ''])[1]),
				date: unesc((/data-date="([^"]*)"/.exec(attrs) || [, ''])[1]),
				url: unesc((/data-url="([^"]*)"/.exec(attrs) || [, ''])[1])
			});
		}
		out.sort(function (a, b) { return a.index - b.index; });
		return out;
	}

	function writeProjects(html, projects) {
		var reg = regionSlice(html, 'PROJECTS');
		if (!reg) { throw new Error('AMCF:PROJECTS region not found'); }
		var byIndex = {};
		projects.forEach(function (p) { byIndex[p.index] = p; });
		var body = reg.text;
		body = body.replace(LI_RE, function (whole, cls, attrs, inner) {
			if (inner.indexOf('folio-open') === -1) { return whole; }
			var idxM = /data-project="(\d+)"/.exec(inner);
			if (!idxM) { return whole; }
			var p = byIndex[parseInt(idxM[1], 10)];
			if (!p) { return whole; }
			// patch only the category token so class order and spacing survive
			var newWhole = whole;
			if (p.category && /category_\d/.test(cls)) {
				newWhole = newWhole.replace(/category_\d/, p.category);
			}
			newWhole = newWhole
				.replace(/data-desc="[^"]*"/, 'data-desc="' + attrEsc(p.desc) + '"')
				.replace(/data-client="[^"]*"/, 'data-client="' + attrEsc(p.client) + '"')
				.replace(/data-date="[^"]*"/, 'data-date="' + attrEsc(p.date) + '"')
				.replace(/data-url="[^"]*"/, 'data-url="' + attrEsc(p.url) + '"')
				.replace(/(<img[^>]*\ssrc=")[^"]*(")/, '$1' + attrEsc(p.image) + '$2')
				.replace(/(<h4[^>]*>)[\s\S]*?(<\/h4>)/, '$1' + esc(p.name) + '$2')
				.replace(/(<h6[^>]*>)[\s\S]*?(<\/h6>)/, '$1' + esc(p.tags) + '$2');
			return newWhole;
		});
		return html.slice(0, reg.start) + body + html.slice(reg.end);
	}

	/* ---------------- resume jobs ---------------- */
	// Jobs are identified by their data-i18n key, NOT by data-rvnum.
	var JOB_RE = /<(\w+)([^>]*?)\sdata-i18n(-html)?="resume\.job(\d+)\.([A-Za-z0-9_]+)"([^>]*)>([\s\S]*?)<\/\1>/g;

	function parseJobs(html) {
		var jobs = {};
		JOB_RE.lastIndex = 0;
		var m;
		while ((m = JOB_RE.exec(html)) !== null) {
			var num = parseInt(m[4], 10), field = m[5];
			var isHtml = !!m[3];
			if (!jobs[num]) { jobs[num] = {}; }
			jobs[num][field] = isHtml ? m[7] : unesc(m[7]);
		}
		return jobs;
	}

	function writeJobFieldsInBlock(block, jobs) {
		return block.replace(JOB_RE, function (whole, tag, before, isHtml, numS, field, after, content) {
			var job = jobs[parseInt(numS, 10)];
			if (!job || job[field] === undefined) { return whole; }
			var val = isHtml ? job[field] : esc(job[field]);
			return '<' + tag + before + (isHtml ? ' data-i18n-html' : ' data-i18n') +
				'="resume.job' + numS + '.' + field + '"' + after + '>' + val + '</' + tag + '>';
		});
	}

	function writeJobs(html, jobs) {
		var reg = regionSlice(html, 'RESUME');
		if (!reg) { throw new Error('AMCF:RESUME region not found'); }
		var body = writeJobFieldsInBlock(reg.text, jobs);
		return html.slice(0, reg.start) + body + html.slice(reg.end);
	}

	/* ---------------- facts ---------------- */
	var FV_RE = /<(\w+)([^>]*?)\sdata-fv="([A-Za-z0-9_]+)"([^>]*)>([\s\S]*?)<\/\1>/g;

	function parseFacts(html) {
		var facts = {};
		FV_RE.lastIndex = 0;
		var m;
		while ((m = FV_RE.exec(html)) !== null) { facts[m[3]] = unesc(m[5]); }
		return facts;
	}

	function writeFacts(html, facts) {
		var reg = regionSlice(html, 'FACTS');
		if (!reg) { throw new Error('AMCF:FACTS region not found'); }
		var body = reg.text.replace(FV_RE, function (whole, tag, before, key, after, content) {
			if (facts[key] === undefined) { return whole; }
			return '<' + tag + before + ' data-fv="' + key + '"' + after + '>' + esc(facts[key]) + '</' + tag + '>';
		});
		return html.slice(0, reg.start) + body + html.slice(reg.end);
	}

	/* ---------------- combined ---------------- */
	function parse(html) {
		return { projects: parseProjects(html), jobs: parseJobs(html), facts: parseFacts(html) };
	}
	function write(html, model) {
		var out = html;
		if (model.projects) { out = writeProjects(out, model.projects); }
		if (model.jobs) { out = writeJobs(out, model.jobs); }
		if (model.facts) { out = writeFacts(out, model.facts); }
		return out;
	}

	/* ---------------- translation dictionaries ---------------- */
	// These edit the JS dictionary sources textually, preserving formatting.
	function escapeJs(s) {
		return String(s === null || s === undefined ? '' : s)
			.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
	}

	// Returns {start,end} of the balanced block whose header matches headerRe.
	function findBlock(src, headerRe) {
		var re = new RegExp(headerRe.source, headerRe.flags.replace('g', ''));
		var m = re.exec(src);
		if (!m) { return null; }
		var i = m.index, depth = 0, started = false;
		while (i < src.length) {
			var ch = src[i];
			if (ch === "'" || ch === '"') {
				var q = ch; i++;
				while (i < src.length) {
					if (src[i] === '\\') { i += 2; continue; }
					if (src[i] === q) { i++; break; }
					i++;
				}
				continue;
			}
			if (ch === '{' || ch === '[') { depth++; started = true; }
			else if (ch === '}' || ch === ']') {
				depth--;
				if (started && depth === 0) { return { start: m.index, end: i + 1 }; }
			}
			i++;
		}
		return null;
	}

	// Set `key: 'value'` inside the block matched by headerRe, inserting it if absent.
	function setDictString(src, headerRe, key, value) {
		var b = findBlock(src, headerRe);
		if (!b) { return null; }
		var block = src.slice(b.start, b.end);
		var re = new RegExp('(\\b' + key + "\\s*:\\s*)'(?:\\\\.|[^'\\\\])*'");
		if (re.test(block)) {
			block = block.replace(re, "$1'" + escapeJs(value) + "'");
		} else {
			var nl = block.indexOf('\n');
			var pad = (block.match(/^\s*/) || [''])[0];
			block = block.slice(0, nl + 1) + pad + '\t' + key + ": '" + escapeJs(value) + "',\n" + block.slice(nl + 1);
		}
		return src.slice(0, b.start) + block + src.slice(b.end);
	}

	// Replace a whole array (e.g. port.tags / port.items) inside a block.
	function setDictArray(src, headerRe, name, bodyText, indent) {
		var b = findBlock(src, headerRe);
		if (!b) { return null; }
		var block = src.slice(b.start, b.end);
		var pad = indent || '\t\t\t\t';
		var rendered = name + ': [\n' + pad + bodyText + '\n' + pad.slice(0, -1) + ']';
		var re = new RegExp('\\b' + name + '\\s*:\\s*\\[[\\s\\S]*?\\]');
		if (re.test(block)) {
			block = block.replace(re, function () { return rendered; });
		} else {
			var nl = block.indexOf('\n');
			var bpad = (block.match(/^\s*/) || [''])[0];
			block = block.slice(0, nl + 1) + bpad + '\t' + rendered + ',\n' + block.slice(nl + 1);
		}
		return src.slice(0, b.start) + block + src.slice(b.end);
	}

	function setPortTags(src, tags) {
		var body = tags.map(function (t) { return "'" + escapeJs(t) + "',"; }).join('\n');
		return setDictArray(src, /port:\s*\{/, 'tags', body);
	}
	function setPortItems(src, items) {
		var body = items.map(function (it) {
			return "{ desc: '" + escapeJs(it.desc) + "', client: '" + escapeJs(it.client) +
				"', date: '" + escapeJs(it.date) + "', url: '" + escapeJs(it.url) + "' },";
		}).join('\n');
		return setDictArray(src, /port:\s*\{/, 'items', body);
	}
	function setJobField(src, jobNum, field, value) {
		return setDictString(src, new RegExp('job' + jobNum + '\\s*:\\s*\\{'), field, value);
	}
	function setFactLabel(src, key, value) {
		return setDictString(src, /facts:\s*\{/, key, value);
	}
	function getJobNumList(src) {
		var re = /\bjob(\d+)\s*:\s*\{/g, out = [], m;
		while ((m = re.exec(src)) !== null) { out.push(parseInt(m[1], 10)); }
		return out;
	}

	/* ---------------- creating and removing ---------------- */
	// Slice a balanced <tag> element starting at or after from.
	function sliceElement(html, from, tag) {
		var openRe = new RegExp('<' + tag + '\\b', 'g');
		openRe.lastIndex = from;
		var open = openRe.exec(html);
		if (!open) { return null; }
		var tagRe = new RegExp('<(/?)' + tag + '\\b[^>]*?(/?)>', 'g');
		tagRe.lastIndex = open.index;
		var depth = 0, m;
		while ((m = tagRe.exec(html)) !== null) {
			if (m[2] === '/') { continue; }
			if (m[1] === '/') { depth--; if (depth === 0) { return { start: open.index, end: tagRe.lastIndex, text: html.slice(open.index, tagRe.lastIndex) }; } }
			else { depth++; }
		}
		return null;
	}

	// Start index of the last <tag> match at or before `before`, or -1.
	function lastTagBefore(text, tagRe, before) {
		var re = new RegExp(tagRe.source, 'g'), last = -1, m;
		while ((m = re.exec(text)) !== null) {
			if (m.index > before) { break; }
			last = m.index;
		}
		return last;
	}

	function nextJobNum(html) {
		var jobs = parseJobs(html), max = 0;
		Object.keys(jobs).forEach(function (n) { if (+n > max) { max = +n; } });
		return max + 1;
	}
	function freeRvnum(html) {
		var re = /data-rvnum="(\d+)"/g, max = 0, m;
		while ((m = re.exec(html)) !== null) { if (+m[1] > max) { max = +m[1]; } }
		return max + 1;
	}

	var JOB_DEFAULTS = { date: '', title: '', text: '', l1: '', l2: '', l3: '', l4: '', l5: '', l6: '', l7: '' };

	// Clone the first existing job holder so the new entry inherits the exact
	// markup shape (circles, head, slider) that the layout expects.
	function addJob(html, fields) {
		var reg = regionSlice(html, 'RESUME');
		if (!reg) { throw new Error('AMCF:RESUME region not found'); }
		// the first resume.jobN.* key inside the region identifies the first holder
		var firstKey = /resume\.job\d+\./.exec(reg.text);
		if (!firstKey) { throw new Error('no job holder found in the resume region'); }
		var holderStart = lastTagBefore(reg.text, /<div class="resume-holder"/g, firstKey.index);
		if (holderStart === -1) { throw new Error('could not locate the job holder'); }
		var holder = sliceElement(reg.text, holderStart, 'div');
		if (!holder) { throw new Error('could not slice a job holder'); }
		var oldNumM = /resume\.job(\d+)\./.exec(holder.text);
		if (!oldNumM) { throw new Error('job holder has no resume.jobN.* keys'); }
		var oldNum = oldNumM[1];
		var num = nextJobNum(html);
		var rv = freeRvnum(html);

		var block = holder.text
			.split('resume.job' + oldNum + '.').join('resume.job' + num + '.')
			.replace(/data-rvnum="\d+"/, 'data-rvnum="' + rv + '"');

		// normalise every keyed field to its default, then apply the supplied values
		var blank = {};
		blank[num] = Object.assign({}, JOB_DEFAULTS, fields || {});
		block = writeJobFieldsInBlock(block, blank);

		var insertAt = reg.start + reg.text.indexOf(holder.text);
		return { html: html.slice(0, insertAt) + block + html.slice(insertAt), num: num, rvnum: rv };
	}

	function removeJob(html, num) {
		var reg = regionSlice(html, 'RESUME');
		if (!reg) { throw new Error('AMCF:RESUME region not found'); }
		var key = 'resume.job' + num + '.';
		var anchor = reg.text.indexOf(key);
		if (anchor === -1) { return { html: html, removed: false }; }
		// walk back to the enclosing holder opening tag
		var head = lastTagBefore(reg.text, /<div class="resume-holder"/g, anchor);
		if (head === -1) { return { html: html, removed: false }; }
		var holder = sliceElement(reg.text, head, 'div');
		if (!holder) { return { html: html, removed: false }; }
		return { html: html.slice(0, reg.start) + reg.text.slice(0, holder.start) + reg.text.slice(holder.end) + html.slice(reg.end), removed: true };
	}

	var PROJECT_TEMPLATE =
		'<li class="box mix category_1 mix_all" data-desc="" data-client="" data-date="" data-url="">' +
		'<a href="#" class="folio-open" data-project="__INDEX__">' +
		'<img src="__IMAGE__" class="respimg" alt="" title="">' +
		'<div class="folio-name clear"><div class="folio-overlay">' +
		'<span class="overlay red"></span>' +
		'<h4>__NAME__</h4><h6>__TAGS__</h6>' +
		'</div></div></a></li>';

	function addProject(html, project) {
		var reg = regionSlice(html, 'PROJECTS');
		if (!reg) { throw new Error('AMCF:PROJECTS region not found'); }
		project = project || {};
		var existing = parseProjects(html);
		var index = existing.length ? Math.max.apply(null, existing.map(function (p) { return p.index; })) + 1 : 0;
		// match the indentation of the tiles already in the region
		var lastLi = reg.text.lastIndexOf('<li class="box');
		var indent = lastLi === -1 ? '\t\t\t\t' : (reg.text.slice(0, lastLi).match(/^[\t ]*/) || [''])[0];
		var block = indent + PROJECT_TEMPLATE
			.replace('__INDEX__', String(index))
			.replace('__IMAGE__', attrEsc(project.image || 'images/folio/new.png'))
			.replace('__NAME__', esc(project.name || 'Neues Projekt'))
			.replace('__TAGS__', esc(project.tags || '')) + '\n';
		var insertAt = reg.start + reg.text.indexOf('<!--AMCF:PROJECTS:END-->');
		return { html: html.slice(0, insertAt) + block + indent + html.slice(insertAt), index: index };
	}

	function removeProject(html, index) {
		var reg = regionSlice(html, 'PROJECTS');
		if (!reg) { throw new Error('AMCF:PROJECTS region not found'); }
		var anchor = reg.text.indexOf('data-project="' + index + '"');
		if (anchor === -1) { return { html: html, removed: false }; }
		// tiles carry more class tokens than just "box", so match on the tag not a literal
		var head = lastTagBefore(reg.text, /<li class="[^"]*\bbox\b[^"]*"/g, anchor);
		if (head === -1) { return { html: html, removed: false }; }
		var li = sliceElement(reg.text, head, 'li');
		if (!li) { return { html: html, removed: false }; }
		return { html: html.slice(0, reg.start) + reg.text.slice(0, li.start) + reg.text.slice(li.end) + html.slice(reg.end), removed: true };
	}

	// Add an empty job block to a translation dictionary.
	function addJobToDict(src, num, fields) {
		var b = findBlock(src, /resume:\s*\{/);
		if (!b) { return null; }
		var headerEnd = src.indexOf('\n', b.start);
		var keys = Object.keys(JOB_DEFAULTS);
		var body = keys.filter(function (k) { return !!(fields && fields[k]); })
			.map(function (k) { return "\t\t\t\t" + k + ": '" + escapeJs(fields[k]) + "',"; })
			.join('\n');
		var block = "\t\t\tjob" + num + ": {\n" + (body ? body + '\n' : '') + '\t\t\t},';
		return src.slice(0, headerEnd + 1) + block + '\n' + src.slice(headerEnd + 1);
	}

	// Remove a job block from a translation dictionary.
	function removeJobFromDict(src, num) {
		var b = findBlock(src, new RegExp('job' + num + '\\s*:\\s*\\{'));
		if (!b) { return null; }
		return src.slice(0, b.start) + src.slice(b.end);
	}

	/* ---------------- entry images ---------------- */
	// Character range of the holder that contains resume.job<num>.*.
	function jobHolderRange(regText, num) {
		var anchor = regText.indexOf('resume.job' + num + '.');
		if (anchor === -1) { return null; }
		var head = lastTagBefore(regText, /<div class="resume-holder"/g, anchor);
		if (head === -1) { return null; }
		var el = sliceElement(regText, head, 'div');
		return el ? { start: el.start, end: el.end } : null;
	}

	function allHolderRanges(regText) {
		var re = /<div class="resume-holder"\s+data-rvnum="\d+"/g, out = [], m;
		while ((m = re.exec(regText)) !== null) {
			var el = sliceElement(regText, m.index, 'div');
			if (el) { out.push(el); }
		}
		return out;
	}

	// Distinct image sources per entry, in document order.
	function parseJobImages(html) {
		var reg = regionSlice(html, 'RESUME');
		var out = {};
		if (!reg) { return out; }
		allHolderRanges(reg.text).forEach(function (r) {
			var num = /resume\.job(\d+)\./.exec(r.text);
			if (!num) { return; }
			var srcs = [], seen = {};
			var imgRe = /<img[^>]*\ssrc="([^"]*)"/g, im;
			while ((im = imgRe.exec(r.text)) !== null) {
				var v = unesc(im[1]);
				if (v && !seen[v]) { seen[v] = 1; srcs.push(v); }
			}
			out[num[1]] = srcs;
		});
		return out;
	}

	/*
	 * Replace the images of each entry. Existing <img src> nodes are rewritten
	 * positionally, so repeated copies of the same picture (the hover overlay,
	 * the popup thumbnail) keep agreeing. Extra images are appended to the
	 * slider when the entry has one; an entry without a slider keeps its
	 * current image-popup shape.
	 */
	function writeJobImages(html, map) {
		var reg = regionSlice(html, 'RESUME');
		if (!reg) { throw new Error('AMCF:RESUME region not found'); }
		var body = reg.text;
		var warnings = [];
		Object.keys(map).forEach(function (num) {
			var wanted = (map[num] || []).map(function (s) { return String(s || '').trim(); })
				.filter(function (s) { return s !== ''; });
			if (!wanted.length) {
				warnings.push('job' + num + ': no image given, left unchanged');
				return;
			}
			var range = jobHolderRange(body, num);
			if (!range) { warnings.push('job' + num + ': holder not found'); return; }
			var chunk = body.slice(range.start, range.end);

			var i = 0;
			chunk = chunk.replace(/(<img[^>]*\ssrc=")[^"]*(")/g, function (m, a, b) {
				// repeats the last image so duplicate nodes stay consistent
				var v = wanted[i < wanted.length ? i : wanted.length - 1];
				i++;
				return a + attrEsc(v) + b;
			});
			// the popup link points at the first image
			chunk = chunk.replace(/(<a class="image-popup"[^>]*\shref=")[^"]*(")/g,
				'$1' + attrEsc(wanted[0]) + '$2');

			// append extras to the slider when there is one
			if (wanted.length > i) {
				var ulRe = /(<div class="resume-slider"[\s\S]*?<ul class="slides">)([\s\S]*?)(<\/ul>)/;
				if (ulRe.test(chunk)) {
					var extra = wanted.slice(i).map(function (src) {
						return '\n\t\t\t\t\t\t\t\t\t\t\t<li><img src="' + attrEsc(src) + '" class="respimg" alt=""></li>';
					}).join('');
					chunk = chunk.replace(ulRe, function (m, open, inner, close) {
						return open + inner.replace(/\s*$/, '') + extra + '\n\t\t\t\t\t\t\t\t\t\t' + close;
					});
				} else {
					warnings.push('job' + num + ': only ' + i + ' image slot(s) available, ' +
						(wanted.length - i) + ' image(s) not added');
				}
			}
			body = body.slice(0, range.start) + chunk + body.slice(range.end);
		});
		return { html: html.slice(0, reg.start) + body + html.slice(reg.end), warnings: warnings };
	}

	return {
		parse: parse, write: write,
		parseProjects: parseProjects, writeProjects: writeProjects,
		parseJobs: parseJobs, writeJobs: writeJobs,
		parseFacts: parseFacts, writeFacts: writeFacts,
		parseJobImages: parseJobImages, writeJobImages: writeJobImages,
		jobHolderRange: jobHolderRange,
		hasRegions: hasRegions, regionSlice: regionSlice,
		addJob: addJob, removeJob: removeJob,
		addProject: addProject, removeProject: removeProject,
		addJobToDict: addJobToDict, removeJobFromDict: removeJobFromDict,
		nextJobNum: nextJobNum, freeRvnum: freeRvnum,
		setPortTags: setPortTags, setPortItems: setPortItems,
		setJobField: setJobField, setFactLabel: setFactLabel,
		getJobNumList: getJobNumList, findBlock: findBlock,
		sliceElement: sliceElement,
		esc: esc, unesc: unesc, attrEsc: attrEsc, escapeJs: escapeJs
	};
});