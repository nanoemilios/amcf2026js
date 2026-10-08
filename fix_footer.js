const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\scripts.js', 'utf8');

const search = '}\r\n\r\n// =============== dark mode ===============\r\n\r\n$(function () {';
const replace = '}\r\n\t}\r\n\r\n// Dynamic footer year\r\nfunction updateFooterYear() {\r\n\tvar el = document.getElementById("footerCopyright");\r\n\tif (el) {\r\n\t\tvar year = new Date().getFullYear();\r\n\t\t// Match both &copy; and © Unicode symbol\r\n\t\tel.innerHTML = el.innerHTML.replace(/(&copy;|©)\\d{4}/, "$1" + year);\r\n\t}\r\n}\r\n\r\n$(function () {\r\n\tupdateFooterYear();\r\n});\r\n\r\n// Also update on language change\r\n$(document).on("AMCF_I18N_RENDER", function () {\r\n\tupdateFooterYear();\r\n});\r\n\r\n// =============== dark mode ===============\r\n\r\n$(function () {';

const newContent = content.replace(
    '}\r\n\r\n// =============== dark mode ===============\r\n\r\n$(function () {',
    '}\r\n\t}\r\n\r\n// Dynamic footer year\r\nfunction updateFooterYear() {\r\n\tvar el = document.getElementById("footerCopyright");\r\n\tif (el) {\r\n\t\tvar year = new Date().getFullYear();\r\n\t\t// Match both &copy; and © Unicode symbol\r\n\t\tel.innerHTML = el.innerHTML.replace(/(&copy;|©)\\d{4}/, "$1" + year);\r\n\t}\r\n}\r\n\r\n$(function () {\r\n\tupdateFooterYear();\r\n});\r\n\r\n// Also update on language change\r\n$(document).on("AMCF_I18N_RENDER", function () {\r\n\tupdateFooterYear();\r\n});\r\n\r\n// =============== dark mode ===============\r\n\r\n$(function () {'
);

const newContent = content.replace(
    '}\r\n\r\n// =============== dark mode ===============\r\n\r\n$(function () {',
    '}\r\n\t}\r\n\r\n// Dynamic footer year\r\nfunction updateFooterYear() {\r\n\tvar el = document.getElementById("footerCopyright");\r\n\tif (el) {\r\n\t\tvar year = new Date().getFullYear();\r\n\t\t// Match both &copy; and © Unicode symbol\r\n\t\tel.innerHTML = el.innerHTML.replace(/(&copy;|©)\\d{4}/, "$1" + year);\r\n\t}\r\n}\r\n\r\n$(function () {\r\n\tupdateFooterYear();\r\n});\r\n\r\n// Also update on language change\r\n$(document).on("AMCF_I18N_RENDER", function () {\r\n\tupdateFooterYear();\r\n});\r\n\r\n// =============== dark mode ===============\r\n\r\n$(function () {'
);

fs.writeFileSync('C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\scripts.js', newContent, 'utf8');
console.log('Done');