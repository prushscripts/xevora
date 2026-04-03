@echo off
title Xevora Deploy
color 0A

echo.
echo  ================================================
echo   XEVORA DEPLOY — Pushing to GitHub + Vercel
echo  ================================================
echo.

:: Navigate to repo root (wherever the bat file lives)
cd /d "%~dp0"

:: Check for uncommitted changes
git status --porcelain > nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Not a git repository. Aborting.
  pause
  exit /b 1
)

:: Stage all changes
echo  [1/4] Staging all changes...
git add -A
if errorlevel 1 (
  echo  [ERROR] Git add failed.
  pause
  exit /b 1
)

:: Commit with timestamp
set TIMESTAMP=%date:~10,4%-%date:~4,2%-%date:~7,2% %time:~0,2%:%time:~3,2%
echo  [2/4] Committing with timestamp: %TIMESTAMP%
git commit -m "deploy: %TIMESTAMP%"
if errorlevel 1 (
  echo  [INFO] Nothing new to commit — pushing existing HEAD.
)

:: Push to main
echo  [3/4] Pushing to GitHub (main)...
git push origin main
if errorlevel 1 (
  echo  [ERROR] Git push failed. Check your connection or credentials.
  pause
  exit /b 1
)

echo  [4/4] Triggering Vercel deployments...

:: Trigger xevora (landing) deploy via Vercel deploy hook
:: Replace the URL below with your actual Vercel deploy hook for the "xevora" project
:: Get it from: Vercel Dashboard → xevora project → Settings → Git → Deploy Hooks → Create Hook
echo  Testing Vercel connection...

curl -s -X POST "https://api.vercel.com/v1/integrations/deploy/prj_mLIOXYoWLiKpgTkhRBkq0ssuNcLx/ZXx54tCMjL" -H "Content-Type: application/json" -d "{}"
if errorlevel 1 (
  echo  [WARN] Could not trigger xevora landing deploy hook. Check URL.
) else (
  echo        xevora (landing) deploy triggered.
)

:: Trigger xevora-app deploy via Vercel deploy hook  
:: Replace the URL below with your actual Vercel deploy hook for the "xevora-app" project
curl -s -X POST "https://api.vercel.com/v1/integrations/deploy/prj_mIZvLa0uUKXLVrlmsRl5kphcNBQn/tZJBOjAO0v" -H "Content-Type: application/json" -d "{}"
if errorlevel 1 (
  echo  [WARN] Could not trigger xevora-app deploy hook. Check URL.
) else (
  echo        xevora-app deploy triggered.
)

echo.
echo  ================================================
echo   DONE. Both projects deploying on Vercel.
echo   Check: https://vercel.com/prushscripts
echo  ================================================
echo.

pause
exit /b 0
