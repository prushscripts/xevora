@echo off
title Xevora Deploy
color 0A
echo.
echo  ================================================
echo   XEVORA DEPLOY — Pushing to GitHub + Vercel
echo  ================================================
echo.
cd /d "%~dp0"

echo  [1/4] Staging all changes...
git add -A

set TIMESTAMP=%date:~10,4%-%date:~4,2%-%date:~7,2% %time:~0,2%:%time:~3,2%
echo  [2/4] Committing: %TIMESTAMP%
git commit -m "deploy: %TIMESTAMP%"
if errorlevel 1 (
  echo  [INFO] Nothing new to commit.
)

echo  [3/4] Pushing to GitHub...
git push origin main
if errorlevel 1 (
  echo  [ERROR] Git push failed.
  pause
  exit /b 1
)

echo  [4/4] Deploying to Vercel...
cd /d "%~dp0xevora-app"
npx vercel --prod --yes
echo        xevora-app deployed.

cd /d "%~dp0landing"
npx vercel --prod --yes
echo        xevora landing deployed.

echo.
echo  ================================================
echo   DONE. Check vercel.com/prushscripts
echo  ================================================
echo.
pause
exit /b 0
