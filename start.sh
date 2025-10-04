#!/bin/bash

echo "🚀 Starting Expense Management System..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   On macOS: brew services start mongodb-community"
    echo "   On Ubuntu: sudo systemctl start mongod"
    echo "   On Windows: Start MongoDB service or run mongod"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd client && npm install && cd ..
fi

# Seed the database
echo "🌱 Seeding database with sample data..."
npm run seed

# Start the application
echo "🎉 Starting the application..."
echo "   Backend: http://localhost:5000"
echo "   Frontend: http://localhost:3000"
echo "   API Docs: http://localhost:5000/api-docs"
echo ""
echo "Sample login credentials:"
echo "   Admin: john.doe@techcorp.com / password123"
echo "   Manager: jane.smith@techcorp.com / password123"
echo "   Employee: mike.johnson@techcorp.com / password123"
echo ""

npm run dev:full
