# CJF Noticias Installation Guide

This guide provides step-by-step instructions for installing and setting up the CJF Judicial News Portal on your local machine or server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Configuration](#configuration)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

Before installing the CJF Noticias application, ensure you have the following prerequisites:

### System Requirements

- **Operating System**: Linux, macOS, or Windows
- **CPU**: 2+ cores recommended
- **RAM**: 2GB minimum, 4GB recommended
- **Disk Space**: 1GB minimum for the application, plus storage for PDFs and database

### Software Requirements

- **Node.js**: Version 14.x or later
  - [Download Node.js](https://nodejs.org/)
  - Verify installation: `node --version`

- **npm**: Version 7.x or later (comes with Node.js)
  - Verify installation: `npm --version`

- **Git**: Latest version
  - [Download Git](https://git-scm.com/)
  - Verify installation: `git --version`

## Installation Steps

Follow these steps to install the CJF Noticias application:

### 1. Clone the Repository

```bash
git clone https://github.com/your-organization/cjf_noticias.git
cd cjf_noticias
```

### 2. Install Dependencies

The application consists of both server and client components. You can install all dependencies with a single command:

```bash
npm run setup
```

This command will:
- Install server dependencies
- Install client dependencies

If you prefer to install them separately:

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Create Environment File

Create a `.env` file in the root directory by copying the example file:

```bash
cp .env.example .env
```

Edit the `.env` file to configure your environment variables (see [Configuration](#configuration) section for details).

## Configuration

The application is configured using environment variables in the `.env` file. Here are the key variables you need to configure:

### Server Configuration

```
# Server port
PORT=3000

# Node environment (development, production, test)
NODE_ENV=development

# JWT secret for authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRATION=24h
```

### Database Configuration

```
# Database path (relative to project root)
DATABASE_PATH=./storage/database.sqlite
```

### PDF Extraction Configuration

```
# URL of the PDF to extract
PDF_URL=https://www.cjf.gob.mx/documentos/diarios/sintetis.pdf

# Time to run daily extraction (24-hour format)
EXTRACTION_TIME=08:00
```

### Admin User Configuration

```
# Default admin password (change this in production)
ADMIN_PASSWORD=admin123

# Default editor password (change this in production)
EDITOR_PASSWORD=editor123
```

## Database Setup

The application uses SQLite as its database, which doesn't require a separate database server. Follow these steps to set up the database:

### 1. Initialize the Database

```bash
npm run init:db
```

This command creates the database file and sets up the required tables.

### 2. Seed the Database (Optional)

To populate the database with initial data for testing:

```bash
npm run init:db:seed
```

This will create:
- Default sections
- Default settings
- Admin user (username: admin, password: from ADMIN_PASSWORD in .env)
- Editor user (username: editor, password: from EDITOR_PASSWORD in .env)

## Running the Application

### Development Mode

To run the application in development mode with hot reloading:

```bash
npm run dev
```

This starts both the server and client in development mode:
- Server: http://localhost:3000
- Client: http://localhost:3001

### Production Mode

To run the application in production mode:

1. Build the client:
```bash
cd client
npm run build
cd ..
```

2. Start the server:
```bash
npm start
```

The application will be available at:
- Server: http://localhost:3000
- Client: Served by the server at http://localhost:3000

### Running Components Separately

If you need to run the server and client separately:

#### Server Only

```bash
npm run dev:server
```

#### Client Only

```bash
npm run dev:client
```

## Accessing the Application

After starting the application, you can access it in your web browser:

- **Public Website**: http://localhost:3001 (development) or http://localhost:3000 (production)
- **Admin Panel**: http://localhost:3001/admin (development) or http://localhost:3000/admin (production)

### Default Login Credentials

- **Admin User**:
  - Username: admin
  - Password: The value of ADMIN_PASSWORD in your .env file (default: admin123)

- **Editor User**:
  - Username: editor
  - Password: The value of EDITOR_PASSWORD in your .env file (default: editor123)

## PDF Extraction

The application extracts content from a daily PDF report. You can trigger the extraction process manually:

```bash
npm run extract:pdf
```

In production, the extraction runs automatically at the time specified in the EXTRACTION_TIME environment variable.

## Troubleshooting

### Common Installation Issues

#### Node.js Version Issues

If you encounter errors related to Node.js version:

```bash
# Check your Node.js version
node --version

# If needed, install nvm to manage Node.js versions
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use the correct Node.js version
nvm install 14
nvm use 14
```

#### Permission Issues

If you encounter permission errors when installing dependencies:

```bash
# On Linux/macOS
sudo npm install -g npm@latest

# Or use npm without sudo
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile
```

#### Database Initialization Errors

If the database initialization fails:

```bash
# Ensure the storage directory exists
mkdir -p storage

# Check permissions
chmod 755 storage

# Try initializing again
npm run init:db
```

#### Port Already in Use

If you see "EADDRINUSE: address already in use" errors:

```bash
# Find the process using the port (Linux/macOS)
lsof -i :3000
# OR (Windows)
netstat -ano | findstr :3000

# Kill the process
kill -9 <PID> # Linux/macOS
taskkill /PID <PID> /F # Windows

# Or change the port in .env
PORT=3001
```

### Getting Help

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting Guide](troubleshooting-guide.md) for more detailed solutions
2. Check the project documentation
3. Contact the development team with:
   - Detailed description of the issue
   - Steps to reproduce
   - Error messages and logs
   - Your environment details (OS, Node.js version, etc.)

## Next Steps

After installation, you may want to:

1. [Configure the application settings](admin-guide.md#system-settings)
2. [Set up a production deployment](deployment-guide.md)
3. [Learn about the API](api.md)
4. [Explore the database schema](database-schema.md)