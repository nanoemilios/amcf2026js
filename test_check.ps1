$r = Invoke-WebRequest -Uri "http://localhost:8000/index.html" -TimeoutSec 5
$content = $r.Content
$idx = $content.IndexOf('jpreLoader')
if ($idx -ge 0) {
    $snippet = $content.Substring($idx, [Math]::Min(200, $content.Length - $idx))
    $snippet | Out-File "C:\Users\nanoe\OneDrive\CODDING\AMCF\2026\test_output.txt"
} else {
    "jpreLoader NOT found in HTML" | Out-File "C:\Users\nanoe\OneDrive\CODDING\AMCF\2026\test_output.txt"
}