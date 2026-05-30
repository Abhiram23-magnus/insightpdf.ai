@echo off
title InsightPDF AI - Frontend Server
cd /d "%~dp0frontend"

echo ==========================================
echo Starting InsightPDF AI Frontend...
echo ==========================================

:: Check if Node is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: Install node_modules if not present
if not exist "node_modules" (
    echo Installing npm packages (this may take a minute)...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: Start Next.js development server
echo Starting Next.js frontend on http://localhost:3000
npm run dev
if %errorlevel% neq 0 (
    echo [ERROR] Frontend failed to start.
    pause
)
