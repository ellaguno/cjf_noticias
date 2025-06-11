require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { setupDatabase } = require('./database');
const routes = require('./routes');
const { requestLogger, errorLogger } = require('./src/middleware/logger');
const { createLogger } = require('./src/utils/logger');
const { main: extractPdfContent } = require('../scripts/pdf-extractor');

// Create logger
const logger = createLogger('server');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // Allow both the Next.js client and direct browser requests
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:3001',
      'http://localhost:3000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS`);
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger); // Use our custom request logger

// Serve static files from the storage directory
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// Serve image files with proper paths
app.use('/images', express.static(path.join(__dirname, '../storage/images')));

// API routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorLogger); // Log errors first
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: {
      message: message,
      status: status
    }
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await setupDatabase();
    logger.info('Database initialized successfully');

    // Check if we should run PDF extraction on startup
    if (process.env.RUN_EXTRACTION_ON_STARTUP === 'true') {
      try {
        logger.info('Running PDF extraction on startup...');
        await extractPdfContent();
        logger.info('PDF extraction completed successfully');
      } catch (error) {
        logger.error('PDF extraction failed:', error);
      }
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();