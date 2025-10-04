@echo off
echo 🚀 Starting Expense Management System...

REM Check if MongoDB is running (basic check)
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ MongoDB is running
) else (
    echo ⚠️  MongoDB is not running. Please start MongoDB first.
    echo    Download from: https://www.mongodb.com/try/download/community
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing backend dependencies...
    npm install
)

if not exist "client\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd client
    npm install
    cd ..
)

REM Seed the database
echo 🌱 Seeding database with sample data...
npm run seed

REM Start the application
echo 🎉 Starting the application...
echo    Backend: http://localhost:5000
echo    Frontend: http://localhost:3000
echo    API Docs: http://localhost:5000/api-docs
echo.
echo Sample login credentials:
echo    Admin: john.doe@techcorp.com / password123
echo    Manager: jane.smith@techcorp.com / password123
echo    Employee: mike.johnson@techcorp.com / password123
echo.

npm run dev:full
