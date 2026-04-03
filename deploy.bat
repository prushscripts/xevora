@echo off
setlocal
cd /d "%~dp0"

echo.
echo ========================================
echo   Xevora - Deploy
echo ========================================
echo   Directory: %CD%
echo   Targets BOTH Vercel projects: xevora ^(marketing^) + xevora-app ^(app^).
echo   1^) Stages changes, stamps landing\ + xevora-app\.
echo   2^) Commits and pushes origin main.
echo   3^) REQUIRED: POSTs 2 Deploy Hook URLs ^(xevora + xevora-app^) so BOTH Vercel projects build.
echo      ^(File: vercel-deploy-hooks.example.txt or .vercel-deploy-hooks.txt — see TEMPLATE^)
echo ========================================
echo.

echo [1/5] Staging your changes ^(git add .^)...
git add .
if errorlevel 1 (
  echo.
  echo ERROR: git add failed. Is this a git repository?
  echo.
  pause
  exit /b 1
)
echo       Done.
echo.

echo [2/5] Updating deploy revision stamps ^(landing + xevora-app^)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $ErrorActionPreference='Stop'; Set-Location -LiteralPath '%CD%'; $ts=(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'); foreach($sub in @('landing','xevora-app')) { $dir=Join-Path (Get-Location) $sub; if(-not(Test-Path -LiteralPath $dir)){ throw ('Missing folder: '+$sub) }; $p=Join-Path $dir '.vercel-deploy-revision.txt'; Set-Content -LiteralPath $p -Value $ts -Encoding ascii } }"
if errorlevel 1 (
  echo.
  echo ERROR: Could not write .vercel-deploy-revision.txt under landing\ or xevora-app\
  echo.
  pause
  exit /b 1
)
git add landing/.vercel-deploy-revision.txt xevora-app/.vercel-deploy-revision.txt
echo       Done.
echo.

echo [3/5] Verifying there is something to commit...
git diff --quiet HEAD
if not errorlevel 1 (
  echo.
  echo ERROR: Still nothing to commit after revision bump. Check git status.
  echo.
  pause
  exit /b 1
)
echo       OK - changes detected.
echo.

echo       Building commit message from changed paths...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop'; " ^
  "$names = @(git diff HEAD --name-only); " ^
  "$n = $names.Count; " ^
  "$max = 12; " ^
  "$take = [Math]::Min($max, $n); " ^
  "$parts = @(); for ($i = 0; $i -lt $take; $i++) { $parts += $names[$i] }; " ^
  "$list = ($parts -join ', '); " ^
  "if ($n -gt $max) { $list += ', and ' + ($n - $max) + ' more' }; " ^
  "$msg = 'update: ' + $list + ' - ' + $n + ' file(s) changed'; " ^
  "$p = Join-Path $env:TEMP 'xevora_deploy_commit_msg.txt'; " ^
  "[System.IO.File]::WriteAllText($p, $msg, [System.Text.UTF8Encoding]::new($false))"
if errorlevel 1 (
  echo.
  echo ERROR: Failed to build commit message.
  echo.
  pause
  exit /b 1
)
set "MSGFILE=%TEMP%\xevora_deploy_commit_msg.txt"
echo       Message:
type "%MSGFILE%"
echo.

git commit -F "%MSGFILE%"
if errorlevel 1 (
  echo.
  echo ERROR: git commit failed.
  echo.
  pause
  exit /b 1
)
echo       Commit created.
echo.

echo [4/5] Pushing to origin main...
git push origin main
if errorlevel 1 (
  echo.
  echo ERROR: git push failed. See messages above.
  echo.
  pause
  exit /b 1
)
echo       Push complete.
echo.

echo       Latest commit ^(local^):
git log -1 --oneline
echo.

echo [5/5] Triggering BOTH Vercel builds ^(Deploy Hooks — required^)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-invoke-hooks.ps1" -RepoRoot "%CD%" -RequireBoth
if errorlevel 1 (
  echo.
  echo ERROR: Hook step failed ^(see PowerShell output above^).
  echo Git push may have succeeded; xevora.io or app may be stale until you fix hooks.
  echo Need 2 lines: hook from Vercel project xevora, then hook from xevora-app.
  echo.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   Done. Open Vercel: both xevora and xevora-app should show a new deployment.
echo ========================================
echo.
pause
endlocal
exit /b 0
