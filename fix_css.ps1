$lines = Get-Content 'app\globals.css'
$lines[0..1057] | Out-File 'app\globals.css' -Encoding UTF8
Write-Host "Done. Lines: $($lines[0..1057].Count)"
