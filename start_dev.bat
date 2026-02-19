@echo off
start "DevOps Agent Backend" cmd /k "cd agent && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
start "DevOps Agent Frontend" cmd /k "cd frontend && npm run dev"
echo [INFO] Services starting...
echo [INFO] Backend: http://localhost:8000
echo [INFO] Frontend: http://localhost:3000
pause
