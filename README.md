# CJF Judicial News Portal

A web portal for displaying judicial news from the Federal Judiciary Council (Consejo de la Judicatura Federal) of Mexico.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Overview

This application extracts content from a daily PDF report published by the CJF and displays it in a structured web portal with an admin section. The content is organized into nine sections as specified in the original report.

## Features

- **Content Extraction**: Automated daily extraction of content from the CJF PDF report
- **Structured Content**: News organized into nine sections:
  1. Ocho columnas
  2. Primeras Planas
  3. Columnas políticas
  4. Información General
  5. Cartones
  6. Suprema Corte de Justicia de la Nación
  7. Tribunal Electoral del Poder Judicial de la Federación
  8. DOF (Diario Oficial)
  9. Consejo de la Judicatura Federal
- **User Interface**:
  - Responsive design for all devices
  - Horizontal scrollable content for each section
  - Thumbnail view for newspaper front pages with click-to-expand functionality
- **Search & Navigation**:
  - Full-text search functionality
  - Calendar for accessing historical news
  - Section-based navigation
- **Admin Features**:
  - Content management dashboard
  - User management with role-based access control
  - PDF extraction monitoring and manual triggering
  - System settings configuration
- **System Features**:
  - Comprehensive testing suite
  - Database migrations and seeding
  - Backup and restore functionality
  - Maintenance mode
  - Error pages and error handling
  - Logging throughout the application

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: React, Next.js, Tailwind CSS
- **Database**: SQLite
- **PDF Processing**: pdf-parse
- **Authentication**: JWT, bcrypt
- **Testing**: Jest, React Testing Library
- **Process Management**: PM2
- **Task Scheduling**: node-schedule

## Documentation

Comprehensive documentation is available in the `docs` directory:

- [Installation Guide](docs/installation-guide.md) - How to install and set up the application
- [Developer Guide](docs/developer-guide.md) - Guide for developers working on the project
- [API Documentation](docs/api.md) - Detailed API reference
- [Database Schema](docs/database-schema.md) - Database structure and relationships
- [Deployment Guide](docs/deployment-guide.md) - How to deploy to production
- [Admin Guide](docs/admin-guide.md) - Guide for administrators
- [Troubleshooting Guide](docs/troubleshooting-guide.md) - Solutions for common issues

## Project Structure

```
cjf_noticias/
├── client/                      # Frontend application (Next.js)
│   ├── components/              # React components
│   ├── pages/                   # Next.js pages
│   ├── styles/                  # CSS styles
│   ├── utils/                   # Utility functions
│   └── __tests__/               # Frontend tests
├── server/                      # Backend application (Express.js)
│   ├── routes/                  # API routes
│   ├── src/                     # Source code
│   │   ├── api/                 # API handlers
│   │   ├── middleware/          # Express middleware
│   │   ├── services/            # Business logic services
│   │   └── utils/               # Utility functions
├── shared/                      # Shared code between client and server
├── scripts/                     # Utility scripts
├── migrations/                  # Database migrations
├── storage/                     # Storage directory for database and uploads
├── tests/                       # Server-side tests
├── docs/                        # Documentation
```

## Quick Start

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd cjf_noticias
   ```

2. Install dependencies:
   ```bash
   npm run setup
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Initialize the database:
   ```bash
   npm run init:db
   ```

### Development

1. Start the development server:
   ```bash
   npm run dev
   ```

   This will start both the backend server and the frontend development server.

2. Access the application:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - Admin Panel: http://localhost:3001/admin

### Testing

Run the test suite:
```bash
npm test
```

For more specific tests:
```bash
npm run test:server    # Server tests only
npm run test:client    # Client tests only
npm run test:e2e       # End-to-end tests
npm run test:coverage  # Tests with coverage report
```

### Production

1. Build for production:
   ```bash
   npm run build:prod
   ```

2. Start the production server:
   ```bash
   npm run start:prod
   ```

   Or with PM2:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

## Contributing

Please read the [Developer Guide](docs/developer-guide.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Acknowledgements

- This project uses data from the [Consejo de la Judicatura Federal](https://www.cjf.gob.mx/)
- Thanks to all contributors who have helped shape this project