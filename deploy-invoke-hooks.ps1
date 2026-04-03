param(
  [Parameter(Mandatory = $true)]
  [string] $RepoRoot
)
$ErrorActionPreference = 'Stop'
$p = Join-Path $RepoRoot '.vercel-deploy-hooks.txt'
if (-not (Test-Path -LiteralPath $p)) {
  Write-Host '       (No .vercel-deploy-hooks.txt — add Deploy Hook URLs to force both Vercel projects.)'
  exit 0
}
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
    Write-Host "       OK"
  } catch {
    Write-Host "       FAIL: $($_.Exception.Message)"
    exit 1
  }
}
if ($n -eq 0) {
  Write-Host '       No hook URLs found in .vercel-deploy-hooks.txt (uncomment/add https lines).'
}
