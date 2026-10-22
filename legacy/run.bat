@echo off
setlocal
echo ========================================================
echo   ReRoute AI 2.0 - Predictive Backhaul Platform
echo ========================================================
echo Starting local application server...

cd /d "%~dp0"

set "AGY_NODE=C:\Users\Arpita\AppData\Roaming\Antigravity\bin\agy-node.cmd"

if exist "%AGY_NODE%" (
    start http://localhost:3000
    "%AGY_NODE%" server.js
) else (
    where node >nul 2>nul
    if %errorlevel% equ 0 (
        start http://localhost:3000
        node server.js
    ) else (
        echo Node runtime not detected.
        echo Opening ReRoute AI 2.0 directly in default web browser...
        start "" "%~dp0index.html"
    )
)

endlocal
pause
