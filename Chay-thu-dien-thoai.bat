@echo off
chcp 65001 >nul
title Xiu - thu dat mon bang dien thoai
cd /d "%~dp0"
where node >nul 2>nul || (
  echo Chua co Node.js. Tai ban LTS tai https://nodejs.org , cai xong thi chay lai tep nay.
  start "" https://nodejs.org
  pause
  exit /b
)
if not exist .dev.vars (
  echo Thieu tep .dev.vars ^(khoa thu nghiem^). Hoi lai Claude.
  pause
  exit /b
)
echo.
echo  Dang mo may chu thu va duong ham HTTPS tam thoi cho dien thoai...
echo  Lan dau se tai cloudflared (khoang 60 MB), xin cho mot chut.
echo.
node worker\dev-tunnel.mjs
pause
