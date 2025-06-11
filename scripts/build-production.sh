#!/bin/bash

# Production Build Script for CJF Judicial News Portal
# This script builds the application for production deployment

# Exit on error
set -e

echo "Starting production build process..."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please update the .env file with your production settings before continuing."
  exit 1
fi

# Install dependencies
echo "Installing server dependencies..."
npm install --production

echo "Installing client dependencies..."
cd client
npm install --production
cd ..

# Build client
echo "Building client application..."
cd client
npm run build
cd ..

# Initialize database
echo "Initializing database..."
npm run init:db

# Create storage directories if they don't exist
echo "Setting up storage directories..."
mkdir -p storage/pdfs
mkdir -p storage/images
mkdir -p storage/backups

# Set permissions
echo "Setting permissions..."
chmod -R 755 storage

# Create a backup of the current database if it exists
if [ -f "storage/database.sqlite" ]; then
  echo "Creating database backup..."
  BACKUP_FILE="storage/backups/database_backup_$(date +%Y%m%d_%H%M%S).sqlite"
  cp storage/database.sqlite "$BACKUP_FILE"
  echo "Database backed up to $BACKUP_FILE"
fi

echo "Production build completed successfully!"
echo "To start the application in production mode, run: npm run start:prod"
echo "Or with PM2: pm2 start ecosystem.config.js --env production"