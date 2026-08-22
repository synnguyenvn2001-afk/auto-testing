@echo off
setlocal
where py >nul 2>nul
if %errorlevel%==0 (
  set PY=py -3
) else (
  set PY=python
)

%PY% -m pip install --upgrade pip
%PY% -m pip install -r "%~dp0requirements.txt"
%PY% -m playwright install chromium

echo.
echo Cai dat xong.
pause
