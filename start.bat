@echo off
title VAULT-01 Turnkey Launcher
cd /d "%~dp0"

echo ====================================================
echo        VAULT-01 // TURNKEY SYSTEM LAUNCHER
echo ====================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (v20 or newer) from https://nodejs.org/
    pause
    exit /b 1
)

node launch.cjs
if %errorlevel% neq 0 (
    echo.
    echo [NOTICE] Launcher terminated with exit code %errorlevel%.
    pause
)
