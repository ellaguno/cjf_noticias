# CJF Noticias Developer Guide

This guide provides comprehensive information for developers working on the CJF Judicial News Portal project. It covers the project architecture, code organization, development workflow, and best practices.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Development Environment Setup](#development-environment-setup)
6. [Development Workflow](#development-workflow)
7. [API Documentation](#api-documentation)
8. [Database Schema](#database-schema)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Coding Standards](#coding-standards)
12. [Performance Considerations](#performance-considerations)
13. [Security Considerations](#security-considerations)
14. [Contributing Guidelines](#contributing-guidelines)

## Project Overview

The CJF Judicial News Portal is a web application that extracts content from daily PDF reports published by the Federal Judiciary Council (Consejo de la Judicatura Federal) of Mexico and presents it in a structured, searchable web portal. The application includes both a public-facing website and an admin section for content management.

### Key Features

- Daily extraction of content from PDF reports
- Structured display of news in nine sections
- Search functionality
- Calendar for accessing historical news
- Admin section for content management
- User authentication and authorization
- PDF extraction scheduling and monitoring

## Architecture

The application follows a client-server architecture:

- **Client**: A Next.js React application that provides the user interface
- **Server**: A Node.js Express application that provides the API
- **Database**: SQLite database for data storage
- **Services**: Background services for PDF extraction and processing

### System Components

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Server    │     │  External   │
│  (Next.js)  │◄───►│  (Express)  │◄───►│   Sources   │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │  Database   │
                    │  (SQLite)   │
                    └─────────────┘
```

### Data Flow

1. **PDF Extraction**:
   - Scheduler triggers extraction at configured time
   - Server downloads PDF from external source
   - PDF content is extracted and processed
   - Processed content is stored in the database

2. **Content Retrieval**:
   - Client requests content from server
   - Server retrieves content from database
   - Server sends content to client
   - Client renders content for user

3. **User Interaction**:
   - User interacts with the client interface
   - Client sends requests to server API
   - Server processes requests and returns responses
   - Client updates UI based on responses

## Technology Stack

### Frontend

- **Next.js**: React framework for server-side rendering and static site generation
- **React**: JavaScript library for building user interfaces
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Data fetching and caching library
- **Axios**: HTTP client for API requests
- **React Icons**: Icon library
- **React Calendar**: Calendar component

### Backend

- **Node.js**: JavaScript runtime
- **Express**: Web framework for Node.js
- **SQLite**: Embedded database
- **JWT**: JSON Web Tokens for authentication
- **Bcrypt**: Password hashing
- **PDF-parse**: PDF parsing library
- **Node-schedule**: Task scheduling

### Development Tools

- **Jest**: Testing framework
- **React Testing Library**: Testing utilities for React
- **ESLint**: JavaScript linter
- **Prettier**: Code formatter
- **Nodemon**: Development server with auto-reload
- **Concurrently**: Run multiple commands concurrently

## Project Structure

The project follows a modular structure with clear separation of concerns:

```
cjf_noticias/
├── client/                      # Frontend application (Next.js)
│   ├── components/              # React components
│   │   ├── admin/               # Admin-specific components
│   │   └── ...                  # Other components
│   ├── pages/                   # Next.js pages
│   │   ├── admin/               # Admin pages
│   │   ├── api/                 # API routes
│   │   └── ...                  # Other pages
│   ├── public/                  # Static assets
│   ├── styles/                  # CSS styles
│   └── utils/                   # Utility functions
│
├── server/                      # Backend application (Express)
│   ├── routes/                  # API routes
│   ├── src/                     # Source code
│   │   ├── api/                 # API handlers
│   │   ├── middleware/          # Express middleware
│   │   ├── services/            # Business logic services
│   │   │   ├── content/         # Content processing service
│   │   │   ├── pdf/             # PDF extraction service
│   │   │   └── scheduler/       # Scheduler service
│   │   └── utils/               # Utility functions
│   ├── database.js              # Database connection
│   └── index.js                 # Server entry point
│
├── shared/                      # Shared code between client and server
│   ├── constants.js             # Shared constants
│   └── validation.js            # Shared validation logic
│
├── scripts/                     # Utility scripts
│   ├── init-db.js               # Database initialization
│   ├── pdf-extractor.js         # PDF extraction script
│   ├── db-migrate.js            # Database migration script
│   ├── db-seed.js               # Database seeding script
│   └── db-backup-restore.js     # Database backup and restore script
│
├── migrations/                  # Database migrations
│
├── storage/                     # Storage directory
│   ├── pdfs/                    # Downloaded PDFs
│   ├── images/                  # Extracted images
│   └── backups/                 # Database backups
│
├── tests/                       # Test files
│
├── docs/                        # Documentation
│
├── .env.example                 # Example environment variables
├── .gitignore                   # Git ignore file
├── package.json                 # Project dependencies and scripts
├── jest.config.js               # Jest configuration
└── README.md                    # Project README
```

## Development Environment Setup

### Prerequisites

- Node.js (v14.x or later)
- npm (v7.x or later)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-organization/cjf_noticias.git
   cd cjf_noticias
   ```

2. Install dependencies:
   ```bash
   npm run setup
   ```

3. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Initialize the database:
   ```bash
   npm run init:db
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Access the application:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000

## Development Workflow

### Feature Development

1. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Implement your feature, following the coding standards and best practices.

3. Write tests for your feature.

4. Run tests to ensure everything works:
   ```bash
   npm test
   ```

5. Commit your changes with descriptive commit messages:
   ```bash
   git commit -m "Add feature: your feature description"
   ```

6. Push your branch to the remote repository:
   ```bash
   git push origin feature/your-feature-name
   ```

7. Create a pull request for code review.

### Bug Fixes

1. Create a new branch for your bug fix:
   ```bash
   git checkout -b fix/bug-description
   ```

2. Fix the bug and add tests to prevent regression.

3. Run tests to ensure everything works:
   ```bash
   npm test
   ```

4. Commit your changes with descriptive commit messages:
   ```bash
   git commit -m "Fix: description of the bug and fix"
   ```

5. Push your branch to the remote repository:
   ```bash
   git push origin fix/bug-description
   ```

6. Create a pull request for code review.

### Database Changes

1. Create a new migration:
   ```bash
   node scripts/db-migrate.js create your-migration-name
   ```

2. Edit the migration file in the `migrations` directory.

3. Run the migration:
   ```bash
   node scripts/db-migrate.js
   ```

## API Documentation

Refer to the [API Documentation](api.md) for detailed information about the API endpoints, request/response formats, and authentication.

## Database Schema

Refer to the [Database Schema](database-schema.md) for detailed information about the database tables, relationships, and constraints.

## Testing

### Running Tests

To run all tests:
```bash
npm test
```

To run server tests only:
```bash
npm run test:server
```

To run client tests only:
```bash
npm run test:client
```

To run tests with coverage:
```bash
npm run test:coverage
```

### Writing Tests

#### Server Tests

Server tests are located in the `tests` directory and use Jest as the testing framework.

Example of a server test:
```javascript
const request = require('supertest');
const app = require('../server/index');

describe('API Endpoints', () => {
  test('GET /api - should return API info', async () => {
    const response = await request(app).get('/api');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('name');
    expect(response.body).toHaveProperty('version');
  });
});
```

#### Client Tests

Client tests are located in the `client/__tests__` directory and use Jest with React Testing Library.

Example of a client component test:
```javascript
import { render, screen } from '@testing-library/react';
import ArticleCard from '../../components/ArticleCard';

describe('ArticleCard Component', () => {
  const mockArticle = {
    id: 1,
    title: 'Test Article',
    summary: 'Test summary',
    source: 'Test Source',
    publication_date: '2023-05-01'
  };

  test('renders article title', () => {
    render(<ArticleCard article={mockArticle} />);
    
    const title = screen.getByText(mockArticle.title);
    expect(title).toBeInTheDocument();
  });
});
```

## Deployment

Refer to the [Deployment Guide](deployment-guide.md) for detailed information about deploying the application to production.

## Coding Standards

### JavaScript/React

- Use ES6+ features
- Use functional components with hooks for React
- Use async/await for asynchronous operations
- Use destructuring for props and state
- Use named exports for better code navigation
- Document complex functions and components with JSDoc comments

### CSS/Tailwind

- Use Tailwind utility classes for styling
- Use custom CSS only when necessary
- Follow the mobile-first approach for responsive design
- Use CSS variables for theme colors and spacing

### Naming Conventions

- **Files**: Use kebab-case for file names (e.g., `article-card.js`)
- **Components**: Use PascalCase for component names (e.g., `ArticleCard`)
- **Functions**: Use camelCase for function names (e.g., `fetchArticle`)
- **Variables**: Use camelCase for variable names (e.g., `articleData`)
- **Constants**: Use UPPER_SNAKE_CASE for constants (e.g., `MAX_ITEMS_PER_PAGE`)
- **Database Tables**: Use UPPER_CASE for table names (e.g., `ARTICLE`)
- **Database Columns**: Use snake_case for column names (e.g., `publication_date`)

### Code Organization

- Group related functions and components together
- Keep files small and focused on a single responsibility
- Use meaningful directory names that reflect the purpose of the code
- Separate business logic from UI components

## Performance Considerations

### Frontend

- Use Next.js static generation and server-side rendering where appropriate
- Implement code splitting to reduce initial load time
- Optimize images using Next.js Image component
- Use React.memo for expensive components
- Implement virtualization for long lists
- Use React Query for efficient data fetching and caching

### Backend

- Implement database indexes for frequently queried columns
- Use query parameters instead of string concatenation for SQL queries
- Implement caching for frequently accessed data
- Use pagination for large data sets
- Optimize PDF extraction process
- Use streams for file operations

## Security Considerations

### Authentication and Authorization

- Use JWT for authentication
- Store hashed passwords using bcrypt
- Implement role-based access control
- Validate user permissions for each protected route
- Use HTTPS in production

### Input Validation

- Validate all user input on the server side
- Use parameterized queries to prevent SQL injection
- Sanitize HTML content to prevent XSS attacks
- Validate file uploads to prevent malicious files

### API Security

- Implement rate limiting to prevent abuse
- Use CORS to restrict access to the API
- Validate API tokens for each request
- Log all API access for auditing

## Contributing Guidelines

### Pull Request Process

1. Ensure your code follows the coding standards
2. Update documentation if necessary
3. Add or update tests as needed
4. Ensure all tests pass
5. Get at least one code review before merging

### Code Review Guidelines

- Focus on code quality, not style preferences
- Look for potential bugs and edge cases
- Check for security vulnerabilities
- Ensure the code is maintainable and follows best practices
- Verify that tests cover the changes

### Documentation

- Update documentation when making significant changes
- Document complex algorithms and business logic
- Keep API documentation up to date
- Document configuration options and environment variables

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [Express Documentation](https://expressjs.com/)
- [Jest Documentation](https://jestjs.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [SQLite Documentation](https://www.sqlite.org/docs.html)