@echo off
title InsightPDF AI - Backend Server
cd /d "%~dp0backend"

echo ==========================================
echo Starting InsightPDF AI Backend...
echo ==========================================

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.11+ from https://www.python.org/
    pause
    exit /b 1
)

:: Create virtual environment if it doesn't exist
if not exist ".venv" (
    echo Creating Python virtual environment (.venv)...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

:: Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment.
    pause
    exit /b 1
)

:: Install requirements
echo Checking and installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install requirements.
    pause
    exit /b 1
)

:: Start backend
echo Starting FastAPI backend on http://localhost:8000 (docs at http://localhost:8000/docs)
uvicorn app.main:app --reload --port 8000
if %errorlevel% neq 0 (
    echo [ERROR] Backend crashed or failed to start.
    pause
)
