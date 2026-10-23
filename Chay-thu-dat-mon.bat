@echo off
chcp 65001 >nul
title Xiu - chay thu dat mon tren may
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
echo  Trang cua tiem : http://localhost:8787/quan-ly
echo  Mat khau thu   : xem dong STAFF_PASSWORD trong tep .dev.vars
echo  Dong cua so nay (hoac Ctrl+C) de tat.
echo.
start "" cmd /c "timeout /t 15 >nul & start http://localhost:8787/quan-ly"
call npx --yes wrangler@4 dev --port 8787
pause
