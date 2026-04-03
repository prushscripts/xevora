@echo off
setlocal
cd /d "%~dp0"

echo.
echo ========================================
echo   Xevora — Deploy
echo ========================================
echo   Directory: %CD%
echo   Pushes origin main — Vercel builds projects linked to this repo.
echo   Tip: xevora.io landing lives under landing\ — use the Vercel project
echo   whose Root Directory is "landing", not only "xevora-app".
echo ========================================
echo.

echo [1/4] Staging all changes ^(git add .^)...
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

echo [2/4] Detecting changes ^(git diff HEAD --name-only^)...
git diff --quiet HEAD
if errorlevel 1 goto :HAVE_CHANGES

echo.
echo No local changes vs last commit — bumping landing\.vercel-deploy-revision.txt
echo so Git has a new commit and Vercel can start a fresh build ^(landing root^).
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $d=Join-Path '%CD%' 'landing'; if(-not(Test-Path $d)){ throw 'landing folder missing' }; $ts=(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'); $p=Join-Path $d '.vercel-deploy-revision.txt'; Set-Content -LiteralPath $p -Value $ts -Encoding ascii"
if errorlevel 1 (
  echo.
  echo ERROR: Could not write landing\.vercel-deploy-revision.txt
  echo.
  pause
  exit /b 1
)
git add landing/.vercel-deploy-revision.txt
git diff --quiet HEAD
if errorlevel 1 goto :HAVE_CHANGES

echo.
echo ERROR: Bump did not produce a diff — check git status.
echo.
pause
exit /b 1

:HAVE_CHANGES

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

echo [3/4] Committing with auto-generated message...
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

echo [4/4] Pushing to origin main...
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

echo ========================================
echo ✅ Xevora deployed — Vercel is building now
echo ========================================
echo.
pause
endlocal
exit /b 0
