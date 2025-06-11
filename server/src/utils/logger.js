/**
 * Logger Utility
 * 
 * This module provides a centralized logging system for the application.
 * It supports different log levels and can output to console and/or database.
 */

const fs = require('fs');
const path = require('path');
const { run } = require('../../database');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../../storage/logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level (can be overridden by environment variable)
const currentLogLevel = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
  : process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

// File paths for different log types
const logFiles = {
  error: path.join(logsDir, 'error.log'),
  warn: path.join(logsDir, 'warn.log'),
  info: path.join(logsDir, 'info.log'),
  debug: path.join(logsDir, 'debug.log'),
  access: path.join(logsDir, 'access.log')
};

/**
 * Write log to file
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
function writeToFile(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logFile = logFiles[level.toLowerCase()] || logFiles.info;
  
  let logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (Object.keys(meta).length > 0) {
    logEntry += ` ${JSON.stringify(meta)}`;
  }
  
  logEntry += '\n';
  
  // Append to log file
  fs.appendFileSync(logFile, logEntry);
}

/**
 * Write log to database
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
async function writeToDatabase(level, message, meta = {}) {
  try {
    // Only log to database in production or if explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !process.env.ENABLE_DB_LOGGING) {
      return;
    }
    
    await run(
      `INSERT INTO LOG (level, message, details, created_at) VALUES (?, ?, ?, ?)`,
      [
        level.toUpperCase(),
        message,
        JSON.stringify(meta),
        new Date().toISOString()
      ]
    );
  } catch (error) {
    // If database logging fails, write to file instead
    writeToFile('error', `Failed to write log to database: ${error.message}`, {
      originalLog: { level, message, meta }
    });
  }
}

/**
 * Format console output with colors
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @returns {string} Formatted message
 */
function formatConsoleOutput(level, message) {
  const colors = {
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m',  // Yellow
    INFO: '\x1b[36m',  // Cyan
    DEBUG: '\x1b[90m', // Gray
    RESET: '\x1b[0m'   // Reset
  };
  
  return `${colors[level.toUpperCase()]}[${level.toUpperCase()}]${colors.RESET} ${message}`;
}

/**
 * Create a logger instance for a specific module
 * @param {string} moduleName - Name of the module using the logger
 * @returns {Object} Logger object with log methods
 */
function createLogger(moduleName) {
  return {
    /**
     * Log an error message
     * @param {string} message - Error message
     * @param {Error|Object} [error] - Error object or additional metadata
     */
    error(message, error = null) {
      if (currentLogLevel >= LOG_LEVELS.ERROR) {
        const meta = {};
        
        if (error) {
          if (error instanceof Error) {
            meta.error = {
              name: error.name,
              message: error.message,
              stack: error.stack
            };
          } else {
            meta.data = error;
          }
        }
        
        const formattedMessage = `[${moduleName}] ${message}`;
        console.error(formatConsoleOutput('ERROR', formattedMessage), error ? error : '');
        writeToFile('error', formattedMessage, meta);
        writeToDatabase('error', formattedMessage, meta).catch(() => {});
      }
    },
    
    /**
     * Log a warning message
     * @param {string} message - Warning message
     * @param {Object} [meta] - Additional metadata
     */
    warn(message, meta = {}) {
      if (currentLogLevel >= LOG_LEVELS.WARN) {
        const formattedMessage = `[${moduleName}] ${message}`;
        console.warn(formatConsoleOutput('WARN', formattedMessage));
        writeToFile('warn', formattedMessage, meta);
        writeToDatabase('warn', formattedMessage, meta).catch(() => {});
      }
    },
    
    /**
     * Log an info message
     * @param {string} message - Info message
     * @param {Object} [meta] - Additional metadata
     */
    info(message, meta = {}) {
      if (currentLogLevel >= LOG_LEVELS.INFO) {
        const formattedMessage = `[${moduleName}] ${message}`;
        console.info(formatConsoleOutput('INFO', formattedMessage));
        writeToFile('info', formattedMessage, meta);
        writeToDatabase('info', formattedMessage, meta).catch(() => {});
      }
    },
    
    /**
     * Log a debug message
     * @param {string} message - Debug message
     * @param {Object} [meta] - Additional metadata
     */
    debug(message, meta = {}) {
      if (currentLogLevel >= LOG_LEVELS.DEBUG) {
        const formattedMessage = `[${moduleName}] ${message}`;
        console.debug(formatConsoleOutput('DEBUG', formattedMessage));
        writeToFile('debug', formattedMessage, meta);
        // Don't log debug messages to database to avoid clutter
      }
    },
    
    /**
     * Log an access event (HTTP request)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {number} responseTime - Response time in milliseconds
     */
    access(req, res, responseTime) {
      const meta = {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`
      };
      
      // Add user ID if authenticated
      if (req.user && req.user.id) {
        meta.userId = req.user.id;
      }
      
      const message = `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${responseTime}ms`;
      writeToFile('access', message, meta);
      
      // Only log non-200 responses or slow responses to console
      if (res.statusCode >= 400 || responseTime > 1000) {
        console.info(formatConsoleOutput('INFO', `[access] ${message}`));
      }
    }
  };
}

module.exports = {
  createLogger,
  LOG_LEVELS
};