@echo off
setlocal
where py >nul 2>nul
if %errorlevel%==0 (
  set PY=py -3
) else (
  set PY=python
)

%PY% "%~dp0..\src\fb_redirect_checker.py" "%~dp0..\data\input\data-1787537778460.csv" --output "%~dp0..\data\output\data-1787537778460_redirect_checked" --resume --workers 10 --timeout 45 --render-wait 2.0 --delay-min 0 --delay-max 0 --save-every 200 --headless %*
pause
