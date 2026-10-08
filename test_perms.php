<?php
$dir = 'C:\Users\nanoe\OneDrive\CODDING\AMCF\2026\data';
echo 'is_dir: ' . (is_dir($dir) ? 'true' : 'false') . PHP_EOL;
echo 'is_writable: ' . (is_writable($dir) ? 'true' : 'false') . PHP_EOL;
echo 'is_readable: ' . (is_readable($dir) ? 'true' : 'false') . PHP_EOL;
$test = $dir . '\test_write.txt';
echo 'file_put_contents: ' . (file_put_contents($test, 'test') !== false ? 'success' : 'failed') . PHP_EOL;
@unlink($test);