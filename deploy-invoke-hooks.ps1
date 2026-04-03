param(
  [Parameter(Mandatory = $true)]
  [string] $RepoRoot
)
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($RepoRoot.TrimEnd('\', '/'))

$candidates = @(
  (Join-Path $root '.vercel-deploy-hooks.txt'),
  (Join-Path $root 'vercel-deploy-hooks.txt')
)

$p = $null
foreach ($c in $candidates) {
  if (Test-Path -LiteralPath $c) {
    $p = $c
    break
  }
}

if (-not $p) {
  Write-Host "       Hooks file not found. Looked for:"
  foreach ($c in $candidates) { Write-Host "         - $c" }
  Write-Host ''
  Write-Host '       Create ONE of these in the repo root (same folder as deploy.bat):'
  Write-Host '         .vercel-deploy-hooks.txt   (leading dot - in Notepad use "All files" when saving)'
  Write-Host '         vercel-deploy-hooks.txt    (no dot - also accepted)'
  Write-Host '       Put one https://... hook URL per line. Do not use .txt.txt double extension.'
  exit 0
}

Write-Host "       Using: $p"
$lines = Get-Content -LiteralPath $p
$n = 0
foreach ($raw in $lines) {
  $line = $raw.Trim()
  if ($line -eq '' -or $line.StartsWith('#')) { continue }
  if ($line -notmatch '^https://') {
    Write-Host "       SKIP (not an https URL): $line"
    continue
  }
  $n++
  Write-Host "       POST hook $n ..."
  try {
    Invoke-WebRequest -Uri $line -Method Post -UseBasicParsing -TimeoutSec 120 | Out-Null
    Write-Host '       OK'
  } catch {
    Write-Host "       FAIL: $($_.Exception.Message)"
    exit 1
  }
}
if ($n -eq 0) {
  Write-Host '       No hook URLs found (add uncommented https:// lines).'
}
