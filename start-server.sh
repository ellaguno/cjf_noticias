#!/bin/bash

# Start the server with the fixed issues
echo "===== Starting CJF Noticias Portal ====="

# Ensure the database is initialized
echo "Initializing database..."
node scripts/init-db.js

# Seed the database with users
echo "Seeding database with users..."
node scripts/db-seed.js users

# Add sample data with force flag to ensure content is displayed
echo "Adding sample data..."
node scripts/add-sample-data.js --force

# Clear terminal
echo ""
echo "===== Starting servers ====="
echo "Backend API will be available at: http://localhost:3000/api"
echo "Frontend client will be available at: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "============================="
echo ""

# Start both backend and frontend concurrently
npx concurrently \
  "node server/index.js" \
  "cd client && npm run dev"