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
set IP=localhost
for /f "delims=" %%i in ('node worker\dev-ip.mjs') do set IP=%%i
echo.
echo  Trang cua tiem : http://%IP%:8787/quan-ly
echo  Mat khau thu   : xem dong STAFF_PASSWORD trong tep .dev.vars
echo  Dien thoai phai dung CUNG mang Wi-Fi voi may tinh nay.
echo  Neu Windows hoi tuong lua ^(Firewall^): chon "Private networks" roi bam Allow.
echo  Dong cua so nay (hoac Ctrl+C) de tat.
echo.
start "" cmd /c "timeout /t 15 >nul & start http://%IP%:8787/quan-ly"
call npx --yes wrangler@4 dev --ip 0.0.0.0 --port 8787
pause
