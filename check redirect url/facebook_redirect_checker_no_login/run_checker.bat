@echo off
setlocal
where py >nul 2>nul
if %errorlevel%==0 (
  set PY=py -3
) else (
  set PY=python
)

if "%~1"=="" (
  echo Keo-tha file CSV/XLSX vao run_checker.bat, hoac nhap duong dan.
  set /p INPUT=File input: 
) else (
  set INPUT=%~1
)

%PY% "%~dp0fb_redirect_checker.py" "%INPUT%" --resume --workers 10 --timeout 45 --render-wait 2.0 --delay-min 0 --delay-max 0 --save-every 200 --headless %*
pause
