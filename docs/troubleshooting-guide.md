# CJF Noticias Troubleshooting Guide

This guide provides solutions for common issues that may arise when running the CJF Judicial News Portal application.

## Table of Contents

1. [Server Issues](#server-issues)
2. [Client Issues](#client-issues)
3. [PDF Extraction Issues](#pdf-extraction-issues)
4. [Database Issues](#database-issues)
5. [Authentication Issues](#authentication-issues)
6. [Performance Issues](#performance-issues)
7. [Deployment Issues](#deployment-issues)

## Server Issues

### Server Won't Start

**Symptoms:**
- Error message when running `npm start`
- PM2 shows the application as errored

**Possible Causes and Solutions:**

1. **Port already in use**
   - Error: `EADDRINUSE: address already in use :::3000`
   - Solution: Change the port in the `.env` file or stop the process using the port
   ```bash
   # Find the process using the port
   lsof -i :3000
   # Kill the process
   kill -9 <PID>
   ```

2. **Missing dependencies**
   - Error: `Cannot find module 'express'`
   - Solution: Reinstall dependencies
   ```bash
   npm install
   ```

3. **Database initialization failed**
   - Error: `Error: SQLITE_CANTOPEN: unable to open database file`
   - Solution: Check database path and permissions
   ```bash
   # Ensure the storage directory exists
   mkdir -p storage
   # Set correct permissions
   chmod 755 storage
   ```

4. **Environment variables not set**
   - Error: `JWT_SECRET is not defined`
   - Solution: Create or update the `.env` file
   ```bash
   cp .env.example .env
   # Edit the .env file with appropriate values
   ```

### API Endpoints Return 500 Error

**Symptoms:**
- API calls return 500 Internal Server Error
- Error logs show exceptions

**Possible Causes and Solutions:**

1. **Database query error**
   - Check server logs for SQL errors
   - Verify database schema is up to date:
   ```bash
   node scripts/db-migrate.js
   ```

2. **Unhandled exceptions**
   - Check server logs for stack traces
   - Add try/catch blocks to the problematic route handler

3. **Missing or corrupt data**
   - Verify required data exists in the database
   - Run database seeding script:
   ```bash
   node scripts/db-seed.js
   ```

## Client Issues

### Client Build Fails

**Symptoms:**
- Error when running `npm run build` in the client directory
- Next.js build errors

**Possible Causes and Solutions:**

1. **Syntax errors in components**
   - Error: `Unexpected token`
   - Solution: Fix syntax errors in the indicated files

2. **Missing dependencies**
   - Error: `Cannot find module '@/components/Layout'`
   - Solution: Install missing dependencies or fix import paths

3. **TypeScript errors**
   - Error: `Type error: Property 'X' is missing in type 'Y'`
   - Solution: Fix type definitions or add proper type annotations

### Pages Not Loading

**Symptoms:**
- Blank page in the browser
- Console errors in browser developer tools

**Possible Causes and Solutions:**

1. **API connection issues**
   - Error: `Failed to fetch` in browser console
   - Solution: Verify API server is running and accessible
   - Check API URL configuration in `client/utils/api.js`

2. **JavaScript errors**
   - Check browser console for specific errors
   - Fix the identified issues in the client code

3. **CSS issues**
   - Styles not loading or applying correctly
   - Check for CSS syntax errors or missing imports

### Responsive Design Issues

**Symptoms:**
- Layout breaks on mobile devices
- Elements overlap or display incorrectly at certain screen sizes

**Possible Causes and Solutions:**

1. **Missing viewport meta tag**
   - Ensure the viewport meta tag is present in `_document.js`
   ```jsx
   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
   ```

2. **Insufficient responsive design**
   - Add responsive Tailwind classes to components
   - Use media queries for custom styling

## PDF Extraction Issues

### PDF Download Fails

**Symptoms:**
- Error logs show PDF download failure
- No content extracted for the day

**Possible Causes and Solutions:**

1. **PDF URL changed**
   - Error: `404 Not Found` when downloading PDF
   - Solution: Update the PDF URL in settings

2. **Network issues**
   - Error: `ETIMEDOUT` or `ECONNREFUSED`
   - Solution: Check network connectivity and firewall settings

3. **Server blocking requests**
   - Error: `403 Forbidden`
   - Solution: Add appropriate headers to the request or use a different approach

### PDF Content Not Extracted Correctly

**Symptoms:**
- Extracted content is incomplete or malformed
- Sections are missing or mixed up

**Possible Causes and Solutions:**

1. **PDF format changed**
   - Error: Section patterns not matching
   - Solution: Update the extraction patterns in `server/src/services/pdf/pdfExtractor.js`

2. **PDF parsing issues**
   - Error: `Error: Failed to parse PDF document`
   - Solution: Check if the PDF is corrupted or in an unsupported format

3. **Text encoding issues**
   - Error: Strange characters in extracted text
   - Solution: Add text normalization to the extraction process

### Scheduled Extraction Not Running

**Symptoms:**
- No new content for the day
- No extraction logs in the database

**Possible Causes and Solutions:**

1. **Scheduler not running**
   - Check if the scheduler process is active:
   ```bash
   pm2 status
   ```
   - Restart the scheduler if needed:
   ```bash
   pm2 restart cjf-noticias-scheduler
   ```

2. **Extraction time misconfigured**
   - Check the extraction time setting in the database
   - Update it to the correct time if needed

3. **Cron job issues**
   - Check system cron logs for errors
   - Verify cron syntax is correct

## Database Issues

### Database Corruption

**Symptoms:**
- SQL errors when querying the database
- Application crashes with database-related errors

**Possible Causes and Solutions:**

1. **File system issues**
   - Error: `SQLITE_CORRUPT: database disk image is malformed`
   - Solution: Restore from a backup:
   ```bash
   node scripts/db-backup-restore.js list
   node scripts/db-backup-restore.js restore <backup-file>
   ```

2. **Concurrent write operations**
   - Implement proper transaction handling
   - Use connection pooling for concurrent operations

### Migration Failures

**Symptoms:**
- Error when running migrations
- Database schema out of sync

**Possible Causes and Solutions:**

1. **Conflicting migrations**
   - Error: `SQLITE_CONSTRAINT: UNIQUE constraint failed`
   - Solution: Fix the migration file or manually resolve the conflict

2. **Syntax errors in migration files**
   - Error: `SyntaxError: Unexpected token`
   - Solution: Fix the syntax in the migration file

3. **Failed migration leaving database in inconsistent state**
   - Solution: Restore from a backup and fix the migration before retrying

## Authentication Issues

### Login Failures

**Symptoms:**
- Unable to log in to admin section
- Authentication errors

**Possible Causes and Solutions:**

1. **Incorrect credentials**
   - Verify username and password
   - Reset password if necessary:
   ```bash
   # Using the database seeding script with the users parameter
   node scripts/db-seed.js users
   ```

2. **JWT issues**
   - Error: `JsonWebTokenError: invalid signature`
   - Solution: Check JWT_SECRET in the .env file
   - Ensure it's consistent across server restarts

3. **Token expiration**
   - Error: `TokenExpiredError: jwt expired`
   - Solution: Refresh the token or log in again

### Authorization Issues

**Symptoms:**
- Access denied to certain features
- 403 Forbidden responses

**Possible Causes and Solutions:**

1. **Insufficient permissions**
   - Check user role in the database
   - Update user role if necessary:
   ```sql
   UPDATE USER SET role = 'admin' WHERE username = 'username';
   ```

2. **Middleware issues**
   - Check authorization middleware for errors
   - Verify token validation logic

## Performance Issues

### Slow API Responses

**Symptoms:**
- API requests take a long time to complete
- Timeouts in the client application

**Possible Causes and Solutions:**

1. **Missing database indexes**
   - Add indexes to frequently queried columns:
   ```sql
   CREATE INDEX idx_article_title ON ARTICLE(title);
   ```

2. **Inefficient queries**
   - Optimize SQL queries in the API routes
   - Use query parameters instead of string concatenation

3. **Server resource limitations**
   - Increase server resources (CPU, memory)
   - Implement caching for frequently accessed data

### High Memory Usage

**Symptoms:**
- Server crashes with out-of-memory errors
- PM2 restarts the application frequently

**Possible Causes and Solutions:**

1. **Memory leaks**
   - Use tools like `node-memwatch` to identify memory leaks
   - Fix identified memory leaks in the code

2. **Large response payloads**
   - Implement pagination for large data sets
   - Limit the amount of data returned in each response

3. **Too many concurrent connections**
   - Implement rate limiting
   - Optimize connection handling

## Deployment Issues

### PM2 Deployment Failures

**Symptoms:**
- PM2 deployment fails
- Error messages in deployment logs

**Possible Causes and Solutions:**

1. **SSH issues**
   - Error: `Host key verification failed`
   - Solution: Add the server's SSH key to known hosts

2. **Git repository issues**
   - Error: `Repository not found`
   - Solution: Verify repository URL and access permissions

3. **Post-deployment script failures**
   - Check specific error in the deployment log
   - Fix the issue in the post-deployment script

### Nginx Configuration Issues

**Symptoms:**
- 502 Bad Gateway errors
- Unable to access the application through Nginx

**Possible Causes and Solutions:**

1. **Incorrect proxy configuration**
   - Check Nginx configuration for errors:
   ```bash
   nginx -t
   ```
   - Fix any identified issues

2. **Application not running**
   - Verify the Node.js application is running:
   ```bash
   pm2 status
   ```
   - Start the application if it's not running

3. **Port conflicts**
   - Ensure the ports specified in Nginx configuration match the application ports

## Additional Troubleshooting Resources

### Logs

Check the following logs for more information:

1. **PM2 logs**
   ```bash
   pm2 logs cjf-noticias-api
   pm2 logs cjf-noticias-client
   pm2 logs cjf-noticias-scheduler
   ```

2. **Nginx logs**
   ```bash
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Application logs in the database**
   - Check the AUDIT_LOG and EXTRACTION_LOG tables
   - Use the admin interface to view logs

### Diagnostic Commands

1. **Check database integrity**
   ```bash
   sqlite3 storage/database.sqlite "PRAGMA integrity_check;"
   ```

2. **Verify database schema**
   ```bash
   sqlite3 storage/database.sqlite ".schema"
   ```

3. **Check system resources**
   ```bash
   # Check disk space
   df -h
   
   # Check memory usage
   free -m
   
   # Check CPU usage
   top
   ```

### Getting Help

If you're unable to resolve an issue using this guide:

1. Check the project documentation
2. Search for similar issues in the project repository
3. Contact the development team with:
   - Detailed description of the issue
   - Steps to reproduce
   - Relevant logs and error messages
   - Environment information (OS, Node.js version, etc.)