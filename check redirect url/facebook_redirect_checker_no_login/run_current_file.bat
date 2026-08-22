@echo off
setlocal
where py >nul 2>nul
if %errorlevel%==0 (
  set PY=py -3
) else (
  set PY=python
)

%PY% "%~dp0fb_redirect_checker.py" "%~dp0data-1787311809740.csv" --resume --workers 10 --delay-min 0 --delay-max 0 --save-every 200 --headless %*
pause
