@echo off
title InsightPDF AI Launcher
cd /d "%~dp0"

echo ==========================================
echo InsightPDF AI Startup Launcher (Windows)
echo ==========================================
echo This script will start both the Python backend and Next.js frontend.
echo.

:: Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Node.js is not found. The frontend will not be able to start.
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Python is not found. The backend will not be able to start.
    echo Please install Python from: https://www.python.org/
    pause
    exit /b 1
)

echo Starting Backend server in a new window...
start "InsightPDF AI Backend" cmd /c "%~dp0start-backend.bat"

echo Starting Frontend server in a new window...
start "InsightPDF AI Frontend" cmd /c "%~dp0start-frontend.bat"

echo.
echo ==========================================
echo Servers are launching in separate windows!
echo ==========================================
echo - Backend (API & Docs): http://localhost:8000/docs
echo - Frontend (Chat App):  http://localhost:3000
echo ==========================================
echo Keep this window open if you want to inspect, or press any key to close this launcher.
echo (The server windows will stay open and running).
echo.
pause
