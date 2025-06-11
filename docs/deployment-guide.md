# CJF Noticias Deployment Guide

This guide provides instructions for deploying the CJF Judicial News Portal to a production environment.

## Prerequisites

Before deploying the application, ensure you have the following:

- Node.js (v14.x or later)
- npm (v7.x or later)
- PM2 (for process management)
- Git
- Access to the server where the application will be deployed
- Domain name (optional, but recommended for production)

## Deployment Options

There are several ways to deploy the application:

1. **Manual Deployment**: Clone the repository and set up the application manually
2. **PM2 Deployment**: Use PM2's deployment functionality
3. **Docker Deployment**: Use Docker containers (not covered in this guide)

This guide focuses on the first two options.

## Manual Deployment

### 1. Clone the Repository

```bash
git clone https://github.com/your-organization/cjf_noticias.git
cd cjf_noticias
```

### 2. Install Dependencies

```bash
npm run setup
```

This will install both server and client dependencies.

### 3. Create Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file and set the appropriate values for your production environment:

```
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DATABASE_PATH=./storage/database.sqlite

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRATION=24h

# PDF Extraction
PDF_URL=https://www.cjf.gob.mx/documentos/diarios/sintetis.pdf
EXTRACTION_TIME=08:00

# Admin User
ADMIN_PASSWORD=secure_admin_password
EDITOR_PASSWORD=secure_editor_password
```

### 4. Build the Application

```bash
npm run build:prod
```

This will:
- Build the Next.js client application
- Initialize the database
- Create necessary directories

### 5. Start the Application

For a simple deployment, you can use:

```bash
npm run start:prod
```

For a more robust deployment, use PM2:

```bash
pm2 start ecosystem.config.js --env production
```

## PM2 Deployment

PM2 provides a more robust way to deploy and manage Node.js applications.

### 1. Set Up PM2 Deployment Configuration

Create a `ecosystem.config.js` file (if not already present) with deployment configuration:

```javascript
module.exports = {
  apps: [
    {
      name: 'cjf-noticias-api',
      script: 'server/src/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'cjf-noticias-client',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      cwd: './client',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'cjf-noticias-scheduler',
      script: 'server/src/services/scheduler/scheduler.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ],
  deploy: {
    production: {
      user: 'deploy_user',
      host: 'your_server_ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-organization/cjf_noticias.git',
      path: '/var/www/cjf_noticias',
      'post-deploy': 'npm run setup && npm run build:prod && pm2 reload ecosystem.config.js --env production'
    }
  }
};
```

### 2. Set Up the Server

Ensure your server has Node.js, npm, and PM2 installed:

```bash
# Install Node.js and npm
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

### 3. Set Up SSH Keys

Ensure your deployment machine has SSH access to the server.

### 4. Initialize the Deployment

```bash
pm2 deploy ecosystem.config.js production setup
```

### 5. Deploy the Application

```bash
pm2 deploy ecosystem.config.js production
```

## Nginx Configuration (Recommended)

For production deployments, it's recommended to use Nginx as a reverse proxy.

### 1. Install Nginx

```bash
sudo apt-get update
sudo apt-get install nginx
```

### 2. Configure Nginx

Create a new Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/cjf_noticias
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /storage {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration:

```bash
sudo ln -s /etc/nginx/sites-available/cjf_noticias /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Set Up SSL (Recommended)

For HTTPS, you can use Let's Encrypt:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Environment-Specific Configurations

The application supports different environments through environment variables and configuration files.

### Production Environment

For production, set the following environment variables:

```
NODE_ENV=production
```

This will:
- Disable development features
- Enable production optimizations
- Use production error handling

### Development Environment

For development, set:

```
NODE_ENV=development
```

### Test Environment

For testing, set:

```
NODE_ENV=test
```

## Database Management

### Database Migrations

To run database migrations:

```bash
node scripts/db-migrate.js
```

### Database Backup

To create a database backup:

```bash
node scripts/db-backup-restore.js backup
```

Backups are stored in the `storage/backups` directory.

### Database Restore

To restore from a backup:

```bash
node scripts/db-backup-restore.js restore <backup-file>
```

## Maintenance Mode

To enable maintenance mode:

1. Update the `maintenance_mode` setting in the database:

```bash
# Using the admin interface
# OR
# Using the API
curl -X PUT http://your-domain.com/api/admin/settings/maintenance_mode \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "true"}'
```

2. The middleware will automatically redirect users to the maintenance page.

To disable maintenance mode, set the value back to `false`.

## Monitoring

### PM2 Monitoring

PM2 provides built-in monitoring:

```bash
pm2 monit
```

For web-based monitoring:

```bash
pm2 plus
```

### Health Checks

The application provides health check endpoints:

- `GET /health`: Server health check
- `GET /api/status/health`: API health check

You can use these endpoints with monitoring tools like Uptime Robot, Pingdom, or your own monitoring solution.

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Check if the database file exists
   - Ensure the application has write permissions to the database directory

2. **PDF extraction failures**:
   - Check if the PDF URL is accessible
   - Verify the PDF structure hasn't changed
   - Check extraction logs in the admin interface

3. **Server won't start**:
   - Check the server logs: `pm2 logs cjf-noticias-api`
   - Ensure the port is not in use by another application

4. **Client build failures**:
   - Check the build logs
   - Ensure all dependencies are installed correctly

### Logs

Logs are available through PM2:

```bash
pm2 logs cjf-noticias-api    # Server logs
pm2 logs cjf-noticias-client # Client logs
pm2 logs cjf-noticias-scheduler # Scheduler logs
```

Application logs are also stored in the database and can be viewed through the admin interface.

## Updating the Application

To update the application:

1. Pull the latest changes:

```bash
git pull origin main
```

2. Install dependencies:

```bash
npm run setup
```

3. Run database migrations:

```bash
node scripts/db-migrate.js
```

4. Rebuild the application:

```bash
npm run build:prod
```

5. Restart the application:

```bash
pm2 reload ecosystem.config.js --env production
```

Or, if using PM2 deployment:

```bash
pm2 deploy ecosystem.config.js production
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive environment variables to the repository
2. **JWT Secret**: Use a strong, unique JWT secret
3. **Admin Passwords**: Use strong passwords for admin accounts
4. **HTTPS**: Always use HTTPS in production
5. **Regular Updates**: Keep the application and its dependencies updated
6. **Database Backups**: Regularly backup the database
7. **Access Control**: Limit server access to authorized personnel only

## Support

For deployment issues or questions, contact the development team or refer to the project documentation.