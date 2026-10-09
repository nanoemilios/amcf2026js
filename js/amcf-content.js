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

	function writeJobs(html, jobs) {
		var reg = regionSlice(html, 'RESUME');
		if (!reg) { throw new Error('AMCF:RESUME region not found'); }
		var body = reg.text.replace(JOB_RE, function (whole, tag, before, isHtml, numS, field, after, content) {
			var job = jobs[parseInt(numS, 10)];
			if (!job || job[field] === undefined) { return whole; }
			var val = isHtml ? job[field] : esc(job[field]);
			return '<' + tag + before + (isHtml ? ' data-i18n-html' : ' data-i18n') +
				'="resume.job' + numS + '.' + field + '"' + after + '>' + val + '</' + tag + '>';
		});
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

	return {
		parse: parse, write: write,
		parseProjects: parseProjects, writeProjects: writeProjects,
		parseJobs: parseJobs, writeJobs: writeJobs,
		parseFacts: parseFacts, writeFacts: writeFacts,
		hasRegions: hasRegions, regionSlice: regionSlice,
		setPortTags: setPortTags, setPortItems: setPortItems,
		setJobField: setJobField, setFactLabel: setFactLabel,
		getJobNumList: getJobNumList, findBlock: findBlock,
		esc: esc, unesc: unesc, attrEsc: attrEsc, escapeJs: escapeJs
	};
});