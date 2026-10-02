/* AMCF i18n - Sprachumschaltung */
(function () {
	"use strict";

	var DEFAULTS = {
		lang: 'de',
		flag: 'de.svg'
	};

	var LANGS = {
		de:   { flag: 'de.svg',  name: 'Deutsch' },
		'de-ch': { flag: 'ch.svg', name: 'Schwiizerd\u00fctsch' },
		en:   { flag: 'gb.svg',  name: 'English' },
		es:   { flag: 'es.svg',  name: 'Espa\u00f1ol' },
		gl:   { flag: 'gl.svg',  name: 'Galego' },
		pt:   { flag: 'pt.svg',  name: 'Portugu\u00eas' }
	};

	var dict = window.AMCF_I18N_LANGS || {};

	function detectLang() {
		var stored = null;
		try { stored = localStorage.getItem('amcf_lang'); } catch (e) {}
		if (stored && LANGS[stored]) { return stored; }
		var nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
		if (nav.indexOf('de-ch') === 0) { return 'de-ch'; }
		if (nav.indexOf('de') === 0) { return 'de'; }
		if (nav.indexOf('gl') === 0) { return 'gl'; }
		if (nav.indexOf('pt') === 0) { return 'pt'; }
		if (nav.indexOf('es') === 0) { return 'es'; }
		if (nav.indexOf('en') === 0) { return 'en'; }
		return DEFAULTS.lang;
	}

	function lookupPath(dict, key) {
		var val = dict;
		var parts = String(key).split('.');
		for (var i = 0; i < parts.length; i++) {
			if (!val || typeof val !== 'object' || !Object.prototype.hasOwnProperty.call(val, parts[i])) {
				return undefined;
			}
			val = val[parts[i]];
		}
		return val;
	}

	function t(key, lang) {
		var val = lookupPath(dict[lang], key);
		if (val !== undefined) { return val; }
		var def = lookupPath(dict.de, key);
		if (def !== undefined) { return def; }
		return key;
	}

	function applyText(el, key, lang) {
		if (el.hasAttribute('data-i18n-html')) {
			el.innerHTML = t(key, lang);
		} else {
			el.textContent = t(key, lang);
		}
	}

	function render(lang) {
		document.documentElement.setAttribute('lang', lang);
		var nodes = document.querySelectorAll('[data-i18n], [data-i18n-html]');
		for (var i = 0; i < nodes.length; i++) {
			var key = nodes[i].getAttribute('data-i18n');
			if (key === null) { key = nodes[i].getAttribute('data-i18n-html'); }
			applyText(nodes[i], key, lang);
		}
		var ph = document.querySelectorAll('[data-i18n-placeholder]');
		for (var j = 0; j < ph.length; j++) {
			ph[j].setAttribute('placeholder', t(ph[j].getAttribute('data-i18n-placeholder'), lang));
		}
		var title = document.querySelector('title');
		if (title && dict[lang] && dict[lang].metaTitle) { title.textContent = dict[lang].metaTitle; }
		var meta = document.querySelector('meta[name="description"]');
		if (meta && dict[lang] && dict[lang].metaDesc) { meta.setAttribute('content', dict[lang].metaDesc); }
		updateSelector(lang);
		if (window.jQuery) {
			jQuery(document).trigger('AMCF_I18N_RENDER', [lang]);
		}
	}

	function updateSelector(lang) {
		var cur = document.querySelectorAll('.lang-flag');
		for (var i = 0; i < cur.length; i++) {
			cur[i].setAttribute('src', 'images/flags/' + LANGS[lang].flag);
			cur[i].setAttribute('alt', LANGS[lang].name);
		}
		var active = document.querySelectorAll('.lang-item');
		for (var j = 0; j < active.length; j++) {
			active[j].classList.toggle('active', active[j].getAttribute('data-lang') === lang);
		}
		var label = document.querySelector('.lang-current-name');
		if (label) { label.textContent = LANGS[lang].name; }
	}

	function setLang(lang) {
		if (!LANGS[lang]) { lang = DEFAULTS.lang; }
		try { localStorage.setItem('amcf_lang', lang); } catch (e) {}
		render(lang);
		window.AMCF_I18N_CURRENT = lang;
	}

	window.AMCF_I18N = {
		LANGS: LANGS,
		render: render,
		setLang: setLang,
		getLang: function () { return window.AMCF_I18N_CURRENT || DEFAULTS.lang; }
	};

	document.addEventListener('DOMContentLoaded', function () {
		var lang = detectLang();
		window.AMCF_I18N_CURRENT = lang;
		render(lang);

		var selector = document.getElementById('langSelector');
		if (selector) {
			var current = selector.querySelector('.lang-current');
			current.addEventListener('click', function (e) {
				e.preventDefault();
				selector.classList.toggle('open');
			});
			document.addEventListener('click', function (e) {
				if (!selector.contains(e.target)) {
					selector.classList.remove('open');
				}
			});
			var items = selector.querySelectorAll('.lang-item');
			for (var i = 0; i < items.length; i++) {
				items[i].addEventListener('click', function (e) {
					e.preventDefault();
					var l = this.getAttribute('data-lang');
					setLang(l);
					selector.classList.remove('open');
				});
			}
		}
	});
})();
