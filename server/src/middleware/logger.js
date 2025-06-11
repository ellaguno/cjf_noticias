/**
 * Logger Middleware
 * 
 * This middleware logs HTTP requests and responses.
 * It captures request details, response status, and timing information.
 */

const { createLogger } = require('../utils/logger');

// Create logger instance
const logger = createLogger('http');

/**
 * HTTP request logger middleware
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requestLogger(req, res, next) {
  // Skip logging for static assets if in production
  if (process.env.NODE_ENV === 'production' && (
    req.path.startsWith('/static/') || 
    req.path.startsWith('/favicon.ico') ||
    req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)
  )) {
    return next();
  }

  // Record start time
  const start = Date.now();
  
  // Log request
  logger.debug(`${req.method} ${req.originalUrl || req.url} - Request received`, {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    referer: req.headers.referer || req.headers.referrer,
    query: req.query,
    // Don't log sensitive information like passwords
    body: req.method === 'POST' && req.body ? sanitizeRequestBody(req.body) : undefined
  });
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to log response
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - start;
    
    // Restore original end function
    res.end = originalEnd;
    
    // Call original end function
    res.end(chunk, encoding);
    
    // Log response
    logger.access(req, res, responseTime);
    
    // Log detailed info for errors
    if (res.statusCode >= 400) {
      const logLevel = res.statusCode >= 500 ? 'error' : 'warn';
      logger[logLevel](`${req.method} ${req.originalUrl || req.url} - ${res.statusCode} - ${responseTime}ms`, {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        responseTime: responseTime,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });
    }
  };
  
  next();
}

/**
 * Sanitize request body to remove sensitive information
 * 
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
function sanitizeRequestBody(body) {
  // Create a copy of the body
  const sanitized = { ...body };
  
  // List of sensitive fields to redact
  const sensitiveFields = [
    'password', 'passwordConfirmation', 'currentPassword', 'newPassword',
    'token', 'accessToken', 'refreshToken', 'apiKey', 'secret',
    'creditCard', 'cardNumber', 'cvv', 'ssn', 'socialSecurityNumber'
  ];
  
  // Redact sensitive fields
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Error logger middleware
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorLogger(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl || req.url} - ${err.message}`, {
    error: {
      message: err.message,
      stack: err.stack,
      status: err.status || 500
    },
    request: {
      method: req.method,
      url: req.originalUrl || req.url,
      query: req.query,
      body: req.method === 'POST' && req.body ? sanitizeRequestBody(req.body) : undefined,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    }
  });
  
  next(err);
}

module.exports = {
  requestLogger,
  errorLogger
};