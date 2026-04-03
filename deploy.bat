@echo off
setlocal
cd /d "%~dp0"

echo.
echo ========================================
echo   Xevora — Deploy
echo ========================================
echo   Directory: %CD%
echo   Targets BOTH Vercel projects: xevora ^(marketing^) + xevora-app ^(app^).
echo   1^) Stages changes, stamps landing\ + xevora-app\ ^(git sees both roots^).
echo   2^) Commits and pushes origin main.
echo   3^) If .vercel-deploy-hooks.txt exists, POSTs each URL ^(forces a build per project^).
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
echo       OK — changes detected.
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

echo [5/5] Vercel Deploy Hooks ^(optional — forces xevora + xevora-app builds^)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-invoke-hooks.ps1" -RepoRoot "%CD%"
if errorlevel 1 (
  echo.
  echo WARNING: A deploy hook failed ^(git push already succeeded^). Fix .vercel-deploy-hooks.txt or Vercel.
  echo.
)

echo.
echo ========================================
echo   Done. Confirm in Vercel:
echo   - Project xevora ^(marketing / landing root^)
echo   - Project xevora-app
echo   With hooks configured, both should show a new deployment now.
echo ========================================
echo.
pause
endlocal
exit /b 0
