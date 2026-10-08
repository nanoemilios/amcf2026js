const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\admin.js', 'utf8');

// Fix 1: Update RESUME_JOBS to 11 entries
let newContent = content.replace(
    "var RESUME_JOBS = ['1','2','3','4','5','6','7','8','9','10'];",
    "var RESUME_JOBS = ['1','2','3','4','5','6','7','8','9','10','11'];"
);

// Fix 2: Update DOMContentLoaded to init from storage
newContent = newContent.replace(
`document.addEventListener('DOMContentLoaded', function () {
		var loginBtn = document.getElementById('loginBtn');
		var pw = document.getElementById('pw');
		var loginBox = document.getElementById('adminLogin');
		var app = document.getElementById('adminApp');`,
`document.addEventListener('DOMContentLoaded', function () {
	// Initialize storage from data/projects.js first
	if (window.AMCFStorage && window.AMCFStorage.initFromProjectsJs) {
		window.AMCFStorage.initFromProjectsJs().then(function() {
			initAdminAfterStorageReady();
		});
	} else {
		initAdminAfterStorageReady();
	}
});

function initAdminAfterStorageReady() {
	var loginBtn = document.getElementById('loginBtn');
	var pw = document.getElementById('pw');
	var loginBox = document.getElementById('adminLogin');
	var app = document.getElementById('adminApp');`
);

// Fix 3: Add admin translation rendering at end of file (before final closing)
const adminTranslationCode = `

// Admin translations
function renderAdminI18n() {
	var lang = localStorage.getItem('amcf_lang') || 'de';
	var dict = window.AMCF_I18N_LANGS && window.AMCF_I18N_LANGS[lang] && window.AMCF_I18N_LANGS[lang].admin;
	if (!dict) { return; }
	
	// Elements with data-i18n
	document.querySelectorAll('[data-i18n]').forEach(function (el) {
		var key = el.getAttribute('data-i18n');
		var val = dict[key];
		if (val !== undefined) {
			if (el.hasAttribute('data-i18n-html')) {
				el.innerHTML = val;
			} else {
				el.textContent = val;
			}
		}
	});
	
	// Elements with data-i18n-placeholder
	document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
		var key = el.getAttribute('data-i18n-placeholder');
		var val = dict[key];
		if (val !== undefined) {
			el.placeholder = val;
		}
	});
	
	// Update select options with data-i18n
	document.querySelectorAll('option[data-i18n]').forEach(function (opt) {
		var key = opt.getAttribute('data-i18n');
		var val = dict[key];
		if (val !== undefined) {
			opt.textContent = val;
		}
	});
	
	// Update admin language selector
	var langSelect = document.getElementById('adminLang');
	if (langSelect) {
		langSelect.value = localStorage.getItem('amcf_lang') || 'de';
	}
}

// Listen for language changes
document.addEventListener('AMCF_I18N_RENDER', function () {
	renderAdminI18n();
});

// Initial render
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', renderAdminI18n);
} else {
	renderAdminI18n();
}

// Listen for language changes from i18n.js
window.addEventListener('storage', function (e) {
	if (e.key === 'amcf_lang') {
		renderAdminI18n();
	}
});`;

newContent = newContent.replace(
`});
})();`,
adminTranslationCode + `

});
})();`
);

fs.writeFileSync('C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\admin.js', newContent, 'utf8');
console.log('Done');