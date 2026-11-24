@echo off
setlocal
title Course Player
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is required.
  echo Install it from https://nodejs.org and then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies, this only happens the first time...
  call npm install --include=dev
  if errorlevel 1 (
    echo.
    echo Dependency installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

echo Starting Course Player and opening it in your browser...
echo Keep this window open while you use the app. Press Ctrl+C to stop.
call npm run dev -- --open

pause
