<?php
/**
 * Image upload for admin-content.html.
 *
 * Receives multipart/form-data with:
 *   dir  - target folder, must be one of ALLOWED_DIRS
 *   file - the image
 *
 * Returns { "ok": true, "path": "images/resume/xyz.jpg", "bytes": 12345 }
 * or      { "ok": false, "error": "..." }
 *
 * The folder is whitelisted, the filename is regenerated from a sanitised base
 * name plus a random suffix, the extension must be an allowed image type, and
 * the upload is confirmed to be a real image with getimagesize() before it is
 * written anywhere.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const ALLOWED_DIRS = ['resume', 'folio'];
const ALLOWED_EXT  = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_BYTES    = 8 * 1024 * 1024;

function fail(string $msg, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('Only POST is allowed.', 405);
}

$dir = isset($_POST['dir']) ? (string) $_POST['dir'] : '';
if (!in_array($dir, ALLOWED_DIRS, true)) {
    fail('Unknown target folder. Allowed: ' . implode(', ', ALLOWED_DIRS));
}

if (empty($_FILES['file'])) {
    $err = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
    fail('No file received (error code ' . $err . ').');
}

$file = $_FILES['file'];

// PHP reports oversized uploads via post_max_size/upload_max_filesize, not here.
if ($file['error'] !== UPLOAD_ERR_OK) {
    $messages = [
        UPLOAD_ERR_INI_SIZE   => 'File exceeds upload_max_filesize.',
        UPLOAD_ERR_FORM_SIZE  => 'File exceeds the form limit.',
        UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded.',
        UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
        UPLOAD_ERR_NO_TMP_DIR => 'Server has no temp folder.',
        UPLOAD_ERR_CANT_WRITE => 'Server cannot write the file.',
        UPLOAD_ERR_EXTENSION  => 'A PHP extension blocked the upload.',
    ];
    fail($messages[$file['error']] ?? ('Upload failed, error code ' . $file['error'] . '.'), 500);
}

if ($file['size'] > MAX_BYTES) {
    fail('File is larger than the ' . (MAX_BYTES / 1024 / 1024) . ' MB limit.', 413);
}
if ($file['size'] <= 0) {
    fail('File is empty.');
}

// extension check, from the client name only
$originalName = (string) $file['name'];
$ext = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));
if (!in_array($ext, ALLOWED_EXT, true)) {
    fail('Allowed image types: ' . implode(', ', ALLOWED_EXT));
}

// confirm it really is an image
$info = @getimagesize($file['tmp_name']);
if ($info === false) {
    fail('That file is not a readable image.');
}

// sanitise the base name: letters, digits, dash, underscore only
$base = pathinfo($originalName, PATHINFO_FILENAME);
$base = preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) $base);
$base = trim((string) $base, '-');
if ($base === '') {
    $base = 'bild';
}
$base = substr($base, 0, 40);

$targetDir = __DIR__ . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . $dir;
if (!is_dir($targetDir) && !@mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
    fail('Target folder does not exist and could not be created: images/' . $dir, 500);
}

// never overwrite: add a random suffix
do {
    $name = $base . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
    $target = $targetDir . DIRECTORY_SEPARATOR . $name;
} while (file_exists($target));

$moved = is_uploaded_file($file['tmp_name'])
    ? @move_uploaded_file($file['tmp_name'], $target)
    : @rename($file['tmp_name'], $target);

if (!$moved) {
    fail('Could not store the file. Check that images/' . $dir . ' is writable.', 500);
}

@chmod($target, 0644);

echo json_encode([
    'ok'    => true,
    'path'  => 'images/' . $dir . '/' . $name,
    'bytes' => (int) filesize($target),
], JSON_UNESCAPED_UNICODE);