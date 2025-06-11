/**
 * PM2 Configuration File
 * 
 * This file defines the applications that PM2 will manage.
 * PM2 is a process manager for Node.js applications.
 */

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
      env: {
        NODE_ENV: 'development'
      },
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
      env: {
        NODE_ENV: 'development'
      },
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
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};