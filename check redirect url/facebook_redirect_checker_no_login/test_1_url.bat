@echo off
setlocal
where py >nul 2>nul
if %errorlevel%==0 (
  set PY=py -3
) else (
  set PY=python
)

%PY% "%~dp0fb_redirect_checker.py" "%~dp0data-1787136301628.csv" --limit 1 --output "%~dp0test_1_url"
pause
