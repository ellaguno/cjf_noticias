# CJF Noticias API Documentation

This document provides comprehensive documentation for the CJF Noticias API, which powers the Judicial News Portal of the Federal Judiciary Council (Consejo de la Judicatura Federal) of Mexico.

## Base URL

```
http://localhost:3000/api
```

For production environments, replace with your production domain.

## Authentication

Some endpoints, particularly those in the admin section, require authentication. Authentication is handled using JSON Web Tokens (JWT).

To authenticate, include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Obtaining a Token

To obtain a token, use the login endpoint:

```
POST /api/admin/login
```

Request body:
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrator",
    "role": "admin"
  }
}
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests:

- `200 OK`: The request was successful
- `201 Created`: The resource was successfully created
- `400 Bad Request`: The request was malformed or invalid
- `401 Unauthorized`: Authentication is required or failed
- `403 Forbidden`: The authenticated user doesn't have permission
- `404 Not Found`: The requested resource was not found
- `500 Internal Server Error`: An error occurred on the server

Error responses have the following format:

```json
{
  "error": {
    "message": "Error message",
    "status": 400
  }
}
```

## Endpoints

### General Information

#### Get API Information

```
GET /api
```

Returns general information about the API, including available endpoints.

Response:
```json
{
  "name": "CJF Noticias API",
  "version": "1.0.0",
  "description": "API for the CJF Judicial News Portal",
  "endpoints": [
    { "path": "/api/latest", "description": "Get latest news" },
    { "path": "/api/articles/:id", "description": "Get article by ID" },
    ...
  ]
}
```

#### Get System Status

```
GET /api/status
```

Returns the current system status, including maintenance mode.

Response:
```json
{
  "status": "ok",
  "maintenance_mode": false,
  "version": "1.0.0",
  "timestamp": "2023-05-15T12:00:00.000Z"
}
```

#### Health Check

```
GET /api/status/health
```

Simple health check endpoint for monitoring.

Response:
```json
{
  "status": "ok",
  "timestamp": "2023-05-15T12:00:00.000Z"
}
```

### News Content

#### Get Latest News

```
GET /api/latest
```

Returns the latest news content for all sections.

Response:
```json
{
  "date": "2023-05-15",
  "sections": [
    {
      "id": "ocho-columnas",
      "name": "Ocho Columnas",
      "count": 5
    },
    ...
  ]
}
```

#### Get Article by ID

```
GET /api/articles/:id
```

Returns a specific article by its ID.

Parameters:
- `id`: The ID of the article

Response:
```json
{
  "id": 1,
  "title": "Article Title",
  "content": "Article content...",
  "summary": "Article summary...",
  "source": "Source Name",
  "section_id": "ocho-columnas",
  "publication_date": "2023-05-15",
  "created_at": "2023-05-15T10:00:00.000Z",
  "updated_at": "2023-05-15T10:00:00.000Z"
}
```

#### Get Section Content

```
GET /api/sections/:sectionId
```

Returns content for a specific section.

Parameters:
- `sectionId`: The ID of the section (e.g., "ocho-columnas")

Response:
```json
{
  "section": "ocho-columnas",
  "name": "Ocho Columnas",
  "date": "2023-05-15",
  "articles": [
    {
      "id": 1,
      "title": "Article Title",
      "summary": "Article summary...",
      "source": "Source Name",
      "publication_date": "2023-05-15"
    },
    ...
  ]
}
```

#### Get Section Preview

```
GET /api/sections/:sectionId/preview
```

Returns a preview of content for a specific section.

Parameters:
- `sectionId`: The ID of the section (e.g., "ocho-columnas")

Response:
```json
{
  "section": "ocho-columnas",
  "name": "Ocho Columnas",
  "date": "2023-05-15",
  "items": [
    {
      "id": 1,
      "title": "Article Title",
      "summary": "Article summary...",
      "type": "article"
    },
    ...
  ]
}
```

### Archive

#### Get Available Archive Dates

```
GET /api/archive/dates
```

Returns a list of dates for which archived news is available.

Response:
```json
[
  "2023-05-15",
  "2023-05-14",
  "2023-05-13",
  ...
]
```

#### Get Archived News for a Date

```
GET /api/archive/:date
```

Returns news content for a specific date.

Parameters:
- `date`: The date in YYYY-MM-DD format

Response:
```json
{
  "date": "2023-05-14",
  "sections": [
    {
      "id": "ocho-columnas",
      "name": "Ocho Columnas",
      "count": 5
    },
    ...
  ]
}
```

### Search

#### Search Articles

