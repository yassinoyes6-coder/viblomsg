@echo off
chcp 65001 >nul
cd /d "%~dp0"
title VIBLO-MSG Server
if not exist node_modules (
  echo Installing dependencies...
  call npm.cmd install --no-audit --no-fund
)
start "" /b cmd /c "timeout /t 2 >nul && start http://localhost:3000"
node server.js
pause
