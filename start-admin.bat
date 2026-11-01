@echo off
cd /d "%~dp0"
title PRUUSHKAA // ARCHIVE_OS - LOCAL ADMIN

set NODE_EXE=node
if exist "C:\Program Files\nodejs\node.exe" set NODE_EXE="C:\Program Files\nodejs\node.exe"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set NODE_EXE="%LOCALAPPDATA%\Programs\nodejs\node.exe"

echo ===================================================================
echo   [PRUUSHKAA // ARCHIVE_OS] LOCAL CONTROL TERMINAL
echo   Directory: %CD%
echo ===================================================================
echo.
echo   [1/2] Opening http://localhost:3001/admin in your browser...
start http://localhost:3001/admin
echo   [2/2] Server running on http://localhost:3001
echo.
echo   To stop the server, press Ctrl+C or close this window.
echo ===================================================================

%NODE_EXE% pruushkaa_archive/server.js
pause
