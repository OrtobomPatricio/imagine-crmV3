@echo off
cd /d "%~dp0"
set NODE_ENV=development
set PORT=3000
start /min pnpm run dev
