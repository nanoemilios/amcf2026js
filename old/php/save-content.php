<?php
/**
 * Persists the content edits produced by admin-content.html.
 *
 * Receives:  { "files": { "index.html": "<html>", "js/i18n.en.js": "<js>" } }
 * Returns:   { "ok": true, "written": { "<path>": <bytes> } }
 *
 * Only the paths in ALLOWED may be written. A .bak copy of the previous
 * version is kept next to each file so a bad save can be undone.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const ALLOWED = [
    'index.html',
    'js/i18n.de-ch.js',
    'js/i18n.en.js',
    'js/i18n.es.js',
    'js/i18n.gl.js',
    'js/i18n.pt.js',
];

function fail(string $msg, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('Only POST is allowed.', 405);
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    // PHP silently discards bodies larger than post_max_size, so an empty read
    // with a large Content-Length means the payload was rejected before we saw it.
    $declared = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    $max = (int) ini_get('post_max_size');
    if ($declared > 0 && $max > 0 && $declared > $max) {
        fail(sprintf('Payload of %d bytes exceeds post_max_size (%d bytes).', $declared, $max), 413);
    }
    fail('Empty request body.');
}

$payload = json_decode($raw, true);
if (!is_array($payload) || !isset($payload['files']) || !is_array($payload['files'])) {
    fail('Expected JSON of the form {"files": {...}}: ' . json_last_error_msg());
}

$root = __DIR__;
$files = $payload['files'];
if (count($files) === 0) {
    fail('No files to write.');
}

$written = [];
$problems = [];

foreach ($files as $relPath => $content) {
    $relPath = (string) $relPath;

    if (!in_array($relPath, ALLOWED, true)) {
        $problems[] = 'refused (not in whitelist): ' . $relPath;
        continue;
    }
    if (!is_string($content)) {
        $problems[] = 'not a string: ' . $relPath;
        continue;
    }

    $target = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relPath);
    $real = realpath(dirname($target));
    if ($real === false || strpos($real, $root) !== 0) {
        $problems[] = 'path escapes the site root: ' . $relPath;
        continue;
    }
    if (!is_file($target)) {
        $problems[] = 'missing on disk: ' . $relPath;
        continue;
    }

    // Keep the previous version so a bad save is recoverable.
    $backup = $target . '.bak';
    if (!@copy($target, $backup)) {
        $problems[] = 'could not create backup: ' . $relPath;
        continue;
    }

    $bytes = @file_put_contents($target, $content, LOCK_EX);
    if ($bytes === false) {
        $problems[] = 'write failed: ' . $relPath;
        continue;
    }
    $written[$relPath] = $bytes;
}

echo json_encode([
    'ok'      => count($problems) === 0 && count($written) > 0,
    'written' => $written,
    'problems' => $problems,
], JSON_UNESCAPED_UNICODE);