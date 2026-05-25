@echo off
echo.
echo  MedCare+ v7 - Starting Development Server
echo  ==========================================
echo.

where dotnet >nul 2>&1 || (echo  ERROR: .NET 8 SDK not found. Get it from https://dotnet.microsoft.com/download & pause & exit /b 1)
where node   >nul 2>&1 || (echo  ERROR: Node.js not found. Get it from https://nodejs.org & pause & exit /b 1)

echo  [1/3] Starting backend on http://localhost:5050 ...
start "MedCare+ Backend" cmd /k "cd /d %~dp0backend && set ASPNETCORE_ENVIRONMENT=Development && dotnet run"

echo  [2/3] Waiting 12 seconds for backend startup and data seeding...
timeout /t 12 /nobreak >nul

echo  [3/3] Starting frontend on http://localhost:4200 ...
cd /d %~dp0frontend
if not exist node_modules (
  echo  Installing npm packages — first run only...
  call npm install
)
start "MedCare+ Frontend" cmd /k "npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo  ==========================================
echo   App:           http://localhost:4200
echo   Swagger UI:    http://localhost:5050/swagger
echo   Health check:  http://localhost:5050/actuator/health
echo.
echo   Demo Login Credentials:
echo   +-----------+---------------------+-------------+
echo   ^| Role      ^| Username/Email      ^| Password    ^|
echo   +-----------+---------------------+-------------+
echo   ^| Admin     ^| admin               ^| Admin@123   ^|
echo   ^| Doctor    ^| priya@medcare.in    ^| Doctor@123  ^|
echo   ^| Patient   ^| aakash              ^| Patient@123 ^|
echo   +-----------+---------------------+-------------+
echo  ==========================================
echo.
echo  TIP: opening http://localhost:5050 directly shows 404 — that is normal.
echo       The backend is an API. Use http://localhost:4200 for the app.
echo.
