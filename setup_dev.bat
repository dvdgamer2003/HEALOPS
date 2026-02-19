@echo off
echo [SETUP] Installing Python dependencies for the Agent...
cd agent
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install Python dependencies. Ensure Python is installed and in PATH.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [SETUP] Installing Node.js dependencies for the Frontend...
cd ..\frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install Frontend dependencies. Ensure Node.js is installed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [INFO] Setup complete.
echo [INFO] To run the agent: cd agent && uvicorn main:app --reload
echo [INFO] To run the frontend: cd frontend && npm run dev
echo.
pause
