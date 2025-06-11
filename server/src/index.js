/**
 * Server Entry Point
 * 
 * This is the main entry point for the server application.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { setupDatabase } = require('../database');
const { initializeScheduler } = require('./services/scheduler/scheduler');
const { createLogger } = require('./utils/logger');

// Create logger for this module
const logger = createLogger('server');

// Import routes
const routes = require('../routes');
const extractionRoutes = require('./api/extraction');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files from the storage directory
app.use('/storage', express.static(path.join(__dirname, '../../storage')));

// API routes
app.use('/api', routes);
app.use('/api/extraction', extractionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await setupDatabase();
    logger.info('Database initialized successfully');
    
    // Initialize scheduler
    await initializeScheduler();
    logger.info('Scheduler initialized successfully');
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer
};