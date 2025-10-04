# 🚀 Quick Start Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)

## Windows Setup

1. **Install MongoDB**:
   - Download from: https://www.mongodb.com/try/download/community
   - Install and start the MongoDB service

2. **Run the application**:
   ```bash
   # Double-click start.bat or run in command prompt
   start.bat
   ```

## macOS/Linux Setup

1. **Install MongoDB**:
   ```bash
   # macOS with Homebrew
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb-community
   
   # Ubuntu/Debian
   sudo apt-get install mongodb
   sudo systemctl start mongod
   ```

2. **Run the application**:
   ```bash
   # Make executable and run
   chmod +x start.sh
   ./start.sh
   ```

## Manual Setup

1. **Install dependencies**:
   ```bash
   # Install all dependencies
   npm run install:all
   ```

2. **Start MongoDB**:
   ```bash
   # Make sure MongoDB is running
   mongod
   ```

3. **Seed the database**:
   ```bash
   npm run seed
   ```

4. **Start the application**:
   ```bash
   # Start both backend and frontend
   npm run dev:full
   ```

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs

## Sample Login Credentials

- **Admin**: john.doe@techcorp.com / password123
- **Manager**: jane.smith@techcorp.com / password123
- **Employee**: mike.johnson@techcorp.com / password123

## Features to Test

### As Admin:
1. View all expenses and users
2. Manage company settings
3. Create/edit users
4. Override approvals

### As Manager:
1. View team expenses
2. Approve/reject expenses
3. Manage team members

### As Employee:
1. Submit expense claims
2. Upload receipts
3. View expense history
4. Track approval status

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string in config.env
- Verify MongoDB port (default: 27017)

### Port Already in Use
- Backend: Change PORT in config.env
- Frontend: Change port in client/package.json

### Dependencies Issues
- Delete node_modules and package-lock.json
- Run `npm install` again

## Need Help?

- Check the full README.md for detailed documentation
- Review API documentation at http://localhost:5000/api-docs
- Check console logs for error messages
