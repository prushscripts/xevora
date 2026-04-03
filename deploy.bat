@echo off
title Xevora Deploy
color 0A
echo.
echo  ================================================
echo   XEVORA DEPLOY — Pushing to GitHub + Vercel
echo  ================================================
echo.

cd /d "%~dp0"

git status --porcelain > nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Not a git repository. Aborting.
  pause
  exit /b 1
)

echo  [1/4] Staging all changes...
git add -A

set TIMESTAMP=%date:~10,4%-%date:~4,2%-%date:~7,2% %time:~0,2%:%time:~3,2%
echo  [2/4] Committing: %TIMESTAMP%
git commit -m "deploy: %TIMESTAMP%"

echo  [3/4] Pushing to GitHub...
git push origin main
if errorlevel 1 (
  echo  [ERROR] Git push failed.
  pause
  exit /b 1
)

echo  [4/4] Triggering Vercel builds...

curl -s -X POST "https://api.vercel.com/v1/integrations/deploy/prj_mLIOXYoWLiKpgTkhRBkq0ssuNcLx/mpHQYT8m6J" > nul 2>&1
echo        xevora landing triggered.

curl -s -X POST "https://api.vercel.com/v1/integrations/deploy/prj_mIZvLa0uUKXLVrlmsRl5kphcNBQn/gmIxd6pyBO" > nul 2>&1
echo        xevora-app triggered.

echo.
echo  ================================================
echo   DONE. Check vercel.com/prushscripts
echo  ================================================
echo.
pause
exit /b 0
