@echo off
cd /d "%~dp0"
if not exist node_modules call npm ci
set NUXT_PUBLIC_DEMO_MODE=true
call npm run dev -- --open
pause
