@echo off
chcp 65001 >nul
title Xiu - quan ly menu
cd /d "%~dp0"
where py >nul 2>nul && (py -3 admin\server.py & goto :end)
where python >nul 2>nul && (python admin\server.py & goto :end)
if exist "%USERPROFILE%\anaconda3\python.exe" ("%USERPROFILE%\anaconda3\python.exe" admin\server.py & goto :end)
if exist "%USERPROFILE%\miniconda3\python.exe" ("%USERPROFILE%\miniconda3\python.exe" admin\server.py & goto :end)
echo Khong tim thay Python. Cai Python tai https://www.python.org/downloads/ (tick "Add python.exe to PATH") roi chay lai.
:end
pause