```
GET /api/search
```

Searches for articles based on a query.

Query Parameters:
- `q`: The search query (required)
- `section`: Filter by section ID (optional)
- `date`: Filter by publication date (optional)
- `page`: Page number for pagination (optional, default: 1)
- `limit`: Number of results per page (optional, default: 10)

Response:
```json
{
  "query": "search term",
  "results": [
    {
      "id": 1,
      "title": "Article Title",
      "summary": "Article summary...",
      "source": "Source Name",
      "section_id": "ocho-columnas",
      "publication_date": "2023-05-15"
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### Admin Endpoints

These endpoints require authentication with admin privileges.

#### Get All Users

```
GET /api/admin/users
```

Returns a list of all users.

Response:
```json
[
  {
    "id": 1,
    "username": "admin",
    "name": "Administrator",
    "role": "admin",
    "email": "admin@example.com",
    "created_at": "2023-05-01T10:00:00.000Z"
  },
  ...
]
```

#### Get User by ID

```
GET /api/admin/users/:id
```

Returns a specific user by ID.

Parameters:
- `id`: The ID of the user

Response:
```json
{
  "id": 1,
  "username": "admin",
  "name": "Administrator",
  "role": "admin",
  "email": "admin@example.com",
  "created_at": "2023-05-01T10:00:00.000Z",
  "updated_at": "2023-05-01T10:00:00.000Z"
}
```

#### Create User

```
POST /api/admin/users
```

Creates a new user.

Request body:
```json
{
  "username": "newuser",
  "password": "password123",
  "name": "New User",
  "role": "editor",
  "email": "newuser@example.com"
}
```

Response:
```json
{
  "id": 2,
  "username": "newuser",
  "name": "New User",
  "role": "editor",
  "email": "newuser@example.com",
  "created_at": "2023-05-15T12:00:00.000Z"
}
```

#### Update User

```
PUT /api/admin/users/:id
```

Updates an existing user.

Parameters:
- `id`: The ID of the user

Request body:
```json
{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

Response:
```json
{
  "id": 2,
  "username": "newuser",
  "name": "Updated Name",
  "role": "editor",
  "email": "updated@example.com",
  "updated_at": "2023-05-15T13:00:00.000Z"
}
```

#### Delete User

```
DELETE /api/admin/users/:id
```

Deletes a user.

Parameters:
- `id`: The ID of the user

Response:
```json
{
  "message": "User deleted successfully"
}
```

#### Get Extraction Status

```
GET /api/extraction/status
```

Returns the status of the PDF extraction process.

Response:
```json
{
  "last_extraction": "2023-05-15T08:00:00.000Z",
  "status": "completed",
  "next_scheduled": "2023-05-16T08:00:00.000Z"
}
```

#### Get Extraction Logs

```
GET /api/extraction/logs
```

Returns logs of the PDF extraction process.

Query Parameters:
- `date`: Filter logs by date (optional)
- `limit`: Number of log entries to return (optional, default: 50)

Response:
```json
[
  {
    "timestamp": "2023-05-15T08:00:00.000Z",
    "level": "info",
    "message": "Extraction started"
  },
  {
    "timestamp": "2023-05-15T08:01:00.000Z",
    "level": "info",
    "message": "PDF downloaded successfully"
  },
  ...
]
```

#### Trigger Manual Extraction

```
POST /api/extraction/run
```

Triggers a manual PDF extraction process.

Response:
```json
{
  "message": "Extraction process started",
  "job_id": "extraction-2023-05-15-manual"
}
```

#### Get Settings

```
GET /api/admin/settings
```

Returns all system settings.

Response:
```json
[
  {
    "key": "site_title",
    "value": "CJF Noticias Judiciales",
    "description": "Título del sitio"
  },
  {
    "key": "extraction_time",
    "value": "08:00",
    "description": "Hora de extracción diaria (formato 24h)"
  },
  ...
]
```

#### Update Setting

```
PUT /api/admin/settings/:key
```

Updates a specific setting.

Parameters:
- `key`: The key of the setting to update

Request body:
```json
{
  "value": "New Value"
}
```

Response:
```json
{
  "key": "site_title",
  "value": "New Value",
  "description": "Título del sitio",
  "updated_at": "2023-05-15T13:00:00.000Z"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. The current limits are:

- 100 requests per minute for general endpoints
- 20 requests per minute for authentication endpoints

When the rate limit is exceeded, the API will respond with a 429 Too Many Requests status code.

## Versioning

The current API version is v1. The version is included in the API information response.

## Support

For API support, please contact the system administrator or refer to the internal documentation.