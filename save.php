<?php
/**
 * save.php – Empfängt Änderungen aus der Admin-Seite (admin.html) und schreibt
 * sie dauerhaft nach data/projects.js auf dem Server. Damit sehen ALLE Besucher
 * die Änderungen beim nächsten Seitenaufruf – ohne manuelles Hochladen.
 *
 * Aufruf: POST (application/json)
 *   { "pwHash": "<sha256 des Admin-Passworts>", "data": { edits, projects, resume } }
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// sha256("AMCF2026") – muss zum PW_HASH in js/admin.js passen.
// ACHTUNG Sicherheit: Das ist "Client-Auth". Wer den Quellcode kennt,
// kennt den Hash. Für echte Absicherung: Passwort nur serverseitig prüfen
// (z. B. hash_equals mit einem geheimen Wert) und HTTPS verwenden.
$PW_HASH = '6db70435647eeba1749000dfcb18e0bbe1af1997fd14ef0361e305f34b17ad6e';

function respondError($msg) {
	echo json_encode(array('ok' => false, 'error' => $msg));
	exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	respondError('Nur POST erlaubt.');
}

$raw = file_get_contents('php://input');
$in = json_decode((string)$raw, true);

if (!is_array($in) || !isset($in['pwHash']) || !is_string($in['pwHash'])) {
	respondError('Ungültige Anfrage.');
}
if (!hash_equals($PW_HASH, $in['pwHash'])) {
	respondError('Nicht autorisiert.');
}

$data = isset($in['data']) && is_array($in['data']) ? $in['data'] : array();
if (!isset($data['edits']))   { $data['edits'] = new stdClass(); }
if (!isset($data['projects'])) { $data['projects'] = array(); }
if (!isset($data['resume']))  { $data['resume'] = array('facts' => new stdClass(), 'jobs' => new stdClass()); }

$header = "/* ============================================================\n" .
	"   AMCF Website-Daten – automatisch von save.php geschrieben\n" .
	"   (Änderungen aus dem Admin werden live für alle Besucher gespeichert).\n" .
	"   Nicht von Hand editieren – wird beim nächsten Speichern überschrieben.\n" .
	"   ============================================================ */";

$json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
if ($json === false) {
	respondError('JSON-Kodierung fehlgeschlagen.');
}

$js = $header . "\n" . 'window.AMCF_SITE_DATA = ' . $json . ';' . "\n";

$dir = __DIR__ . '/data';
if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
if (!is_dir($dir) || !is_writable($dir)) {
	respondError('Ordner data/ nicht beschreibbar. Bitte Schreibrechte setzen (z. B. CHMOD 775/777).');
}

$target = $dir . '/projects.js';
$tmp = $dir . '/projects.tmp.js';

if (file_put_contents($tmp, $js) === false) {
	respondError('Temporäre Datei konnte nicht geschrieben werden.');
}
if (!@rename($tmp, $target)) {
	if (!file_put_contents($target, $js)) {
		@unlink($tmp);
		respondError('Datei konnte nicht ersetzt werden.');
	}
	@unlink($tmp);
}

echo json_encode(array('ok' => true));
