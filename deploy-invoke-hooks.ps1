param(
  [Parameter(Mandatory = $true)]
  [string] $RepoRoot
)
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($RepoRoot.TrimEnd('\', '/'))

$candidates = @(
  (Join-Path $root '.vercel-deploy-hooks.txt'),
  (Join-Path $root 'vercel-deploy-hooks.txt'),
  (Join-Path $root 'vercel-deploy-hooks.example.txt'),
  (Join-Path $root 'vercel-deploy-hooks.example')
)

$p = $null
foreach ($c in $candidates) {
  if (Test-Path -LiteralPath $c) {
    $p = $c
    break
  }
}

if (-not $p) {
  Write-Host '       Hooks file not found. Looked for:'
  foreach ($c in $candidates) { Write-Host "         - $c" }
  Write-Host ''
  Write-Host '       Add your Vercel hook URLs to ONE of these (repo root, next to deploy.bat):'
  Write-Host '         vercel-deploy-hooks.example.txt   (recommended; gitignored)'
  Write-Host '         .vercel-deploy-hooks.txt'
  Write-Host '         vercel-deploy-hooks.txt'
  Write-Host '       See vercel-deploy-hooks.TEMPLATE.txt for instructions.'
  exit 0
}

Write-Host "       Using: $p"

$rawLines = New-Object System.Collections.Generic.List[string]
foreach ($raw in (Get-Content -LiteralPath $p)) {
  $line = $raw.Trim()
  if ($line -eq '' -or $line.StartsWith('#')) { continue }
  if ($line -notmatch '^https://') {
    Write-Host "       SKIP (not an https URL): $line"
    continue
  }
  $rawLines.Add($line)
}

if ($rawLines.Count -eq 0) {
  Write-Host '       No hook URLs found (add uncommented https:// lines).'
  exit 0
}

$uniqueOrdered = New-Object System.Collections.Generic.List[string]
$seen = @{}
foreach ($u in $rawLines) {
  if ($seen.ContainsKey($u)) {
    Write-Host "       WARNING: Duplicate URL (posting once): $($u.Substring(0, [Math]::Min(64, $u.Length)))..."
    continue
  }
  $seen[$u] = $true
  $uniqueOrdered.Add($u)
}

if ($uniqueOrdered.Count -lt 2) {
  Write-Host ''
  Write-Host '       WARNING: Only one deploy hook URL. You need TWO different URLs:'
  Write-Host '         1) Vercel project **xevora**  -> Settings -> Git -> Deploy Hooks -> copy URL'
  Write-Host '         2) Vercel project **xevora-app** -> same (must be a different URL / different prj_ id)'
  Write-Host '       Put one URL per line in this file. Saving the same hook twice will not build the app.'
  Write-Host ''
}

$failures = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $uniqueOrdered.Count; $i++) {
  if ($i -gt 0) { Start-Sleep -Seconds 2 }
  $line = $uniqueOrdered[$i]
  $preview = if ($line.Length -gt 72) { $line.Substring(0, 72) + '...' } else { $line }
  Write-Host "       POST hook $($i + 1)/$($uniqueOrdered.Count) ..."
  Write-Host "         $preview"
  try {
    $r = Invoke-WebRequest -Uri $line -Method Post -UseBasicParsing -TimeoutSec 120
    Write-Host "       OK (HTTP $($r.StatusCode))"
  } catch {
    $msg = $_.Exception.Message
    $resp = $_.Exception.Response
    if ($null -ne $resp -and $resp -is [System.Net.HttpWebResponse]) {
      try {
        $stream = $resp.GetResponseStream()
        if ($null -ne $stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $body = $reader.ReadToEnd()
          if ($body.Length -gt 0 -and $body.Length -lt 500) { $msg += " | $body" }
        }
      } catch { }
    }
    Write-Host "       FAIL: $msg"
    $failures.Add($preview)
  }
}

if ($failures.Count -gt 0) {
  Write-Host ''
  Write-Host '       One or more hooks failed. Check the failing URL in Vercel (Revoke + create new hook if needed).'
  Write-Host '       The xevora-app line must be copied from the **xevora-app** project, not xevora.'
  exit 1
}
