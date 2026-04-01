@echo off
setlocal
cd /d "%~dp0"

echo.
echo ========================================
echo   Xevora — Deploy
echo ========================================
echo   Directory: %CD%
echo ========================================
echo.

echo [1/5] Staging all changes ^(git add .^)...
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

echo [2/5] Detecting changes ^(git diff HEAD --name-only^)...
git diff --quiet HEAD
if errorlevel 1 goto :HAVE_CHANGES

echo.
echo ⚠️ Nothing to deploy — no changes detected
echo.
pause
exit /b 0

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

echo [3/5] Committing with auto-generated message...
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

echo [5/5] Opening Vercel dashboard in your browser...
start "" "https://vercel.com/dashboard"
echo       Browser launched.
echo.

echo ========================================
echo ✅ Xevora deployed — Vercel is building now
echo ========================================
echo.
pause
endlocal
exit /b 0
